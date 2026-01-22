import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onFilterChange: (value: string) => void;
  filterValue: string;
}

export function DataTableToolbar<TData>({
  table,
  onFilterChange,
  filterValue,
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation();
  const isFiltered = filterValue.length > 0;

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 items-center space-x-2'>
        <Input
          placeholder={t('redemptions.filter.placeholder')}
          value={filterValue}
          onChange={(event) => onFilterChange(event.target.value)}
          className='h-8 w-[150px] lg:w-[250px]'
        />
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => onFilterChange('')}
            className='h-8 px-2 lg:px-3'
          >
            {t('common.reset')}
            <Cross2Icon className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
