'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { DepreciationSchedule, DepreciationHistory } from '@/components/costing';
import { getDepreciationHistory } from '@/lib/depreciation-actions';
import { generateDepreciationSchedule } from '@/lib/depreciation-utils';
import { createClient } from '@/lib/supabase/client';
import { AssetDepreciation, DepreciationProjection } from '@/types/depreciation';
import { DepreciationMethod } from '@/types/assets';
import { formatIDR } from '@/lib/pjo-utils';
import { toast } from 'sonner';

interface DepreciationClientProps {
  assetId: string;
}

interface AssetInfo {
  assetCode: string;
  assetName: string;
  purchasePrice: number;
  bookValue: number;
  salvageValue: number;
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
}

export function DepreciationClient({ assetId }: DepreciationClientProps) {
  const router = useRouter();
  const [asset, setAsset] = useState<AssetInfo | null>(null);
  const [history, setHistory] = useState<AssetDepreciation[]>([]);
  const [projections, setProjections] = useState<DepreciationProjection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get asset details
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('asset_code, asset_name, purchase_price, book_value, salvage_value, depreciation_method, useful_life_years, accumulated_depreciation')
        .eq('id', assetId)
        .single();

      if (assetError || !assetData) {
        toast.error('Asset not found');
        router.push('/equipment');
        return;
      }

      const assetInfo: AssetInfo = {
        assetCode: assetData.asset_code,
        assetName: assetData.asset_name,
        purchasePrice: assetData.purchase_price || 0,
        bookValue: assetData.book_value || assetData.purchase_price || 0,
        salvageValue: assetData.salvage_value || 0,
        depreciationMethod: (assetData.depreciation_method || 'straight_line') as DepreciationMethod,
        usefulLifeYears: assetData.useful_life_years || 5,
        accumulatedDepreciation: assetData.accumulated_depreciation || 0,
      };
      setAsset(assetInfo);

      // Generate projections
      const schedule = generateDepreciationSchedule(
        assetInfo.depreciationMethod,
        assetInfo.purchasePrice,
        assetInfo.bookValue,
        assetInfo.salvageValue,
        assetInfo.usefulLifeYears,
        assetInfo.accumulatedDepreciation,
        60
      );
      setProjections(schedule);

      // Get depreciation history
      const historyResult = await getDepreciationHistory(assetId);
      if (historyResult.success && historyResult.data) {
        setHistory(historyResult.data);
      }
    } catch (error) {
      console.error('Error loading depreciation data:', error);
      toast.error('Failed to load depreciation data');
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Depreciation - {asset.assetCode}
          </h1>
          <p className="text-muted-foreground">{asset.assetName}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Purchase Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(asset.purchasePrice)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Book Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(asset.bookValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accumulated Depreciation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatIDR(asset.accumulatedDepreciation)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Salvage Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(asset.salvageValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Depreciation Schedule</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Projected Depreciation Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <DepreciationSchedule projections={projections} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Depreciation History</CardTitle>
            </CardHeader>
            <CardContent>
              <DepreciationHistory records={history} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
