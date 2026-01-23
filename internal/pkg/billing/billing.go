package billing

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/consumptionrecord"
	"github.com/looplj/axonhub/internal/ent/modelpricing"
	"github.com/looplj/axonhub/internal/ent/privacy"
	"github.com/looplj/axonhub/internal/ent/trace"
	"github.com/looplj/axonhub/internal/log"
	"github.com/looplj/axonhub/internal/pkg/xcache"
)

type BillingService struct {
	client          *ent.Client
	pricingCache    xcache.Cache[ent.ModelPricing]
	settlementQueue *SettlementQueue
}

func NewBillingService(client *ent.Client, cacheConfig xcache.Config) *BillingService {
	service := &BillingService{
		client:       client,
		pricingCache: xcache.NewFromConfig[ent.ModelPricing](cacheConfig),
	}
	service.settlementQueue = NewSettlementQueue(service)
	return service
}

// CalculateQuota calculates the quota consumption for a request
// promptTokens: number of tokens in the prompt
// completionTokens: number of tokens in the completion
// modelName: name of the model
func (s *BillingService) CalculateQuota(ctx context.Context, modelName string, promptTokens, completionTokens int) (int64, error) {
	pricing, err := s.GetModelPricing(ctx, modelName)
	if err != nil {
		return 0, err
	}
	groupMultiplier := ResolveGroupMultiplier("default", nil)
	return CalculateActualQuotaWithPricing(pricing, groupMultiplier, promptTokens, completionTokens), nil
}

// EstimatePreQuota returns the pre-consume quota based on estimated prompt tokens and max tokens.
func (s *BillingService) EstimatePreQuota(ctx context.Context, modelName string, groupMultiplier float64, promptTokensEst, maxTokens int) (int64, error) {
	pricing, err := s.GetModelPricing(ctx, modelName)
	if err != nil {
		return 0, err
	}
	return EstimatePreQuotaWithPricing(pricing, groupMultiplier, promptTokensEst, maxTokens), nil
}

// CalculateActualQuota returns the actual quota based on usage tokens.
func (s *BillingService) CalculateActualQuota(ctx context.Context, modelName string, groupMultiplier float64, promptTokens, completionTokens int) (int64, error) {
	pricing, err := s.GetModelPricing(ctx, modelName)
	if err != nil {
		return 0, err
	}
	return CalculateActualQuotaWithPricing(pricing, groupMultiplier, promptTokens, completionTokens), nil
}

func EstimatePreQuotaWithPricing(pricing *ent.ModelPricing, groupMultiplier float64, promptTokensEst, maxTokens int) int64 {
	if pricing == nil {
		return 0
	}
	if pricing.Type != modelpricing.TypeQuota {
		return int64(math.Ceil(pricing.Price * groupMultiplier))
	}
	if pricing.Quota == 0 || groupMultiplier == 0 {
		return 0
	}

	preTokens := promptTokensEst
	if preTokens < preConsumeMinTokens {
		preTokens = preConsumeMinTokens
	}
	preTokens += maxTokens
	if preTokens <= 0 {
		return 0
	}

	total := float64(preTokens) * pricing.Quota * groupMultiplier
	return int64(math.Ceil(total))
}

func CalculateActualQuotaWithPricing(pricing *ent.ModelPricing, groupMultiplier float64, promptTokens, completionTokens int) int64 {
	if pricing == nil {
		return 0
	}
	if pricing.Type != modelpricing.TypeQuota {
		return int64(math.Ceil(pricing.Price * groupMultiplier))
	}
	if pricing.Quota == 0 || groupMultiplier == 0 {
		return 0
	}

	completionRatio := pricing.CompletionRatio
	if completionRatio == 0 {
		completionRatio = 1
	}

	totalTokens := float64(promptTokens) + float64(completionTokens)*completionRatio
	total := totalTokens * pricing.Quota * groupMultiplier
	return int64(math.Ceil(total))
}

