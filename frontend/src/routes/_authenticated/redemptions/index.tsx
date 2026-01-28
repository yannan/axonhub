import { createFileRoute } from '@tanstack/react-router';
import { RouteGuard } from '@/components/route-guard';

import Redemptions from '@/features/redemptions';

function ProtectedRedemptions() {
  return (
    <RouteGuard requiredScopes={['read_system']}>
      <Redemptions />
    </RouteGuard>
  );
}

export const Route = createFileRoute('/_authenticated/redemptions/')({
  component: ProtectedRedemptions,
});
