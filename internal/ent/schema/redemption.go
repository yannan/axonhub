package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/looplj/axonhub/internal/ent/schema/schematype"
)

// RedemptionCode holds the schema definition for the RedemptionCode entity.
type RedemptionCode struct {
	ent.Schema
}

func (RedemptionCode) Mixin() []ent.Mixin {
	return []ent.Mixin{
		TimeMixin{},
		schematype.SoftDeleteMixin{},
	}
}

// Fields of the RedemptionCode.
func (RedemptionCode) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").Unique().Comment("Redemption code"),
		field.Int("quota").Comment("Quota value"),
		field.Enum("status").Values("active", "used", "disabled").Default("active"),
		field.Time("expires_at").Optional().Comment("Expiration time, empty means never expires"),
		field.Int("max_uses").Default(1).Comment("Maximum number of uses"),
		field.Int("used_times").Default(0).Comment("Used times"),
		field.Bool("voided").Default(false).Comment("Whether the code is voided"),
		field.Int("used_by").Optional().Comment("User ID who used the code"),
		field.Time("used_at").Optional().Comment("Time when used"),
	}
}

// Edges of the RedemptionCode.
func (RedemptionCode) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Field("used_by").
			Ref("redemption_codes").
			Unique(),
		edge.To("recharge_records", RechargeRecord.Type),
	}
}

func (RedemptionCode) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entgql.QueryField(),
		entgql.RelayConnection(),
		entgql.Mutations(entgql.MutationCreate(), entgql.MutationUpdate()),
	}
}
