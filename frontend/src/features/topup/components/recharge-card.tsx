import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { History } from 'lucide-react';
import { useProjectSubscription, useProjectUsage } from '../data/topup';
import { UsageHistoryTable } from './usage-history-table';
import { createUsageColumns } from './usage-history-columns';

interface RechargeCardProps {
  onOpenHistory: () => void;
  projectId?: string;
}

export function RechargeCard({ onOpenHistory, projectId }: RechargeCardProps) {
  const { t } = useTranslation();
  const { data: subscription } = useProjectSubscription(projectId);
  const { data: usageData, isLoading } = useProjectUsage(projectId, 1, 5); // Fetch first 5 records

  const columns = useMemo(() => createUsageColumns(t), [t]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-1.5">
          <Button variant="outline" size="sm" onClick={onOpenHistory} className="gap-2">
            <History className="h-4 w-4" />
            {t('topup.history.title')}
          </Button>
        </div>
        
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">{t('topup.balanceUsage')}</Label>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                {subscription?.used_quota?.toFixed(2) || '0.00'}
              </span>
              <span className="text-xl text-muted-foreground">
                / {subscription?.quota?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        <UsageHistoryTable
          columns={columns}
          data={usageData?.data || []}
          loading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
