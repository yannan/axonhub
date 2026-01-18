'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { formatNumber } from '@/utils/format-number';
import {
  useProjectDashboardStats,
  useProjectRecharges,
  useProjectSubscription,
  useProjectUsage,
  useRedeemCode,
} from './data/billing';

export default function ProjectBillingPage() {
  const { t } = useTranslation();
  const { data: subscription, isLoading: subscriptionLoading } = useProjectSubscription();
  const { data: recharges = [], isLoading: rechargesLoading } = useProjectRecharges();
  const { data: dashboardStats, isLoading: dashboardLoading } = useProjectDashboardStats();
  const { data: usageRecords = [], isLoading: usageLoading } = useProjectUsage();
  const redeemCode = useRedeemCode();
  const [code, setCode] = useState('');

  const remainingQuota = useMemo(() => {
    if (!subscription) {
      return 0;
    }
    return Math.max(subscription.quota - subscription.usedQuota, 0);
  }, [subscription]);

  const successRate = useMemo(() => {
    if (!dashboardStats || dashboardStats.total_requests === 0) {
      return null;
    }
    return (dashboardStats.completed_requests / dashboardStats.total_requests) * 100;
  }, [dashboardStats]);

  const avgLatency = dashboardStats?.average_latency_ms ?? null;
  const avgFirstToken = dashboardStats?.average_first_token_latency_ms ?? null;

  const handleRedeem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }
    try {
      await redeemCode.mutateAsync(code.trim());
    } catch {
      // Errors are surfaced via toasts; avoid unhandled promise noise.
    }
    setCode('');
  };

  return (
    <>
      <Header fixed></Header>
      <Main fixed>
        <div className='flex min-h-0 flex-1 flex-col overflow-auto'>
          <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>{t('projectBilling.title')}</h2>
              <p className='text-muted-foreground'>{t('projectBilling.description')}</p>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader>
                <CardTitle>{t('projectBilling.cards.quota')}</CardTitle>
                <CardDescription>{t('projectBilling.cards.quotaDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-semibold'>
                  {subscriptionLoading ? '-' : subscription?.quota.toLocaleString() ?? '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('projectBilling.cards.usedQuota')}</CardTitle>
                <CardDescription>{t('projectBilling.cards.usedQuotaDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-semibold'>
                  {subscriptionLoading ? '-' : subscription?.usedQuota.toLocaleString() ?? '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('projectBilling.cards.remainingQuota')}</CardTitle>
                <CardDescription>{t('projectBilling.cards.remainingQuotaDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-semibold'>{subscriptionLoading ? '-' : remainingQuota.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <div className='mt-6'>
            <div className='mb-4'>
              <h3 className='text-lg font-semibold'>{t('projectBilling.dashboard.title')}</h3>
              <p className='text-muted-foreground text-sm'>{t('projectBilling.dashboard.description')}</p>
            </div>
            <div className='grid gap-4 md:grid-cols-3'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('projectBilling.dashboard.cards.requests')}</CardTitle>
                  <CardDescription>{t('projectBilling.dashboard.cards.requestsDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <div className='text-2xl font-semibold'>
                    {dashboardLoading ? '-' : formatNumber(dashboardStats?.total_requests || 0)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('projectBilling.dashboard.stats.completed')}: {formatNumber(dashboardStats?.completed_requests || 0)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('projectBilling.dashboard.stats.failed')}: {formatNumber(dashboardStats?.failed_requests || 0)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('projectBilling.dashboard.stats.blocked')}: {formatNumber(dashboardStats?.blocked_requests || 0)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('projectBilling.dashboard.stats.canceled')}: {formatNumber(dashboardStats?.canceled_requests || 0)}
                  </div>
                  {successRate != null && (
                    <div className='text-xs font-medium'>
                      {t('projectBilling.dashboard.stats.successRate')}: {successRate.toFixed(1)}%
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('projectBilling.dashboard.cards.tokens')}</CardTitle>
                  <CardDescription>{t('projectBilling.dashboard.cards.tokensDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <div className='text-2xl font-semibold'>
                    {dashboardLoading ? '-' : formatNumber(dashboardStats?.total_tokens || 0)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('projectBilling.dashboard.stats.prompt')}: {formatNumber(dashboardStats?.prompt_tokens || 0)}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('projectBilling.dashboard.stats.completion')}: {formatNumber(dashboardStats?.completion_tokens || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('projectBilling.dashboard.cards.latency')}</CardTitle>
                  <CardDescription>{t('projectBilling.dashboard.cards.latencyDescription')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <div className='text-2xl font-semibold'>
                    {dashboardLoading || avgLatency == null ? '-' : `${formatNumber(avgLatency)} ms`}
                  </div>
                  <div className='text-muted-foreground text-xs'>{t('projectBilling.dashboard.stats.avgLatency')}</div>
                  <div className='text-sm font-medium'>
                    {dashboardLoading || avgFirstToken == null ? '-' : `${formatNumber(avgFirstToken)} ms`}
                    <span className='text-muted-foreground ml-2 text-xs'>{t('projectBilling.dashboard.stats.avgFirstToken')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className='mt-6'>
            <Card>
              <CardHeader>
                <CardTitle>{t('projectBilling.usage.title')}</CardTitle>
                <CardDescription>{t('projectBilling.usage.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='shadow-soft relative overflow-hidden rounded-2xl border border-[var(--table-border)]'>
                  <Table className='border-separate border-spacing-0 rounded-2xl bg-[var(--table-background)]'>
                    <TableHeader className='bg-[var(--table-header)] shadow-sm'>
                      <TableRow className='group/row border-0'>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.usage.columns.model')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.usage.columns.type')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                        {t('projectBilling.usage.columns.quota')}
                      </TableHead>
                      <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                        {t('projectBilling.usage.columns.multiplier')}
                      </TableHead>
                      <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                        {t('projectBilling.usage.columns.groupMultiplier')}
                      </TableHead>
                      <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                        {t('projectBilling.usage.columns.modelMultiplier')}
                      </TableHead>
                      <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                        {t('projectBilling.usage.columns.completionRatio')}
                      </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.usage.columns.tokens')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.usage.columns.apiKey')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.usage.columns.trace')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.usage.columns.createdAt')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='space-y-1 !bg-[var(--table-background)] p-2'>
                    {usageLoading ? (
                      <TableSkeleton rows={6} columns={11} />
                    ) : usageRecords.length > 0 ? (
                      usageRecords.map((record) => (
                        <TableRow key={record.id} className='group/row border-0 !bg-[var(--table-background)]'>
                          <TableCell className='border-0 px-4 py-3 font-mono text-xs'>{record.model}</TableCell>
                          <TableCell className='border-0 px-4 py-3'>
                            <Badge variant='secondary'>{t(`projectBilling.usage.types.${record.type}`)}</Badge>
                          </TableCell>
                          <TableCell className='border-0 px-4 py-3'>{formatNumber(record.quota)}</TableCell>
                          <TableCell className='border-0 px-4 py-3 font-mono text-xs'>
                            {Number.isFinite(record.billing_multiplier) ? record.billing_multiplier.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className='border-0 px-4 py-3 font-mono text-xs'>
                            {Number.isFinite(record.group_multiplier) ? record.group_multiplier.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className='border-0 px-4 py-3 font-mono text-xs'>
                            {Number.isFinite(record.model_multiplier) ? record.model_multiplier.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className='border-0 px-4 py-3 font-mono text-xs'>
                            {Number.isFinite(record.completion_ratio) ? record.completion_ratio.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell className='border-0 px-4 py-3'>
                            <div className='text-sm font-medium'>{formatNumber(record.total_tokens)}</div>
                            <div className='text-muted-foreground text-xs'>
                              {t('projectBilling.usage.tokens.prompt')}: {formatNumber(record.prompt_tokens)}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              {t('projectBilling.usage.tokens.completion')}: {formatNumber(record.completion_tokens)}
                            </div>
                          </TableCell>
                          <TableCell className='border-0 px-4 py-3'>
                            <span className='text-muted-foreground'>
                              {record.api_key_name || (record.api_key_id ? `#${record.api_key_id}` : '-')}
                            </span>
                          </TableCell>
                            <TableCell className='border-0 px-4 py-3'>
                              <span className='text-muted-foreground'>{record.trace_id || '-'}</span>
                            </TableCell>
                            <TableCell className='border-0 px-4 py-3 text-muted-foreground'>
                              {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow className='!bg-[var(--table-background)]'>
                        <TableCell colSpan={11} className='h-24 text-center text-muted-foreground'>
                          {t('projectBilling.usage.empty')}
                        </TableCell>
                      </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
            <Card>
              <CardHeader>
                <CardTitle>{t('projectBilling.redeem.title')}</CardTitle>
                <CardDescription>{t('projectBilling.redeem.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRedeem} className='space-y-4'>
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t('projectBilling.redeem.placeholder')}
                  />
                  <Button type='submit' disabled={!code.trim() || redeemCode.isPending} className='w-full'>
                    {redeemCode.isPending ? t('projectBilling.redeem.submitting') : t('projectBilling.redeem.submit')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('projectBilling.recharges.title')}</CardTitle>
                <CardDescription>{t('projectBilling.recharges.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='shadow-soft relative overflow-hidden rounded-2xl border border-[var(--table-border)]'>
                  <Table className='border-separate border-spacing-0 rounded-2xl bg-[var(--table-background)]'>
                    <TableHeader className='bg-[var(--table-header)] shadow-sm'>
                      <TableRow className='group/row border-0'>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.recharges.columns.codeId')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.recharges.columns.amount')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.recharges.columns.status')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.recharges.columns.trace')}
                        </TableHead>
                        <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                          {t('projectBilling.recharges.columns.createdAt')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='space-y-1 !bg-[var(--table-background)] p-2'>
                      {rechargesLoading ? (
                        <TableSkeleton rows={6} columns={5} />
                      ) : recharges.length > 0 ? (
                        recharges.map((record) => (
                          <TableRow key={record.id} className='group/row border-0 !bg-[var(--table-background)]'>
                            <TableCell className='border-0 px-4 py-3'>#{record.code_id}</TableCell>
                            <TableCell className='border-0 px-4 py-3'>{record.amount.toLocaleString()}</TableCell>
                            <TableCell className='border-0 px-4 py-3'>
                              <Badge variant={record.status === 'success' ? 'default' : 'secondary'}>
                                {t(`projectBilling.recharges.status.${record.status}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className='border-0 px-4 py-3'>
                              <span className='text-muted-foreground'>{record.trace_id || '-'}</span>
                            </TableCell>
                            <TableCell className='border-0 px-4 py-3 text-muted-foreground'>
                              {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className='!bg-[var(--table-background)]'>
                          <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                            {t('projectBilling.recharges.empty')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  );
}
