'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AboutSettings } from './about-settings';
import { BrandSettings } from './brand-settings';
import { BillingStatsSettings } from './billing-stats-settings';
import { SensitiveWordsSettings } from './sensitive-words-settings';
import { RedemptionSettings } from './redemption-settings';
import { RetrySettings } from './retry-settings';
import { StorageSettings } from './storage-settings';
import { GroupRatioSettings } from '@/features/system-settings/components/group-ratio-settings';
import { UserSelectableGroupsSettings } from '@/features/system-settings/components/user-selectable-groups-settings';

type SystemTabKey =
  | 'brand'
  | 'storage'
  | 'retry'
  | 'redemption'
  | 'billing'
  | 'sensitive-words'
  | 'about'
  | 'group-settings';

interface SystemSettingsTabsProps {
  initialTab?: SystemTabKey;
}

export function SystemSettingsTabs({ initialTab }: SystemSettingsTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SystemTabKey>('brand');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SystemTabKey)} className='w-full'>
      <TabsList className='shadow-soft border-border bg-background grid w-full grid-cols-8 rounded-2xl border'>
        <TabsTrigger value='brand' data-value='brand'>
          {t('system.tabs.brand')}
        </TabsTrigger>
        <TabsTrigger value='retry' data-value='retry'>
          {t('system.tabs.retry')}
        </TabsTrigger>
        <TabsTrigger value='storage' data-value='storage'>
          {t('system.tabs.storage')}
        </TabsTrigger>
        <TabsTrigger value='redemption' data-value='redemption'>
          {t('system.tabs.redemption')}
        </TabsTrigger>
        <TabsTrigger value='billing' data-value='billing'>
          {t('system.tabs.billing')}
        </TabsTrigger>
        <TabsTrigger value='sensitive-words' data-value='sensitive-words'>
          {t('system.tabs.sensitiveWords')}
        </TabsTrigger>
        <TabsTrigger value='group-settings' data-value='group-settings'>
          分组设置
        </TabsTrigger>
        <TabsTrigger value='about' data-value='about'>
          {t('system.tabs.about')}
        </TabsTrigger>
      </TabsList>
      <div className='shadow-soft border-border bg-card mt-6 rounded-2xl border p-6'>
        <TabsContent value='brand' className='mt-0 p-0'>
          <BrandSettings />
        </TabsContent>
        <TabsContent value='storage' className='mt-0 p-0'>
          <StorageSettings />
        </TabsContent>
        <TabsContent value='retry' className='mt-0 p-0'>
          <RetrySettings />
        </TabsContent>
        <TabsContent value='redemption' className='mt-0 p-0'>
          <RedemptionSettings />
        </TabsContent>
        <TabsContent value='billing' className='mt-0 p-0'>
          <BillingStatsSettings />
        </TabsContent>
        <TabsContent value='sensitive-words' className='mt-0 p-0'>
          <SensitiveWordsSettings />
        </TabsContent>
        <TabsContent value='group-settings' className='mt-0 p-0'>
          <div className='space-y-6'>
            <div>
              <h3 className='text-lg font-semibold'>分组倍率设置</h3>
              <p className='text-sm text-muted-foreground'>配置不同用户分组的计费倍率</p>
            </div>
            <GroupRatioSettings />
            <div className='border-t pt-6'>
              <h3 className='text-lg font-semibold'>用户可选分组</h3>
              <p className='text-sm text-muted-foreground'>配置用户创建项目时可选择的分组</p>
            </div>
            <UserSelectableGroupsSettings />
          </div>
        </TabsContent>
        <TabsContent value='about' className='mt-0 p-0'>
          <AboutSettings />
        </TabsContent>
      </div>
    </Tabs>
  );
}
