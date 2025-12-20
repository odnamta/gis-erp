import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PayrollProcessingView } from '@/components/payroll';
import { getPayrollPeriod, getPayrollRecords } from '../actions';

export const metadata: Metadata = {
  title: 'Payroll Processing | Gama ERP',
  description: 'Process employee payroll for the period',
};

interface PayrollProcessingPageProps {
  params: Promise<{ periodId: string }>;
}

export default async function PayrollProcessingPage({ params }: PayrollProcessingPageProps) {
  const { periodId } = await params;
  
  const [period, records] = await Promise.all([
    getPayrollPeriod(periodId),
    getPayrollRecords(periodId),
  ]);

  if (!period) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <PayrollProcessingView period={period} records={records} />
    </div>
  );
}
