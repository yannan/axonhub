import { createFileRoute } from '@tanstack/react-router';
import { ProjectGuard } from '@/components/project-guard';
import { RouteGuard } from '@/components/route-guard';
import Topup from '@/features/topup';

function ProtectedProjectTopup() {
  return (
    <ProjectGuard>
      <RouteGuard requiredScopes={['read_topup']}>
        <Topup />
      </RouteGuard>
    </ProjectGuard>
  );
}

export const Route = createFileRoute('/_authenticated/project/topup/')({
  component: ProtectedProjectTopup,
});
