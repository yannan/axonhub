package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/schema/schematype"
	"github.com/looplj/axonhub/internal/ent/sensitiveword"
	"github.com/looplj/axonhub/internal/pkg/filter"
	"go.uber.org/fx"
)

type FilterHandlers struct {
	client *ent.Client
	engine *filter.ValidationEngine
}

type FilterHandlersParams struct {
	fx.In
	Client *ent.Client
	Engine *filter.ValidationEngine
}

func NewFilterHandlers(params FilterHandlersParams) *FilterHandlers {
	return &FilterHandlers{
		client: params.Client,
		engine: params.Engine,
	}
}

type AddWordRequest struct {
	Word string `json:"word" binding:"required"`
	Type string `json:"type" binding:"oneof=block replace"`
}

func (h *FilterHandlers) AddSensitiveWord(c *gin.Context) {
	var req AddWordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	swType := sensitiveword.TypeBlock
	if req.Type == "replace" {
		swType = sensitiveword.TypeReplace
	}

	ctx := schematype.SkipSoftDelete(c.Request.Context())
	existing, err := h.client.SensitiveWord.Query().
		Where(sensitiveword.WordEQ(req.Word)).
		Only(ctx)
	if err == nil {
		if existing.DeletedAt != 0 {
			word, err := h.client.SensitiveWord.UpdateOneID(existing.ID).
				SetDeletedAt(0).
				SetType(swType).
				Save(ctx)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			_ = h.engine.Reload(c.Request.Context())
			c.JSON(http.StatusOK, gin.H{"data": word})
			return
		}

		c.JSON(http.StatusConflict, gin.H{"error": "sensitive word already exists"})
		return
	}
	if !ent.IsNotFound(err) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	word, err := h.client.SensitiveWord.Create().
		SetWord(req.Word).
		SetType(swType).
		Save(c.Request.Context())
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reload engine
	// Ideally this should be done via event or distributed lock/pubsub
	// For now simple reload
	_ = h.engine.Reload(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{"data": word})
}

func (h *FilterHandlers) ListSensitiveWords(c *gin.Context) {
	words, err := h.client.SensitiveWord.Query().All(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": words})
}

func (h *FilterHandlers) DeleteSensitiveWord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	err = h.client.SensitiveWord.DeleteOneID(id).Exec(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	_ = h.engine.Reload(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
