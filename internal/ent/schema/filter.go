package schema

import (
	"entgo.io/contrib/entgql"
	"entgo.io/ent"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"github.com/looplj/axonhub/internal/ent/schema/schematype"
)

// SensitiveWord holds the schema definition for the SensitiveWord entity.
type SensitiveWord struct {
	ent.Schema
}

func (SensitiveWord) Mixin() []ent.Mixin {
	return []ent.Mixin{
		TimeMixin{},
		schematype.SoftDeleteMixin{},
	}
}

// Fields of the SensitiveWord.
func (SensitiveWord) Fields() []ent.Field {
	return []ent.Field{
		field.String("word").Unique().Comment("Sensitive word"),
		field.Enum("type").Values("block", "replace").Default("block").Comment("Action type"),
	}
}

// Edges of the SensitiveWord.
func (SensitiveWord) Edges() []ent.Edge {
	return nil
}

func (SensitiveWord) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entgql.QueryField(),
		entgql.RelayConnection(),
		entgql.Mutations(entgql.MutationCreate(), entgql.MutationUpdate()),
	}
}
