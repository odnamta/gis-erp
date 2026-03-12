'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CostBreakdownChart } from './cost-breakdown-chart';
import { getJobCustomsCosts, getFeesByJob } from '@/lib/fee-actions';
import { aggregateFeesByCategory, formatFeeAmount } from '@/lib/fee-utils';
import { JobCustomsCostSummary, CustomsFeeWithRelations } from '@/types/customs-fees';
import { Receipt, ExternalLink, Loader2 } from 'lucide-react';

interface JobCustomsSectionProps {
  jobOrderId: string;
}

export function JobCustomsSection({ jobOrderId }: JobCustomsSectionProps) {
  const [summary, setSummary] = useState<JobCustomsCostSummary | null>(null);
  const [fees, setFees] = useState<CustomsFeeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [summaryData, feesData] = await Promise.all([
          getJobCustomsCosts(jobOrderId),
          getFeesByJob(jobOrderId),
        ]);
        setSummary(summaryData);
        setFees(feesData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobOrderId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Customs Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // If no fees linked to this job
  if (!summary || fees.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Customs Costs
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/customs/fees?job_order_id=${jobOrderId}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View All Fees
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No customs fees linked to this job order.
          </div>
        </CardContent>
      </Card>
    );
  }

  const aggregatedData = aggregateFeesByCategory(fees);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Customs Costs Summary
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/customs/fees?job_order_id=${jobOrderId}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View All Fees
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Summary */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Customs Cost</p>
                  <p className="text-2xl font-bold">
                    {formatFeeAmount(summary.total_customs_cost, 'IDR')}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Fees Count</p>
                  <p className="text-2xl font-bold">{fees.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm text-green-600">Paid</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatFeeAmount(summary.total_paid, 'IDR')}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <p className="text-sm text-yellow-600">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatFeeAmount(summary.total_pending, 'IDR')}
                  </p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2">
                <p className="text-sm font-medium">By Category</p>
                <div className="space-y-1">
                  {summary.total_duties > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duties</span>
                      <span>{formatFeeAmount(summary.total_duties, 'IDR')}</span>
                    </div>
                  )}
                  {summary.total_taxes > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes</span>
                      <span>{formatFeeAmount(summary.total_taxes, 'IDR')}</span>
                    </div>
                  )}
                  {summary.total_services > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Services</span>
                      <span>{formatFeeAmount(summary.total_services, 'IDR')}</span>
                    </div>
                  )}
                  {summary.total_storage > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Storage</span>
                      <span>{formatFeeAmount(summary.total_storage, 'IDR')}</span>
                    </div>
                  )}
                  {summary.total_penalties > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Penalties</span>
                      <span className="text-red-600">{formatFeeAmount(summary.total_penalties, 'IDR')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart */}
            <CostBreakdownChart data={aggregatedData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
