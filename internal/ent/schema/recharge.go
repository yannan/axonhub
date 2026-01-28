package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// RechargeRecord holds the schema definition for the RechargeRecord entity.
type RechargeRecord struct {
	ent.Schema
}

func (RechargeRecord) Mixin() []ent.Mixin {
	return []ent.Mixin{
		TimeMixin{},
	}
}

// Fields of the RechargeRecord.
func (RechargeRecord) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id").Comment("User ID"),
		field.Int("project_id").Comment("Project ID"),
		field.Int("code_id").Comment("Redemption code ID"),
		field.Int64("amount").Comment("Recharge amount"),
		field.Enum("status").Values("success", "failed").Default("success"),
		field.String("trace_id").Optional().Comment("Trace ID"),
	}
}

func (RechargeRecord) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("project_id", "code_id").
			StorageKey("recharge_records_by_project_code").
			Unique(),
		index.Fields("user_id", "created_at").
			StorageKey("recharge_records_by_user_created_at"),
		index.Fields("project_id", "created_at").
			StorageKey("recharge_records_by_project_created_at"),
	}
}

// Edges of the RechargeRecord.
func (RechargeRecord) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Field("user_id").
			Ref("recharge_records").
			Unique().
			Required(),
		edge.From("project", Project.Type).
			Field("project_id").
			Ref("recharge_records").
			Unique().
			Required(),
		edge.From("redemption_code", RedemptionCode.Type).
			Field("code_id").
			Ref("recharge_records").
			Unique().
			Required(),
	}
}

func (RechargeRecord) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entgql.QueryField(),
		entgql.RelayConnection(),
	}
}
