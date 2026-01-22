'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { useState, useMemo, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useRatioSettings, useUpdateRatioSettings } from '../data/ratiosetting';

// Helper to validate JSON string
const isValidJson = (value: string) => {
  if (!value) return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const createFormSchema = (t: any) => z.object({
  ModelPrice: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  ModelRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  // CacheRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  CompletionRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  ImageRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  AudioRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  AudioCompletionRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  ExposeRatioEnabled: z.boolean(),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export function ModelRatioSettings() {
  const { t } = useTranslation();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const { data: ratioSettings, isLoading } = useRatioSettings();
  const { mutate: updateSettings } = useUpdateRatioSettings();

  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ModelPrice: '',
      ModelRatio: '',
      // CacheRatio: '',
      CompletionRatio: '',
      ImageRatio: '',
      AudioRatio: '',
      AudioCompletionRatio: '',
      ExposeRatioEnabled: false,
    },
  });

  // Load data from backend when available
  useEffect(() => {
    if (ratioSettings) {
      const formattedData = {
        ModelPrice: ratioSettings.ModelPrice || '{}',
        ModelRatio: ratioSettings.ModelRatio || '{}',
        // CacheRatio: ratioSettings.CacheRatio || '{}',
        CompletionRatio: ratioSettings.CompletionRatio || '{}',
        ImageRatio: '{}', // Not in RatioSettings interface, keep empty
        AudioRatio: '{}', // Not in RatioSettings interface, keep empty
        AudioCompletionRatio: '{}', // Not in RatioSettings interface, keep empty
        ExposeRatioEnabled: false, // Not in RatioSettings interface
      };

      form.reset(formattedData);
    }
  }, [ratioSettings, form]);

  function onSubmit(data: FormValues) {
    console.log('Submitted data:', data);
    updateSettings({
      ModelPrice: data.ModelPrice,
      ModelRatio: data.ModelRatio,
      // CacheRatio: data.CacheRatio,
      CompletionRatio: data.CompletionRatio,
    });
  }

  function onReset() {
    form.reset();
    setResetDialogOpen(false);
    toast.success(t('ratioSetting.resetSuccess'));
  }

  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-1'>
            <FormField
              control={form.control}
              name='ModelPrice'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.modelRatioSettings.modelFixedPrice')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.modelRatioSettings.modelPricePlaceholder')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.modelRatioSettings.modelPriceDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='ModelRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.modelRatio')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.modelRatioSettings.jsonMapModelToRatio')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name='CacheRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.modelRatioSettings.cacheRatio')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.modelRatioSettings.jsonMapModelToRatio')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <FormField
              control={form.control}
              name='CompletionRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.modelRatioSettings.completionRatioLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.modelRatioSettings.jsonMapModelToRatio')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('ratioSetting.modelRatioSettings.onlyCustomModels')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name='ImageRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.modelRatioSettings.imageRatioLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.modelRatioSettings.imageRatioPlaceholder')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.modelRatioSettings.imageRatioDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='AudioRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.modelRatioSettings.audioRatioLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.modelRatioSettings.audioRatioPlaceholder')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.modelRatioSettings.audioRatioDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='AudioCompletionRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.modelRatioSettings.audioCompletionRatioLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.modelRatioSettings.audioCompletionRatioPlaceholder')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.modelRatioSettings.audioCompletionRatioDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            {/* <FormField
              control={form.control}
              name='ExposeRatioEnabled'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4 max-w-3xl'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>{t('ratioSetting.modelRatioSettings.exposeRatio')}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            /> */}
          </div>

          <div className='flex items-center space-x-4'>
            <Button type='submit'>{t('ratioSetting.modelRatioSettings.saveModelRatioSettings')}</Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => setResetDialogOpen(true)}
            >
              {t('ratioSetting.modelRatioSettings.resetModelRatio')}
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={t('ratioSetting.modelRatioSettings.confirmReset')}
        desc={t('ratioSetting.modelRatioSettings.irreversibleAction')}
        confirmText={t('ratioSetting.modelRatioSettings.resetModelRatio')}
        cancelBtnText={t('ratioSetting.cancel')}
        destructive
        handleConfirm={onReset}
      />
    </div>
  );
}
