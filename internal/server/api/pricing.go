package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/modelpricing"
	"github.com/looplj/axonhub/internal/ent/schema/schematype"
	"github.com/looplj/axonhub/internal/pkg/billing"
)

type PricingHandlers struct {
	client         *ent.Client
	billingService *billing.BillingService
}

func NewPricingHandlers(client *ent.Client, billingService *billing.BillingService) *PricingHandlers {
	return &PricingHandlers{
		client:         client,
		billingService: billingService,
	}
}

// ListPrices - List all model prices
func (h *PricingHandlers) ListPrices(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	ctx := c.Request.Context()
	if c.Query("include_deleted") == "true" {
		ctx = schematype.SkipSoftDelete(ctx)
	}

	prices, err := h.client.ModelPricing.Query().All(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": prices})
}

// CreatePrice - Create a new model price
func (h *PricingHandlers) CreatePrice(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	var req struct {
		Model           string            `json:"model" binding:"required"`
		Type            modelpricing.Type `json:"type"`
		Quota           float64           `json:"quota"`
		Price           float64           `json:"price"`
		CompletionRatio float64           `json:"completion_ratio"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default type if not set
	if req.Type == "" {
		req.Type = modelpricing.TypeQuota
	}

	builder := h.client.ModelPricing.Create().
		SetModel(req.Model).
		SetType(req.Type).
		SetQuota(req.Quota).
		SetPrice(req.Price).
		SetCompletionRatio(req.CompletionRatio)

	price, err := builder.Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.billingService.InvalidateModelPricingCache(c.Request.Context(), req.Model)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": price})
}

// CreatePricesBatch - Create model prices in batch
func (h *PricingHandlers) CreatePricesBatch(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	var req struct {
		Items []struct {
			Model           string            `json:"model" binding:"required"`
			Type            modelpricing.Type `json:"type"`
			Quota           float64           `json:"quota"`
			Price           float64           `json:"price"`
			CompletionRatio float64           `json:"completion_ratio"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "items must not be empty"})
		return
	}

	for _, item := range req.Items {
		if item.Model == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "model is required"})
			return
		}
	}

	ctx := c.Request.Context()
	tx, err := h.client.Tx(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	builders := make([]*ent.ModelPricingCreate, 0, len(req.Items))
	models := make([]string, 0, len(req.Items))

	for _, item := range req.Items {
		if item.Type == "" {
			item.Type = modelpricing.TypeQuota
		}

		builder := tx.ModelPricing.Create().
			SetModel(item.Model).
			SetType(item.Type).
			SetQuota(item.Quota).
			SetPrice(item.Price).
			SetCompletionRatio(item.CompletionRatio)
		builders = append(builders, builder)
		models = append(models, item.Model)
	}

	prices, err := tx.ModelPricing.CreateBulk(builders...).Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, model := range models {
		h.billingService.InvalidateModelPricingCache(ctx, model)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": prices})
}

// UpdatePrice - Update an existing model price
func (h *PricingHandlers) UpdatePrice(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	var req struct {
		Model           string            `json:"model" binding:"required"`
		Type            modelpricing.Type `json:"type"`
		Quota           float64           `json:"quota"`
		Price           float64           `json:"price"`
		CompletionRatio float64           `json:"completion_ratio"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the pricing entry logic.
	// Since 'model' is unique, we find by model.
	// But Ent update usually works by ID. We need to query first or assume ID is passed?
	// The requirement is "Update", usually by Model name if that's the key.
	// Let's find ID by model first.

	p, err := h.client.ModelPricing.Query().Where(modelpricing.ModelEQ(req.Model)).Only(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "model pricing not found"})
		return
	}

	builder := h.client.ModelPricing.UpdateOne(p)

	// Only update fields if provided? Or replace?
	// For simplicity, update all provided fields (or set defaults if zero/empty which might be tricky).
	// Let's assume we update all.

	if req.Type != "" {
		builder.SetType(req.Type)
	}
	// floats default to 0, so we might zero them out if we're not careful.
	// Ideally we should use pointers or check for presence.
	// Assuming simple full update for now.
	builder.SetQuota(req.Quota)
	builder.SetPrice(req.Price)
	builder.SetCompletionRatio(req.CompletionRatio)
	updated, err := builder.Save(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.billingService.InvalidateModelPricingCache(c.Request.Context(), req.Model)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated})
}

// DeletePrice - Delete a model price
func (h *PricingHandlers) DeletePrice(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	model := c.Param("model")
	if model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "model parameter required"})
		return
	}

	ctx := schematype.SkipSoftDelete(c.Request.Context())

	// Delete by model name
	p, err := h.client.ModelPricing.Query().Where(modelpricing.ModelEQ(model)).Only(ctx)
	if ent.IsNotFound(err) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err = h.client.ModelPricing.DeleteOne(p).Exec(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.billingService.InvalidateModelPricingCache(ctx, model)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DisablePrice - Disable a model price (soft delete)
func (h *PricingHandlers) DisablePrice(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	model := c.Param("model")
	if model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "model parameter required"})
		return
	}

	ctx := c.Request.Context()
	p, err := h.client.ModelPricing.Query().Where(modelpricing.ModelEQ(model)).Only(ctx)
	if ent.IsNotFound(err) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	updated, err := h.client.ModelPricing.UpdateOneID(p.ID).
		SetDeletedAt(int(time.Now().Unix())).
		Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.billingService.InvalidateModelPricingCache(ctx, model)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated})
}

// EnablePrice - Restore a soft-deleted model price
func (h *PricingHandlers) EnablePrice(c *gin.Context) {
	if _, ok := requireOwner(c); !ok {
		return
	}

	model := c.Param("model")
	if model == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "model parameter required"})
		return
	}

	ctx := schematype.SkipSoftDelete(c.Request.Context())
	p, err := h.client.ModelPricing.Query().Where(modelpricing.ModelEQ(model)).Only(ctx)
	if ent.IsNotFound(err) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if p.DeletedAt == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": p})
		return
	}

	updated, err := h.client.ModelPricing.UpdateOneID(p.ID).
		SetDeletedAt(0).
		Save(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.billingService.InvalidateModelPricingCache(ctx, model)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated})
}
