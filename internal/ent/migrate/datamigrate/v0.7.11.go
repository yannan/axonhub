package datamigrate

import (
	"context"

	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/consumptionrecord"
	"github.com/looplj/axonhub/internal/ent/privacy"
	"github.com/looplj/axonhub/internal/ent/project"
	"github.com/looplj/axonhub/internal/ent/rechargerecord"
	"github.com/looplj/axonhub/internal/ent/userproject"
	"github.com/looplj/axonhub/internal/log"
)

// V0_7_11 implements DataMigrator for version 0.7.11 migration.
type V0_7_11 struct{}

// NewV0_7_11 creates a new V0_7_11 data migrator.
func NewV0_7_11() DataMigrator {
	return &V0_7_11{}
}

// Version returns the version of this migrator.
func (v *V0_7_11) Version() string {
	return "v0.7.11"
}

// Migrate performs the version 0.7.11 data migration.
// - Backfills project quota/used_quota based on member users
// - Backfills project_id on consumption/recharge records
// - Ensures project billing group is set
func (v *V0_7_11) Migrate(ctx context.Context, client *ent.Client) error {
	ctx = privacy.DecisionContext(ctx, privacy.Allow)

	projects, err := client.Project.Query().
		Where(project.DeletedAtEQ(0)).
		All(ctx)
	if err != nil {
		return err
	}

	userProjects, err := client.UserProject.Query().
		Where(userproject.DeletedAtEQ(0)).
		Order(
			ent.Desc(userproject.FieldIsOwner),
			ent.Asc(userproject.FieldCreatedAt),
			ent.Asc(userproject.FieldID),
		).
		All(ctx)
	if err != nil {
		return err
	}

	userToProject := make(map[int]int, len(userProjects))
	for _, up := range userProjects {
		if _, ok := userToProject[up.UserID]; ok {
			continue
		}
		userToProject[up.UserID] = up.ProjectID
	}

	defaultProjectID := 0
	for _, proj := range projects {
		if proj.Name == "Default" {
			defaultProjectID = proj.ID
			break
		}
		if defaultProjectID == 0 {
			defaultProjectID = proj.ID
		}
	}

	for _, proj := range projects {
		update := client.Project.UpdateOneID(proj.ID)
		updated := false

		if proj.Group == "" {
			update.SetGroup("default")
			updated = true
		}

		if proj.Quota == 0 && proj.UsedQuota == 0 {
			users, err := proj.QueryUsers().All(ctx)
			if err != nil {
				return err
			}
			var quotaSum int64
			var usedSum int64
			for _, u := range users {
				quotaSum += u.Quota
				usedSum += u.UsedQuota
			}
			if quotaSum != 0 || usedSum != 0 {
				update.SetQuota(quotaSum)
				update.SetUsedQuota(usedSum)
				updated = true
			}
		}

		if updated {
			if _, err := update.Save(ctx); err != nil {
				return err
			}
		}
	}

	for userID, projectID := range userToProject {
		if projectID == 0 {
			continue
		}
		rows, err := client.ConsumptionRecord.Update().
			Where(
				consumptionrecord.UserIDEQ(userID),
				consumptionrecord.ProjectIDEQ(0),
			).
			SetProjectID(projectID).
			Save(ctx)
		if err != nil {
			return err
		}
		if rows > 0 {
			log.Info(ctx, "backfilled consumption records project_id", log.Int("user_id", userID), log.Int("project_id", projectID), log.Int("rows", rows))
		}

		rows, err = client.RechargeRecord.Update().
			Where(
				rechargerecord.UserIDEQ(userID),
				rechargerecord.ProjectIDEQ(0),
			).
			SetProjectID(projectID).
			Save(ctx)
		if err != nil {
			return err
		}
		if rows > 0 {
			log.Info(ctx, "backfilled recharge records project_id", log.Int("user_id", userID), log.Int("project_id", projectID), log.Int("rows", rows))
		}
	}

	if defaultProjectID != 0 {
		rows, err := client.ConsumptionRecord.Update().
			Where(consumptionrecord.ProjectIDEQ(0)).
			SetProjectID(defaultProjectID).
			Save(ctx)
		if err != nil {
			return err
		}
		if rows > 0 {
			log.Info(ctx, "backfilled consumption records project_id to default project", log.Int("project_id", defaultProjectID), log.Int("rows", rows))
		}

		rows, err = client.RechargeRecord.Update().
			Where(rechargerecord.ProjectIDEQ(0)).
			SetProjectID(defaultProjectID).
			Save(ctx)
		if err != nil {
			return err
		}
		if rows > 0 {
			log.Info(ctx, "backfilled recharge records project_id to default project", log.Int("project_id", defaultProjectID), log.Int("rows", rows))
		}
	}

	return nil
}
