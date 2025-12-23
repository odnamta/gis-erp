import { Suspense } from 'react';
import { EditShippingRateClient } from './edit-shipping-rate-client';

interface EditShippingRatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditShippingRatePage({ params }: EditShippingRatePageProps) {
  const { id } = await params;
  
  return (
    <Suspense fallback={<EditShippingRatePageSkeleton />}>
      <EditShippingRateClient id={id} />
    </Suspense>
  );
}

function EditShippingRatePageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-6 w-24 bg-muted animate-pulse rounded mb-2" />
        <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
      </div>
      
      {/* Form skeleton */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
