package middleware

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/consumptionrecord"
	"github.com/looplj/axonhub/internal/ent/enttest"
	"github.com/looplj/axonhub/internal/ent/modelpricing"
	"github.com/looplj/axonhub/internal/ent/privacy"
	"github.com/looplj/axonhub/internal/ent/project"
	"github.com/looplj/axonhub/internal/ent/user"
	"github.com/looplj/axonhub/internal/pkg/billing"
	"github.com/looplj/axonhub/internal/pkg/xcache"
)

func TestWithBilling_APIKeyRequestCreatesConsumptionRecord(t *testing.T) {
	gin.SetMode(gin.TestMode)

	client := enttest.NewEntClient(t, "sqlite3", "file:ent?mode=memory&_fk=1")
	defer client.Close()

	ctx := context.Background()
	ctx = ent.NewContext(ctx, client)
	ctx = privacy.DecisionContext(ctx, privacy.Allow)

	testUser, err := client.User.Create().
		SetEmail("billing-test@example.com").
		SetPassword("test-password").
		SetFirstName("Test").
		SetLastName("User").
		SetStatus(user.StatusActivated).
		Save(ctx)
	require.NoError(t, err)

	now := time.Now()
	testProject, err := client.Project.Create().
		SetName("billing-test-project").
		SetDescription("billing test project").
		SetStatus(project.StatusActive).
		SetQuota(1000).
		SetCreatedAt(now).
		SetUpdatedAt(now).
		Save(ctx)
	require.NoError(t, err)

	apiKey, err := client.APIKey.Create().
		SetKey("ah-test-key").
		SetName("Billing Test Key").
		SetUser(testUser).
		SetProject(testProject).
		Save(ctx)
	require.NoError(t, err)

	_, err = client.ModelPricing.Create().
		SetModel("gpt-4").
		SetType(modelpricing.TypeQuota).
		SetQuota(1).
		SetCompletionRatio(1).
		Save(ctx)
	require.NoError(t, err)

	billingService := billing.NewBillingService(client, xcache.Config{})

	router := gin.New()
	router.Use(func(c *gin.Context) {
		reqCtx := privacy.DecisionContext(c.Request.Context(), privacy.Allow)
		reqCtx = ent.NewContext(reqCtx, client)
		reqCtx = contexts.WithAPIKey(reqCtx, apiKey)
		c.Request = c.Request.WithContext(reqCtx)
		c.Next()
	})
	router.Use(WithBilling(billingService))
	router.POST("/v1/chat/completions", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"id": "chatcmpl-test",
			"usage": gin.H{
				"prompt_tokens":     5,
				"completion_tokens": 3,
				"total_tokens":      8,
			},
		})
	})

	body := `{"model":"gpt-4","messages":[{"role":"user","content":"hello"}],"max_tokens":0}`
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	record, err := client.ConsumptionRecord.Query().Only(ctx)
	require.NoError(t, err)
	require.Equal(t, apiKey.UserID, record.UserID)
	require.Equal(t, testProject.ID, record.ProjectID)
	require.Equal(t, "gpt-4", record.Model)
	require.Equal(t, 8, record.Quota)
	require.Equal(t, 5, record.PromptTokens)
	require.Equal(t, 3, record.CompletionTokens)
	require.Equal(t, 8, record.TotalTokens)
	require.Equal(t, consumptionrecord.TypeChat, record.Type)

	updatedProject, err := client.Project.Get(ctx, testProject.ID)
	require.NoError(t, err)
	require.Equal(t, int64(992), updatedProject.Quota)
	require.Equal(t, int64(8), updatedProject.UsedQuota)
}
