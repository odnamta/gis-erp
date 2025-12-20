import { Metadata } from 'next';
import { ManpowerCostDashboard } from '@/components/manpower-cost/manpower-cost-dashboard';
import { getManpowerCostDashboardData, getAvailablePeriods } from './actions';

export const metadata: Metadata = {
  title: 'Manpower Cost Analysis | Gama ERP',
  description: 'Track and analyze labor costs by department',
};

export default async function ManpowerCostPage() {
  // Get current date for default period
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Fetch initial data
  const [dashboardData, availablePeriods] = await Promise.all([
    getManpowerCostDashboardData(currentYear, currentMonth),
    getAvailablePeriods(),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <ManpowerCostDashboard
        initialData={dashboardData}
        availablePeriods={availablePeriods}
        initialYear={currentYear}
        initialMonth={currentMonth}
      />
    </div>
  );
}
