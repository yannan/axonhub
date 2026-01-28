package redemption

import (
	"context"
	"errors"
	"fmt"
	"time"

	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/sql"
	"github.com/google/uuid"
	"github.com/looplj/axonhub/internal/contexts"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/rechargerecord"
	"github.com/looplj/axonhub/internal/ent/redemptioncode"
	"github.com/looplj/axonhub/internal/log"
)

type RedemptionService struct {
	client *ent.Client
}

func NewRedemptionService(client *ent.Client) *RedemptionService {
	return &RedemptionService{client: client}
}

// GenerateCodes generates N redemption codes
func (s *RedemptionService) GenerateCodes(ctx context.Context, count int, quota int, expiresAt *time.Time, maxUses *int) ([]string, error) {
	var codes []string
	bulk := make([]*ent.RedemptionCodeCreate, count)

	for i := 0; i < count; i++ {
		code := fmt.Sprintf("sk-%s", uuid.New().String())
		codes = append(codes, code)
		builder := s.client.RedemptionCode.Create().
			SetCode(code).
			SetQuota(quota).
			SetStatus(redemptioncode.StatusActive).
			SetNillableExpiresAt(expiresAt)
		if maxUses != nil && *maxUses > 0 {
			builder.SetMaxUses(*maxUses)
		}
		bulk[i] = builder
	}

	err := s.client.RedemptionCode.CreateBulk(bulk...).Exec(ctx)
	if err != nil {
		return nil, err
	}
	return codes, nil
}

// RedeemCode redeems a code for a user
func (s *RedemptionService) RedeemCode(ctx context.Context, projectID, userID int, code string) (int, error) {
	// Start transaction
	tx, err := s.client.Tx(ctx)
	if err != nil {
		return 0, err
	}

	// 1. Find and validate code with FOR UPDATE lock
	results, err := tx.RedemptionCode.Query().
		Where(redemptioncode.CodeEQ(code)).
		Modify(func(s *sql.Selector) {
			if s.Dialect() != dialect.SQLite {
				s.For("UPDATE")
			}
		}).
		All(ctx)
	if err != nil {
		tx.Rollback()
		return 0, err
	}
	if len(results) == 0 {
		tx.Rollback()
		return 0, errors.New("redemption code not found")
	}
	if len(results) > 1 {
		tx.Rollback()
		return 0, errors.New("multiple redemption codes found with same code")
	}
	rc := results[0]

	existingRecord, err := tx.RechargeRecord.Query().
		Where(
			rechargerecord.ProjectID(projectID),
			rechargerecord.CodeID(rc.ID),
		).
		First(ctx)
	if err == nil {
		tx.Rollback()
		return int(existingRecord.Amount), nil
	}
	if err != nil && !ent.IsNotFound(err) {
		tx.Rollback()
		return 0, err
	}

	if rc.Status != redemptioncode.StatusActive {
		tx.Rollback()
		return 0, errors.New("code is invalid or already used")
	}
	if rc.Voided {
		tx.Rollback()
		return 0, errors.New("code is voided")
	}
	if !rc.ExpiresAt.IsZero() && rc.ExpiresAt.Before(time.Now()) {
		tx.Rollback()
		return 0, errors.New("code is expired")
	}
	if rc.MaxUses > 0 && rc.UsedTimes >= rc.MaxUses {
		tx.Rollback()
		return 0, errors.New("code usage limit reached")
	}

	// 2. Update project balance
	err = tx.Project.UpdateOneID(projectID).
		AddQuota(int64(rc.Quota)).
		Exec(ctx)
	if err != nil {
		tx.Rollback()
		return 0, err
	}

	newUsedTimes := rc.UsedTimes + 1
	update := tx.RedemptionCode.UpdateOne(rc).
		SetUsedBy(userID).
		SetUsedAt(time.Now()).
		SetUsedTimes(newUsedTimes)
	if rc.MaxUses > 0 && newUsedTimes >= rc.MaxUses {
		update.SetStatus(redemptioncode.StatusUsed)
	}
	_, err = update.Save(ctx)
	if err != nil {
		tx.Rollback()
		return 0, err
	}

	recharge := tx.RechargeRecord.Create().
		SetUserID(userID).
		SetProjectID(projectID).
		SetCodeID(rc.ID).
		SetAmount(int64(rc.Quota)).
		SetStatus(rechargerecord.StatusSuccess)
	if traceID, ok := contexts.GetTraceID(ctx); ok && traceID != "" {
		recharge.SetTraceID(traceID)
	}
	if trace, ok := contexts.GetTrace(ctx); ok && trace != nil && trace.TraceID != "" {
		recharge.SetTraceID(trace.TraceID)
	}
	if _, err := recharge.Save(ctx); err != nil {
		tx.Rollback()
		if ent.IsConstraintError(err) {
			if record, getErr := tx.RechargeRecord.Query().
				Where(
					rechargerecord.UserID(userID),
					rechargerecord.CodeID(rc.ID),
				).
				First(ctx); getErr == nil {
				return int(record.Amount), nil
			}
		}
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	log.Info(ctx, "redemption code redeemed", log.Int("user_id", userID), log.Int("project_id", projectID), log.Int("code_id", rc.ID), log.Int("quota", rc.Quota))
	return rc.Quota, nil
}
