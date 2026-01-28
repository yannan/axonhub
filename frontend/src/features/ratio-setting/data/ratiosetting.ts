import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { pricingApi, PricingUpsertRequest, systemSettingsApi } from '@/lib/api-client';

// Types
export interface RatioSettings {
  ModelPrice: string;
  ModelRatio: string;
  CompletionRatio: string;
  // CacheRatio: string;
  GroupRatio: string;
  UserUsableGroups: string;
  // GroupGroupRatio: string;
  ModelEnabled: string;
}

export interface UpdateRatioSettingsInput {
  ModelPrice?: string;
  ModelRatio?: string;
  CompletionRatio?: string;
  // CacheRatio?: string;
  GroupRatio?: string;
  UserUsableGroups?: string;
  // GroupGroupRatio?: string;
}

export function useModelRatioSettings() {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ['modelRatioSettings'],
    queryFn: async () => {
      try {
        const pricingResponse = await pricingApi.getPricing();

        if (!pricingResponse.success) {
          throw new Error('Failed to fetch pricing settings');
        }

        const modelPrice: Record<string, number> = {};
        const modelRatio: Record<string, number> = {};
        const completionRatio: Record<string, number> = {};
        const modelEnabled: Record<string, boolean> = {};

        pricingResponse.data.forEach(item => {
          modelPrice[item.model] = item.price;
          modelRatio[item.model] = item.quota;
          completionRatio[item.model] = item.completion_ratio;
          
          if (item.status) {
            modelEnabled[item.model] = item.status === 'enabled';
          } else {
            modelEnabled[item.model] = item.deleted_at === 0 || item.deleted_at === undefined;
          }
        });

        return {
          ModelPrice: JSON.stringify(modelPrice),
          ModelRatio: JSON.stringify(modelRatio),
          CompletionRatio: JSON.stringify(completionRatio),
          ModelEnabled: JSON.stringify(modelEnabled),
        };
      } catch (error) {
        console.warn('API error fetching pricing settings:', error);
        throw error;
      }
    },
  });
}

export function useGroupRatioSettings() {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ['groupRatioSettings'],
    queryFn: async () => {
      try {
        const settingsResponse = await systemSettingsApi.getSettings();

        // Extract GroupRatio from system settings
        let groupRatio = '{}';
        let userUsableGroups = '{}';
        // let groupGroupRatio = '{}';
        
        if (settingsResponse && settingsResponse.settings) {
          const groupRatioSetting = settingsResponse.settings.find(s => s.key === 'GroupRatio');
          if (groupRatioSetting) {
            groupRatio = typeof groupRatioSetting.value === 'string' 
              ? groupRatioSetting.value 
              : JSON.stringify(groupRatioSetting.value);
          }
          const userUsableGroupsSetting = settingsResponse.settings.find(s => s.key === 'user_selectable_groups');
          if (userUsableGroupsSetting) {
            userUsableGroups = typeof userUsableGroupsSetting.value === 'string'
              ? userUsableGroupsSetting.value
              : JSON.stringify(userUsableGroupsSetting.value);
          }
          
        }

        return {
          GroupRatio: groupRatio,
          UserUsableGroups: userUsableGroups,
          // GroupGroupRatio: groupGroupRatio,
        };
      } catch (error) {
        console.warn('API error fetching system settings:', error);
        throw error;
      }
    },
  });
}

export function useRatioSettings() {
  const modelSettings = useModelRatioSettings();
  const groupSettings = useGroupRatioSettings();

  const data = useMemo(() => {
    if (!modelSettings.data || !groupSettings.data) return undefined;
    return {
      ...modelSettings.data,
      ...groupSettings.data,
    } as RatioSettings;
  }, [modelSettings.data, groupSettings.data]);

  return {
    data,
    isLoading: modelSettings.isLoading || groupSettings.isLoading,
    error: modelSettings.error || groupSettings.error,
    isError: modelSettings.isError || groupSettings.isError,
  };
}

export function useUpdateRatioSettings() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (input: UpdateRatioSettingsInput) => {
      // Parse JSON inputs to get individual model settings
      const modelPrices = input.ModelPrice ? JSON.parse(input.ModelPrice) : {};
      const modelRatios = input.ModelRatio ? JSON.parse(input.ModelRatio) : {};
      const completionRatios = input.CompletionRatio ? JSON.parse(input.CompletionRatio) : {};

      // We need to iterate over models and update them one by one
      // or use a batch update if available. For now, we'll try to update
      // based on the input data structure.
      // Note: This is a simplified implementation. In a real scenario,
      // we might want to diff the changes or have a bulk update endpoint.
      
      const promises: Promise<unknown>[] = Object.keys(modelPrices).map(async (model) => {
        const data: PricingUpsertRequest = {
          model,
          type: 'quota', // Default type
          price: modelPrices[model] || 0,
          quota: modelRatios[model] || 0,
          completion_ratio: completionRatios[model] || 0,
        };
        return pricingApi.updatePricing(data);
      });

      // Update GroupRatio if present
      if (input.GroupRatio) {
        let value = input.GroupRatio;
        try {
          value = JSON.parse(input.GroupRatio);
        } catch {
          // keep as string if not valid JSON, though it should be validated by form
        }
        promises.push(systemSettingsApi.updateSettings({
          key: 'GroupRatio',
          value: value,
        }));
      }

      // Update UserUsableGroups if present
      if (input.UserUsableGroups) {
        let value = input.UserUsableGroups;
        try {
          value = JSON.parse(input.UserUsableGroups);
        } catch {
          // keep as string if not valid JSON
        }
        promises.push(systemSettingsApi.updateSettings({
          key: 'user_selectable_groups',
          value: value,
        }));
      }

      // if (input.GroupGroupRatio) {
      //   let value = input.GroupGroupRatio;
      //   try {
      //     value = JSON.parse(input.GroupGroupRatio);
      //   } catch {
      //     // keep as string if not valid JSON
      //   }
      //   promises.push(systemSettingsApi.updateSettings({
      //     key: 'content_safety_intercept_enabled',
      //     value: value,
      //   }));
      // }

      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      toast.success(i18n.t('ratioSetting.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['ratioSettings'] });
      queryClient.invalidateQueries({ queryKey: ['modelRatioSettings'] });
      queryClient.invalidateQueries({ queryKey: ['groupRatioSettings'] });
    },
    onError: (error) => {
      handleError(error);
    },
  });
}
