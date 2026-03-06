'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VesselList } from '@/components/vessel-tracking/vessel-list';
import { Vessel, ShippingLine } from '@/types/agency';
import { getVessels } from '@/app/actions/vessel-tracking-actions';
import { getShippingLines } from '@/app/actions/shipping-line-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface VesselStats {
  totalVessels: number;
  activeCount: number;
  underwayCount: number;
  mooredCount: number;
}

function calculateVesselStats(vessels: Vessel[]): VesselStats {
  return {
    totalVessels: vessels.length,
    activeCount: vessels.filter(v => v.isActive).length,
    underwayCount: vessels.filter(v => v.currentStatus === 'underway').length,
    mooredCount: vessels.filter(v => v.currentStatus === 'moored').length,
  };
}

export function VesselsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [stats, setStats] = useState<VesselStats>({
    totalVessels: 0,
    activeCount: 0,
    underwayCount: 0,
    mooredCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vesselsData, shippingLinesResult] = await Promise.all([
        getVessels({ isActive: true }),
        getShippingLines(),
      ]);

      setVessels(vesselsData);
      setStats(calculateVesselStats(vesselsData));

      if (shippingLinesResult.success && shippingLinesResult.data) {
        setShippingLines(shippingLinesResult.data);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load vessels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <VesselList
      initialVessels={vessels}
      initialStats={stats}
      shippingLines={shippingLines}
    />
  );
}
