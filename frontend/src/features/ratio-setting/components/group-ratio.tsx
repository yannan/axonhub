'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { useMemo, useEffect } from 'react';

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
import { useGroupRatioSettings, useUpdateRatioSettings } from '../data/ratiosetting';

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

const isValidJsonArray = (value: string) => {
  if (!value) return true;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return false;
    return parsed.every((item) => typeof item === 'string');
  } catch {
    return false;
  }
};

const createFormSchema = (t: any) => z.object({
  GroupRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  UserUsableGroups: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  // GroupGroupRatio: z.string().refine(isValidJson, { message: t('ratioSetting.invalidJson') }),
  // 'group_ratio_setting.group_special_usable_group': z.string().refine(isValidJson, {
  //   message: t('ratioSetting.invalidJson'),
  // }),
  // AutoGroups: z.string().refine(isValidJsonArray, {
  //   message: t('ratioSetting.groupRatioSettings.invalidJsonArray'),
  // }),
  // DefaultUseAutoGroup: z.boolean(),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export function GroupRatioSettings() {
  const { t } = useTranslation();

  const { data: ratioSettings } = useGroupRatioSettings();
  const { mutate: updateSettings } = useUpdateRatioSettings();

  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      GroupRatio: '',
      UserUsableGroups: '',
      // GroupGroupRatio: '',
      // 'group_ratio_setting.group_special_usable_group': '',
      // AutoGroups: '',
      // DefaultUseAutoGroup: false,
    },
  });

  // Load data from backend/mock when available
  useEffect(() => {
    if (ratioSettings) {
      const formattedData = {
        GroupRatio: ratioSettings.GroupRatio || '{}',
        UserUsableGroups: ratioSettings.UserUsableGroups || '{}',
        // GroupGroupRatio: ratioSettings.GroupGroupRatio || '{}',
        // 'group_ratio_setting.group_special_usable_group': '{}',
        // AutoGroups: '[]',
        // DefaultUseAutoGroup: false,
      };

      form.reset(formattedData);
    }
  }, [ratioSettings, form]);

  function onSubmit(data: FormValues) {
    console.log('Submitted data:', data);
    updateSettings({
      GroupRatio: data.GroupRatio,
      UserUsableGroups: data.UserUsableGroups,
      // GroupGroupRatio: data.GroupGroupRatio,
    });
  }

  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-1'>
            <FormField
              control={form.control}
              name='GroupRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.groupRatioSettings.groupRatio')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.groupRatioSettings.jsonMapGroupToRatio')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.groupRatioSettings.groupRatioDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='UserUsableGroups'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.groupRatioSettings.userUsableGroups')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.groupRatioSettings.jsonMapGroupToDesc')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.groupRatioSettings.userUsableGroupsDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name='GroupGroupRatio'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.groupRatioSettings.groupGroupRatio')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.groupRatioSettings.jsonText')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.groupRatioSettings.groupGroupRatioDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='group_ratio_setting.group_special_usable_group'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.groupRatioSettings.groupSpecialUsableGroup')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.groupRatioSettings.jsonText')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('ratioSetting.groupRatioSettings.groupSpecialUsableGroupDesc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='AutoGroups'
              render={({ field }) => (
                <FormItem className='max-w-3xl'>
                  <FormLabel>{t('ratioSetting.groupRatioSettings.autoGroups')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ratioSetting.groupRatioSettings.jsonText')}
                      className='min-h-[150px] font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='DefaultUseAutoGroup'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4 max-w-3xl'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      {t('ratioSetting.groupRatioSettings.defaultUseAutoGroup')}
                    </FormLabel>
                    <FormDescription>
                      {t('ratioSetting.groupRatioSettings.defaultUseAutoGroupDesc')}
                    </FormDescription>
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

          <Button type='submit'>{t('ratioSetting.groupRatioSettings.saveGroupRatioSettings')}</Button>
        </form>
      </Form>
    </div>
  );
}
