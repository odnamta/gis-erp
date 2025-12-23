import { Suspense } from 'react';
import { ServiceProvidersClient } from './service-providers-client';

export default function ServiceProvidersPage() {
  return (
    <Suspense fallback={<ServiceProvidersPageSkeleton />}>
      <ServiceProvidersClient />
    </Suspense>
  );
}

function ServiceProvidersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-44 bg-muted animate-pulse rounded" />
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
        <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 h-56" />
        ))}
      </div>
    </div>
  );
}
