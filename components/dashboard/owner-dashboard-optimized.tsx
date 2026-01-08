'use client'

import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Settings, BarChart3, Crown } from 'lucide-react'
import Link from 'next/link'
import { PreviewDropdown } from '@/components/preview/preview-dropdown'
import { usePreview } from '@/hooks/use-preview'
import {
  UserMetricsSection,
  UsersByRoleSection,
  SystemKPIsSection,
  RecentLoginsSection,
} from './owner-dashboard-sections'
import {
  OwnerKPIsSkeleton,
  UsersByRoleSkeleton,
  SystemKPIsSkeleton,
  RecentLoginsSkeleton,
} from './owner-dashboard-skeleton'
import type { OwnerUserMetrics, OwnerSystemKPIs, RecentLogin } from '@/lib/dashboard-cache-actions'

interface OwnerDashboardOptimizedProps {
  // Initial data for immediate display (KPIs shown first)
  initialUserMetrics?: OwnerUserMetrics
  initialSystemKPIs?: OwnerSystemKPIs
  initialRecentLogins?: RecentLogin[]
}

/**
 * Optimized Owner Dashboard with progressive loading
 * - Shows KPIs immediately
 * - Charts and tables load progressively with Suspense
 * - Uses cached data for < 500ms initial load
 */
export function OwnerDashboardOptimized({
  initialUserMetrics,
  initialSystemKPIs,
  initialRecentLogins,
}: OwnerDashboardOptimizedProps) {
  const { effectiveRole, setPreviewRole, canUsePreview } = usePreview()

  return (
    <div className="space-y-6">
      {/* Header - Always visible immediately */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-amber-500" />
            Owner Dashboard
          </h2>
          <p className="text-muted-foreground">
            System overview and user management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PreviewDropdown
            currentRole={effectiveRole}
            onRoleSelect={setPreviewRole}
            canUsePreview={canUsePreview}
          />
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/settings/users">
                <Settings className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button asChild>
              <Link href="/reports">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* User Metrics KPIs - Priority 1 (show immediately) */}
      <Suspense fallback={<OwnerKPIsSkeleton />}>
        {initialUserMetrics ? (
          <UserMetricsSection data={initialUserMetrics} />
        ) : (
          <OwnerKPIsSkeleton />
        )}
      </Suspense>

      {/* Users by Role - Priority 2 */}
      <Suspense fallback={<UsersByRoleSkeleton />}>
        {initialUserMetrics ? (
          <UsersByRoleSection data={initialUserMetrics} />
        ) : (
          <UsersByRoleSkeleton />
        )}
      </Suspense>

      {/* System KPIs - Priority 3 */}
      <Suspense fallback={<SystemKPIsSkeleton />}>
        {initialSystemKPIs ? (
          <SystemKPIsSection data={initialSystemKPIs} />
        ) : (
          <SystemKPIsSkeleton />
        )}
      </Suspense>

      {/* Recent Logins - Priority 4 (load last) */}
      <Suspense fallback={<RecentLoginsSkeleton />}>
        {initialRecentLogins ? (
          <RecentLoginsSection data={initialRecentLogins} />
        ) : (
          <RecentLoginsSkeleton />
        )}
      </Suspense>
    </div>
  )
}
