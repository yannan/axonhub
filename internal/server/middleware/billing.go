package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/consumptionrecord"
	"github.com/looplj/axonhub/internal/ent/modelpricing"
	"github.com/looplj/axonhub/internal/ent/privacy"
	"github.com/looplj/axonhub/internal/log"
	"github.com/looplj/axonhub/internal/pkg/billing"
	"github.com/looplj/axonhub/internal/server/biz"
)

type billingResponseWriter struct {
	gin.ResponseWriter
	body     *bytes.Buffer
	stream   *streamUsageTracker
	checked  bool
	isStream bool
}

func (w *billingResponseWriter) Write(b []byte) (int, error) {
	w.detectStream()
	if w.isStream {
		if w.stream != nil {
			w.stream.Write(b)
		}
	} else if w.body != nil {
		w.body.Write(b)
	}
	return w.ResponseWriter.Write(b)
}

func (w *billingResponseWriter) WriteString(s string) (int, error) {
	w.detectStream()
	if w.isStream {
		if w.stream != nil {
			w.stream.Write([]byte(s))
		}
	} else if w.body != nil {
		w.body.WriteString(s)
	}
	return w.ResponseWriter.WriteString(s)
}

func (w *billingResponseWriter) detectStream() {
	if w.checked {
		return
	}
	contentType := w.Header().Get("Content-Type")
	if strings.Contains(contentType, "text/event-stream") {
		w.isStream = true
		w.stream = &streamUsageTracker{}
		w.body = nil
	}
	w.checked = true
}

func (w *billingResponseWriter) IsStream() bool {
	w.detectStream()
	return w.isStream
}

type streamUsageTracker struct {
	buffer bytes.Buffer
	usage  typeofUsage
	found  bool
}

func (t *streamUsageTracker) Write(b []byte) {
	if len(b) == 0 {
		return
	}
	t.buffer.Write(b)
	data := t.buffer.Bytes()
	for {
		idx := bytes.IndexByte(data, '\n')
		if idx == -1 {
			break
		}
		line := bytes.TrimSpace(data[:idx])
		data = data[idx+1:]
		if len(line) == 0 || !bytes.HasPrefix(line, []byte("data:")) {
			continue
		}
		payload := bytes.TrimSpace(bytes.TrimPrefix(line, []byte("data:")))
		if bytes.Equal(payload, []byte("[DONE]")) {
			continue
		}
		var response struct {
			Usage *typeofUsage `json:"usage"`
		}
		if err := json.Unmarshal(payload, &response); err == nil && response.Usage != nil {
			t.usage = *response.Usage
			t.found = true
		}
	}
	t.buffer.Reset()
	if len(data) > 0 {
		t.buffer.Write(data)
	}
}

func (t *streamUsageTracker) Usage() (typeofUsage, bool) {
	return t.usage, t.found
}

