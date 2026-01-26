import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDirectorDashboardMetrics } from '@/lib/dashboard/director-data'
import { formatCurrency, formatRelative } from '@/lib/utils/format'
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle,
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  BarChart3,
  Wallet,
  Receipt
} from 'lucide-react'

/**
 * Director Dashboard Page
 * 
 * Provides business-focused metrics and operational oversight for director role users.
 * Emphasizes business performance, operational KPIs, pipeline visibility, and financial health.
 * 
 * Requirements covered:
 * - 8.1, 8.2, 8.3, 8.4: Role-based access control
 * - 9.1, 9.2, 9.3, 9.4: Visual identity (indigo theme, briefcase icon)
 * - 10.1-10.4: Mobile responsiveness
 */
export default async function DirectorDashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check access: director role or owner only (Requirement 8.1, 8.2, 8.3)
  const hasAccess = profile.role === 'director' || profile.role === 'owner'

  if (!hasAccess) {
    redirect('/dashboard')
  }

  const metrics = await getDirectorDashboardMetrics()

  // Color coding helpers (Requirement 1.7, 4.5)
  const getMarginColor = (margin: number) => {
    if (margin >= 25) return 'text-green-600'
    if (margin >= 15) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCollectionColor = (rate: number) => {
    if (rate >= 85) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const totalPendingApprovals = metrics.pendingPJOApprovals + metrics.pendingBKKApprovals
  const showApprovalWarning = totalPendingApprovals > 5

  return (
    <div className="space-y-6">
      {/* Header with indigo theme (Requirement 9.1, 9.2, 9.3, 9.4) */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Briefcase className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Director Dashboard</h1>
          <p className="text-muted-foreground">
            Business performance and operational oversight
          </p>
        </div>
      </div>

      {/* Quick Actions (Requirement 5.1, 5.2, 5.3, 5.4, 5.5) */}
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/reports" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          View Reports
        </Link>
        <Link 
          href="/proforma-jo?status=pending_approval" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <Clock className="h-4 w-4" />
          Pending Approvals
          {totalPendingApprovals > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
              {totalPendingApprovals}
            </span>
          )}
        </Link>
        <Link 
          href="/job-orders?status=active" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Active Jobs
        </Link>
      </div>

      {/* Business Performance Cards (Requirement 1.5, 1.6, 1.7) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4 bg-indigo-50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">Total Revenue</h3>
          </div>
          <div className="text-2xl font-bold text-indigo-700">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <p className="text-sm text-muted-foreground">All completed jobs</p>
        </div>

        <div className="rounded-lg border p-4 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Total Profit</h3>
          </div>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(metrics.totalProfit)}
          </div>
          <p className="text-sm text-muted-foreground">Revenue minus costs</p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Profit Margin</h3>
          </div>
          <div className={`text-2xl font-bold ${getMarginColor(metrics.profitMargin)}`}>
            {metrics.profitMargin}%
          </div>
          <p className="text-sm text-muted-foreground">
            {metrics.profitMargin >= 25 ? 'Excellent' : metrics.profitMargin >= 15 ? 'Good' : 'Needs attention'}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            {metrics.revenueChangePercent >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <h3 className="font-semibold">MoM Change</h3>
          </div>
          <div className={`text-2xl font-bold ${metrics.revenueChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.revenueChangePercent >= 0 ? '+' : ''}{metrics.revenueChangePercent}%
          </div>
          <p className="text-sm text-muted-foreground">
            MTD: {formatCurrency(metrics.revenueMTD)}
          </p>
        </div>
      </div>

      {/* Operational KPIs (Requirement 2.1, 2.2, 2.3, 2.4, 2.5, 2.6) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Active Jobs</h3>
          </div>
          <div className="text-2xl font-bold text-blue-700">{metrics.activeJobs}</div>
          <p className="text-sm text-muted-foreground">Currently in progress</p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Completed This Month</h3>
          </div>
          <div className="text-2xl font-bold text-green-700">{metrics.completedJobsThisMonth}</div>
          <p className="text-sm text-muted-foreground">
            {metrics.jobCompletionRate}% completion rate
          </p>
        </div>

        <div className={`rounded-lg border p-4 ${showApprovalWarning ? 'bg-orange-50 border-orange-200' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            {showApprovalWarning && <AlertTriangle className="h-5 w-5 text-orange-600" />}
            <Clock className={`h-5 w-5 ${showApprovalWarning ? 'text-orange-600' : 'text-gray-600'}`} />
            <h3 className="font-semibold">Pending Approvals</h3>
          </div>
          <div className={`text-2xl font-bold ${showApprovalWarning ? 'text-orange-700' : ''}`}>
            {totalPendingApprovals}
          </div>
          <p className="text-sm text-muted-foreground">
            {metrics.pendingPJOApprovals} PJO, {metrics.pendingBKKApprovals} BKK
          </p>
        </div>
      </div>

      {/* Pipeline Overview (Requirement 3.1, 3.2, 3.3, 3.4, 3.5) */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Pipeline Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quotations Pipeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Quotations</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-gray-100 rounded">
                <div className="text-lg font-bold">{metrics.pipeline.quotationsDraft}</div>
                <div className="text-xs text-muted-foreground">Draft</div>
              </div>
              <div className="p-2 bg-blue-100 rounded">
                <div className="text-lg font-bold text-blue-700">{metrics.pipeline.quotationsSubmitted}</div>
                <div className="text-xs text-muted-foreground">Submitted</div>
              </div>
              <div className="p-2 bg-green-100 rounded">
                <div className="text-lg font-bold text-green-700">{metrics.pipeline.quotationsWon}</div>
                <div className="text-xs text-muted-foreground">Won</div>
              </div>
              <div className="p-2 bg-red-100 rounded">
                <div className="text-lg font-bold text-red-700">{metrics.pipeline.quotationsLost}</div>
                <div className="text-xs text-muted-foreground">Lost</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Win Rate:</span>
              <span className="font-semibold text-green-600">{metrics.pipeline.winRate}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Won Value (MTD):</span>
              <span className="font-semibold">{formatCurrency(metrics.pipeline.wonValueThisMonth)}</span>
            </div>
          </div>

          {/* PJO Pipeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Proforma Job Orders</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-gray-100 rounded">
                <div className="text-lg font-bold">{metrics.pipeline.pjosDraft}</div>
                <div className="text-xs text-muted-foreground">Draft</div>
              </div>
              <div className="p-2 bg-orange-100 rounded">
                <div className="text-lg font-bold text-orange-700">{metrics.pipeline.pjosPendingApproval}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="p-2 bg-green-100 rounded">
                <div className="text-lg font-bold text-green-700">{metrics.pipeline.pjosApproved}</div>
                <div className="text-xs text-muted-foreground">Approved</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <ArrowRight className="h-4 w-4" />
              <span>Quotations → PJOs → Job Orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health (Requirement 4.1, 4.2, 4.3, 4.4, 4.5) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">AR Outstanding</h3>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(metrics.arOutstanding)}
          </div>
          <p className="text-sm text-muted-foreground">Unpaid invoices</p>
        </div>

        <div className={`rounded-lg border p-4 ${metrics.arOverdue > 0 ? 'bg-red-50 border-red-200' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            {metrics.arOverdue > 0 && <AlertTriangle className="h-5 w-5 text-red-600" />}
            <Receipt className={`h-5 w-5 ${metrics.arOverdue > 0 ? 'text-red-600' : 'text-gray-600'}`} />
            <h3 className="font-semibold">AR Overdue</h3>
          </div>
          <div className={`text-2xl font-bold ${metrics.arOverdue > 0 ? 'text-red-700' : ''}`}>
            {formatCurrency(metrics.arOverdue)}
          </div>
          <p className="text-sm text-muted-foreground">Past due date</p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">Collection Rate</h3>
          </div>
          <div className={`text-2xl font-bold ${getCollectionColor(metrics.collectionRate)}`}>
            {metrics.collectionRate}%
          </div>
          <p className="text-sm text-muted-foreground">
            {metrics.collectionRate >= 85 ? 'Excellent' : metrics.collectionRate >= 70 ? 'Good' : 'Needs attention'}
          </p>
        </div>
      </div>

      {/* Recent Activity (Requirement 6.1, 6.2, 6.3, 6.4) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Completed Jobs */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Recent Completed Jobs
          </h3>
          {metrics.recentCompletedJobs.length > 0 ? (
            <div className="space-y-3">
              {metrics.recentCompletedJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <Link 
                      href={`/job-orders/${job.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {job.joNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">{job.customerName}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(job.finalRevenue)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelative(job.completedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No completed jobs yet</p>
          )}
        </div>

        {/* Recent Won Quotations */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Recent Won Quotations
          </h3>
          {metrics.recentWonQuotations.length > 0 ? (
            <div className="space-y-3">
              {metrics.recentWonQuotations.map((quotation) => (
                <div key={quotation.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <Link 
                      href={`/quotations/${quotation.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {quotation.quotationNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">{quotation.customerName}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(quotation.totalRevenue)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelative(quotation.outcomeDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No won quotations yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
