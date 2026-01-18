import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/use-error-handler';

const redemptionCodeSchema = z.object({
  id: z.number(),
  code: z.string(),
  quota: z.number(),
  status: z.enum(['active', 'used', 'disabled']),
  expires_at: z.string().nullable().optional(),
  max_uses: z.number().nullable().optional(),
  used_times: z.number().nullable().optional(),
  voided: z.boolean().optional(),
  used_by: z.number().nullable().optional(),
});

const redemptionListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(redemptionCodeSchema),
});

const redemptionGenerateResponseSchema = z.object({
  data: z.array(z.string()),
});

const successResponseSchema = z.object({
  success: z.boolean().optional(),
});

export type RedemptionCode = z.infer<typeof redemptionCodeSchema>;
export type RedemptionStatus = z.infer<typeof redemptionCodeSchema>['status'];

export interface RedemptionFilters {
  code?: string;
  status?: RedemptionStatus;
  voided?: boolean;
  usedBy?: number;
  expired?: boolean;
  offset?: number;
  limit?: number;
}

export interface RedemptionGenerateRequest {
  count: number;
  quota: number;
  max_uses?: number | null;
  expires_at?: string | null;
  export?: boolean;
}

const buildQueryParams = (filters: RedemptionFilters) => {
  const params = new URLSearchParams();
  if (filters.code) {
    params.set('code', filters.code);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.voided !== undefined) {
    params.set('voided', String(filters.voided));
  }
  if (filters.usedBy !== undefined) {
    params.set('used_by', String(filters.usedBy));
  }
  if (filters.expired !== undefined) {
    params.set('expired', String(filters.expired));
  }
  if (filters.offset !== undefined) {
    params.set('offset', String(filters.offset));
  }
  if (filters.limit !== undefined) {
    params.set('limit', String(filters.limit));
  }
  return params.toString();
};

export function useAdminRedemptions(filters: RedemptionFilters) {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ['admin-redemptions', filters],
    queryFn: async () => {
      try {
        const query = buildQueryParams(filters);
        const endpoint = query ? `/admin/redemption?${query}` : '/admin/redemption';
        const data = await apiRequest(endpoint, { requireAuth: true });
        return redemptionListResponseSchema.parse(data).data;
      } catch (error) {
        handleError(error, t('system.redemption.errors.load'));
        throw error;
      }
    },
  });
}

export function useGenerateRedemptions() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RedemptionGenerateRequest) => {
      try {
        const data = await apiRequest('/admin/redemption/generate', {
          method: 'POST',
          requireAuth: true,
          body: payload,
        });
        return redemptionGenerateResponseSchema.parse(data);
      } catch (error) {
        handleError(error, t('system.redemption.errors.generate'));
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      toast.success(t('system.redemption.messages.generated', { count: data.data.length }));
    },
  });
}

export function useVoidRedemption() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      try {
        const data = await apiRequest(`/admin/redemption/${id}/void`, {
          method: 'POST',
          requireAuth: true,
        });
        return successResponseSchema.parse(data);
      } catch (error) {
        handleError(error, t('system.redemption.errors.void'));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      toast.success(t('system.redemption.messages.voided'));
    },
  });
}

export function useDeleteRedemptions() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      try {
        const data = await apiRequest('/admin/redemption/delete', {
          method: 'POST',
          requireAuth: true,
          body: { ids },
        });
        return successResponseSchema.parse(data);
      } catch (error) {
        handleError(error, t('system.redemption.errors.delete'));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      toast.success(t('system.redemption.messages.deleted'));
    },
  });
}
