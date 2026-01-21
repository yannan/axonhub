import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { apiRequest, API_BASE_URL } from '@/lib/api-client';
import { getTokenFromStorage } from '@/stores/authStore';
import { useErrorHandler } from '@/hooks/use-error-handler';

const consumptionStatsRowSchema = z.object({
  project_id: z.number(),
  model: z.string(),
  date: z.string(),
  count: z.number(),
  quota: z.number(),
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
});

const consumptionStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(consumptionStatsRowSchema),
  pagination: z.object({
    total: z.coerce.number(),
    offset: z.coerce.number(),
    limit: z.coerce.number(),
  }),
});

export type ConsumptionStatsRow = z.infer<typeof consumptionStatsRowSchema>;
export type ConsumptionStatsPagination = z.infer<typeof consumptionStatsResponseSchema>['pagination'];

export interface ConsumptionStatsFilters {
  projectId?: number;
  model?: string;
  startDate?: string;
  endDate?: string;
}

const buildQueryParams = (filters: ConsumptionStatsFilters, pagination?: { offset?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters.projectId) {
    params.set('project_id', String(filters.projectId));
  }
  if (filters.model) {
    params.set('model', filters.model);
  }
  if (filters.startDate) {
    params.set('start_date', filters.startDate);
  }
  if (filters.endDate) {
    params.set('end_date', filters.endDate);
  }
  if (pagination?.offset != null) {
    params.set('offset', String(pagination.offset));
  }
  if (pagination?.limit != null) {
    params.set('limit', String(pagination.limit));
  }
  return params.toString();
};

export function useAdminConsumptionStats(
  filters: ConsumptionStatsFilters,
  pagination?: { offset?: number; limit?: number }
) {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ['admin-consumption-stats', filters, pagination],
    queryFn: async () => {
      try {
        const query = buildQueryParams(filters, pagination);
        const endpoint = query ? `/admin/billing/stats?${query}` : '/admin/billing/stats';
        const data = await apiRequest(endpoint, { requireAuth: true });
        const parsed = consumptionStatsResponseSchema.parse(data);
        return {
          records: parsed.data,
          pagination: parsed.pagination,
        };
      } catch (error) {
        handleError(error, t('system.billingStats.errors.load'));
        throw error;
      }
    },
  });
}

export async function downloadConsumptionStats(filters: ConsumptionStatsFilters): Promise<Blob> {
  const query = buildQueryParams(filters);
  const endpoint = query ? `/admin/billing/export?${query}` : '/admin/billing/export';
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {};
  const token = getTokenFromStorage();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    let message = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const payload = (await response.json()) as { error?: string | { message?: string }; message?: string };
      if (payload?.message) {
        message = payload.message;
      } else if (payload?.error) {
        message = typeof payload.error === 'string' ? payload.error : payload.error?.message || message;
      }
    } catch {
      // ignore non-JSON payload
    }
    throw new Error(message);
  }

  return response.blob();
}
