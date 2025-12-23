import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SIDetail } from './si-detail';
import { getShippingInstruction, getBillsOfLading } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface SIDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SIDetailPage({ params }: SIDetailPageProps) {
  const { id } = await params;
  
  const [si, availableBLs] = await Promise.all([
    getShippingInstruction(id),
    getBillsOfLading({}), // Get all B/Ls for linking
  ]);

  if (!si) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SIDetail si={si} availableBLs={availableBLs} />
    </Suspense>
  );
}
