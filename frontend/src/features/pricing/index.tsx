'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { useQueryPricing } from './data/pricing';
import { Pricing } from './data/schema';
import { createPricingColumns } from './components/pricing-columns';
import { PricingActionDialog } from './components/pricing-action-dialog';
import { PricingDeleteDialog } from './components/pricing-delete-dialog';
import { PricingDisableDialog } from './components/pricing-disable-dialog';
import { PricingEnableDialog } from './components/pricing-enable-dialog';

export default function PricingManagement() {
    const { t } = useTranslation();
    const [pricingOffset, setPricingOffset] = useState(0);
    const pricingLimit = 20;
    const { data: pricingData, isLoading } = useQueryPricing({ offset: pricingOffset, limit: pricingLimit });
    const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
    const [currentRow, setCurrentRow] = useState<Pricing | undefined>(undefined);
    const [deleteRow, setDeleteRow] = useState<Pricing | null>(null);
    const [disableRow, setDisableRow] = useState<Pricing | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [disableDialogOpen, setDisableDialogOpen] = useState(false);
    const [enableDialogOpen, setEnableDialogOpen] = useState(false);
    const [enableRow, setEnableRow] = useState<Pricing | null>(null);

    const handleCreate = () => {
        setCurrentRow(undefined);
        setActionDialogOpen(true);
    };

    const handleEdit = (pricing: Pricing) => {
        setCurrentRow(pricing);
        setActionDialogOpen(true);
    };

    const handleDelete = (pricing: Pricing) => {
        setDeleteRow(pricing);
        setDeleteDialogOpen(true);
    };

    const handleDisable = (pricing: Pricing) => {
        setDisableRow(pricing);
        setDisableDialogOpen(true);
    };

    const handleEnable = (pricing: Pricing) => {
        setEnableRow(pricing);
        setEnableDialogOpen(true);
    };

    const columns = useMemo(
        () =>
            createPricingColumns(t, {
                onEdit: handleEdit,
                onDelete: handleDelete,
                onEnable: handleEnable,
                onDisable: handleDisable,
            }),
        [t, handleEdit, handleDelete, handleEnable, handleDisable]
    );

    const pricingList = pricingData?.records ?? [];
    const pricingPagination = pricingData?.pagination;
    const pricingTotal = pricingPagination?.total ?? 0;
    const pricingStart = pricingTotal === 0 ? 0 : (pricingPagination?.offset ?? 0) + 1;
    const pricingEnd =
        pricingTotal === 0
            ? 0
            : Math.min((pricingPagination?.offset ?? 0) + (pricingPagination?.limit ?? pricingLimit), pricingTotal);
    const pricingCanPrevious = (pricingPagination?.offset ?? pricingOffset) > 0;
    const pricingCanNext =
        pricingPagination != null
            ? pricingPagination.offset + pricingPagination.limit < pricingPagination.total
            : pricingOffset + pricingLimit < pricingTotal;

    useEffect(() => {
        if (!pricingPagination) {
            return;
        }
        if (pricingPagination.total === 0 && pricingOffset !== 0) {
            setPricingOffset(0);
            return;
        }
        if (pricingPagination.total > 0 && pricingOffset >= pricingPagination.total) {
            setPricingOffset(Math.max(pricingPagination.total - pricingPagination.limit, 0));
        }
    }, [pricingPagination, pricingOffset]);

    const table = useReactTable({
        data: pricingList,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <>
            <Header fixed />
            <Main fixed>
                <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
                    <div>
                        <h2 className='text-2xl font-bold tracking-tight'>{t('pricing.title')}</h2>
                        <p className='text-muted-foreground'>{t('pricing.description')}</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <IconPlus className='mr-2 h-4 w-4' />
                        {t('pricing.buttons.create')}
                    </Button>
                </div>

                <div className='shadow-soft relative overflow-hidden rounded-2xl border border-[var(--table-border)]'>
                    <Table className='border-separate border-spacing-0 rounded-2xl bg-[var(--table-background)]'>
                        <TableHeader className='bg-[var(--table-header)] shadow-sm'>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className='group/row border-0'>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className='text-muted-foreground border-0 text-xs font-semibold uppercase'
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody className='space-y-1 !bg-[var(--table-background)] p-2'>
                            {isLoading ? (
                                <TableSkeleton rows={6} columns={columns.length} />
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className='group/row border-0 !bg-[var(--table-background)]'
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className='border-0 px-4 py-3'>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className='!bg-[var(--table-background)]'>
                                    <TableCell colSpan={columns.length} className='h-24 text-center text-muted-foreground'>
                                        {t('pricing.empty')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
                    <div>
                        {t('pricing.pagination.summary', {
                            start: pricingStart,
                            end: pricingEnd,
                            total: pricingTotal,
                        })}
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setPricingOffset(Math.max(pricingOffset - pricingLimit, 0))}
                            disabled={!pricingCanPrevious || isLoading}
                        >
                            {t('pricing.pagination.previous')}
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setPricingOffset(pricingOffset + pricingLimit)}
                            disabled={!pricingCanNext || isLoading}
                        >
                            {t('pricing.pagination.next')}
                        </Button>
                    </div>
                </div>
            </Main>

            <PricingActionDialog
                currentRow={currentRow}
                open={actionDialogOpen}
                onOpenChange={setActionDialogOpen}
            />

            <PricingDeleteDialog
                pricing={deleteRow}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            />

            <PricingDisableDialog
                pricing={disableRow}
                open={disableDialogOpen}
                onOpenChange={(open) => {
                    setDisableDialogOpen(open);
                    if (!open) {
                        setDisableRow(null);
                    }
                }}
            />

            <PricingEnableDialog
                pricing={enableRow}
                open={enableDialogOpen}
                onOpenChange={(open) => {
                    setEnableDialogOpen(open);
                    if (!open) {
                        setEnableRow(null);
                    }
                }}
            />
        </>
    );
}
