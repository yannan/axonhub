import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useSelectedProjectId } from '@/stores/projectStore';
import {
  dashboardStatsResponseSchema,
  rechargeListResponseSchema,
  redeemResponseSchema,
  subscriptionResponseSchema,
  usageResponseSchema,
  type DashboardStatsData,
  type RechargeRecord,
  type RedeemResponse,
  type SubscriptionData,
  type UsageRecord,
} from './schema';

const buildProjectHeaders = (projectId: string | null) => (projectId ? { 'X-Project-ID': projectId } : {});

const mapRedeemError = (error: unknown, t: (key: string) => string) => {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.toLowerCase();

  if (message.includes('redemption code not found')) {
    return new Error(t('projectBilling.redeem.errors.notFound'));
  }
  if (message.includes('code is invalid') || message.includes('already used')) {
    return new Error(t('projectBilling.redeem.errors.invalid'));
  }
  if (message.includes('code is voided')) {
    return new Error(t('projectBilling.redeem.errors.voided'));
  }
  if (message.includes('code is expired')) {
    return new Error(t('projectBilling.redeem.errors.expired'));
  }
  if (message.includes('code usage limit')) {
    return new Error(t('projectBilling.redeem.errors.limit'));
  }

  return null;
};

export function useProjectSubscription() {
  const { handleError } = useErrorHandler();
  const projectId = useSelectedProjectId();

  return useQuery({
    queryKey: ['project-subscription', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<SubscriptionData> => {
      try {
        const data = await apiRequest('/project/billing/subscription', {
          requireAuth: true,
          headers: buildProjectHeaders(projectId),
        });
        const parsed = subscriptionResponseSchema.parse(data);
        return {
          quota: parsed.data.quota,
          usedQuota: parsed.data.used_quota,
        };
      } catch (error) {
        handleError(error, '获取项目额度');
        throw error;
      }
    },
  });
}

export function useProjectRecharges() {
  const { handleError } = useErrorHandler();
  const projectId = useSelectedProjectId();

  return useQuery({
    queryKey: ['project-recharges', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<RechargeRecord[]> => {
      try {
        const data = await apiRequest('/project/recharges', {
          requireAuth: true,
          headers: buildProjectHeaders(projectId),
        });
        return rechargeListResponseSchema.parse(data).data;
      } catch (error) {
        handleError(error, '获取充值记录');
        throw error;
      }
    },
  });
}

export function useRedeemCode() {
  const { handleError } = useErrorHandler();
  const { t } = useTranslation();
  const projectId = useSelectedProjectId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<RedeemResponse> => {
      try {
        const data = await apiRequest('/project/redemption/redeem', {
          method: 'POST',
          requireAuth: true,
          headers: buildProjectHeaders(projectId),
          body: { code },
        });
        return redeemResponseSchema.parse(data);
      } catch (error) {
        const mappedError = mapRedeemError(error, t);
        const errorToHandle = mappedError ?? error;
        if (errorToHandle && typeof errorToHandle === 'object') {
          (errorToHandle as { suppressToast?: boolean }).suppressToast = true;
        }
        handleError(errorToHandle, t('projectBilling.redeem.errorTitle'));
        throw errorToHandle;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-subscription', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-recharges', projectId] });
      toast.success(`兑换成功 +${data.quota.toLocaleString()}`);
    },
  });
}

export function useProjectDashboardStats() {
  const { handleError } = useErrorHandler();
  const projectId = useSelectedProjectId();

  return useQuery({
    queryKey: ['project-dashboard-stats', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<DashboardStatsData> => {
      try {
        const data = await apiRequest('/project/dashboard/stats', {
          requireAuth: true,
          headers: buildProjectHeaders(projectId),
        });
        return dashboardStatsResponseSchema.parse(data).data;
      } catch (error) {
        handleError(error, '获取项目统计数据');
        throw error;
      }
    },
    refetchInterval: 60000,
  });
}

export function useProjectUsage() {
  const { handleError } = useErrorHandler();
  const projectId = useSelectedProjectId();

  return useQuery({
    queryKey: ['project-usage', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<UsageRecord[]> => {
      try {
        const data = await apiRequest('/project/billing/usage', {
          requireAuth: true,
          headers: buildProjectHeaders(projectId),
        });
        return usageResponseSchema.parse(data).data;
      } catch (error) {
        handleError(error, '获取项目用量记录');
        throw error;
      }
    },
    refetchInterval: 60000,
  });
}