func (s *BillingService) GetModelPricing(ctx context.Context, model string) (*ent.ModelPricing, error) {
	if pricing, err := s.pricingCache.Get(ctx, pricingCacheKey(model)); err == nil {
		return &pricing, nil
	}

	pricing, err := s.client.ModelPricing.Query().
		Where(
			modelpricing.ModelEQ(model),
			modelpricing.StatusEQ(modelpricing.StatusEnabled),
		).
		First(ctx)
	if err != nil {
		return nil, err
	}

	_ = s.pricingCache.Set(ctx, pricingCacheKey(model), *pricing, xcache.WithExpiration(pricingCacheTTL))
	return pricing, nil
}

func (s *BillingService) InvalidateModelPricingCache(ctx context.Context, model string) {
	if model == "" {
		_ = s.pricingCache.Clear(ctx)
		return
	}

	_ = s.pricingCache.Delete(ctx, pricingCacheKey(model))
}

type SettlementUsage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

type SettlementTask struct {
	ProjectID         int
	UserID            int
	Model             string
	ActualQuota       int64
	Delta             int64
	Usage             SettlementUsage
	TotalTokens       int
	UsageType         consumptionrecord.Type
	TraceID           string
	BillingMultiplier float64
	GroupMultiplier   float64
	ModelMultiplier   float64
	CompletionRatio   float64
	Attempts          int
}

