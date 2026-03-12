import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeeList } from '@/components/customs-fees/fee-list';
import { FeeSummaryCards } from '@/components/customs-fees/fee-summary-cards';
import { getFees, getFeeStatistics } from '@/lib/fee-actions';
import { Plus } from 'lucide-react';

export default async function CustomsFeesPage() {
  const [fees, statistics] = await Promise.all([
    getFees(),
    getFeeStatistics(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customs Fees</h1>
          <p className="text-muted-foreground">
            Track and manage customs-related fees and duties
          </p>
        </div>
        <Button asChild>
          <Link href="/customs/fees/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Fee
          </Link>
        </Button>
      </div>

      <FeeSummaryCards statistics={statistics} />

      <Card>
        <CardHeader>
          <CardTitle>All Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <FeeList fees={fees} />
        </CardContent>
      </Card>
    </div>
  );
}
