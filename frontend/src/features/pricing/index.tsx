'use client';

import { useMemo, useState } from 'react';
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
    const { data: pricingList = [], isLoading } = useQueryPricing();
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
