import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Row } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Redemption } from '../data/schema';
import { useState } from 'react';
import { RedemptionsActionDialog } from './redemptions-action-dialog';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
  const { t } = useTranslation();
  const redemption = row.original as Redemption;
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Can only void active redemptions
  const canVoid = redemption.status === 'active';

  return (
    <>
      <RedemptionsActionDialog
        key='void'
        open={showVoidDialog}
        onOpenChange={setShowVoidDialog}
        redemption={redemption}
        mode='void'
      />
      <RedemptionsActionDialog
        key='delete'
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        redemption={redemption}
        mode='delete'
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'>
            <DotsHorizontalIcon className='h-4 w-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[160px]'>
          {canVoid && (
            <DropdownMenuItem onSelect={() => setShowVoidDialog(true)}>
              {t('common.buttons.void')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowDeleteDialog(true)}>
            {t('common.buttons.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
