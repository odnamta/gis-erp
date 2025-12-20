import { Metadata } from 'next';
import { PayrollPeriodList } from '@/components/payroll';
import { getPayrollPeriods } from './actions';

export const metadata: Metadata = {
  title: 'Payroll | Gama ERP',
  description: 'Manage employee payroll and salary processing',
};

export default async function PayrollPage() {
  const periods = await getPayrollPeriods();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll</h1>
        <p className="text-muted-foreground">
          Manage monthly payroll processing and salary slips
        </p>
      </div>

      <PayrollPeriodList periods={periods} />
    </div>
  );
}
