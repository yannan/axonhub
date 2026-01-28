import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { redemptionApi, RedemptionGenerateResponse, RedemptionCode } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useErrorHandler } from '@/hooks/use-error-handler';
import {
  Redemption,
  RedemptionList,
  CreateRedemptionInput,
  redemptionListSchema,
} from './schema';

// Query hooks
export function useRedemptions(
  params?: {
    page?: number;
    page_size?: number;
    keyword?: string;
  },
  options?: {
    disableAutoFetch?: boolean;
  }
) {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ['redemptions', params],
    queryFn: async () => {
      try {
        const data = await redemptionApi.getRedemptions(params);
        return redemptionListSchema.parse(data);
      } catch (error) {
        handleError(error, t('redemptions.messages.loadError'));
        throw error;
      }
    },
    enabled: !options?.disableAutoFetch,
  });
}

// Mutation hooks
export function useCreateRedemption() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRedemptionInput) => {
      return await redemptionApi.generate(input);
    },
    onSuccess: (data: RedemptionGenerateResponse) => {
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      toast.success(t('redemptions.messages.createSuccess'));
      // Show generated codes?
      if (data.data && data.data.length > 0) {
        // Maybe copy to clipboard or show in a dialog
        // For now just toast
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${t('redemptions.messages.createError')}: ${errorMessage}`);
    },
  });
}

export function useVoidRedemption() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await redemptionApi.void(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      toast.success(t('redemptions.messages.updateSuccess'));
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${t('redemptions.messages.updateError')}: ${errorMessage}`);
    },
  });
}

export function useDeleteRedemption() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await redemptionApi.delete([id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      toast.success(t('redemptions.messages.deleteSuccess'));
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${t('redemptions.messages.deleteError')}: ${errorMessage}`);
    },
  });
}
