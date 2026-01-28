package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"

	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/server/biz"
)

type SettingsHandlersParams struct {
	fx.In

	SettingsService *biz.SettingsService
}

func NewSettingsHandlers(params SettingsHandlersParams) *SettingsHandlers {
	return &SettingsHandlers{
		SettingsService: params.SettingsService,
	}
}

type SettingsHandlers struct {
	SettingsService *biz.SettingsService
}

// GetSystemSettingsResponse represents the response for getting system settings.
type GetSystemSettingsResponse struct {
	Settings []*SettingItem `json:"settings"`
}

// SettingItem represents a single setting.
type SettingItem struct {
	Key         string                 `json:"key"`
	Value       map[string]interface{} `json:"value"`
	Description string                 `json:"description"`
	UpdatedAt   string                 `json:"updated_at"`
}

// UpdateSystemSettingsRequest represents the request for updating system settings.
type UpdateSystemSettingsRequest struct {
	Key         string                 `json:"key" binding:"required"`
	Value       map[string]interface{} `json:"value" binding:"required"`
	Description string                 `json:"description"`
}

// UpdateSystemSettingsResponse represents the response for updating system settings.
type UpdateSystemSettingsResponse struct {
	Success bool         `json:"success"`
	Message string       `json:"message"`
	Setting *SettingItem `json:"setting,omitempty"`
}

// GetSystemSettings retrieves all system settings or a specific setting by key.
// GET /admin/system/settings?key=group_ratio
func (h *SettingsHandlers) GetSystemSettings(c *gin.Context) {
	ctx := c.Request.Context()
	key := c.Query("key")

	if key != "" {
		// Get specific setting
		setting, err := h.SettingsService.GetSetting(ctx, key)
		if err != nil {
			if ent.IsNotFound(err) {
				JSONError(c, http.StatusNotFound, err)
				return
			}
			JSONError(c, http.StatusInternalServerError, err)
			return
		}

		c.JSON(http.StatusOK, GetSystemSettingsResponse{
			Settings: []*SettingItem{
				{
					Key:         setting.Key,
					Value:       setting.Value,
					Description: setting.Description,
					UpdatedAt:   setting.UpdatedAt.Format("2006-01-02 15:04:05"),
				},
			},
		})
		return
	}

	// Get all settings
	settings, err := h.SettingsService.GetAllSettings(ctx)
	if err != nil {
		JSONError(c, http.StatusInternalServerError, err)
		return
	}

	items := make([]*SettingItem, 0, len(settings))
	for _, setting := range settings {
		items = append(items, &SettingItem{
			Key:         setting.Key,
			Value:       setting.Value,
			Description: setting.Description,
			UpdatedAt:   setting.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, GetSystemSettingsResponse{
		Settings: items,
	})
}

// UpdateSystemSettings updates or creates a system setting.
// PUT /admin/system/settings
func (h *SettingsHandlers) UpdateSystemSettings(c *gin.Context) {
	ctx := c.Request.Context()
	var req UpdateSystemSettingsRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, UpdateSystemSettingsResponse{
			Success: false,
			Message: "Invalid request format: " + err.Error(),
		})
		return
	}

	setting, err := h.SettingsService.UpdateSetting(ctx, req.Key, req.Value, req.Description)
	if err != nil {
		c.JSON(http.StatusBadRequest, UpdateSystemSettingsResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, UpdateSystemSettingsResponse{
		Success: true,
		Message: "Setting updated successfully",
		Setting: &SettingItem{
			Key:         setting.Key,
			Value:       setting.Value,
			Description: setting.Description,
			UpdatedAt:   setting.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}
