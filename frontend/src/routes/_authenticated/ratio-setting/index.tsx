import { createFileRoute } from '@tanstack/react-router';
import { RouteGuard } from '@/components/route-guard';

import RatioSetting from '@/features/ratio-setting';

function ProtectedRatioSettingPage() {
  return (
    <RouteGuard requiredScopes={['read_system']}>
      <RatioSetting />
    </RouteGuard>
  );
}

export const Route = createFileRoute('/_authenticated/ratio-setting/')({
  component: ProtectedRatioSettingPage,
});
