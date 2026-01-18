import { z } from 'zod';

// Schema for group ratio settings
export const groupRatioSchema = z.record(z.string(), z.number().nonnegative());

// Schema for user selectable groups
export const userSelectableGroupsSchema = z.record(z.string(), z.string());

// Schema for a single setting item
export const settingItemSchema = z.object({
    key: z.string(),
    value: z.record(z.string(), z.any()),
    description: z.string(),
    updated_at: z.string(),
});

// Schema for get settings response
export const getSystemSettingsResponseSchema = z.object({
    settings: z.array(settingItemSchema),
});

// Schema for update settings request
export const updateSystemSettingsRequestSchema = z.object({
    key: z.string(),
    value: z.record(z.string(), z.any()),
    description: z.string().optional(),
});

// Schema for update settings response
export const updateSystemSettingsResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    setting: settingItemSchema.optional(),
});

// TypeScript types
export type GroupRatio = z.infer<typeof groupRatioSchema>;
export type UserSelectableGroups = z.infer<typeof userSelectableGroupsSchema>;
export type SettingItem = z.infer<typeof settingItemSchema>;
export type GetSystemSettingsResponse = z.infer<typeof getSystemSettingsResponseSchema>;
export type UpdateSystemSettingsRequest = z.infer<typeof updateSystemSettingsRequestSchema>;
export type UpdateSystemSettingsResponse = z.infer<typeof updateSystemSettingsResponseSchema>;
