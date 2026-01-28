'use client';

import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { RatioSettingTabs } from './components/tabs';

type RatioTabKey = 'ModelRatio' | 'GroupRatio' | 'ModelSettingsVisual' | 'ModelRatioNotSet' | 'UpstreamRatio';

interface RatioContentProps {
  initialTab?: RatioTabKey;
}

function RatioContent({ initialTab }: RatioContentProps) {
  return (
    <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
      <RatioSettingTabs initialTab={initialTab} />
    </div>
  );
}

interface RatioManagementProps {
  initialTab?: RatioTabKey;
}

export default function RatioManagement({ initialTab }: RatioManagementProps) {
  const { t } = useTranslation();

  return (
    <>
      <Header fixed></Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div id='system-title'>
            <h2 className='text-2xl font-bold tracking-tight'>{t('ratioSetting.title')}</h2>
            <p className='text-muted-foreground'>{t('ratioSetting.description')}</p>
          </div>
        </div>
        <RatioContent initialTab={initialTab} />
      </Main>
    </>
  );
}
