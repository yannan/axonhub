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
import { Pricing } from '../data/schema';
import { useDisablePricing } from '../data/pricing';

interface Props {
    pricing: Pricing | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PricingDisableDialog({ pricing, open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const disablePricing = useDisablePricing();

    const handleDisable = async () => {
        if (!pricing) return;

        try {
            await disablePricing.mutateAsync(pricing.model);
            onOpenChange(false);
        } catch (_error) {
            // Error is handled by the mutation hook
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('pricing.dialogs.disable.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('pricing.dialogs.disable.description', { model: pricing?.model || '' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisable} disabled={disablePricing.isPending}>
                        {disablePricing.isPending ? t('common.buttons.saving') : t('pricing.buttons.disable')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
