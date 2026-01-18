package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/request"
	"github.com/looplj/axonhub/internal/ent/trace"
	"github.com/looplj/axonhub/internal/log"
	"github.com/looplj/axonhub/internal/pkg/filter"
	"github.com/looplj/axonhub/internal/pkg/httpclient"
	"github.com/looplj/axonhub/internal/tracing"
)

// WithSensitiveWordFilter creates a middleware that checks request body for sensitive words
func WithSensitiveWordFilter(engine *filter.ValidationEngine) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only check POST/PUT methods usually having body
		if c.Request.Method != http.MethodPost && c.Request.Method != http.MethodPut {
			c.Next()
			return
		}

		// Read body
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
		}

		// Validate
		valid, word := engine.Validate(string(bodyBytes))
		if !valid {
			traceID := ""
			if trace, ok := contexts.GetTrace(c.Request.Context()); ok && trace != nil && trace.TraceID != "" {
				traceID = trace.TraceID
			} else if id, ok := contexts.GetTraceID(c.Request.Context()); ok && id != "" {
				traceID = id
			}
			log.Warn(c.Request.Context(), "sensitive word blocked",
				log.String("word", word),
				log.String("status", "blocked"),
				log.String("trace_id", traceID),
			)
			recordBlockedRequest(c, bodyBytes, word)
			// Spec requires: status blocked, return hint, no billing.
			// Returning 400 with specific error.
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"message": "Request contains sensitive word: " + word,
					"type":    "content_policy_violation",
					"param":   nil,
					"code":    "sensitive_content",
				},
			})
			c.Abort()
			return
		}

		// Restore body
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		c.Next()
	}
}

func recordBlockedRequest(c *gin.Context, bodyBytes []byte, word string) {
	client := ent.FromContext(c.Request.Context())
	if client == nil {
		return
	}

	projectID, _ := contexts.GetProjectID(c.Request.Context())
	apiKey, _ := contexts.GetAPIKey(c.Request.Context())
	if projectID == 0 && apiKey != nil {
		projectID = apiKey.ProjectID
	}
	if projectID == 0 {
		return
	}

	model, stream := parseRequestModel(bodyBytes)
	if model == "" {
		model = "unknown"
	}

	requestBody := bodyBytes
	if len(requestBody) == 0 {
		requestBody = []byte("{}")
	}

	respBody, _ := json.Marshal(gin.H{
		"error": gin.H{
			"message": "Request contains sensitive word: " + word,
			"type":    "content_policy_violation",
			"param":   nil,
			"code":    "sensitive_content",
			"status":  "blocked",
		},
	})

	headers := httpclient.MaskSensitiveHeaders(c.Request.Header)
	headersBytes, _ := json.Marshal(headers)

	traceEntity, traceID := ensureBlockedTrace(c, client, projectID)
	if traceID != "" {
		log.Warn(c.Request.Context(), "sensitive word blocked trace",
			log.String("trace_id", traceID),
			log.String("word", word),
		)
	}

	builder := client.Request.Create().
		SetProjectID(projectID).
		SetModelID(model).
		SetStatus(request.StatusBlocked).
		SetStream(stream).
		SetSource(contexts.GetSourceOrDefault(c.Request.Context(), request.SourceAPI)).
		SetRequestHeaders(headersBytes).
		SetRequestBody(requestBody)

	if apiKey != nil {
		builder.SetAPIKeyID(apiKey.ID)
	}
	if traceEntity != nil {
		builder.SetTraceID(traceEntity.ID)
	}
	if len(respBody) > 0 {
		builder.SetResponseBody(respBody)
	}

	if _, err := builder.Save(c.Request.Context()); err != nil {
		log.Warn(c.Request.Context(), "failed to record blocked request", log.Cause(err))
	}
}

func ensureBlockedTrace(c *gin.Context, client *ent.Client, projectID int) (*ent.Trace, string) {
	if traceEntity, ok := contexts.GetTrace(c.Request.Context()); ok && traceEntity != nil {
		return traceEntity, traceEntity.TraceID
	}

	traceID, _ := contexts.GetTraceID(c.Request.Context())
	if traceID == "" {
		traceID = tracing.GenerateTraceID()
	}

	traceEntity, err := client.Trace.Query().
		Where(
			trace.TraceIDEQ(traceID),
			trace.ProjectIDEQ(projectID),
		).
		Only(c.Request.Context())
	if err == nil {
		return traceEntity, traceID
	}
	if !ent.IsNotFound(err) {
		log.Warn(c.Request.Context(), "failed to query trace for blocked request", log.Cause(err))
		return nil, traceID
	}

	builder := client.Trace.Create().
		SetTraceID(traceID).
		SetProjectID(projectID)
	if thread, ok := contexts.GetThread(c.Request.Context()); ok && thread != nil {
		builder.SetThreadID(thread.ID)
	}

	traceEntity, err = builder.Save(c.Request.Context())
	if err != nil {
		log.Warn(c.Request.Context(), "failed to create trace for blocked request", log.Cause(err))
		return nil, traceID
	}

	return traceEntity, traceID
}

func parseRequestModel(body []byte) (string, bool) {
	if len(body) == 0 {
		return "", false
	}

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", false
	}

	model := ""
	if raw, ok := payload["model"]; ok {
		if value, ok := raw.(string); ok {
			model = value
		}
	}

	stream := false
	if raw, ok := payload["stream"]; ok {
		if value, ok := raw.(bool); ok {
			stream = value
		}
	}

	return model, stream
}
