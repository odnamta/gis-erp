import { Suspense } from 'react';
import { ShippingRatesManageClient } from './shipping-rates-manage-client';

export default function ShippingRatesManagePage() {
  return (
    <Suspense fallback={<ShippingRatesManagePageSkeleton />}>
      <ShippingRatesManageClient />
    </Suspense>
  );
}

function ShippingRatesManagePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-36 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
