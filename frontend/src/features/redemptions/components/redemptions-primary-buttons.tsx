import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { RedemptionsActionDialog } from './redemptions-action-dialog';

export function RedemptionsPrimaryButtons() {
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <>
      <RedemptionsActionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode='create'
      />
      <Button onClick={() => setShowCreateDialog(true)}>
        <PlusIcon className='mr-2 h-4 w-4' />
        {t('redemptions.actions.create')}
      </Button>
    </>
  );
}
