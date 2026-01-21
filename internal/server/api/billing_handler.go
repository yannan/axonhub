package api

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/apikey"
	"github.com/looplj/axonhub/internal/ent/consumptionrecord"
	"github.com/looplj/axonhub/internal/ent/modelpricing"
	"github.com/looplj/axonhub/internal/ent/request"
	"github.com/looplj/axonhub/internal/ent/trace"
	"github.com/looplj/axonhub/internal/ent/usagelog"
)

type BillingHandlers struct {
	client *ent.Client
}

func NewBillingHandlers(client *ent.Client) *BillingHandlers {
	return &BillingHandlers{client: client}
}

type ConsumptionStatsRow struct {
	ProjectID        int    `json:"project_id"`
	Model            string `json:"model"`
	Date             string `json:"date"`
	Count            int    `json:"count"`
	Quota            int64  `json:"quota"`
	PromptTokens     int64  `json:"prompt_tokens"`
	CompletionTokens int64  `json:"completion_tokens"`
	TotalTokens      int64  `json:"total_tokens"`
}

type DashboardStatsResponse struct {
	TotalRequests            int    `json:"total_requests"`
	CompletedRequests        int    `json:"completed_requests"`
	FailedRequests           int    `json:"failed_requests"`
	CanceledRequests         int    `json:"canceled_requests"`
	BlockedRequests          int    `json:"blocked_requests"`
	AverageLatencyMs         *int64 `json:"average_latency_ms,omitempty"`
	AverageFirstTokenLatency *int64 `json:"average_first_token_latency_ms,omitempty"`
	PromptTokens             int64  `json:"prompt_tokens"`
	CompletionTokens         int64  `json:"completion_tokens"`
	TotalTokens              int64  `json:"total_tokens"`
}

