package api

import (
	"go.uber.org/fx"
)

var Module = fx.Module("api",
	fx.Provide(NewOpenAIHandlers),
	fx.Provide(NewAnthropicHandlers),
	fx.Provide(NewGeminiHandlers),
	fx.Provide(NewAiSDKHandlers),
	fx.Provide(NewPlaygroundHandlers),
	fx.Provide(NewSystemHandlers),
	fx.Provide(NewAuthHandlers),
	fx.Provide(NewJinaHandlers),
	fx.Provide(NewRedemptionHandlers),
	fx.Provide(NewFilterHandlers),
	fx.Provide(NewPricingHandlers),
	fx.Provide(NewBillingHandlers),
	fx.Provide(NewSettingsHandlers),
	fx.Invoke(initLogger),
)
