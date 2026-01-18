import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { IconBan, IconEdit, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/components/data-table-column-header';
import { Pricing } from '../data/schema';

interface ColumnProps {
    onEdit: (pricing: Pricing) => void;
    onDelete: (pricing: Pricing) => void;
    onEnable: (pricing: Pricing) => void;
    onDisable: (pricing: Pricing) => void;
}

export function createPricingColumns(
    t: ReturnType<typeof useTranslation>['t'],
    { onEdit, onDelete, onEnable, onDisable }: ColumnProps
): ColumnDef<Pricing>[] {
    return [
        {
            accessorKey: 'model',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.model')} />,
            cell: ({ row }) => <div className='font-medium'>{row.getValue('model')}</div>,
            enableSorting: true,
            enableHiding: false,
        },
        {
            id: 'status',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.status')} />,
            cell: ({ row }) => {
                const isDisabled = row.original.deleted_at > 0;
                return (
                    <Badge variant={isDisabled ? 'secondary' : 'default'} className='capitalize'>
                        {isDisabled ? t('pricing.status.disabled') : t('pricing.status.active')}
                    </Badge>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: 'type',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.type')} />,
            cell: ({ row }) => {
                const type = row.getValue('type') as string;
                return (
                    <Badge variant={type === 'quota' ? 'default' : 'secondary'} className='capitalize'>
                        {t(`pricing.types.${type}`)}
                    </Badge>
                );
            },
            enableSorting: true,
        },
        {
            accessorKey: 'quota',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.quota')} />,
            cell: ({ row }) => {
                const quota = row.getValue('quota') as number;
                return <span className='font-mono'>{quota.toFixed(4)}</span>;
            },
            enableSorting: true,
        },
        {
            accessorKey: 'price',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.price')} />,
            cell: ({ row }) => {
                const price = row.getValue('price') as number;
                return <span className='font-mono'>{price.toFixed(4)}</span>;
            },
            enableSorting: true,
        },
        {
            accessorKey: 'completion_ratio',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.completionRatio')} />,
            cell: ({ row }) => {
                const ratio = row.getValue('completion_ratio') as number;
                return <span className='font-mono'>{ratio.toFixed(2)}</span>;
            },
            enableSorting: true,
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.createdAt')} />,
            cell: ({ row }) => {
                const date = new Date(row.getValue('created_at'));
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className='text-muted-foreground cursor-help text-sm'>{format(date, 'yyyy-MM-dd')}</div>
                        </TooltipTrigger>
                        <TooltipContent>{format(date, 'yyyy-MM-dd HH:mm:ss')}</TooltipContent>
                    </Tooltip>
                );
            },
            enableSorting: true,
        },
        {
            id: 'actions',
            header: ({ column }) => <DataTableColumnHeader column={column} title={t('pricing.columns.actions')} />,
            cell: ({ row }) => {
                const pricing = row.original;
                const isDisabled = pricing.deleted_at > 0;
                return (
                    <div className='flex items-center gap-1'>
                        <Button
                            size='sm'
                            variant='outline'
                            className='h-8 w-8 p-0'
                            onClick={() => onEdit(pricing)}
                            disabled={isDisabled}
                        >
                            <IconEdit className='h-3 w-3' />
                        </Button>
                        {!isDisabled && (
                            <Button
                                size='sm'
                                variant='outline'
                                className='h-8 w-8 p-0'
                                onClick={() => onDisable(pricing)}
                            >
                                <IconBan className='h-3 w-3' />
                            </Button>
                        )}
                        <Button
                            size='sm'
                            variant='outline'
                            className='h-8 w-8 p-0'
                            onClick={() => onDelete(pricing)}
                        >
                            <IconTrash className='h-3 w-3' />
                        </Button>
                        {isDisabled && (
                            <Button size='sm' variant='secondary' className='h-8 px-2' onClick={() => onEnable(pricing)}>
                                {t('pricing.buttons.enable')}
                            </Button>
                        )}
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
        },
    ];
}