func (s *BillingService) Settle(ctx context.Context, task SettlementTask) error {
	if task.ProjectID == 0 || task.UserID == 0 || task.Model == "" {
		return errors.New("invalid settlement task")
	}

	settleCtx := privacy.DecisionContext(ctx, privacy.Allow)
	totalTokens := task.TotalTokens
	if totalTokens == 0 {
		totalTokens = task.Usage.TotalTokens
	}
	if totalTokens == 0 {
		totalTokens = task.Usage.PromptTokens + task.Usage.CompletionTokens
	}

	tx, err := s.client.Tx(settleCtx)
	if err != nil {
		return err
	}

	projectUpdate := tx.Project.UpdateOneID(task.ProjectID).AddUsedQuota(task.ActualQuota)
	if task.Delta != 0 {
		projectUpdate.AddQuota(-task.Delta)
	}
	if _, err := projectUpdate.Save(settleCtx); err != nil {
		_ = tx.Rollback()
		return err
	}

	recordBuilder := tx.ConsumptionRecord.Create().
		SetUserID(task.UserID).
		SetProjectID(task.ProjectID).
		SetModel(task.Model).
		SetQuota(int(task.ActualQuota)).
		SetPromptTokens(task.Usage.PromptTokens).
		SetCompletionTokens(task.Usage.CompletionTokens).
		SetTotalTokens(totalTokens).
		SetType(task.UsageType)

	if task.TraceID != "" {
		recordBuilder.SetTraceID(task.TraceID)
	}
	if task.BillingMultiplier > 0 {
		contentPayload := struct {
			BillingMultiplier float64 `json:"billing_multiplier"`
			GroupMultiplier   float64 `json:"group_multiplier"`
			ModelMultiplier   float64 `json:"model_multiplier"`
			CompletionRatio   float64 `json:"completion_ratio"`
		}{
			BillingMultiplier: task.BillingMultiplier,
			GroupMultiplier:   task.GroupMultiplier,
			ModelMultiplier:   task.ModelMultiplier,
			CompletionRatio:   task.CompletionRatio,
		}
		if payload, err := json.Marshal(contentPayload); err == nil {
			recordBuilder.SetContent(string(payload))
		}
	}

	if _, err := recordBuilder.Save(settleCtx); err != nil {
		_ = tx.Rollback()
		return err
	}

	if task.TraceID != "" && task.ActualQuota != 0 {
		if err := tx.Trace.Update().
			Where(trace.TraceIDEQ(task.TraceID)).
			AddCost(task.ActualQuota).
			Exec(settleCtx); err != nil {
			_ = tx.Rollback()
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (s *BillingService) EnqueueSettlement(task SettlementTask) error {
	if s.settlementQueue == nil {
		return errors.New("settlement queue not configured")
	}
	return s.settlementQueue.Enqueue(task)
}

func (s *BillingService) StartSettlementQueue(ctx context.Context) {
	if s.settlementQueue == nil {
		return
	}
	s.settlementQueue.Start(ctx)
}

func (s *BillingService) StopSettlementQueue() {
	if s.settlementQueue == nil {
		return
	}
	s.settlementQueue.Stop()
}

// ResolveGroupMultiplier returns the multiplier for the provided group name.
func ResolveGroupMultiplier(group string, ratios map[string]float64) float64 {
	log.Info(context.Background(), "ResolveGroupMultiplier", log.String("group", group), log.Any("ratios", ratios))
	if group == "" {
		group = "default"
	}
	groups := strings.Split(group, ",")
	if len(groups) == 0 || len(ratios) == 0 {
		return 1
	}

	normalized := make(map[string]float64, len(ratios))
	for key, multiplier := range ratios {
		key = strings.ToLower(strings.TrimSpace(key))
		if key == "" {
			continue
		}
		normalized[key] = multiplier
	}

	maxMultiplier := 0.0
	for _, g := range groups {
		g = strings.ToLower(strings.TrimSpace(g))
		if g == "" {
			continue
		}
		if multiplier, ok := normalized[g]; ok && multiplier > maxMultiplier {
			maxMultiplier = multiplier
		}
	}

	return maxMultiplier
}

const preConsumeMinTokens = 8

const pricingCacheTTL = 5 * time.Minute

func pricingCacheKey(model string) string {
	return "model_pricing:" + strings.ToLower(strings.TrimSpace(model))
}

type SettlementQueue struct {
	service       *BillingService
	tasks         chan SettlementTask
	stopCh        chan struct{}
	wg            sync.WaitGroup
	workerCount   int
	retryDelay    time.Duration
	maxAttempts   int
	settleTimeout time.Duration
}

func NewSettlementQueue(service *BillingService) *SettlementQueue {
	return &SettlementQueue{
		service:       service,
		tasks:         make(chan SettlementTask, 256),
		stopCh:        make(chan struct{}),
		workerCount:   2,
		retryDelay:    2 * time.Second,
		maxAttempts:   5,
		settleTimeout: 8 * time.Second,
	}
}

func (q *SettlementQueue) Start(ctx context.Context) {
	for i := 0; i < q.workerCount; i++ {
		q.wg.Add(1)
		go q.worker(ctx)
	}
}

func (q *SettlementQueue) Stop() {
	close(q.stopCh)
	q.wg.Wait()
}

func (q *SettlementQueue) Enqueue(task SettlementTask) error {
	select {
	case q.tasks <- task:
		return nil
	default:
		return errors.New("settlement queue is full")
	}
}

func (q *SettlementQueue) worker(ctx context.Context) {
	defer q.wg.Done()

	for {
		select {
		case <-q.stopCh:
			return
		case task := <-q.tasks:
			q.handleTask(ctx, task)
		}
	}
}

func (q *SettlementQueue) handleTask(ctx context.Context, task SettlementTask) {
	if task.Attempts >= q.maxAttempts {
		log.Error(ctx, "billing settlement task exceeded retries",
			log.Int("project_id", task.ProjectID),
			log.String("model", task.Model),
			log.Int("attempts", task.Attempts),
		)
		return
	}

	task.Attempts++
	settleCtx, cancel := context.WithTimeout(ctx, q.settleTimeout)
	err := q.service.Settle(settleCtx, task)
	cancel()
	if err == nil {
		return
	}

	if task.Attempts >= q.maxAttempts {
		log.Error(ctx, "billing settlement task failed",
			log.Cause(err),
			log.Int("project_id", task.ProjectID),
			log.String("model", task.Model),
			log.Int("attempts", task.Attempts),
		)
		return
	}

	log.Warn(ctx, "billing settlement task retry scheduled",
		log.Cause(err),
		log.Int("project_id", task.ProjectID),
		log.String("model", task.Model),
		log.Int("attempts", task.Attempts),
	)

	time.AfterFunc(q.retryDelay, func() {
		if q.isStopped() {
			return
		}
		if err := q.Enqueue(task); err != nil {
			log.Error(ctx, "failed to re-enqueue billing settlement task",
				log.Cause(err),
				log.Int("project_id", task.ProjectID),
				log.String("model", task.Model),
			)
		}
	})
}

func (q *SettlementQueue) isStopped() bool {
	select {
	case <-q.stopCh:
		return true
	default:
		return false
	}
}