func WithBilling(billingService *billing.BillingService) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodPost {
			c.Next()
			return
		}

		// 1. Check Pre-flight conditions
		apiKey, ok := contexts.GetAPIKey(c.Request.Context())
		if !ok || apiKey == nil {
			// No API key, skip billing or block?
			// Public endpoints are not under this group usually.
			c.Next()
			return
		}

		bodyBytes, err := readRequestBody(c)
		if err != nil {
			AbortWithError(c, http.StatusBadRequest, err)
			return
		}

		reqMeta := parseRequestMeta(bodyBytes)
		if reqMeta.Model == "" {
			AbortWithError(c, http.StatusBadRequest, errMissingModel)
			return
		}

		pricing, err := billingService.GetModelPricing(c.Request.Context(), reqMeta.Model)
		if err != nil {
			AbortWithError(c, http.StatusBadRequest, err)
			return
		}

		client := ent.FromContext(c.Request.Context())
		if client == nil {
			AbortWithError(c, http.StatusInternalServerError, errMissingEntClient)
			return
		}

		projectID := resolveProjectID(c, apiKey)
		if projectID == 0 {
			AbortWithError(c, http.StatusBadRequest, errMissingProjectID)
			return
		}

		allowCtx := privacy.DecisionContext(c.Request.Context(), privacy.Allow)
		project, err := client.Project.Get(allowCtx, projectID)
		if err != nil {
			AbortWithError(c, http.StatusInternalServerError, err)
			return
		}

		groupMultiplier := resolveGroupMultiplier(allowCtx, client, project.Group)
		preQuota := billing.EstimatePreQuotaWithPricing(pricing, groupMultiplier, reqMeta.PromptTokensEst, reqMeta.MaxTokens)

		if preQuota > 0 && project.Quota < preQuota {
			AbortWithError(c, http.StatusForbidden, errInsufficientQuota)
			return
		}

		if preQuota > 0 {
			if _, err := client.Project.UpdateOneID(project.ID).AddQuota(-preQuota).Save(allowCtx); err != nil {
				AbortWithError(c, http.StatusInternalServerError, err)
				return
			}
		}

		// Wrap writer to capture response
		w := &billingResponseWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
		c.Writer = w

		c.Next()

		// 2. Post-processing: Deduct Quota
		// Only for successful requests
		if c.Writer.Status() != http.StatusOK {
			if preQuota > 0 {
				_, refundErr := client.Project.UpdateOneID(project.ID).AddQuota(preQuota).Save(c.Request.Context())
				if refundErr != nil {
					log.Error(c.Request.Context(), "failed to refund pre-consumed quota", log.Any("error", refundErr))
				}
			}
			return
		}

		isStream := w.IsStream()
		var (
			usageUsage typeofUsage
			usageOk    bool
		)
		if isStream {
			if w.stream != nil {
				usageUsage, usageOk = w.stream.Usage()
			}
		} else {
			responseBody := ""
			if w.body != nil {
				responseBody = w.body.String()
			}
			usageUsage, usageOk = extractUsage(responseBody, false)
		}
		if !usageOk {
			usageUsage = typeofUsage{
				PromptTokens:     reqMeta.PromptTokensEst,
				CompletionTokens: 0,
				TotalTokens:      reqMeta.PromptTokensEst,
			}
		}

		actualGroupMultiplier := groupMultiplier
		actualQuota := billing.CalculateActualQuotaWithPricing(pricing, actualGroupMultiplier, usageUsage.PromptTokens, usageUsage.CompletionTokens)
		delta := actualQuota - preQuota
		billingMultiplier := actualGroupMultiplier
		modelMultiplier := 1.0
		completionRatio := 1.0
		if pricing.Type == modelpricing.TypeQuota {
			modelMultiplier = pricing.Quota
			billingMultiplier = pricing.Quota * actualGroupMultiplier
			if pricing.CompletionRatio > 0 {
				completionRatio = pricing.CompletionRatio
			}
		}
		totalTokens := usageUsage.TotalTokens
		if totalTokens == 0 {
			totalTokens = usageUsage.PromptTokens + usageUsage.CompletionTokens
		}

		traceID := resolveTraceID(c)
		settlement := billing.SettlementTask{
			ProjectID:   project.ID,
			UserID:      apiKey.UserID,
			Model:       reqMeta.Model,
			ActualQuota: actualQuota,
			Delta:       delta,
			Usage: billing.SettlementUsage{
				PromptTokens:     usageUsage.PromptTokens,
				CompletionTokens: usageUsage.CompletionTokens,
				TotalTokens:      usageUsage.TotalTokens,
			},
			TotalTokens: totalTokens,
			UsageType:   determineUsageType(c.FullPath()),
			TraceID:     traceID,
			BillingMultiplier: billingMultiplier,
			GroupMultiplier:   actualGroupMultiplier,
			ModelMultiplier:   modelMultiplier,
			CompletionRatio:   completionRatio,
		}

		settleErr := settleBillingWithRetry(c, billingService, settlement)
		if settleErr != nil {
			log.Error(c.Request.Context(), "billing settlement failed after retries", log.Any("error", settleErr))
			refundSucceeded := false
			if preQuota > 0 {
				if refundErr := refundPreQuota(allowCtx, client, project.ID, preQuota); refundErr != nil {
					log.Error(c.Request.Context(), "failed to refund pre-consumed quota after billing failure", log.Any("error", refundErr))
				} else {
					refundSucceeded = true
				}
			}

			if refundSucceeded {
				settlement.Delta = settlement.ActualQuota
			}
			if err := billingService.EnqueueSettlement(settlement); err != nil {
				log.Error(c.Request.Context(), "failed to enqueue billing settlement", log.Any("error", err))
			}
		}
	}
}

type typeofUsage struct {
	TotalTokens      int `json:"total_tokens"`
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type requestMeta struct {
	Model           string
	MaxTokens       int
	PromptTokensEst int
	ChannelID       int
}

var (
	errMissingModel      = errors.New("model is required for billing")
	errMissingEntClient  = errors.New("ent client missing in context")
	errMissingProjectID  = errors.New("project id missing in context")
	errInsufficientQuota = errors.New("insufficient quota")
)

func readRequestBody(c *gin.Context) ([]byte, error) {
	if c.Request.Body == nil {
		return nil, nil
	}
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil, err
	}
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	return bodyBytes, nil
}

