import { fetchFinancialAnalyticsData } from '@/lib/financial-analytics-actions';
import { FinancialAnalyticsClient } from '@/components/financial-analytics/financial-analytics-client';

export const metadata = {
  title: 'Financial Analytics | Executive Dashboard',
  description: 'Deep-dive financial analytics with cash flow tracking and profitability reports',
};

export default async function FinancialAnalyticsPage() {
  // Default to current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Fetch initial data
  const initialData = await fetchFinancialAnalyticsData(year, month);

  return (
    <div className="container mx-auto py-6">
      <FinancialAnalyticsClient
        initialData={initialData}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
