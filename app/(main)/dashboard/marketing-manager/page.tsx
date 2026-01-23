import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMarketingManagerMetrics } from '@/lib/dashboard/marketing-manager-data'
import { formatCurrencyIDRCompact } from '@/lib/utils/format'

export default async function MarketingManagerDashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, email')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check access: marketing_manager role or owner/director
  const hasAccess = profile.role === 'marketing_manager' || 
    ['owner', 'director'].includes(profile.role)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  // Fetch real metrics from the data service
  // Requirements: 8.1
  const metrics = await getMarketingManagerMetrics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Hutami&apos;s focused view: Marketing pipeline, engineering projects, and team performance
        </p>
      </div>

      {/* Primary Focus: Marketing & Engineering */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Marketing Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-pink-700">Marketing Department</h2>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 bg-pink-50">
              <h3 className="font-semibold">Active Quotations</h3>
              <p className="text-sm text-muted-foreground">Quotations in progress</p>
              <div className="text-2xl font-bold text-pink-700 mt-2">{metrics.activeQuotations}</div>
            </div>
            <div className="rounded-lg border p-4 bg-pink-50">
              <h3 className="font-semibold">Win Rate</h3>
              <p className="text-sm text-muted-foreground">This month</p>
              <div className="text-2xl font-bold text-pink-700 mt-2">{metrics.winRatePercent}%</div>
            </div>
            <div className="rounded-lg border p-4 bg-pink-50">
              <h3 className="font-semibold">Pipeline Value</h3>
              <p className="text-sm text-muted-foreground">Potential revenue</p>
              <div className="text-2xl font-bold text-pink-700 mt-2">{formatCurrencyIDRCompact(metrics.pipelineValue)}</div>
            </div>
          </div>
        </div>

        {/* Engineering Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-cyan-700">Engineering Department</h2>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 bg-cyan-50">
              <h3 className="font-semibold">Pending Reviews</h3>
              <p className="text-sm text-muted-foreground">Quotations needing review</p>
              <div className="text-2xl font-bold text-cyan-700 mt-2">{metrics.pendingEngineeringReview}</div>
            </div>
            <div className="rounded-lg border p-4 bg-cyan-50">
              <h3 className="font-semibold">Active Surveys</h3>
              <p className="text-sm text-muted-foreground">Route surveys in progress</p>
              <div className="text-2xl font-bold text-cyan-700 mt-2">{metrics.activeSurveys}</div>
            </div>
            <div className="rounded-lg border p-4 bg-cyan-50">
              <h3 className="font-semibold">JMP Status</h3>
              <p className="text-sm text-muted-foreground">Journey Management Plans</p>
              <div className="text-2xl font-bold text-cyan-700 mt-2">{metrics.activeJMPs}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Metrics Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 bg-green-50">
          <h3 className="font-semibold">Total Customers</h3>
          <p className="text-sm text-muted-foreground">Active customer portfolio</p>
          <div className="text-2xl font-bold text-green-700 mt-2">{metrics.totalCustomers}</div>
        </div>
        <div className="rounded-lg border p-4 bg-green-50">
          <h3 className="font-semibold">New Customers MTD</h3>
          <p className="text-sm text-muted-foreground">Acquired this month</p>
          <div className="text-2xl font-bold text-green-700 mt-2">{metrics.newCustomersMTD}</div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Quotations */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Recent Quotations</h3>
          <div className="space-y-3">
            {metrics.recentQuotations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent quotations</p>
            ) : (
              metrics.recentQuotations.map((quotation) => (
                <Link
                  key={quotation.id}
                  href={`/quotations/${quotation.id}`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{quotation.quotation_number}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{quotation.title}</p>
                      <p className="text-xs text-muted-foreground">{quotation.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">{quotation.status}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(quotation.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Customers - Requirements: 6.2 */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Recent Customers</h3>
          <div className="space-y-3">
            {metrics.recentCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent customers</p>
            ) : (
              metrics.recentCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cross-Department Notifications */}
      <div className="rounded-lg border p-4 bg-blue-50">
        <h3 className="font-semibold text-blue-700 mb-2">Cross-Department Updates</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Finance: 3 invoices pending approval</span>
            <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
          </div>
          <div className="flex justify-between">
            <span>Operations: 2 jobs completed, awaiting handover</span>
            <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
          </div>
        </div>
      </div>
    </div>
  )
}