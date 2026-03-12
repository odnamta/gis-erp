import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileHasRole } from '@/lib/auth-utils'
import { getAgencyDashboardMetrics } from '@/lib/dashboard/agency-data'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { Ship, FileText, Anchor, Package, Clock, CheckCircle } from 'lucide-react'

export const metadata = {
  title: 'Agency Dashboard | Gama ERP',
  description: 'Agency division operations overview',
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    requested: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    amended: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    shipped: 'bg-purple-100 text-purple-800',
    completed: 'bg-emerald-100 text-emerald-800',
    submitted: 'bg-blue-100 text-blue-800',
    issued: 'bg-green-100 text-green-800',
    released: 'bg-purple-100 text-purple-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function AgencyDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Parallelize profile check + metrics fetch
  const [profileResult, metricsResult] = await Promise.allSettled([
    supabase.from('user_profiles').select('role').eq('user_id', user.id).single(),
    getAgencyDashboardMetrics(),
  ])

  const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null
  if (!profile) {
    redirect('/login')
  }

  // Only agency role (or owner/director) can access
  const allowedRoles = ['agency', 'owner', 'director']
  if (!profileHasRole(profile as any, allowedRoles)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    redirect('/dashboard')
  }

  if (metricsResult.status === 'rejected') throw metricsResult.reason
  const metrics = metricsResult.value

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agency Dashboard</h1>
        <p className="text-muted-foreground">
          Shipping operations, bookings, and B/L management
        </p>
      </div>

      {/* Booking Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Booking Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Active Bookings</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.activeBookings)}</div>
            <p className="text-sm text-muted-foreground">In progress</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">This Month</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.bookingsThisMonth)}</div>
            <p className="text-sm text-muted-foreground">Bookings created</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <h3 className="font-semibold text-sm">Pending Confirmation</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.pendingConfirmations)}</div>
            <p className="text-sm text-muted-foreground">Awaiting carrier</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold text-sm">Completed</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.completedThisMonth)}</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </div>
        </div>
      </div>

      {/* Shipping Lines & B/L Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shipping Lines */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Shipping Lines</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Total Lines</h3>
              </div>
              <div className="text-2xl font-bold mt-2">{formatNumber(metrics.totalShippingLines)}</div>
              <p className="text-sm text-muted-foreground">Active carriers</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-sm">Most Used</h3>
              <div className="text-lg font-bold mt-2 truncate" title={metrics.mostUsedShippingLine}>
                {metrics.mostUsedShippingLine}
              </div>
              <p className="text-sm text-muted-foreground">By booking count</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-sm">Preferred</h3>
              <div className="text-2xl font-bold mt-2">{formatNumber(metrics.preferredLinesCount)}</div>
              <p className="text-sm text-muted-foreground">Preferred carriers</p>
            </div>
          </div>
        </div>

        {/* B/L Statistics */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Bills of Lading</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" />
                <h3 className="font-semibold text-sm">Issued</h3>
              </div>
              <div className="text-2xl font-bold mt-2">{formatNumber(metrics.blIssuedThisMonth)}</div>
              <p className="text-sm text-muted-foreground">This month</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Pending</h3>
              </div>
              <div className="text-2xl font-bold mt-2">{formatNumber(metrics.blPendingIssuance)}</div>
              <p className="text-sm text-muted-foreground">Awaiting issuance</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Draft</h3>
              </div>
              <div className="text-2xl font-bold mt-2">{formatNumber(metrics.blDraftCount)}</div>
              <p className="text-sm text-muted-foreground">In preparation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vessel & Container Status */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Vessel & Container Status</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Arrivals This Week</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.upcomingArrivals)}</div>
            <p className="text-sm text-muted-foreground">Scheduled vessels</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              <h3 className="font-semibold text-sm">In Transit</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.containersInTransit)}</div>
            <p className="text-sm text-muted-foreground">Containers shipped</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Expected (7 days)</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.expectedArrivals)}</div>
            <p className="text-sm text-muted-foreground">Upcoming arrivals</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Bookings</h2>
          <div className="rounded-lg border">
            {metrics.recentBookings.length > 0 ? (
              <div className="divide-y">
                {metrics.recentBookings.map((booking) => (
                  <div key={booking.id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{booking.bookingNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">{booking.customerName}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <StatusBadge status={booking.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(booking.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent bookings
              </div>
            )}
          </div>
        </div>

        {/* Recent B/Ls */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Bills of Lading</h2>
          <div className="rounded-lg border">
            {metrics.recentBLs.length > 0 ? (
              <div className="divide-y">
                {metrics.recentBLs.map((bl) => (
                  <div key={bl.id} className="p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{bl.blNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">{bl.vesselName}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <StatusBadge status={bl.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {bl.issuedAt ? formatDate(bl.issuedAt) : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent B/Ls issued
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
