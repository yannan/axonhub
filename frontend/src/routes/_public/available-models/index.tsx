import { createFileRoute } from '@tanstack/react-router';
import { ModelsPage } from '@/features/landing/models-page';

export const Route = createFileRoute('/_public/available-models/')({
  component: ModelsPage,
});
