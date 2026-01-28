package biz

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/looplj/axonhub/internal/ent"
	"github.com/looplj/axonhub/internal/ent/systemsettings"
)

// SettingsService provides business logic for system settings management.
type SettingsService struct {
	client *ent.Client
}

// NewSettingsService creates a new SettingsService.
func NewSettingsService(client *ent.Client) *SettingsService {
	return &SettingsService{client: client}
}

// GetSetting retrieves a specific setting by key.
func (s *SettingsService) GetSetting(ctx context.Context, key string) (*ent.SystemSettings, error) {
	return s.client.SystemSettings.Query().
		Where(systemsettings.KeyEQ(key)).
		First(ctx)
}

// GetAllSettings retrieves all settings.
func (s *SettingsService) GetAllSettings(ctx context.Context) ([]*ent.SystemSettings, error) {
	return s.client.SystemSettings.Query().All(ctx)
}

// UpdateSetting updates or creates a setting.
func (s *SettingsService) UpdateSetting(ctx context.Context, key string, value map[string]interface{}, description string) (*ent.SystemSettings, error) {
	// Validate the value based on the key
	if err := s.validateSettingValue(key, value); err != nil {
		return nil, fmt.Errorf("invalid setting value: %w", err)
	}

	// Try to find existing setting
	existing, err := s.GetSetting(ctx, key)
	if err != nil && !ent.IsNotFound(err) {
		return nil, err
	}

	// Update existing or create new
	if existing != nil {
		updated, err := existing.Update().
			SetValue(value).
			SetDescription(description).
			Save(ctx)
		return updated, err
	}

	created, err := s.client.SystemSettings.Create().
		SetKey(key).
		SetValue(value).
		SetDescription(description).
		Save(ctx)
	return created, err
}

// validateSettingValue validates the setting value based on the key.
func (s *SettingsService) validateSettingValue(key string, value map[string]interface{}) error {
	switch key {
	case "group_ratio":
		return s.validateGroupRatio(value)
	case "user_selectable_groups":
		return s.validateUserSelectableGroups(value)
	default:
		// Allow other settings without specific validation
		return nil
	}
}

// validateGroupRatio validates the group_ratio setting.
// Expected format: {"default": 2.0, "vip": 1.0, "svip": 0.5}
func (s *SettingsService) validateGroupRatio(value map[string]interface{}) error {
	if len(value) == 0 {
		return fmt.Errorf("group_ratio cannot be empty")
	}

	for group, ratio := range value {
		if group == "" {
			return fmt.Errorf("group name cannot be empty")
		}

		// Check if ratio is a number
		switch v := ratio.(type) {
		case float64:
			if v < 0 {
				return fmt.Errorf("ratio for group %s must be non-negative", group)
			}
		case int:
			if v < 0 {
				return fmt.Errorf("ratio for group %s must be non-negative", group)
			}
		case json.Number:
			f, err := v.Float64()
			if err != nil {
				return fmt.Errorf("invalid ratio for group %s: %w", group, err)
			}
			if f < 0 {
				return fmt.Errorf("ratio for group %s must be non-negative", group)
			}
		default:
			return fmt.Errorf("ratio for group %s must be a number", group)
		}
	}

	return nil
}

// validateUserSelectableGroups validates the user_selectable_groups setting.
// Expected format: {"default": "默认分组", "vip": "VIP分组", "svip": "SVIP分组"}
func (s *SettingsService) validateUserSelectableGroups(value map[string]interface{}) error {
	if len(value) == 0 {
		return fmt.Errorf("user_selectable_groups cannot be empty")
	}

	for group, label := range value {
		if group == "" {
			return fmt.Errorf("group name cannot be empty")
		}

		// Check if label is a string
		if _, ok := label.(string); !ok {
			return fmt.Errorf("label for group %s must be a string", group)
		}
	}

	return nil
}

// GetGroupRatio retrieves the group_ratio setting with default values.
func (s *SettingsService) GetGroupRatio(ctx context.Context) (map[string]float64, error) {
	setting, err := s.GetSetting(ctx, "group_ratio")
	if err != nil {
		if ent.IsNotFound(err) {
			// Return default values
			return map[string]float64{
				"default": 1.0,
			}, nil
		}
		return nil, err
	}

	// Convert map[string]interface{} to map[string]float64
	result := make(map[string]float64)
	for k, v := range setting.Value {
		switch val := v.(type) {
		case float64:
			result[k] = val
		case int:
			result[k] = float64(val)
		case json.Number:
			f, err := val.Float64()
			if err != nil {
				return nil, fmt.Errorf("invalid ratio for group %s: %w", k, err)
			}
			result[k] = f
		default:
			return nil, fmt.Errorf("invalid ratio type for group %s", k)
		}
	}

	return result, nil
}

// GetUserSelectableGroups retrieves the user_selectable_groups setting with default values.
func (s *SettingsService) GetUserSelectableGroups(ctx context.Context) (map[string]string, error) {
	setting, err := s.GetSetting(ctx, "user_selectable_groups")
	if err != nil {
		if ent.IsNotFound(err) {
			// Return default values
			return map[string]string{
				"default": "默认分组",
			}, nil
		}
		return nil, err
	}

	// Convert map[string]interface{} to map[string]string
	result := make(map[string]string)
	for k, v := range setting.Value {
		str, ok := v.(string)
		if !ok {
			return nil, fmt.Errorf("invalid label type for group %s", k)
		}
		result[k] = str
	}

	return result, nil
}
