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
import { useEnablePricing } from '../data/pricing';
import { Pricing } from '../data/schema';

interface Props {
    pricing: Pricing | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PricingEnableDialog({ pricing, open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const enablePricing = useEnablePricing();

    const handleEnable = async () => {
        if (!pricing) return;

        try {
            await enablePricing.mutateAsync(pricing.model);
            onOpenChange(false);
        } catch (_error) {
            // Error is handled by the mutation hook
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('pricing.dialogs.enable.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('pricing.dialogs.enable.description', { model: pricing?.model || '' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEnable} disabled={enablePricing.isPending}>
                        {enablePricing.isPending ? t('common.buttons.saving') : t('pricing.buttons.enable')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
