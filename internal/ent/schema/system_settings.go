package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/looplj/axonhub/internal/ent/schema/schematype"
)

// SystemSettings holds the schema definition for the SystemSettings entity.
type SystemSettings struct {
	ent.Schema
}

func (SystemSettings) Mixin() []ent.Mixin {
	return []ent.Mixin{
		TimeMixin{},
		schematype.SoftDeleteMixin{},
	}
}

// Fields of the SystemSettings.
func (SystemSettings) Fields() []ent.Field {
	return []ent.Field{
		field.String("key").
			Unique().
			Comment("Setting key (e.g., 'group_ratio', 'user_selectable_groups')"),
		field.JSON("value", map[string]interface{}{}).
			Comment("Setting value as JSON"),
		field.String("description").
			Optional().
			Comment("Human-readable description of the setting"),
	}
}

// Edges of the SystemSettings.
func (SystemSettings) Edges() []ent.Edge {
	return nil
}

func (SystemSettings) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entgql.QueryField(),
		entgql.RelayConnection(),
		entgql.Mutations(entgql.MutationCreate(), entgql.MutationUpdate()),
	}
}
