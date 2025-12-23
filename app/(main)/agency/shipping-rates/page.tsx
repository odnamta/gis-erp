import { Suspense } from 'react';
import { ShippingRatesClient } from './shipping-rates-client';

export default function ShippingRatesPage() {
  return (
    <Suspense fallback={<ShippingRatesPageSkeleton />}>
      <ShippingRatesClient />
    </Suspense>
  );
}

function ShippingRatesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-36 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Search form skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="mt-4 h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Results skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
