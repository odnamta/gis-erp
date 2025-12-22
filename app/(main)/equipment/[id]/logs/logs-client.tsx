'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DailyLogForm } from '@/components/utilization/daily-log-form';
import { DailyLogTable } from '@/components/utilization/daily-log-table';
import { AssetDailyLog } from '@/types/utilization';
import { Asset } from '@/types/assets';
import { getAssetById } from '@/lib/asset-actions';
import { getDailyLogs } from '@/lib/utilization-actions';
import { toast } from 'sonner';

interface JobOrder {
  id: string;
  jo_number: string;
  customer_name?: string;
}

export function LogsClient() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [logs, setLogs] = useState<AssetDailyLog[]>([]);
  const [jobOrders] = useState<JobOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assetResult, logsResult] = await Promise.all([
        getAssetById(assetId),
        getDailyLogs(assetId, dateFrom, dateTo),
      ]);

      if (!assetResult) {
        toast.error('Asset not found');
        router.push('/equipment');
        return;
      }

      setAsset(assetResult);
      if (logsResult.success && logsResult.data) {
        setLogs(logsResult.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [assetId, dateFrom, dateTo, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (from?: string, to?: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/equipment/${assetId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8" />
              Daily Logs
            </h1>
            <p className="text-muted-foreground">
              {asset.asset_code} • {asset.asset_name}
            </p>
          </div>
        </div>

        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Today
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Registration</p>
              <p className="font-medium">{asset.registration_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{asset.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Odometer</p>
              <p className="font-medium">{asset.current_units?.toLocaleString() || 0} km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="font-medium">{logs.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DailyLogTable
        logs={logs}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onFilterChange={handleFilterChange}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Daily Utilization</DialogTitle>
          </DialogHeader>
          <DailyLogForm
            assetId={assetId}
            assetCode={asset.asset_code}
            assetName={asset.asset_name}
            currentOdometer={asset.current_units}
            jobOrders={jobOrders}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
