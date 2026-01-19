import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/use-error-handler';
import {
    pricingListResponseSchema,
    pricingResponseSchema,
    deleteResponseSchema,
    type Pricing,
    type CreatePricingInput,
    type UpdatePricingInput,
} from './schema';

/**
 * Hook to fetch all pricing records
 */
export function useQueryPricing() {
    const { handleError } = useErrorHandler();

    return useQuery({
        queryKey: ['pricing'],
        queryFn: async (): Promise<Pricing[]> => {
            try {
                const data = await apiRequest('/admin/pricing', {
                    requireAuth: true,
                });
                const parsed = pricingListResponseSchema.parse(data);
                return parsed.data;
            } catch (error) {
                handleError(error, 'Failed to fetch pricing');
                throw error;
            }
        },
    });
}

/**
 * Hook to create a new pricing record
 */
export function useCreatePricing() {
    const { handleError } = useErrorHandler();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreatePricingInput): Promise<Pricing> => {
            try {
                const data = await apiRequest('/admin/pricing', {
                    method: 'POST',
                    requireAuth: true,
                    body: input,
                });
                return pricingResponseSchema.parse(data).data;
            } catch (error) {
                handleError(error, t('pricing.errors.createFailed'));
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing'] });
            toast.success(t('pricing.messages.createSuccess'));
        },
    });
}

/**
 * Hook to update an existing pricing record
 */
export function useUpdatePricing() {
    const { handleError } = useErrorHandler();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdatePricingInput): Promise<Pricing> => {
            try {
                const data = await apiRequest('/admin/pricing', {
                    method: 'PUT',
                    requireAuth: true,
                    body: input,
                });
                return pricingResponseSchema.parse(data).data;
            } catch (error) {
                handleError(error, t('pricing.errors.updateFailed'));
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing'] });
            toast.success(t('pricing.messages.updateSuccess'));
        },
    });
}

/**
 * Hook to delete a pricing record
 */
export function useDeletePricing() {
    const { handleError } = useErrorHandler();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (model: string): Promise<void> => {
            try {
                const data = await apiRequest(`/admin/pricing/${encodeURIComponent(model)}`, {
                    method: 'DELETE',
                    requireAuth: true,
                });
                deleteResponseSchema.parse(data);
            } catch (error) {
                handleError(error, t('pricing.errors.deleteFailed'));
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing'] });
            toast.success(t('pricing.messages.deleteSuccess'));
        },
    });
}

/**
 * Hook to disable a pricing record
 */
export function useDisablePricing() {
    const { handleError } = useErrorHandler();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (model: string): Promise<void> => {
            try {
                const data = await apiRequest(`/admin/pricing/${encodeURIComponent(model)}/disable`, {
                    method: 'PUT',
                    requireAuth: true,
                });
                deleteResponseSchema.parse(data);
            } catch (error) {
                handleError(error, t('pricing.errors.disableFailed'));
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing'] });
            toast.success(t('pricing.messages.disableSuccess'));
        },
    });
}

/**
 * Hook to enable a pricing record
 */
export function useEnablePricing() {
    const { handleError } = useErrorHandler();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (model: string): Promise<void> => {
            try {
                const data = await apiRequest(`/admin/pricing/${encodeURIComponent(model)}/enable`, {
                    method: 'PUT',
                    requireAuth: true,
                });
                deleteResponseSchema.parse(data);
            } catch (error) {
                handleError(error, t('pricing.errors.enableFailed'));
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing'] });
            toast.success(t('pricing.messages.enableSuccess'));
        },
    });
}
