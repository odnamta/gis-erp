'use client';

// Transmittals List Page
// View all drawing transmittals

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TransmittalList } from '@/components/drawings/transmittal-list';
import { getTransmittals } from '@/lib/drawing-actions';
import { DrawingTransmittalWithDetails } from '@/types/drawing';

export default function TransmittalsPage() {
  const [transmittals, setTransmittals] = useState<DrawingTransmittalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransmittals();
  }, []);

  const loadTransmittals = async () => {
    setLoading(true);
    try {
      const data = await getTransmittals();
      setTransmittals(data);
    } catch (error) {
      console.error('Error loading transmittals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drawing Transmittals</h1>
          <p className="text-muted-foreground">
            Manage drawing distribution to external parties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/engineering/drawings">Back to Drawings</Link>
          </Button>
          <Button asChild>
            <Link href="/engineering/drawings/transmittals/new">
              <Plus className="h-4 w-4 mr-2" />
              New Transmittal
            </Link>
          </Button>
        </div>
      </div>

      {/* Transmittal List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <TransmittalList transmittals={transmittals} />
      )}
    </div>
  );
}
