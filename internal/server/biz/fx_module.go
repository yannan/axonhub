package biz

import (
	"context"

	"github.com/looplj/axonhub/internal/log"
	"github.com/looplj/axonhub/internal/pkg/billing"
	"github.com/looplj/axonhub/internal/pkg/filter"
	"github.com/looplj/axonhub/internal/pkg/redemption"
	"go.uber.org/fx"
)

var Module = fx.Module("biz",
	fx.Provide(NewSystemService),
	fx.Provide(NewAuthService),
	fx.Provide(NewChannelService),
	fx.Provide(NewRequestService),
	fx.Provide(NewUsageLogService),
	fx.Provide(NewUserService),
	fx.Provide(NewAPIKeyService),
	fx.Provide(NewProjectService),
	fx.Provide(NewRoleService),
	fx.Provide(NewThreadService),
	fx.Provide(NewTraceService),
	fx.Provide(NewDataStorageService),
	fx.Provide(NewChannelOverrideTemplateService),
	fx.Provide(NewModelService),
	fx.Provide(NewSettingsService),
	fx.Provide(billing.NewBillingService),
	fx.Provide(redemption.NewRedemptionService),
	fx.Provide(filter.NewValidationEngine),
	fx.Invoke(initSensitiveWordFilter),
	fx.Invoke(initBillingSettlementQueue),
)

func initSensitiveWordFilter(lc fx.Lifecycle, engine *filter.ValidationEngine) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := engine.Reload(ctx); err != nil {
				log.Error(ctx, "failed to load sensitive words", log.Cause(err))
				return err
			}
			log.Info(ctx, "sensitive words loaded")
			return nil
		},
	})
}

func initBillingSettlementQueue(lc fx.Lifecycle, service *billing.BillingService) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			service.StartSettlementQueue(ctx)
			return nil
		},
		OnStop: func(ctx context.Context) error {
			service.StopSettlementQueue()
			return nil
		},
	})
}
