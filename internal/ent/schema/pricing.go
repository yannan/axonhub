package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/looplj/axonhub/internal/ent/schema/schematype"
)

// ModelPricing holds the schema definition for the ModelPricing entity.
type ModelPricing struct {
	ent.Schema
}

func (ModelPricing) Mixin() []ent.Mixin {
	return []ent.Mixin{
		TimeMixin{},
		schematype.SoftDeleteMixin{},
	}
}

// Fields of the ModelPricing.
func (ModelPricing) Fields() []ent.Field {
	return []ent.Field{
		field.String("model").Unique().Comment("Model identifier"),
		field.Enum("type").Values("quota", "connection").Default("quota").Comment("Billing type: quota or connection"),
		field.Enum("status").Values("enabled", "disabled").Default("enabled").Comment("Pricing status"),
		field.Float("quota").Default(1.0).Comment("Quota multiplier"),
		field.Float("completion_ratio").Default(1.0).Comment("Completion ratio multiplier"),
		field.Float("price").Default(0).Comment("Price per unit"),
	}
}

// Edges of the ModelPricing.
func (ModelPricing) Edges() []ent.Edge {
	return nil
}

func (ModelPricing) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entgql.QueryField(),
		entgql.RelayConnection(),
		entgql.Mutations(entgql.MutationCreate(), entgql.MutationUpdate()),
	}
}
