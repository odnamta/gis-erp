import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileHasRole } from '@/lib/auth-utils'
import { getOperationsManagerDashboardData } from '@/lib/operations-manager-dashboard-utils'
import { formatCurrencyIDR } from '@/lib/utils/format'
import { format } from 'date-fns'

export default async function OperationsManagerDashboardPage() {
  const supabase = await createClient()

  // Auth check — getUser is required before profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Parallelize profile check + dashboard data (dashboard does its own auth internally)
  const [profileResult, dashboardResult] = await Promise.allSettled([
    supabase.from('user_profiles').select('role, email').eq('user_id', user.id).single(),
    getOperationsManagerDashboardData(),
  ])

  const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null
  if (!profile) {
    redirect('/login')
  }

  const hasAccess = profileHasRole(profile as any, ['operations_manager', 'owner', 'director']) // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!hasAccess) {
    redirect('/dashboard')
  }

  let data
  try {
    if (dashboardResult.status === 'rejected') throw dashboardResult.reason
    data = dashboardResult.value
  } catch {
    // Return fallback UI on error
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operations Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Operations execution, asset management, and team performance
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">Failed to load dashboard data. Please try refreshing the page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Operations execution, asset management, and team performance
        </p>
      </div>

      {/* Primary Focus: Operations & Assets */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Operations Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-green-700">Operations Department</h2>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 bg-green-50">
              <h3 className="font-semibold">Active Jobs</h3>
              <p className="text-sm text-muted-foreground">Jobs in progress</p>
              <div className="text-2xl font-bold text-green-700 mt-2">{data.jobMetrics.activeJobs}</div>
            </div>
            <div className="rounded-lg border p-4 bg-green-50">
              <h3 className="font-semibold">Pending Handover</h3>
              <p className="text-sm text-muted-foreground">Completed jobs awaiting finance</p>
              <div className="text-2xl font-bold text-green-700 mt-2">{data.jobMetrics.pendingHandover}</div>
            </div>
            <div className="rounded-lg border p-4 bg-green-50">
              <h3 className="font-semibold">Team Utilization</h3>
              <p className="text-sm text-muted-foreground">Current workforce usage</p>
              <div className="text-2xl font-bold text-green-700 mt-2">{data.teamMetrics.utilizationRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.teamMetrics.assignedToJobs} of {data.teamMetrics.totalActiveEmployees} employees assigned
              </p>
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-amber-700">Assets Department</h2>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 bg-amber-50">
              <h3 className="font-semibold">Equipment Status</h3>
              <p className="text-sm text-muted-foreground">Available / Total</p>
              <div className="text-2xl font-bold text-amber-700 mt-2">
                {data.assetMetrics.availableAssets} / {data.assetMetrics.totalAssets}
              </div>
            </div>
            <div className="rounded-lg border p-4 bg-amber-50">
              <h3 className="font-semibold">Maintenance Due</h3>
              <p className="text-sm text-muted-foreground">Equipment needing attention (7 days)</p>
              <div className="text-2xl font-bold text-amber-700 mt-2">{data.assetMetrics.maintenanceDue}</div>
            </div>
            <div className="rounded-lg border p-4 bg-amber-50">
              <h3 className="font-semibold">Asset Utilization</h3>
              <p className="text-sm text-muted-foreground">Equipment usage rate</p>
              <div className="text-2xl font-bold text-amber-700 mt-2">{data.assetMetrics.utilizationRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.assetMetrics.assignedAssets} of {data.assetMetrics.totalAssets} assets assigned
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">On-Time Delivery</h3>
          <div className="text-2xl font-bold text-gray-400 mt-2">--</div>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Safety Score</h3>
          <div className="text-2xl font-bold text-gray-400 mt-2">--</div>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Cost Efficiency</h3>
          <div className="text-2xl font-bold text-purple-600 mt-2">{data.kpiMetrics.costEfficiency}%</div>
          <p className="text-sm text-purple-600">Budget remaining</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Equipment Uptime</h3>
          <div className="text-2xl font-bold text-amber-600 mt-2">{data.kpiMetrics.equipmentUptime}%</div>
          <p className="text-sm text-amber-600">Available for use</p>
        </div>
      </div>

      {/* Cost Summary - NO REVENUE */}
      <div className="rounded-lg border p-4 bg-purple-50">
        <h3 className="font-semibold text-purple-700 mb-3">Budget Overview (Active Jobs)</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-lg font-semibold">{formatCurrencyIDR(data.costMetrics.totalBudget)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-lg font-semibold">{formatCurrencyIDR(data.costMetrics.totalSpent)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Budget Utilization</p>
            <p className="text-lg font-semibold">{data.costMetrics.budgetUtilization}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Over Budget Jobs</p>
            <p className={`text-lg font-semibold ${data.costMetrics.overBudgetJobs > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {data.costMetrics.overBudgetJobs}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Jobs */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Recent Job Activity</h3>
          {data.recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent job activity</p>
          ) : (
            <div className="space-y-2">
              {data.recentJobs.map(job => (
                <div key={job.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{job.joNumber}</p>
                    <p className="text-muted-foreground">{job.customerName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      job.status === 'active' ? 'bg-green-100 text-green-700' :
                      job.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {job.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(job.updatedAt), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent BKK */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Recent Disbursements (BKK)</h3>
          {data.recentBKK.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent disbursements</p>
          ) : (
            <div className="space-y-2">
              {data.recentBKK.map(bkk => (
                <div key={bkk.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{bkk.bkkNumber}</p>
                    <p className="text-muted-foreground truncate max-w-[200px]">{bkk.description || 'No description'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrencyIDR(bkk.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(bkk.createdAt), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Status Breakdown */}
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-3">Job Status Breakdown</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(data.jobMetrics.statusBreakdown).map(([status, count]) => (
            <div key={status} className="text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