type ConsumptionRecordResponse struct {
	ID               int                    `json:"id"`
	UserID           int                    `json:"user_id"`
	ProjectID        int                    `json:"project_id"`
	Model            string                 `json:"model"`
	Quota            int                    `json:"quota"`
	BillingType      *string                `json:"billing_type,omitempty"`
	TraceID          *string                `json:"trace_id,omitempty"`
	APIKeyID         *int                   `json:"api_key_id,omitempty"`
	APIKeyName       *string                `json:"api_key_name,omitempty"`
	PromptTokens     int                    `json:"prompt_tokens"`
	CompletionTokens int                    `json:"completion_tokens"`
	TotalTokens      int                    `json:"total_tokens"`
	Type             consumptionrecord.Type `json:"type"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

type PaginationResponse struct {
	Total  int `json:"total"`
	Offset int `json:"offset"`
	Limit  int `json:"limit"`
}

func mapConsumptionRecord(record *ent.ConsumptionRecord, apiKeyID *int, apiKeyName *string, billingType *string) ConsumptionRecordResponse {
	var traceID *string
	if record.TraceID != "" {
		traceID = &record.TraceID
	}

	return ConsumptionRecordResponse{
		ID:               record.ID,
		UserID:           record.UserID,
		ProjectID:        record.ProjectID,
		Model:            record.Model,
		Quota:            record.Quota,
		BillingType:      billingType,
		TraceID:          traceID,
		APIKeyID:         apiKeyID,
		APIKeyName:       apiKeyName,
		PromptTokens:     record.PromptTokens,
		CompletionTokens: record.CompletionTokens,
		TotalTokens:      record.TotalTokens,
		Type:             record.Type,
		CreatedAt:        record.CreatedAt,
		UpdatedAt:        record.UpdatedAt,
	}
}

// GetSubscription - Get project quota information
// mimic OpenAI dashboard/billing/subscription or simple quota
func (h *BillingHandlers) GetSubscription(c *gin.Context) {
	projectID, ok := contexts.GetProjectID(c.Request.Context())
	if !ok || projectID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project id missing in context"})
		return
	}

	project, err := h.client.Project.Get(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Response format compatible with One-API /api/user/self or just returning quota
	// One-API usually returns: { "success": true, "data": { ... "quota": 100, "used_quota": 10 ... } }
	// The requeset was "Model pricing CRUD, consumption query, quota query".
	// AxonHub response format seems to prefer { "success": true, "data": ... }

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"quota":      project.Quota,
			"used_quota": project.UsedQuota,
			// "balance": user.Quota - user.UsedQuota, // Optional helper
		},
	})
}

// GetUsage - Get consumption records
func (h *BillingHandlers) GetUsage(c *gin.Context) {
	projectID, ok := contexts.GetProjectID(c.Request.Context())
	if !ok || projectID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project id missing in context"})
		return
	}

	offset := 0
	limit := 100
	if value := strings.TrimSpace(c.Query("offset")); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid offset"})
			return
		}
		offset = parsed
	}
	if value := strings.TrimSpace(c.Query("limit")); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid limit"})
			return
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}

	baseQuery := h.client.ConsumptionRecord.Query().
		Where(consumptionrecord.ProjectID(projectID))
	total, err := baseQuery.Clone().Count(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	records, err := baseQuery.
		Order(ent.Desc(consumptionrecord.FieldCreatedAt)).
		Offset(offset).
		Limit(limit).
		All(c.Request.Context())

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	modelSet := make(map[string]struct{})
	for _, record := range records {
		if record.Model != "" {
			modelSet[record.Model] = struct{}{}
		}
	}

	modelPricingMap := make(map[string]string)
	if len(modelSet) > 0 {
		models := make([]string, 0, len(modelSet))
		for model := range modelSet {
			models = append(models, model)
		}
		pricings, err := h.client.ModelPricing.Query().
			Where(modelpricing.ModelIn(models...)).
			All(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		for _, pricing := range pricings {
			modelPricingMap[pricing.Model] = string(pricing.Type)
		}
	}

	traceIDSet := make(map[string]struct{})
	for _, record := range records {
		if record.TraceID != "" {
			traceIDSet[record.TraceID] = struct{}{}
		}
	}

	traceIDMap := make(map[string]int)
	traceIDInts := make([]int, 0, len(traceIDSet))
	if len(traceIDSet) > 0 {
		traceIDs := make([]string, 0, len(traceIDSet))
		for traceID := range traceIDSet {
			traceIDs = append(traceIDs, traceID)
		}
		traces, err := h.client.Trace.Query().
			Where(trace.TraceIDIn(traceIDs...)).
			All(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for _, traceEntry := range traces {
			traceIDMap[traceEntry.TraceID] = traceEntry.ID
			traceIDInts = append(traceIDInts, traceEntry.ID)
		}
	}

	traceToAPIKeyID := make(map[int]int)
	apiKeyIDSet := make(map[int]struct{})
	if len(traceIDInts) > 0 {
		requests, err := h.client.Request.Query().
			Where(request.TraceIDIn(traceIDInts...)).
			Order(ent.Desc(request.FieldCreatedAt)).
			All(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for _, req := range requests {
			if req.TraceID == 0 || req.APIKeyID == 0 {
				continue
			}
			if _, exists := traceToAPIKeyID[req.TraceID]; exists {
				continue
			}
			traceToAPIKeyID[req.TraceID] = req.APIKeyID
			apiKeyIDSet[req.APIKeyID] = struct{}{}
		}
	}

	apiKeyNameMap := make(map[int]string)
	if len(apiKeyIDSet) > 0 {
		apiKeyIDs := make([]int, 0, len(apiKeyIDSet))
		for apiKeyID := range apiKeyIDSet {
			apiKeyIDs = append(apiKeyIDs, apiKeyID)
		}
		apiKeys, err := h.client.APIKey.Query().
			Where(apikey.IDIn(apiKeyIDs...)).
			All(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		for _, key := range apiKeys {
			apiKeyNameMap[key.ID] = key.Name
		}
	}

	response := make([]ConsumptionRecordResponse, 0, len(records))
	for _, record := range records {
		var apiKeyID *int
		var apiKeyName *string
		var billingType *string
		if pricingType, ok := modelPricingMap[record.Model]; ok {
			billingType = &pricingType
		}
		if record.TraceID != "" {
			if traceID, ok := traceIDMap[record.TraceID]; ok {
				if resolvedID, ok := traceToAPIKeyID[traceID]; ok {
					apiKeyID = &resolvedID
					if resolvedName, ok := apiKeyNameMap[resolvedID]; ok && resolvedName != "" {
						apiKeyName = &resolvedName
					}
				}
			}
		}
		response = append(response, mapConsumptionRecord(record, apiKeyID, apiKeyName, billingType))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
		"pagination": PaginationResponse{
			Total:  total,
			Offset: offset,
			Limit:  limit,
		},
	})
}

// GetDashboardStats returns a lightweight stats overview for the project dashboard.
func (h *BillingHandlers) GetDashboardStats(c *gin.Context) {
	projectID, ok := contexts.GetProjectID(c.Request.Context())
	if !ok || projectID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project id missing in context"})
		return
	}

	startAt, endAt, err := parseDateRange(c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	requestQuery := h.client.Request.Query().Where(request.ProjectIDEQ(projectID))
	if !startAt.IsZero() {
		requestQuery = requestQuery.Where(request.CreatedAtGTE(startAt))
	}
	if !endAt.IsZero() {
		requestQuery = requestQuery.Where(request.CreatedAtLT(endAt))
	}

	totalRequests, err := requestQuery.Count(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	completedCount, _ := requestQuery.Clone().Where(request.StatusEQ(request.StatusCompleted)).Count(c.Request.Context())
	failedCount, _ := requestQuery.Clone().Where(request.StatusEQ(request.StatusFailed)).Count(c.Request.Context())
	canceledCount, _ := requestQuery.Clone().Where(request.StatusEQ(request.StatusCanceled)).Count(c.Request.Context())
	blockedCount, _ := requestQuery.Clone().Where(request.StatusEQ(request.StatusBlocked)).Count(c.Request.Context())

	avgLatency := queryAverageMetric(c.Request.Context(), requestQuery.Clone().Where(request.MetricsLatencyMsNotNil()), request.FieldMetricsLatencyMs)
	avgFirstToken := queryAverageMetric(c.Request.Context(), requestQuery.Clone().Where(request.MetricsFirstTokenLatencyMsNotNil()), request.FieldMetricsFirstTokenLatencyMs)

	usageQuery := h.client.UsageLog.Query().Where(usagelog.ProjectIDEQ(projectID))
	if !startAt.IsZero() {
		usageQuery = usageQuery.Where(usagelog.CreatedAtGTE(startAt))
	}
	if !endAt.IsZero() {
		usageQuery = usageQuery.Where(usagelog.CreatedAtLT(endAt))
	}

	promptTokens, completionTokens, totalTokens := queryUsageTotals(c.Request.Context(), usageQuery)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": DashboardStatsResponse{
			TotalRequests:            totalRequests,
			CompletedRequests:        completedCount,
			FailedRequests:           failedCount,
			CanceledRequests:         canceledCount,
			BlockedRequests:          blockedCount,
			AverageLatencyMs:         avgLatency,
			AverageFirstTokenLatency: avgFirstToken,
			PromptTokens:             promptTokens,
			CompletionTokens:         completionTokens,
			TotalTokens:              totalTokens,
		},
	})
}

// GetConsumptionStats returns aggregated consumption by project/model/date.
func (h *BillingHandlers) GetConsumptionStats(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	rows, err := h.queryConsumptionStats(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	limit := parseLimit(c.Query("limit"), 100)
	offset := parseOffset(c.Query("offset"))
	total := len(rows)

	if offset >= total {
		rows = []ConsumptionStatsRow{}
	} else {
		end := offset + limit
		if end > total {
			end = total
		}
		rows = rows[offset:end]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rows,
		"pagination": PaginationResponse{
			Total:  total,
			Offset: offset,
			Limit:  limit,
		},
	})
}

// ExportConsumptionStats exports aggregated consumption to CSV.
func (h *BillingHandlers) ExportConsumptionStats(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	rows, err := h.queryConsumptionStats(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payload, err := exportConsumptionStatsCSV(rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "application/vnd.ms-excel")
	c.Header("Content-Disposition", "attachment; filename=consumption_stats.csv")
	c.Data(http.StatusOK, "application/vnd.ms-excel", payload)
}

func (h *BillingHandlers) queryConsumptionStats(c *gin.Context) ([]ConsumptionStatsRow, error) {
	query := h.client.ConsumptionRecord.Query()

	if projectID := strings.TrimSpace(c.Query("project_id")); projectID != "" {
		id, err := strconv.Atoi(projectID)
		if err != nil {
			return nil, fmt.Errorf("invalid project_id")
		}
		query = query.Where(consumptionrecord.ProjectIDEQ(id))
	}

	if model := strings.TrimSpace(c.Query("model")); model != "" {
		query = query.Where(consumptionrecord.ModelEQ(model))
	}

	startAt, endAt, err := parseDateRange(c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		return nil, err
	}
	if !startAt.IsZero() {
		query = query.Where(consumptionrecord.CreatedAtGTE(startAt))
	}
	if !endAt.IsZero() {
		query = query.Where(consumptionrecord.CreatedAtLT(endAt))
	}

	records, err := query.All(c.Request.Context())
	if err != nil {
		return nil, err
	}

	byKey := make(map[string]*ConsumptionStatsRow)
	for _, record := range records {
		dateKey := record.CreatedAt.UTC().Format("2006-01-02")
		key := fmt.Sprintf("%d|%s|%s", record.ProjectID, record.Model, dateKey)
		row, ok := byKey[key]
		if !ok {
			row = &ConsumptionStatsRow{
				ProjectID: record.ProjectID,
				Model:     record.Model,
				Date:      dateKey,
			}
			byKey[key] = row
		}
		row.Count++
		row.Quota += int64(record.Quota)
		row.PromptTokens += int64(record.PromptTokens)
		row.CompletionTokens += int64(record.CompletionTokens)
		row.TotalTokens += int64(record.TotalTokens)
	}

	rows := make([]ConsumptionStatsRow, 0, len(byKey))
	for _, row := range byKey {
		rows = append(rows, *row)
	}

	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Date != rows[j].Date {
			return rows[i].Date < rows[j].Date
		}
		if rows[i].ProjectID != rows[j].ProjectID {
			return rows[i].ProjectID < rows[j].ProjectID
		}
		return rows[i].Model < rows[j].Model
	})

	return rows, nil
}

func parseDateRange(startRaw, endRaw string) (time.Time, time.Time, error) {
	startRaw = strings.TrimSpace(startRaw)
	endRaw = strings.TrimSpace(endRaw)

	var (
		startAt time.Time
		endAt   time.Time
		err     error
	)

	if startRaw != "" {
		startAt, err = parseDate(startRaw, false)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
	}
	if endRaw != "" {
		endAt, err = parseDate(endRaw, true)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
	}

	return startAt, endAt, nil
}

func parseDate(raw string, end bool) (time.Time, error) {
	if raw == "" {
		return time.Time{}, nil
	}

	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t, nil
	}

	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date: %s", raw)
	}

	if end {
		return t.Add(24 * time.Hour), nil
	}

	return t, nil
}

func exportConsumptionStatsCSV(rows []ConsumptionStatsRow) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	if err := writer.Write([]string{
		"project_id",
		"model",
		"date",
		"count",
		"quota",
		"prompt_tokens",
		"completion_tokens",
		"total_tokens",
	}); err != nil {
		return nil, err
	}

	for _, row := range rows {
		record := []string{
			strconv.Itoa(row.ProjectID),
			row.Model,
			row.Date,
			strconv.Itoa(row.Count),
			strconv.FormatInt(row.Quota, 10),
			strconv.FormatInt(row.PromptTokens, 10),
			strconv.FormatInt(row.CompletionTokens, 10),
			strconv.FormatInt(row.TotalTokens, 10),
		}
		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func queryAverageMetric(ctx context.Context, query *ent.RequestQuery, field string) *int64 {
	type metricAgg struct {
		Count int   `json:"count"`
		Sum   int64 `json:"sum"`
	}

	var results []metricAgg
	err := query.Aggregate(
		ent.As(ent.Count(), "count"),
		ent.As(ent.Sum(field), "sum"),
	).Scan(ctx, &results)
	if err != nil || len(results) == 0 || results[0].Count == 0 {
		return nil
	}

	avg := results[0].Sum / int64(results[0].Count)
	return &avg
}

func queryUsageTotals(ctx context.Context, query *ent.UsageLogQuery) (int64, int64, int64) {
	type usageAgg struct {
		Prompt     int64 `json:"prompt_tokens"`
		Completion int64 `json:"completion_tokens"`
		Total      int64 `json:"total_tokens"`
	}

	var results []usageAgg
	err := query.Aggregate(
		ent.As(ent.Sum(usagelog.FieldPromptTokens), "prompt_tokens"),
		ent.As(ent.Sum(usagelog.FieldCompletionTokens), "completion_tokens"),
		ent.As(ent.Sum(usagelog.FieldTotalTokens), "total_tokens"),
	).Scan(ctx, &results)
	if err != nil || len(results) == 0 {
		return 0, 0, 0
	}

	return results[0].Prompt, results[0].Completion, results[0].Total
}
