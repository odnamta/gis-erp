/**
 * Guided Tours Page
 * v0.37: Training Mode / Guided Tours
 * 
 * Route: /help/tours
 */

import { TourLauncherPage } from '@/components/guided-tours/tour-launcher-page';

export const metadata = {
  title: 'Guided Tours | Gama ERP',
  description: 'Learn the system step-by-step with interactive tutorials',
};

export default function ToursPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <TourLauncherPage />
    </div>
  );
}
