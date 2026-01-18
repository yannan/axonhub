'use client';

import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeletePricing } from '../data/pricing';
import { Pricing } from '../data/schema';

interface Props {
    pricing: Pricing | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PricingDeleteDialog({ pricing, open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const deletePricing = useDeletePricing();

    const handleDelete = async () => {
        if (!pricing) return;

        try {
            await deletePricing.mutateAsync(pricing.model);
            onOpenChange(false);
        } catch (_error) {
            // Error is handled by the mutation hook
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('pricing.dialogs.delete.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('pricing.dialogs.delete.description', { model: pricing?.model || '' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deletePricing.isPending} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                        {deletePricing.isPending ? t('common.buttons.deleting') : t('common.buttons.delete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
