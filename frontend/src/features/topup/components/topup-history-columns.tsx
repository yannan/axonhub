import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/data-table-column-header';
import { TopupHistoryItem } from '../data/schema';
import { format } from 'date-fns';

export const createColumns = (t: any): ColumnDef<TopupHistoryItem>[] => [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => <div className="w-[80px] truncate">{row.getValue('id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('topup.history.amount')} />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      return (
        <div className="font-medium">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('topup.history.type')} />
    ),
    cell: ({ row }) => <Badge variant="outline">{row.getValue('type')}</Badge>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('topup.history.status')} />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={status === 'SUCCESS' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_time',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('topup.history.time')} />
    ),
    cell: ({ row }) => {
      const ts = row.getValue('created_time') as number;
      return (
        <div className="w-[120px]">
          {ts ? format(new Date(ts * 1000), 'yyyy-MM-dd HH:mm') : '-'}
        </div>
      );
    },
  },
];
