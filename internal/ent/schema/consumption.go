package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

// ConsumptionRecord holds the schema definition for the ConsumptionRecord entity.
type ConsumptionRecord struct {
	ent.Schema
}

func (ConsumptionRecord) Mixin() []ent.Mixin {
	return []ent.Mixin{
		TimeMixin{},
	}
}

// Fields of the ConsumptionRecord.
func (ConsumptionRecord) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id").Comment("User ID"),
		field.Int("project_id").Comment("Project ID"),
		field.String("model").Comment("Model used"),
		field.Int("quota").Comment("Quota consumed"),
		field.String("trace_id").Optional().Comment("Trace ID"),
		field.Int("prompt_tokens").Default(0).Comment("Prompt tokens"),
		field.Int("completion_tokens").Default(0).Comment("Completion tokens"),
		field.Int("total_tokens").Default(0).Comment("Total tokens"),
		field.String("content").Optional().Comment("Content snippet or hash"),
		field.Enum("type").Values("chat", "image").Default("chat").Comment("Type of consumption"),
	}
}

// Edges of the ConsumptionRecord.
func (ConsumptionRecord) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Field("user_id").
			Ref("consumption_records").
			Unique().
			Required(),
		edge.From("project", Project.Type).
			Field("project_id").
			Ref("consumption_records").
			Unique().
			Required(),
	}
}

func (ConsumptionRecord) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entgql.QueryField(),
		entgql.RelayConnection(),
	}
}
