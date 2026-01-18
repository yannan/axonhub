import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/use-error-handler';

const sensitiveWordTypeSchema = z.enum(['block', 'replace']);

const sensitiveWordSchema = z.object({
  id: z.number(),
  word: z.string(),
  type: sensitiveWordTypeSchema,
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.number().optional().nullable(),
});

const sensitiveWordListResponseSchema = z.object({
  data: z.array(sensitiveWordSchema),
});

const sensitiveWordResponseSchema = z.object({
  data: sensitiveWordSchema,
});

const deleteResponseSchema = z.object({
  status: z.string().optional(),
});

export type SensitiveWord = z.infer<typeof sensitiveWordSchema>;
export type SensitiveWordType = z.infer<typeof sensitiveWordTypeSchema>;

export interface AddSensitiveWordInput {
  word: string;
  type?: SensitiveWordType;
}

export function useSensitiveWords() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ['sensitive-words'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/admin/filter/words', { requireAuth: true });
        return sensitiveWordListResponseSchema.parse(data).data;
      } catch (error) {
        handleError(error, t('system.sensitiveWords.errors.load'));
        throw error;
      }
    },
  });
}

export function useAddSensitiveWord() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddSensitiveWordInput) => {
      try {
        const data = await apiRequest('/admin/filter/words', {
          method: 'POST',
          requireAuth: true,
          body: payload,
        });
        return sensitiveWordResponseSchema.parse(data).data;
      } catch (error) {
        handleError(error, t('system.sensitiveWords.errors.add'));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensitive-words'] });
      toast.success(t('system.sensitiveWords.messages.added'));
    },
  });
}

export function useDeleteSensitiveWord() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      try {
        const data = await apiRequest(`/admin/filter/words/${id}`, {
          method: 'DELETE',
          requireAuth: true,
        });
        return deleteResponseSchema.parse(data);
      } catch (error) {
        handleError(error, t('system.sensitiveWords.errors.delete'));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensitive-words'] });
      toast.success(t('system.sensitiveWords.messages.deleted'));
    },
  });
}
