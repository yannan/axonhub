import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ConsumptionStatsFilters, downloadConsumptionStats, useAdminConsumptionStats } from '../data/billing';

type FilterState = {
  projectId: string;
  model: string;
  startDate: string;
  endDate: string;
};

const emptyFilters: FilterState = {
  projectId: '',
  model: '',
  startDate: '',
  endDate: '',
};

export function BillingStatsSettings() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters);

  const queryFilters = useMemo<ConsumptionStatsFilters>(() => {
    const parsedProjectId = Number(appliedFilters.projectId);
    return {
      projectId: Number.isFinite(parsedProjectId) && parsedProjectId > 0 ? parsedProjectId : undefined,
      model: appliedFilters.model.trim() || undefined,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
    };
  }, [appliedFilters]);

  const { data: stats = [], isLoading } = useAdminConsumptionStats(queryFilters);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await downloadConsumptionStats(queryFilters);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = format(new Date(), 'yyyyMMdd');
      anchor.href = url;
      anchor.download = `consumption_stats_${stamp}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success(t('system.billingStats.messages.exported'));
    },
    onError: (error) => {
      handleError(error, t('system.billingStats.errors.export'));
    },
  });

  const handleApply = () => {
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('system.billingStats.title')}</CardTitle>
        <CardDescription>{t('system.billingStats.description')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='grid gap-4 md:grid-cols-5'>
          <div className='space-y-2'>
            <Label htmlFor='billing-filter-project'>{t('system.billingStats.filters.projectId')}</Label>
            <Input
              id='billing-filter-project'
              type='number'
              min={1}
              value={filters.projectId}
              onChange={(event) => setFilters((prev) => ({ ...prev, projectId: event.target.value }))}
              placeholder={t('system.billingStats.filters.projectPlaceholder')}
            />
          </div>
          <div className='space-y-2 md:col-span-2'>
            <Label htmlFor='billing-filter-model'>{t('system.billingStats.filters.model')}</Label>
            <Input
              id='billing-filter-model'
              value={filters.model}
              onChange={(event) => setFilters((prev) => ({ ...prev, model: event.target.value }))}
              placeholder={t('system.billingStats.filters.modelPlaceholder')}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='billing-filter-start'>{t('system.billingStats.filters.startDate')}</Label>
            <Input
              id='billing-filter-start'
              type='date'
              value={filters.startDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='billing-filter-end'>{t('system.billingStats.filters.endDate')}</Label>
            <Input
              id='billing-filter-end'
              type='date'
              value={filters.endDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </div>
          <div className='flex flex-wrap items-end justify-end gap-2 md:col-span-5'>
            <Button type='button' variant='outline' onClick={handleReset}>
              {t('system.billingStats.actions.reset')}
            </Button>
            <Button type='button' onClick={handleApply}>
              {t('system.billingStats.actions.apply')}
            </Button>
            <Button
              type='button'
              variant='secondary'
              onClick={() => exportMutation.mutateAsync()}
              disabled={exportMutation.isPending}
            >
              {t('system.billingStats.actions.export')}
            </Button>
          </div>
        </div>

        <div className='shadow-soft relative overflow-hidden rounded-2xl border border-[var(--table-border)]'>
          <Table className='border-separate border-spacing-0 rounded-2xl bg-[var(--table-background)]'>
            <TableHeader className='bg-[var(--table-header)] shadow-sm'>
              <TableRow className='group/row border-0'>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                  {t('system.billingStats.table.columns.projectId')}
                </TableHead>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                  {t('system.billingStats.table.columns.model')}
                </TableHead>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                  {t('system.billingStats.table.columns.date')}
                </TableHead>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase text-right'>
                  {t('system.billingStats.table.columns.count')}
                </TableHead>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase text-right'>
                  {t('system.billingStats.table.columns.quota')}
                </TableHead>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase text-right'>
                  {t('system.billingStats.table.columns.promptTokens')}
                </TableHead>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase text-right'>
                  {t('system.billingStats.table.columns.completionTokens')}
                </TableHead>
                <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase text-right'>
                  {t('system.billingStats.table.columns.totalTokens')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className='space-y-1 !bg-[var(--table-background)] p-2'>
              {isLoading ? (
                <TableSkeleton rows={6} columns={8} />
              ) : stats.length > 0 ? (
                stats.map((row) => (
                  <TableRow key={`${row.project_id}-${row.model}-${row.date}`} className='group/row border-0 !bg-[var(--table-background)]'>
                    <TableCell className='border-0 px-4 py-3'>#{row.project_id}</TableCell>
                    <TableCell className='border-0 px-4 py-3 font-mono text-xs'>{row.model}</TableCell>
                    <TableCell className='border-0 px-4 py-3'>{row.date}</TableCell>
                    <TableCell className='border-0 px-4 py-3 text-right'>{row.count.toLocaleString()}</TableCell>
                    <TableCell className='border-0 px-4 py-3 text-right'>{row.quota.toLocaleString()}</TableCell>
                    <TableCell className='border-0 px-4 py-3 text-right'>{row.prompt_tokens.toLocaleString()}</TableCell>
                    <TableCell className='border-0 px-4 py-3 text-right'>{row.completion_tokens.toLocaleString()}</TableCell>
                    <TableCell className='border-0 px-4 py-3 text-right'>{row.total_tokens.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className='!bg-[var(--table-background)]'>
                  <TableCell colSpan={8} className='h-24 text-center text-muted-foreground'>
                    {t('system.billingStats.table.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
