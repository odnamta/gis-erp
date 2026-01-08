import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
  const hasAccess = profile.role === 'finance_manager' || 
    ['owner', 'director'].includes(profile.role)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Feri&apos;s focused view: Financial operations, administration workflow, and team performance
        </p>
      </div>

      {/* Primary Focus: Administration & Finance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Administration Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-orange-700">Administration Department</h2>
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">Pending PJOs</h3>
              <p className="text-sm text-muted-foreground">Awaiting preparation</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">7</div>
            </div>
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">Draft Invoices</h3>
              <p className="text-sm text-muted-foreground">Ready to send</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">4</div>
            </div>
            <div className="rounded-lg border p-4 bg-orange-50">
              <h3 className="font-semibold">Document Queue</h3>
              <p className="text-sm text-muted-foreground">Processing required</p>
              <div className="text-2xl font-bold text-orange-700 mt-2">15</div>
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
              <div className="text-2xl font-bold text-purple-700 mt-2">9</div>
            </div>
            <div className="rounded-lg border p-4 bg-purple-50">
              <h3 className="font-semibold">AR Outstanding</h3>
              <p className="text-sm text-muted-foreground">Overdue invoices</p>
              <div className="text-2xl font-bold text-purple-700 mt-2">Rp 1.2B</div>
            </div>
            <div className="rounded-lg border p-4 bg-purple-50">
              <h3 className="font-semibold">Cash Position</h3>
              <p className="text-sm text-muted-foreground">Available funds</p>
              <div className="text-2xl font-bold text-purple-700 mt-2">Rp 850M</div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Revenue MTD</h3>
          <div className="text-2xl font-bold text-green-600 mt-2">Rp 3.2B</div>
          <p className="text-sm text-green-600">+12% vs last month</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Gross Margin</h3>
          <div className="text-2xl font-bold text-blue-600 mt-2">28%</div>
          <p className="text-sm text-blue-600">+2% vs target</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Collection Rate</h3>
          <div className="text-2xl font-bold text-purple-600 mt-2">85%</div>
          <p className="text-sm text-purple-600">Within target</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Cost Control</h3>
          <div className="text-2xl font-bold text-orange-600 mt-2">92%</div>
          <p className="text-sm text-orange-600">Budget adherence</p>
        </div>
      </div>

      {/* Cross-Department Notifications */}
      <div className="rounded-lg border p-4 bg-blue-50">
        <h3 className="font-semibold text-blue-700 mb-2">Cross-Department Updates</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Marketing: 5 quotations won, ready for PJO</span>
            <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
          </div>
          <div className="flex justify-between">
            <span>Operations: Equipment maintenance budget exceeded</span>
            <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
          </div>
        </div>
      </div>
    </div>
  )
}