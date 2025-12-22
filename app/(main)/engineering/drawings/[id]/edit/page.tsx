'use client';

// Edit Drawing Page
// Edit an existing engineering drawing

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { DrawingForm } from '@/components/drawings/drawing-form';
import { getDrawingById } from '@/lib/drawing-actions';
import { DrawingWithDetails } from '@/types/drawing';

interface EditDrawingPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDrawingPage({ params }: EditDrawingPageProps) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Drawing</h1>
        <p className="text-muted-foreground">
          Editing: {drawing.drawing_number} - {drawing.title}
        </p>
      </div>

      <DrawingForm drawing={drawing} mode="edit" />
    </div>
  );
}
