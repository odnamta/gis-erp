'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { CostHistoryTable, CostBreakdownChart } from '@/components/costing';
import { getCostHistory, getCostBreakdown } from '@/lib/depreciation-actions';
import { createClient } from '@/lib/supabase/client';
import { AssetCostTracking, CostBreakdown } from '@/types/depreciation';
import { formatIDR } from '@/lib/pjo-utils';
import { toast } from 'sonner';

interface CostsClientProps {
  assetId: string;
}

interface AssetInfo {
  assetCode: string;
  assetName: string;
}

export function CostsClient({ assetId }: CostsClientProps) {
  const router = useRouter();
  const [asset, setAsset] = useState<AssetInfo | null>(null);
  const [costHistory, setCostHistory] = useState<AssetCostTracking[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get asset details
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('asset_code, asset_name')
        .eq('id', assetId)
        .single();

      if (assetError || !assetData) {
        toast.error('Asset not found');
        router.push('/equipment');
        return;
      }

      setAsset({
        assetCode: assetData.asset_code,
        assetName: assetData.asset_name,
      });

      // Get cost history and breakdown
      const [historyResult, breakdownResult] = await Promise.all([
        getCostHistory(assetId),
        getCostBreakdown(assetId),
      ]);

      if (historyResult.success && historyResult.data) {
        setCostHistory(historyResult.data);
        const total = historyResult.data.reduce((sum, c) => sum + c.amount, 0);
        setTotalCost(total);
      }

      if (breakdownResult.success && breakdownResult.data) {
        setCostBreakdown(breakdownResult.data);
      }
    } catch (error) {
      console.error('Error loading cost data:', error);
      toast.error('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  }, [assetId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/equipment/${assetId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Costs - {asset.assetCode}
          </h1>
          <p className="text-muted-foreground">{asset.assetName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Costs</p>
          <p className="text-2xl font-bold">{formatIDR(totalCost)}</p>
        </div>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Cost History ({costHistory.length})</TabsTrigger>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Cost Records</CardTitle>
            </CardHeader>
            <CardContent>
              <CostHistoryTable records={costHistory} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Cost Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CostBreakdownChart data={costBreakdown} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
