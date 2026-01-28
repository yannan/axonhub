'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ModelRatioSettings } from './modelratio-settings';
import { GroupRatioSettings } from './group-ratio';
import ModelSettingsVisualEditor from './modelsettings-visual';
import ModelRatioNotSetEditor from './modelratio-notset';
import UpstreamRatioSync from './upstream-ratio';

import { useRatioSettings } from '../data/ratiosetting';

type RatioTabKey = 'ModelRatio' | 'GroupRatio' | 'ModelSettingsVisual' | 'ModelRatioNotSet' | 'UpstreamRatio';

interface RatioSettingTabsProps {
  initialTab?: RatioTabKey;
}

export function RatioSettingTabs({ initialTab }: RatioSettingTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<RatioTabKey>('ModelRatio');

  const { data: ratioSettings, isLoading } = useRatioSettings();

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const options = ratioSettings || {
    ModelPrice: '{}',
    ModelRatio: '{}',
    CompletionRatio: '{}',
    CacheRatio: '{}',
    GroupRatio: '{}',
    UserUsableGroups: '{}',
    // GroupGroupRatio: '{}',
    ModelEnabled: '{}',
  };

  const refresh = () => {
    // React Query handles invalidation automatically
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as RatioTabKey)} className='w-full'>
      <TabsList className='shadow-soft border-border bg-background grid w-full grid-cols-5 rounded-2xl border'>
        <TabsTrigger value='ModelRatio' data-value='ModelRatio'>
          {t('ratioSetting.tabs.ModelRatio')}
        </TabsTrigger>
        <TabsTrigger value='GroupRatio' data-value='GroupRatio'>
          {t('ratioSetting.tabs.GroupRatio')}
        </TabsTrigger>
        <TabsTrigger value='ModelSettingsVisual' data-value='ModelSettingsVisual'>
          {t('ratioSetting.tabs.ModelSettingsVisual')}
        </TabsTrigger>
        <TabsTrigger value='ModelRatioNotSet' data-value='ModelRatioNotSet'>
          {t('ratioSetting.tabs.ModelRatioNotSet')}
        </TabsTrigger>
        <TabsTrigger value='UpstreamRatio' data-value='UpstreamRatio'>
          {t('ratioSetting.tabs.UpstreamRatio')}
        </TabsTrigger>
      </TabsList>
      <div className='shadow-soft border-border bg-card mt-6 rounded-2xl border p-6'>
        <TabsContent value='ModelRatio' className='mt-0 p-0'>
          <ModelRatioSettings />
        </TabsContent>
        <TabsContent value='ModelSettingsVisual' className='mt-0 p-0'>
          <ModelSettingsVisualEditor options={options} refresh={refresh} />
        </TabsContent>
        <TabsContent value='GroupRatio' className='mt-0 p-0'>
          <GroupRatioSettings />
        </TabsContent>
        <TabsContent value='ModelRatioNotSet' className='mt-0 p-0'>
          <ModelRatioNotSetEditor options={options} refresh={refresh} />
        </TabsContent>
        <TabsContent value='UpstreamRatio' className='mt-0 p-0'>
          <UpstreamRatioSync options={options} refresh={refresh} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
