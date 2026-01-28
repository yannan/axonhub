import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';
import { Redemption } from '../data/schema';
import { format } from 'date-fns';

export const createColumns = (t: any): ColumnDef<Redemption>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('redemptions.fields.id')} />
    ),
    cell: ({ row }) => <div className='w-[80px]'>{row.getValue('id')}</div>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('redemptions.fields.code')} />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex space-x-2'>
          <span className='max-w-[500px] truncate font-medium'>
            {row.getValue('code')}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('redemptions.fields.status')} />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
      let label = t('redemptions.status.unknown');

      if (status === 'active') {
        variant = 'default'; // or success if available in custom theme, otherwise default (black/primary)
        label = t('redemptions.status.active');
      } else if (status === 'used') {
        variant = 'secondary';
        label = t('redemptions.status.used');
      } else if (status === 'disabled') {
        variant = 'destructive';
        label = t('redemptions.status.expired');
      }

      return <Badge variant={variant}>{label}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'quota',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('redemptions.fields.quota')} />
    ),
    cell: ({ row }) => {
      const quota = row.getValue('quota') as number;
      return (
        <div className='flex items-center'>
          <span>{quota}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'max_uses',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('redemptions.fields.max_uses')} />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex items-center'>
          <span>{row.getValue('max_uses')}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'used_times',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('redemptions.fields.used_times')} />
    ),
    cell: ({ row }) => {
      return (
        <div className='flex items-center'>
          <span>{row.getValue('used_times')}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('redemptions.fields.createdTime')} />
    ),
    cell: ({ row }) => {
      const ts = row.getValue('created_at') as string;
      return (
        <div className='flex w-[100px] items-center'>
          <span>{ts ? format(new Date(ts), 'yyyy-MM-dd HH:mm') : '-'}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
