'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  type RedemptionCode,
  useAdminRedemptions,
  useDeleteRedemptions,
  useGenerateRedemptions,
  useVoidRedemption,
} from '../data/redemption';

type FilterState = {
  code: string;
  status: 'all' | 'active' | 'used' | 'disabled';
  voided: 'all' | 'true' | 'false';
  expired: 'all' | 'true' | 'false';
  usedBy: string;
};

type GenerateState = {
  count: string;
  quota: string;
  maxUses: string;
  expiresAt: string;
};

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export function RedemptionSettings() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>({
    code: '',
    status: 'all',
    voided: 'all',
    expired: 'all',
    usedBy: '',
  });
  const [pagination, setPagination] = useState({ offset: 0, limit: 20 });
  const [generateForm, setGenerateForm] = useState<GenerateState>({
    count: '',
    quota: '',
    maxUses: '',
    expiresAt: '',
  });
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [voidTarget, setVoidTarget] = useState<RedemptionCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RedemptionCode | null>(null);

  const appliedFilters = useMemo(() => {
    const usedByValue = parseOptionalNumber(filters.usedBy);
    return {
      code: filters.code.trim() || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      voided: filters.voided === 'all' ? undefined : filters.voided === 'true',
      expired: filters.expired === 'all' ? undefined : filters.expired === 'true',
      usedBy: usedByValue,
      offset: pagination.offset,
      limit: pagination.limit,
    };
  }, [filters, pagination]);

  const { data: redemptions = [], isLoading } = useAdminRedemptions(appliedFilters);
  const generateCodes = useGenerateRedemptions();
  const voidRedemption = useVoidRedemption();
  const deleteRedemption = useDeleteRedemptions();

  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [filters, pagination.limit]);

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const countValue = parseOptionalNumber(generateForm.count);
    const quotaValue = parseOptionalNumber(generateForm.quota);

    if (!countValue || countValue < 1 || !quotaValue || quotaValue < 1) {
      return;
    }

    const maxUsesValue = parseOptionalNumber(generateForm.maxUses);
    const expiresAtValue = generateForm.expiresAt.trim()
      ? new Date(generateForm.expiresAt).toISOString()
      : undefined;

    try {
      const response = await generateCodes.mutateAsync({
        count: countValue,
        quota: quotaValue,
        max_uses: maxUsesValue,
        expires_at: expiresAtValue,
      });
      setGeneratedCodes(response.data);
      setGenerateForm((prev) => ({ ...prev, maxUses: '', expiresAt: '' }));
    } catch {
      // Errors are surfaced via toasts.
    }
  };

  const hasNextPage = redemptions.length === pagination.limit;
  const hasPreviousPage = pagination.offset > 0;
  const startIndex = redemptions.length ? pagination.offset + 1 : 0;
  const endIndex = pagination.offset + redemptions.length;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('system.redemption.generate.title')}</CardTitle>
          <CardDescription>{t('system.redemption.generate.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='redemption-count'>{t('system.redemption.generate.count')}</Label>
              <Input
                id='redemption-count'
                type='number'
                min={1}
                value={generateForm.count}
                onChange={(event) => setGenerateForm((prev) => ({ ...prev, count: event.target.value }))}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='redemption-quota'>{t('system.redemption.generate.quota')}</Label>
              <Input
                id='redemption-quota'
                type='number'
                min={1}
                value={generateForm.quota}
                onChange={(event) => setGenerateForm((prev) => ({ ...prev, quota: event.target.value }))}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='redemption-max-uses'>{t('system.redemption.generate.maxUses')}</Label>
              <Input
                id='redemption-max-uses'
                type='number'
                min={1}
                value={generateForm.maxUses}
                onChange={(event) => setGenerateForm((prev) => ({ ...prev, maxUses: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='redemption-expires-at'>{t('system.redemption.generate.expiresAt')}</Label>
              <Input
                id='redemption-expires-at'
                type='datetime-local'
                value={generateForm.expiresAt}
                onChange={(event) => setGenerateForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
              />
            </div>
            <div className='md:col-span-2 flex justify-end'>
              <Button type='submit' disabled={generateCodes.isPending}>
                {generateCodes.isPending
                  ? t('common.buttons.creating')
                  : t('system.redemption.generate.submit')}
              </Button>
            </div>
          </form>

          {generatedCodes.length > 0 && (
            <div className='border-border bg-muted/30 mt-6 rounded-xl border p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='text-sm font-semibold'>{t('system.redemption.generate.latest')}</div>
                <div className='flex items-center gap-2'>
                  <CopyButton content={generatedCodes.join('\n')} copyMessage={t('common.copied')} />
                  <Button variant='ghost' size='sm' onClick={() => setGeneratedCodes([])}>
                    {t('system.redemption.generate.clear')}
                  </Button>
                </div>
              </div>
              <div className='mt-3 grid gap-2 md:grid-cols-2'>
                {generatedCodes.map((code) => (
                  <div
                    key={code}
                    className='border-border bg-background flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-sm'
                  >
                    <span>{code}</span>
                    <CopyButton content={code} copyMessage={t('common.copied')} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('system.redemption.title')}</CardTitle>
          <CardDescription>{t('system.redemption.description')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-5'>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='redemption-filter-code'>{t('system.redemption.filters.code')}</Label>
              <Input
                id='redemption-filter-code'
                value={filters.code}
                onChange={(event) => setFilters((prev) => ({ ...prev, code: event.target.value }))}
                placeholder={t('system.redemption.filters.codePlaceholder')}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='redemption-filter-status'>{t('system.redemption.filters.status')}</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value as FilterState['status'] }))
                }
              >
                <SelectTrigger id='redemption-filter-status' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>{t('system.redemption.filters.all')}</SelectItem>
                  <SelectItem value='active'>{t('system.redemption.status.active')}</SelectItem>
                  <SelectItem value='used'>{t('system.redemption.status.used')}</SelectItem>
                  <SelectItem value='disabled'>{t('system.redemption.status.disabled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='redemption-filter-voided'>{t('system.redemption.filters.voided')}</Label>
              <Select
                value={filters.voided}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, voided: value as FilterState['voided'] }))
                }
              >
                <SelectTrigger id='redemption-filter-voided' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>{t('system.redemption.filters.all')}</SelectItem>
                  <SelectItem value='true'>{t('system.redemption.filters.yes')}</SelectItem>
                  <SelectItem value='false'>{t('system.redemption.filters.no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='redemption-filter-used-by'>{t('system.redemption.filters.usedBy')}</Label>
              <Input
                id='redemption-filter-used-by'
                type='number'
                min={1}
                value={filters.usedBy}
                onChange={(event) => setFilters((prev) => ({ ...prev, usedBy: event.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='redemption-filter-expired'>{t('system.redemption.filters.expired')}</Label>
              <Select
                value={filters.expired}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, expired: value as FilterState['expired'] }))
                }
              >
                <SelectTrigger id='redemption-filter-expired' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>{t('system.redemption.filters.all')}</SelectItem>
                  <SelectItem value='true'>{t('system.redemption.filters.yes')}</SelectItem>
                  <SelectItem value='false'>{t('system.redemption.filters.no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-end justify-end md:col-span-5'>
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  setFilters({
                    code: '',
                    status: 'all',
                    voided: 'all',
                    expired: 'all',
                    usedBy: '',
                  })
                }
              >
                {t('system.redemption.filters.reset')}
              </Button>
            </div>
          </div>

          <div className='shadow-soft relative overflow-hidden rounded-2xl border border-[var(--table-border)]'>
            <Table className='border-separate border-spacing-0 rounded-2xl bg-[var(--table-background)]'>
              <TableHeader className='bg-[var(--table-header)] shadow-sm'>
                <TableRow className='group/row border-0'>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.id')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.code')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.quota')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.status')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.uses')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.expiresAt')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.voided')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase'>
                    {t('system.redemption.table.columns.usedBy')}
                  </TableHead>
                  <TableHead className='text-muted-foreground border-0 text-xs font-semibold uppercase text-right'>
                    {t('system.redemption.table.columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='space-y-1 !bg-[var(--table-background)] p-2'>
                {isLoading ? (
                  <TableSkeleton rows={6} columns={9} />
                ) : redemptions.length > 0 ? (
                  redemptions.map((code) => {
                    const maxUses = code.max_uses ?? null;
                    const usedTimes = code.used_times ?? 0;
                    const useLabel = maxUses ? `${usedTimes}/${maxUses}` : t('system.redemption.table.unlimited');
                    const isVoided = code.voided ?? false;
                    const statusVariant = code.status === 'active' ? 'default' : code.status === 'used' ? 'secondary' : 'outline';

                    return (
                      <TableRow key={code.id} className='group/row border-0 !bg-[var(--table-background)]'>
                        <TableCell className='border-0 px-4 py-3'>#{code.id}</TableCell>
                        <TableCell className='border-0 px-4 py-3 font-mono'>{code.code}</TableCell>
                        <TableCell className='border-0 px-4 py-3'>{code.quota.toLocaleString()}</TableCell>
                        <TableCell className='border-0 px-4 py-3'>
                          <Badge variant={statusVariant}>{t(`system.redemption.status.${code.status}`)}</Badge>
                        </TableCell>
                        <TableCell className='border-0 px-4 py-3'>{useLabel}</TableCell>
                        <TableCell className='border-0 px-4 py-3 text-muted-foreground'>
                          {code.expires_at ? format(new Date(code.expires_at), 'yyyy-MM-dd HH:mm') : '-'}
                        </TableCell>
                        <TableCell className='border-0 px-4 py-3'>
                          <Badge variant={isVoided ? 'destructive' : 'secondary'}>
                            {isVoided ? t('system.redemption.filters.yes') : t('system.redemption.filters.no')}
                          </Badge>
                        </TableCell>
                        <TableCell className='border-0 px-4 py-3 text-muted-foreground'>
                          {code.used_by ?? '-'}
                        </TableCell>
                        <TableCell className='border-0 px-4 py-3 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              onClick={() => setVoidTarget(code)}
                              disabled={isVoided || code.status === 'disabled'}
                            >
                              {t('system.redemption.actions.void')}
                            </Button>
                            <Button type='button' size='sm' variant='destructive' onClick={() => setDeleteTarget(code)}>
                              {t('system.redemption.actions.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow className='!bg-[var(--table-background)]'>
                    <TableCell colSpan={9} className='h-24 text-center text-muted-foreground'>
                      {t('system.redemption.table.empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 px-2'>
            <div className='text-muted-foreground text-sm'>
              {t('system.redemption.table.pagination', { start: startIndex, end: endIndex })}
            </div>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>{t('pagination.rowsPerPage')}</span>
                <Select
                  value={`${pagination.limit}`}
                  onValueChange={(value) => setPagination((prev) => ({ ...prev, limit: Number(value) }))}
                >
                  <SelectTrigger className='h-8 w-[70px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side='top'>
                    {[10, 20, 30, 40, 50].map((size) => (
                      <SelectItem key={size} value={`${size}`}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  className='h-8 px-3'
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))
                  }
                  disabled={!hasPreviousPage}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant='outline'
                  className='h-8 px-3'
                  onClick={() => setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={!hasNextPage}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!voidTarget}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
          }
        }}
        title={t('system.redemption.dialogs.void.title')}
        desc={t('system.redemption.dialogs.void.description')}
        cancelBtnText={t('common.buttons.cancel')}
        confirmText={t('system.redemption.actions.void')}
        destructive
        isLoading={voidRedemption.isPending}
        handleConfirm={async () => {
          if (!voidTarget) {
            return;
          }
          await voidRedemption.mutateAsync(voidTarget.id);
          setVoidTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={t('system.redemption.dialogs.delete.title')}
        desc={t('system.redemption.dialogs.delete.description')}
        cancelBtnText={t('common.buttons.cancel')}
        confirmText={t('common.buttons.delete')}
        destructive
        isLoading={deleteRedemption.isPending}
        handleConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteRedemption.mutateAsync([deleteTarget.id]);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
