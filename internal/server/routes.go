package server

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/request"
	"github.com/looplj/axonhub/internal/pkg/billing"
	"github.com/looplj/axonhub/internal/pkg/filter"
	"github.com/looplj/axonhub/internal/server/api"
	"github.com/looplj/axonhub/internal/server/biz"
	"github.com/looplj/axonhub/internal/server/gql"
	"github.com/looplj/axonhub/internal/server/middleware"
	"github.com/looplj/axonhub/internal/server/static"
)

type Handlers struct {
	fx.In

	Graphql    *gql.GraphqlHandler
	OpenAI     *api.OpenAIHandlers
	Anthropic  *api.AnthropicHandlers
	Gemini     *api.GeminiHandlers
	AiSDK      *api.AiSDKHandlers
	Playground *api.PlaygroundHandlers
	System     *api.SystemHandlers
	Auth       *api.AuthHandlers
	Jina       *api.JinaHandlers
	Redemption *api.RedemptionHandlers
	Filter     *api.FilterHandlers
	Pricing    *api.PricingHandlers
	Billing    *api.BillingHandlers
	Settings   *api.SettingsHandlers
}

type Services struct {
	fx.In

	TraceService    *biz.TraceService
	ThreadService   *biz.ThreadService
	AuthService     *biz.AuthService
	BillingService  *billing.BillingService
	FilterEngine    *filter.ValidationEngine
	SettingsService *biz.SettingsService
}

