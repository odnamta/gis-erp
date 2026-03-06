import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileHasRole } from '@/lib/auth-utils'
import { getFinanceManagerMetrics } from '@/lib/dashboard/finance-manager-data'
import { formatCurrencyIDRCompact } from '@/lib/utils/format'
import { format } from 'date-fns'
import { ARAgingChart } from '@/components/finance/ar-aging-chart'

export default async function FinanceManagerDashboardPage() {
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

  // Check access: finance_manager role or owner/director
  const hasAccess = profileHasRole(profile as any, ['finance_manager', 'owner', 'director'])

  if (!hasAccess) {
    redirect('/dashboard')
  }

  const metrics = await getFinanceManagerMetrics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Feri&apos;s focused view: Financial operations, administration workflow, and team performance
        </p>
      </div>

      {/* Financial Overview Section - Task 3.1 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 bg-green-50">
          <h3 className="font-semibold">Revenue YTD</h3>
          <p className="text-sm text-muted-foreground">Year-to-date revenue</p>
          <div className="text-2xl font-bold text-green-700 mt-2">
            {formatCurrencyIDRCompact(metrics.revenueYTD)}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-amber-50">
          <h3 className="font-semibold">Expenses MTD</h3>
          <p className="text-sm text-muted-foreground">Month-to-date expenses</p>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {formatCurrencyIDRCompact(metrics.expensesMTD)}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-blue-50">
          <h3 className="font-semibold">Gross Profit</h3>
          <p className="text-sm text-muted-foreground">Revenue MTD - Expenses MTD</p>
          <div className={`text-2xl font-bold mt-2 ${metrics.grossProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            {metrics.grossProfit < 0 && '-'}
            {formatCurrencyIDRCompact(Math.abs(metrics.grossProfit))}
          </div>
        </div>
      </div>

      {/* Primary Focus: Administration & Finance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Administration Section - Task 3.2 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-orange-700">Administration Department</h2>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">Pending PJOs</h3>
              <p className="text-sm text-muted-foreground">Awaiting preparation</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">{metrics.pendingPJOs}</div>
            </div>
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">PJOs Ready for JO</h3>
              <p className="text-sm text-muted-foreground">Approved, awaiting conversion</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">{metrics.pjosReadyForJO}</div>
            </div>
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">JOs Pending Invoice</h3>
              <p className="text-sm text-muted-foreground">Completed, awaiting billing</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">{metrics.josPendingInvoice}</div>
            </div>
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">Draft Invoices</h3>
              <p className="text-sm text-muted-foreground">Ready to send</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">{metrics.draftInvoices}</div>
            </div>
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">Document Queue</h3>
              <p className="text-sm text-muted-foreground">Processing required</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">{metrics.documentQueue}</div>
            </div>
          </div>
          
          {/* Admin Pipeline Visual - Task 3.2 */}
          <div className="rounded-lg border p-4 bg-orange-50">
            <h3 className="font-semibold mb-3">Document Workflow Pipeline</h3>
            <div className="flex items-center justify-between text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-orange-700">{metrics.adminPipeline.draftPJOs}</div>
                <div className="text-muted-foreground">Draft PJOs</div>
              </div>
              <div className="text-orange-400">→</div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-700">{metrics.adminPipeline.pendingApprovalPJOs}</div>
                <div className="text-muted-foreground">Pending Approval</div>
              </div>
              <div className="text-orange-400">→</div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-700">{metrics.adminPipeline.activeJOs}</div>
                <div className="text-muted-foreground">Active JOs</div>
              </div>
              <div className="text-orange-400">→</div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-700">{metrics.adminPipeline.completedJOs}</div>
                <div className="text-muted-foreground">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Finance Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-purple-700">Finance Department</h2>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 bg-purple-50">
              <h3 className="font-semibold">Pending Payments</h3>
              <p className="text-sm text-muted-foreground">BKK approvals needed</p>
              <div className="text-2xl font-bold text-purple-700 mt-2">{metrics.pendingBKK}</div>
            </div>
            <div className="rounded-lg border p-4 bg-purple-50">
              <h3 className="font-semibold">AR Outstanding</h3>
              <p className="text-sm text-muted-foreground">Unpaid invoices</p>
              <div className="text-2xl font-bold text-purple-700 mt-2">
                {formatCurrencyIDRCompact(metrics.arOutstanding)}
              </div>
            </div>
            {/* AP Outstanding - Task 3.4 */}
            <div className="rounded-lg border p-4 bg-purple-50">
              <h3 className="font-semibold">AP Outstanding</h3>
              <p className="text-sm text-muted-foreground">Pending disbursements</p>
              <div className="text-2xl font-bold text-purple-700 mt-2">
                {formatCurrencyIDRCompact(metrics.apOutstanding)}
              </div>
            </div>
            {/* AP Due This Week - Task 3.4 */}
            <div className="rounded-lg border p-4 bg-purple-50">
              <h3 className="font-semibold">AP Due This Week</h3>
              <p className="text-sm text-muted-foreground">Urgent payments</p>
              <div className="text-2xl font-bold text-purple-700 mt-2">
                {formatCurrencyIDRCompact(metrics.apDueThisWeek)}
              </div>
            </div>
            {metrics.cashPosition > 0 && (
              <div className="rounded-lg border p-4 bg-purple-50">
                <h3 className="font-semibold">Cash Position</h3>
                <p className="text-sm text-muted-foreground">Available funds</p>
                <div className="text-2xl font-bold text-purple-700 mt-2">
                  {formatCurrencyIDRCompact(metrics.cashPosition)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AR Enhancement Section - Task 3.3 + Phase 2C-4 */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold text-red-700 mb-3">AR Overdue</h3>
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Overdue Amount</p>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrencyIDRCompact(metrics.arOverdue)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Overdue Invoices</p>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.overdueInvoicesCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AR Aging Visual Funnel - Phase 2C-4 */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">AR Aging Breakdown</h3>
          <ARAgingChart
            agingData={{
              current: metrics.arAging.current,
              days31to60: metrics.arAging.days31to60,
              days61to90: metrics.arAging.days61to90,
              over90: metrics.arAging.over90,
            }}
            customerAging={metrics.customerAging.map(c => ({
              customerId: c.customerId,
              customerName: c.customerName,
              totalOutstanding: c.totalOutstanding,
              invoiceCount: c.invoiceCount,
              oldestDaysOverdue: c.oldestDaysOverdue,
            }))}
          />
        </div>
      </div>

      {/* Invoice Red Flags Section - Phase 2C */}
      {metrics.redFlagCounts.totalFlags > 0 && (
        <div className="rounded-lg border border-red-200 p-4 bg-red-50/50">
          <h3 className="font-semibold text-red-700 mb-3">Invoice Red Flags</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {metrics.redFlagCounts.overdueCount > 0 && (
              <div className="rounded-lg border border-red-200 p-3 bg-white">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <div className="text-xl font-bold text-red-600">{metrics.redFlagCounts.overdueCount}</div>
              </div>
            )}
            {metrics.redFlagCounts.negativeMarginCount > 0 && (
              <div className="rounded-lg border border-orange-200 p-3 bg-white">
                <p className="text-xs text-muted-foreground">Margin Negatif</p>
                <div className="text-xl font-bold text-orange-600">{metrics.redFlagCounts.negativeMarginCount}</div>
              </div>
            )}
            {metrics.redFlagCounts.duplicateSuspectCount > 0 && (
              <div className="rounded-lg border border-yellow-200 p-3 bg-white">
                <p className="text-xs text-muted-foreground">Duplikat</p>
                <div className="text-xl font-bold text-yellow-600">{metrics.redFlagCounts.duplicateSuspectCount}</div>
              </div>
            )}
            {metrics.redFlagCounts.missingInvoiceCount > 0 && (
              <div className="rounded-lg border border-purple-200 p-3 bg-white">
                <p className="text-xs text-muted-foreground">Belum Diinvoice</p>
                <div className="text-xl font-bold text-purple-600">{metrics.redFlagCounts.missingInvoiceCount}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Queue Section - Task 3.5 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 bg-yellow-50">
          <h3 className="font-semibold text-yellow-700">Pending PJO Approvals</h3>
          <div className="mt-2 flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">Count</p>
              <div className="text-2xl font-bold text-yellow-700">{metrics.pendingPJOApprovals.count}</div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <div className="text-xl font-bold text-yellow-700">
                {formatCurrencyIDRCompact(metrics.pendingPJOApprovals.totalValue)}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-yellow-50">
          <h3 className="font-semibold text-yellow-700">Pending Disbursement Approvals</h3>
          <div className="mt-2 flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">Count</p>
              <div className="text-2xl font-bold text-yellow-700">{metrics.pendingDisbursementApprovals.count}</div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <div className="text-xl font-bold text-yellow-700">
                {formatCurrencyIDRCompact(metrics.pendingDisbursementApprovals.totalValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Revenue MTD</h3>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrencyIDRCompact(metrics.revenueMTD)}
          </div>
          <p className={`text-sm ${metrics.revenueMTDChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.revenueMTDChange >= 0 ? '+' : ''}{metrics.revenueMTDChange}% vs last month
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Gross Margin</h3>
          <div className="text-2xl font-bold text-blue-600 mt-2">{metrics.grossMargin}%</div>
          <p className={`text-sm ${metrics.grossMarginVsTarget >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {metrics.grossMarginVsTarget >= 0 ? '+' : ''}{metrics.grossMarginVsTarget}% vs target
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Collection Rate</h3>
          <div className="text-2xl font-bold text-purple-600 mt-2">{metrics.collectionRate}%</div>
          <p className={`text-sm ${metrics.collectionRate >= 80 ? 'text-purple-600' : 'text-orange-600'}`}>
            {metrics.collectionRate >= 80 ? 'Within target' : 'Below target'}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Cost Control</h3>
          <div className="text-2xl font-bold text-orange-600 mt-2">{metrics.costControl}%</div>
          <p className="text-sm text-orange-600">Budget adherence</p>
        </div>
      </div>

      {/* Recent Activity Section - Task 3.6 */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Invoices */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Recent Invoices</h3>
          <div className="space-y-3">
            {metrics.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent invoices</p>
            ) : (
              metrics.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-start text-sm border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-muted-foreground text-xs">{invoice.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrencyIDRCompact(invoice.total_amount)}</div>
                    <div className={`text-xs ${
                      invoice.status === 'paid' ? 'text-green-600' :
                      invoice.status === 'overdue' ? 'text-red-600' :
                      invoice.status === 'sent' ? 'text-blue-600' :
                      'text-muted-foreground'
                    }`}>
                      {invoice.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Recent Payments</h3>
          <div className="space-y-3">
            {metrics.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent payments</p>
            ) : (
              metrics.recentPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-start text-sm border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{payment.invoice_number}</div>
                    <div className="text-muted-foreground text-xs">{payment.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">{formatCurrencyIDRCompact(payment.total_amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {payment.paid_at ? format(new Date(payment.paid_at), 'dd/MM/yyyy') : '-'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent PJO Approvals */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Recent PJO Approvals</h3>
          <div className="space-y-3">
            {metrics.recentPJOApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent approvals</p>
            ) : (
              metrics.recentPJOApprovals.map((pjo) => (
                <div key={pjo.id} className="flex justify-between items-start text-sm border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{pjo.pjo_number}</div>
                    <div className="text-muted-foreground text-xs truncate max-w-[150px]">{pjo.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrencyIDRCompact(pjo.estimated_amount)}</div>
                    <div className={`text-xs font-medium ${
                      pjo.status === 'approved' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {pjo.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cross-Department Notifications */}
      <div className="rounded-lg border p-4 bg-blue-50">
        <h3 className="font-semibold text-blue-700 mb-2">Cross-Department Updates</h3>
        <div className="space-y-2 text-sm">
          {metrics.quotationsWonPendingPJO > 0 && (
            <div className="flex justify-between">
              <span>Marketing: {metrics.quotationsWonPendingPJO} quotation{metrics.quotationsWonPendingPJO > 1 ? 's' : ''} won, ready for PJO</span>
              <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
            </div>
          )}
          {metrics.budgetExceededCount > 0 && (
            <div className="flex justify-between">
              <span>Operations: {metrics.budgetExceededCount} cost item{metrics.budgetExceededCount > 1 ? 's' : ''} exceeded budget</span>
              <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
            </div>
          )}
          {metrics.quotationsWonPendingPJO === 0 && metrics.budgetExceededCount === 0 && (
            <p className="text-muted-foreground">No pending cross-department items</p>
          )}
        </div>
      </div>
    </div>
  )
}
