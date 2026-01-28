import { ColumnDef } from '@tanstack/react-table';
import { TFunction } from 'i18next';
import { ConsumptionRecord } from '@/lib/api-client';

export const createUsageColumns = (t: TFunction): ColumnDef<ConsumptionRecord>[] => [
  {
    accessorKey: 'model',
    header: t('topup.usage.model'),
    cell: ({ row }) => <div className="font-medium">{row.getValue('model')}</div>,
  },
  {
    accessorKey: 'total_tokens',
    header: t('topup.usage.tokens'),
    cell: ({ row }) => <div>{row.getValue('total_tokens')}</div>,
  },
  {
    accessorKey: 'quota',
    header: t('topup.usage.cost'),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('quota'));
      return <div className="font-mono">{amount.toFixed(6)}</div>;
    },
  },
  {
    accessorKey: 'created_at',
    header: t('topup.usage.time'),
    cell: ({ row }) => {
      return (
        <div className="text-muted-foreground text-sm">
          {new Date(row.getValue('created_at')).toLocaleString()}
        </div>
      );
    },
  },
];