func SetupRoutes(server *Server, handlers Handlers, client *ent.Client, services Services) {
	// Serve static frontend files
	server.NoRoute(static.Handler())

	server.Use(middleware.AccessLog())
	server.Use(middleware.WithEntClient(client))
	server.Use(middleware.WithLoggingTracing(server.Config.Trace))
	server.Use(middleware.WithMetrics())

	// Setup CORS middleware at server level if enabled
	if server.Config.CORS.Enabled {
		corsConfig := cors.DefaultConfig()
		corsConfig.AllowOrigins = server.Config.CORS.AllowedOrigins
		corsConfig.AllowMethods = server.Config.CORS.AllowedMethods
		corsConfig.AllowHeaders = server.Config.CORS.AllowedHeaders
		corsConfig.ExposeHeaders = server.Config.CORS.ExposedHeaders
		corsConfig.AllowCredentials = server.Config.CORS.AllowCredentials
		corsConfig.MaxAge = server.Config.CORS.MaxAge

		corsHandler := cors.New(corsConfig)
		server.Use(corsHandler)
		server.OPTIONS("*any", corsHandler)
	}

	publicGroup := server.Group("", middleware.WithTimeout(server.Config.RequestTimeout))
	{
		// Favicon API - DO NOT AUTH
		publicGroup.GET("/favicon", handlers.System.GetFavicon)
		// Health check endpoint - no authentication required
		publicGroup.GET("/health", handlers.System.Health)
	}

	publicAdminGroup := server.Group("/admin", middleware.WithTimeout(server.Config.RequestTimeout))
	{
		publicAdminGroup.GET("/graphql-docs", func(c *gin.Context) {
			handlers.Graphql.Playground.ServeHTTP(c.Writer, c.Request)
		})
		publicAdminGroup.GET("/playground", func(c *gin.Context) {
			handlers.Graphql.Playground.ServeHTTP(c.Writer, c.Request)
		})
	}

	unSecureAdminGroup := server.Group("/admin", middleware.WithTimeout(server.Config.RequestTimeout))
	{
		// System Status and Initialize - DO NOT AUTH
		unSecureAdminGroup.GET("/system/status", handlers.System.GetSystemStatus)
		unSecureAdminGroup.POST("/system/initialize", handlers.System.InitializeSystem)
		// User Login - DO NOT AUTH
		unSecureAdminGroup.POST("/auth/signin", handlers.Auth.SignIn)
	}

	adminGroup := server.Group("/admin", middleware.WithJWTAuth(services.AuthService), middleware.WithProjectID())
	// 管理员路由 - 使用 JWT 认证
	{
		adminGroup.POST("/graphql", middleware.WithTimeout(server.Config.RequestTimeout), func(c *gin.Context) {
			handlers.Graphql.Graphql.ServeHTTP(c.Writer, c.Request)
		})

		// Playground API with channel specification support
		adminGroup.POST("/playground/chat",
			middleware.WithSource(request.SourcePlayground),
			handlers.Playground.ChatCompletion,
		)

		// Redemption (Admin)
		adminGroup.POST("/redemption/generate", handlers.Redemption.GenerateCodes)
		adminGroup.GET("/redemption", handlers.Redemption.ListCodes)
		adminGroup.POST("/redemption/:id/void", handlers.Redemption.VoidCode)
		adminGroup.POST("/redemption/delete", handlers.Redemption.DeleteCodes)
		adminGroup.GET("/recharges", handlers.Redemption.ListRechargesAdmin)

		// Filter (Admin)
		adminGroup.POST("/filter/words", handlers.Filter.AddSensitiveWord)
		adminGroup.GET("/filter/words", handlers.Filter.ListSensitiveWords)
		adminGroup.DELETE("/filter/words/:id", handlers.Filter.DeleteSensitiveWord)

		// Pricing (Admin)
		adminGroup.GET("/pricing", handlers.Pricing.ListPrices)
		adminGroup.POST("/pricing", handlers.Pricing.CreatePrice)
		adminGroup.POST("/pricing/batch", handlers.Pricing.CreatePricesBatch)
		adminGroup.PUT("/pricing", handlers.Pricing.UpdatePrice)
		adminGroup.DELETE("/pricing/:model", handlers.Pricing.DeletePrice)
		adminGroup.PUT("/pricing/:model/disable", handlers.Pricing.DisablePrice)
		adminGroup.PUT("/pricing/:model/enable", handlers.Pricing.EnablePrice)

		// Billing (Admin)
		adminGroup.GET("/billing/stats", handlers.Billing.GetConsumptionStats)
		adminGroup.GET("/billing/export", handlers.Billing.ExportConsumptionStats)

		// System Settings (Admin)
		adminGroup.GET("/system/settings", handlers.Settings.GetSystemSettings)
		adminGroup.PUT("/system/settings", handlers.Settings.UpdateSystemSettings)
	}

	userGroup := server.Group("/user", middleware.WithJWTAuth(services.AuthService), middleware.WithProjectID())
	{
		userGroup.POST("/redemption/redeem", handlers.Redemption.RedeemCode)
		userGroup.GET("/recharges", handlers.Redemption.ListUserRecharges)

		// Billing (User) - deprecated, keep for backward compatibility
		userGroup.GET("/billing/subscription", handlers.Billing.GetSubscription)
		userGroup.GET("/billing/usage", handlers.Billing.GetUsage)
	}

	projectGroup := server.Group("/project", middleware.WithJWTAuth(services.AuthService), middleware.WithProjectID())
	{
		projectGroup.POST("/redemption/redeem", handlers.Redemption.RedeemCode)
		projectGroup.GET("/recharges", handlers.Redemption.ListUserRecharges)

		// Billing (Project)
		projectGroup.GET("/billing/subscription", handlers.Billing.GetSubscription)
		projectGroup.GET("/billing/usage", handlers.Billing.GetUsage)
		projectGroup.GET("/dashboard/stats", handlers.Billing.GetDashboardStats)
	}

	apiGroup := server.Group("/",
		middleware.WithTimeout(server.Config.LLMRequestTimeout),
		middleware.WithAPIKeyAuth(services.AuthService),
		middleware.WithSource(request.SourceAPI),
		middleware.WithThread(server.Config.Trace, services.ThreadService),
		middleware.WithTrace(server.Config.Trace, services.TraceService),
		middleware.WithSensitiveWordFilter(services.FilterEngine, services.SettingsService),
		middleware.WithBilling(services.BillingService),
	)

	{
		openaiGroup := apiGroup.Group("/v1")
		openaiGroup.POST("/chat/completions", handlers.OpenAI.ChatCompletion)
		openaiGroup.POST("/responses", handlers.OpenAI.CreateResponse)
		openaiGroup.GET("/models", handlers.OpenAI.ListModels)
		openaiGroup.POST("/embeddings", handlers.OpenAI.CreateEmbedding)

		// Compatible with OpenAI API
		openaiGroup.POST("/rerank", handlers.Jina.Rerank)
	}

	{
		jinaGroup := apiGroup.Group("/jina/v1")
		jinaGroup.POST("/embeddings", handlers.Jina.CreateEmbedding)
		jinaGroup.POST("/rerank", handlers.Jina.Rerank)
	}

	{
		anthropicGroup := apiGroup.Group("/anthropic/v1")
		anthropicGroup.POST("/messages", handlers.Anthropic.CreateMessage)
		anthropicGroup.GET("/models", handlers.Anthropic.ListModels)
	}

	{
		geminiGroup := apiGroup.Group("/gemini/:gemini-api-version")
		geminiGroup.POST("/models/*action", handlers.Gemini.GenerateContent)
		geminiGroup.GET("/models", handlers.Gemini.ListModels)
	}
}
