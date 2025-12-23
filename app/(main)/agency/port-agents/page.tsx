import { Suspense } from 'react';
import { PortAgentsClient } from './port-agents-client';

export default function PortAgentsPage() {
  return (
    <Suspense fallback={<PortAgentsPageSkeleton />}>
      <PortAgentsClient />
    </Suspense>
  );
}

function PortAgentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-36 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
          </div>
        ))}
      </div>
      
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-44 bg-muted animate-pulse rounded" />
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Country group skeleton */}
      <div className="space-y-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-7 w-32 bg-muted animate-pulse rounded" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="rounded-lg border bg-card p-6 h-56" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
