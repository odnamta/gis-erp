import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { JmpStatusCards } from '@/components/jmp/jmp-status-cards';
import { JmpListWrapper } from '@/components/jmp/jmp-list-wrapper';
import { getJmpStatusCounts, getJmpList, getCustomersForSelection } from '@/lib/jmp-actions';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

async function JmpContent() {
  const [statusCounts, jmps, customers] = await Promise.all([
    getJmpStatusCounts(),
    getJmpList({ status: 'all', customerId: 'all', search: '' }),
    getCustomersForSelection(),
  ]);

  return (
    <div className="space-y-6">
      <JmpStatusCards counts={statusCounts} />
      <JmpListWrapper initialJmps={jmps} customers={customers} />
    </div>
  );
}

export default function JmpPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journey Management Plans</h1>
          <p className="text-muted-foreground">
            Plan and track heavy-haul journeys with detailed checkpoints and risk assessments
          </p>
        </div>
        <Link
          href="/engineering/jmp/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New JMP
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        }
      >
        <JmpContent />
      </Suspense>
    </div>
  );
}
