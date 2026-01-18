import { createFileRoute } from '@tanstack/react-router';
import { RouteGuard } from '@/components/route-guard';
import PricingManagement from '@/features/pricing';

function ProtectedPricing() {
    return (
        <RouteGuard requiredScopes={['read_system']}>
            <PricingManagement />
        </RouteGuard>
    );
}

export const Route = createFileRoute('/_authenticated/pricing/')({
    component: ProtectedPricing,
});
