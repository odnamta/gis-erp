'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for Owner Dashboard KPIs section
 */
export function OwnerKPIsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Loading skeleton for Users by Role section
 */
export function UsersByRoleSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-6" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for System KPIs section
 */
export function SystemKPIsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Loading skeleton for Recent Logins table
 */
export function RecentLoginsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table header */}
          <div className="flex gap-4 pb-2 border-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Table rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Full Owner Dashboard skeleton
 */
export function OwnerDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>

      {/* User Metrics */}
      <OwnerKPIsSkeleton />

      {/* Users by Role */}
      <UsersByRoleSkeleton />

      {/* System KPIs */}
      <SystemKPIsSkeleton />

      {/* Recent Logins */}
      <RecentLoginsSkeleton />
    </div>
  )
}
