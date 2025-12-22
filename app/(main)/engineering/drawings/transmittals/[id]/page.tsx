'use client';

// Transmittal Detail Page
// View and manage a single transmittal

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { TransmittalDetail } from '@/components/drawings/transmittal-detail';
import { getTransmittalById } from '@/lib/drawing-actions';
import { DrawingTransmittalWithDetails } from '@/types/drawing';

interface TransmittalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TransmittalDetailPage({ params }: TransmittalDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [transmittal, setTransmittal] = useState<DrawingTransmittalWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransmittal();
  }, [id]);

  const loadTransmittal = async () => {
    setLoading(true);
    try {
      const data = await getTransmittalById(id);
      if (!data) {
        router.push('/engineering/drawings/transmittals');
        return;
      }
      setTransmittal(data);
    } catch (error) {
      console.error('Error loading transmittal:', error);
      router.push('/engineering/drawings/transmittals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!transmittal) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <TransmittalDetail transmittal={transmittal} onRefresh={loadTransmittal} />
    </div>
  );
}
