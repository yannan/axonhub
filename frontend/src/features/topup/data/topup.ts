import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { projectApi } from '@/lib/api-client';
import { TopupHistoryConnection } from './schema';

export function useTopupHistory(args: {
  page?: number;
  pageSize?: number;
  projectId?: string;
}) {
  const { handleError } = useErrorHandler();
  const { t } = useTranslation();

  return useQuery({
    queryKey: ['topupHistory', args],
    queryFn: async () => {
      try {
        const { page = 1, pageSize = 10, projectId } = args;
        
        if (!projectId) {
          return {
            totalCount: 0,
            edges: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
          };
        }

        const response = await projectApi.getRecharges(projectId, { page, page_size: pageSize });

        if (!response.success) {
          throw new Error('Failed to load history');
        }

        // Map to TopupHistoryConnection format
        const connection: TopupHistoryConnection = {
          totalCount: 0, // API doesn't return total count yet? Assuming handled by pagination or infinite scroll later
          edges: response.data.map(item => ({
            node: {
              id: item.id.toString(),
              amount: item.amount,
              type: 'CODE', // Defaulting to CODE as it's not in RechargeRecord yet or handled differently
              status: item.status.toUpperCase(),
              created_time: new Date(item.created_at).getTime() / 1000,
            },
            cursor: item.id.toString(),
          })),
          pageInfo: {
            hasNextPage: response.data.length === pageSize, // Simple heuristic
            hasPreviousPage: page > 1,
            startCursor: null,
            endCursor: null,
          },
        };

        return connection;
      } catch (error) {
        handleError(error, t('topup.history.loadError') || 'Failed to load history');
        throw error;
      }
    },
  });
}

export function useProjectSubscription(projectId?: string) {
  const { handleError } = useErrorHandler();
  const { t } = useTranslation();

  return useQuery({
    queryKey: ['projectSubscription', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      try {
        const response = await projectApi.getSubscription(projectId);
        if (!response.success) {
          throw new Error('Failed to load subscription');
        }
        return response.data;
      } catch (error) {
        handleError(error, t('topup.subscription.loadError') || 'Failed to load subscription');
        throw error;
      }
    },
    enabled: !!projectId,
  });
}

export function useProjectUsage(projectId?: string, page = 1, pageSize = 10) {
  const { handleError } = useErrorHandler();
  const { t } = useTranslation();

  return useQuery({
    queryKey: ['projectUsage', projectId, page, pageSize],
    queryFn: async () => {
      if (!projectId) return { success: false, data: [] };
      try {
        const response = await projectApi.getUsage(projectId, { page, page_size: pageSize });
        if (!response.success) {
          throw new Error('Failed to load usage');
        }
        return response;
      } catch (error) {
        handleError(error, t('topup.usage.loadError') || 'Failed to load usage');
        throw error;
      }
    },
    enabled: !!projectId,
  });
}

export function useRedeemCode() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ code, projectId }: { code: string; projectId?: string }) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      return projectApi.redeem(projectId, code);
    },
    onSuccess: () => {
      toast.success(t('topup.redeem.success'));
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Refresh user balance
      queryClient.invalidateQueries({ queryKey: ['projectSubscription'] }); // Refresh project subscription
      queryClient.invalidateQueries({ queryKey: ['topupHistory'] });
    },
    onError: (error: unknown) => {
      toast.error(t('topup.redeem.error'));
      handleError(error);
    },
  });
}
