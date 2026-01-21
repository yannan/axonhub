'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [rechargeOffset, setRechargeOffset] = useState(0);
  const rechargeLimit = 10;
  const { data: rechargeData, isLoading: rechargesLoading } = useProjectRecharges({
    offset: rechargeOffset,
    limit: rechargeLimit,
  });
  const { data: dashboardStats, isLoading: dashboardLoading } = useProjectDashboardStats();
  const [usageOffset, setUsageOffset] = useState(0);
  const usageLimit = 20;
  const { data: usageData, isLoading: usageLoading } = useProjectUsage({ offset: usageOffset, limit: usageLimit });
  const redeemCode = useRedeemCode();
  const [code, setCode] = useState('');

  const recharges = rechargeData?.records ?? [];
  const rechargePagination = rechargeData?.pagination;

  const usageRecords = usageData?.records ?? [];
  const usagePagination = usageData?.pagination;

  useEffect(() => {
    if (!usagePagination) {
      return;
    }
    if (usagePagination.total === 0 && usageOffset !== 0) {
      setUsageOffset(0);
      return;
    }
    if (usagePagination.total > 0 && usageOffset >= usagePagination.total) {
      setUsageOffset(Math.max(usagePagination.total - usagePagination.limit, 0));
    }
  }, [usagePagination, usageOffset]);

  useEffect(() => {
    if (!rechargePagination) {
      return;
    }
    if (rechargePagination.total === 0 && rechargeOffset !== 0) {
      setRechargeOffset(0);
      return;
    }
    if (rechargePagination.total > 0 && rechargeOffset >= rechargePagination.total) {
      setRechargeOffset(Math.max(rechargePagination.total - rechargePagination.limit, 0));
    }
  }, [rechargePagination, rechargeOffset]);

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
  const usageTotal = usagePagination?.total ?? 0;
  const usageStart = usageTotal === 0 ? 0 : (usagePagination?.offset ?? 0) + 1;
  const usageEnd = usageTotal === 0 ? 0 : Math.min((usagePagination?.offset ?? 0) + (usagePagination?.limit ?? usageLimit), usageTotal);
  const canPrevious = (usagePagination?.offset ?? usageOffset) > 0;
  const canNext =
    usagePagination != null
      ? usagePagination.offset + usagePagination.limit < usagePagination.total
      : usageOffset + usageLimit < usageTotal;
  const rechargeTotal = rechargePagination?.total ?? 0;
  const rechargeStart = rechargeTotal === 0 ? 0 : (rechargePagination?.offset ?? 0) + 1;
  const rechargeEnd =
    rechargeTotal === 0
      ? 0
      : Math.min((rechargePagination?.offset ?? 0) + (rechargePagination?.limit ?? rechargeLimit), rechargeTotal);
  const rechargeCanPrevious = (rechargePagination?.offset ?? rechargeOffset) > 0;
  const rechargeCanNext =
    rechargePagination != null
      ? rechargePagination.offset + rechargePagination.limit < rechargePagination.total
      : rechargeOffset + rechargeLimit < rechargeTotal;

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
                      <TableSkeleton rows={6} columns={7} />
                    ) : usageRecords.length > 0 ? (
                      usageRecords.map((record) => (
                        <TableRow key={record.id} className='group/row border-0 !bg-[var(--table-background)]'>
                          <TableCell className='border-0 px-4 py-3 font-mono text-xs'>{record.model}</TableCell>
                          <TableCell className='border-0 px-4 py-3'>
                            <Badge variant='secondary'>{t(`projectBilling.usage.types.${record.type}`)}</Badge>
                          </TableCell>
                          <TableCell className='border-0 px-4 py-3'>{formatNumber(record.quota)}</TableCell>
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
                        <TableCell colSpan={7} className='h-24 text-center text-muted-foreground'>
                          {t('projectBilling.usage.empty')}
                        </TableCell>
                      </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
                  <div>{t('projectBilling.usage.pagination.summary', { start: usageStart, end: usageEnd, total: usageTotal })}</div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setUsageOffset(Math.max(usageOffset - usageLimit, 0))}
                      disabled={!canPrevious || usageLoading}
                    >
                      {t('projectBilling.usage.pagination.previous')}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setUsageOffset(usageOffset + usageLimit)}
                      disabled={!canNext || usageLoading}
                    >
                      {t('projectBilling.usage.pagination.next')}
                    </Button>
                  </div>
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
                <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
                  <div>
                    {t('projectBilling.recharges.pagination.summary', {
                      start: rechargeStart,
                      end: rechargeEnd,
                      total: rechargeTotal,
                    })}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setRechargeOffset(Math.max(rechargeOffset - rechargeLimit, 0))}
                      disabled={!rechargeCanPrevious || rechargesLoading}
                    >
                      {t('projectBilling.recharges.pagination.previous')}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setRechargeOffset(rechargeOffset + rechargeLimit)}
                      disabled={!rechargeCanNext || rechargesLoading}
                    >
                      {t('projectBilling.recharges.pagination.next')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  );
}
