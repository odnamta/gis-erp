import { Suspense } from 'react'
import { EquipmentClient } from './equipment-client'

export default function EquipmentPage() {
  return (
    <Suspense fallback={<EquipmentPageSkeleton />}>
      <EquipmentClient />
    </Suspense>
  )
}

function EquipmentPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
          <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
          </div>
        ))}
      </div>
      
      {/* Filters skeleton */}
      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
        <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="h-12 bg-muted/50 border-b" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b last:border-0" />
        ))}
      </div>
    </div>
  )
}
