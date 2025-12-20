'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign } from 'lucide-react';
import { formatManpowerCurrency } from '@/lib/manpower-cost-utils';

interface ManpowerCostSummaryCardProps {
  totalCompanyCost: number;
  employeeCount: number;
  isLoading?: boolean;
}

export function ManpowerCostSummaryCard({
  totalCompanyCost,
  employeeCount,
  isLoading,
}: ManpowerCostSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48 bg-blue-400/30" />
              <Skeleton className="h-10 w-64 bg-blue-400/30" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 bg-blue-400/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">
              Total Company Manpower Cost
            </p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">
              {formatManpowerCurrency(totalCompanyCost)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-500/30 rounded-lg px-4 py-2">
              <Users className="h-5 w-5" />
              <div>
                <p className="text-xs text-blue-100">Employees</p>
                <p className="text-xl font-semibold">{employeeCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/30 rounded-lg px-4 py-2">
              <DollarSign className="h-5 w-5" />
              <div>
                <p className="text-xs text-blue-100">Avg/Employee</p>
                <p className="text-xl font-semibold">
                  {employeeCount > 0
                    ? formatManpowerCurrency(Math.round(totalCompanyCost / employeeCount))
                    : 'Rp 0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
