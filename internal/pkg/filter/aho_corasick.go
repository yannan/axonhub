package filter

import (
	"context"
	"sync"

	"github.com/cloudflare/ahocorasick"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/sensitiveword"
)

type ValidationEngine struct {
	client *ent.Client
	ac     *ahocorasick.Matcher
	words  []string
	mu     sync.RWMutex
}

func NewValidationEngine(client *ent.Client) *ValidationEngine {
	return &ValidationEngine{
		client: client,
		ac:     ahocorasick.NewStringMatcher([]string{}),
		words:  []string{},
	}
}

func (e *ValidationEngine) Reload(ctx context.Context) error {
	words, err := e.client.SensitiveWord.Query().Where(sensitiveword.TypeEQ(sensitiveword.TypeBlock)).All(ctx)
	if err != nil {
		return err
	}

	patterns := make([]string, len(words))
	for i, w := range words {
		patterns[i] = w.Word
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	e.ac = ahocorasick.NewStringMatcher(patterns)
	e.words = patterns
	return nil
}

func (e *ValidationEngine) Validate(content string) (bool, string) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	matches := e.ac.MatchThreadSafe([]byte(content))
	if len(matches) > 0 {
		// Return the first matched word
		idx := matches[0]
		if idx < len(e.words) {
			return false, e.words[idx]
		}
		return false, ""
	}
	return true, ""
}