func parseRequestMeta(body []byte) requestMeta {
	if len(body) == 0 {
		return requestMeta{}
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return requestMeta{}
	}

	meta := requestMeta{
		Model:     readStringField(payload, "model"),
		MaxTokens: readIntField(payload, "max_tokens"),
		ChannelID: readIntField(payload, "channel_id"),
	}
	meta.PromptTokensEst = estimatePromptTokens(payload)
	return meta
}

func estimatePromptTokens(payload map[string]any) int {
	totalChars := 0

	if prompt, ok := payload["prompt"]; ok {
		totalChars += countTextSize(prompt)
	}
	if input, ok := payload["input"]; ok {
		totalChars += countTextSize(input)
	}
	if messages, ok := payload["messages"]; ok {
		if list, ok := messages.([]any); ok {
			for _, item := range list {
				msg, ok := item.(map[string]any)
				if !ok {
					continue
				}
				if content, ok := msg["content"]; ok {
					totalChars += countTextSize(content)
				}
			}
		}
	}

	if totalChars == 0 {
		return 0
	}
	return int(math.Ceil(float64(totalChars) / 4))
}

func countTextSize(value any) int {
	switch v := value.(type) {
	case string:
		return len(v)
	case []any:
		size := 0
		for _, item := range v {
			size += countTextSize(item)
		}
		return size
	case map[string]any:
		if text, ok := v["text"]; ok {
			return countTextSize(text)
		}
	}
	return 0
}

func readStringField(payload map[string]any, key string) string {
	if value, ok := payload[key]; ok {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return ""
}

func readIntField(payload map[string]any, key string) int {
	if value, ok := payload[key]; ok {
		switch v := value.(type) {
		case float64:
			return int(v)
		case int:
			return v
		}
	}
	return 0
}

func extractUsage(body string, isStream bool) (typeofUsage, bool) {
	if !isStream {
		var response struct {
			Usage *typeofUsage `json:"usage"`
		}
		if err := json.Unmarshal([]byte(body), &response); err == nil && response.Usage != nil {
			return *response.Usage, true
		}
		return typeofUsage{}, false
	}

	usage := typeofUsage{}
	found := false
	parts := strings.Split(body, "\n")
	for _, line := range parts {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			continue
		}
		var response struct {
			Usage *typeofUsage `json:"usage"`
		}
		if err := json.Unmarshal([]byte(data), &response); err == nil && response.Usage != nil {
			usage = *response.Usage
			found = true
		}
	}
	return usage, found
}

func determineUsageType(path string) consumptionrecord.Type {
	if strings.Contains(path, "image") {
		return consumptionrecord.TypeImage
	}
	return consumptionrecord.TypeChat
}

func resolveGroupMultiplier(ctx context.Context, client *ent.Client, group string) float64 {
	if client == nil {
		return billing.ResolveGroupMultiplier(group, map[string]float64{"default": 1})
	}

	settingsService := biz.NewSettingsService(client)
	ratios, err := settingsService.GetGroupRatio(ctx)
	if err != nil {
		return billing.ResolveGroupMultiplier(group, map[string]float64{"default": 1})
	}

	return billing.ResolveGroupMultiplier(group, ratios)
}

func resolveProjectID(c *gin.Context, apiKey *ent.APIKey) int {
	if projectID, ok := contexts.GetProjectID(c.Request.Context()); ok && projectID > 0 {
		return projectID
	}
	if apiKey != nil && apiKey.ProjectID > 0 {
		return apiKey.ProjectID
	}
	return 0
}

const (
	billingSettlementRetries    = 3
	billingSettlementRetryDelay = 200 * time.Millisecond
)

func settleBillingWithRetry(c *gin.Context, billingService *billing.BillingService, task billing.SettlementTask) error {
	var lastErr error
	for attempt := 1; attempt <= billingSettlementRetries; attempt++ {
		lastErr = billingService.Settle(c.Request.Context(), task)
		if lastErr == nil {
			return nil
		}
		log.Warn(c.Request.Context(), "billing settlement retry failed", log.Int("attempt", attempt), log.Any("error", lastErr))
		if attempt < billingSettlementRetries {
			time.Sleep(billingSettlementRetryDelay)
		}
	}
	return lastErr
}

func refundPreQuota(ctx context.Context, client *ent.Client, projectID int, preQuota int64) error {
	_, err := client.Project.UpdateOneID(projectID).AddQuota(preQuota).Save(ctx)
	return err
}

func resolveTraceID(c *gin.Context) string {
	if trace, ok := contexts.GetTrace(c.Request.Context()); ok && trace != nil && trace.TraceID != "" {
		return trace.TraceID
	}
	if traceID, ok := contexts.GetTraceID(c.Request.Context()); ok && traceID != "" {
		return traceID
	}
	return ""
}
