import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import {
    GetSystemSettingsResponse,
    getSystemSettingsResponseSchema,
    UpdateSystemSettingsRequest,
    UpdateSystemSettingsResponse,
    updateSystemSettingsResponseSchema,
} from './schema';

// Query key factory
export const systemSettingsKeys = {
    all: ['system-settings'] as const,
    detail: (key: string) => [...systemSettingsKeys.all, key] as const,
};

// Fetch all system settings
async function fetchSystemSettings(): Promise<GetSystemSettingsResponse> {
    const response = await apiRequest<GetSystemSettingsResponse>('/admin/system/settings', {
        method: 'GET',
        requireAuth: true,
    });
    return getSystemSettingsResponseSchema.parse(response);
}

// Fetch a specific setting by key
async function fetchSystemSetting(key: string): Promise<GetSystemSettingsResponse> {
    const response = await apiRequest<GetSystemSettingsResponse>(`/admin/system/settings?key=${key}`, {
        method: 'GET',
        requireAuth: true,
    });
    return getSystemSettingsResponseSchema.parse(response);
}

// Update a system setting
async function updateSystemSetting(
    data: UpdateSystemSettingsRequest
): Promise<UpdateSystemSettingsResponse> {
    const response = await apiRequest<UpdateSystemSettingsResponse>('/admin/system/settings', {
        method: 'PUT',
        body: data,
        requireAuth: true,
    });
    return updateSystemSettingsResponseSchema.parse(response);
}

// Hook to query all system settings
export function useQuerySystemSettings() {
    return useQuery({
        queryKey: systemSettingsKeys.all,
        queryFn: fetchSystemSettings,
    });
}

// Hook to query a specific setting
export function useQuerySystemSetting(key: string) {
    return useQuery({
        queryKey: systemSettingsKeys.detail(key),
        queryFn: () => fetchSystemSetting(key),
        enabled: !!key,
    });
}

// Hook to update a system setting
export function useUpdateSystemSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateSystemSetting,
        onSuccess: (_data, variables) => {
            // Invalidate all settings queries to refetch
            queryClient.invalidateQueries({ queryKey: systemSettingsKeys.all });
            if (variables?.key) {
                queryClient.invalidateQueries({ queryKey: systemSettingsKeys.detail(variables.key) });
            }
        },
    });
}
