import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/features/landing/landing-page';

export const Route = createFileRoute('/_public/')({
  component: LandingPage,
});
