import { createFileRoute } from '@tanstack/react-router';
import { PublicLayout } from '@/public-layout';

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});
