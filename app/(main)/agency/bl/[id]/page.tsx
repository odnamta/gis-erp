import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { BLDetail } from './bl-detail';
import { getBillOfLading } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BLDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BLDetailPage({ params }: BLDetailPageProps) {
  const { id } = await params;
  
  const bl = await getBillOfLading(id);

  if (!bl) {
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
      <BLDetail bl={bl} />
    </Suspense>
  );
}
