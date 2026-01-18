import { ProjectGuard } from '@/components/project-guard';
import ProjectBillingPage from '@/features/project-billing';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/project/billing/')({
  component: () => (
    <ProjectGuard>
      <ProjectBillingPage />
    </ProjectGuard>
  ),
});
