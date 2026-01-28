'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { RechargeCard } from './components/recharge-card';
import { TopupHistory } from './components/topup-history';
import { useSelectedProjectId } from '@/stores/projectStore';

export default function TopupManagement() {
  const { t } = useTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const projectId = useSelectedProjectId();

  return (
    <>
      <Header fixed />
      <Main>
        <div className="mb-2 flex flex-wrap items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('topup.title')}</h2>
            <p className="text-muted-foreground">{t('topup.description')}</p>
          </div>
        </div>
        <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12">
          <RechargeCard onOpenHistory={() => setHistoryOpen(true)} projectId={projectId ?? undefined} />
        </div>
      </Main>
      <TopupHistory open={historyOpen} onOpenChange={setHistoryOpen} projectId={projectId ?? undefined} />
    </>
  );
}
