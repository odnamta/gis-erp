'use client';

// Drawing Detail Page
// View and manage a single drawing

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { DrawingDetailView } from '@/components/drawings/drawing-detail-view';
import { getDrawingById } from '@/lib/drawing-actions';
import { DrawingWithDetails } from '@/types/drawing';

interface DrawingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DrawingDetailPage({ params }: DrawingDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [drawing, setDrawing] = useState<DrawingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrawing();
  }, [id]);

  const loadDrawing = async () => {
    setLoading(true);
    try {
      const data = await getDrawingById(id);
      if (!data) {
        router.push('/engineering/drawings');
        return;
      }
      setDrawing(data);
    } catch (error) {
      console.error('Error loading drawing:', error);
      router.push('/engineering/drawings');
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

  if (!drawing) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <DrawingDetailView drawing={drawing} onRefresh={loadDrawing} />
    </div>
  );
}
