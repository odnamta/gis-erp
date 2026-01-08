import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
              <div className="text-2xl font-bold text-pink-700 mt-2">12</div>
            </div>
            <div className="rounded-lg border p-4 bg-pink-50">
              <h3 className="font-semibold">Win Rate</h3>
              <p className="text-sm text-muted-foreground">This month</p>
              <div className="text-2xl font-bold text-pink-700 mt-2">68%</div>
            </div>
            <div className="rounded-lg border p-4 bg-pink-50">
              <h3 className="font-semibold">Pipeline Value</h3>
              <p className="text-sm text-muted-foreground">Potential revenue</p>
              <div className="text-2xl font-bold text-pink-700 mt-2">Rp 2.4B</div>
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
              <div className="text-2xl font-bold text-cyan-700 mt-2">5</div>
            </div>
            <div className="rounded-lg border p-4 bg-cyan-50">
              <h3 className="font-semibold">Active Surveys</h3>
              <p className="text-sm text-muted-foreground">Route surveys in progress</p>
              <div className="text-2xl font-bold text-cyan-700 mt-2">3</div>
            </div>
            <div className="rounded-lg border p-4 bg-cyan-50">
              <h3 className="font-semibold">JMP Status</h3>
              <p className="text-sm text-muted-foreground">Journey Management Plans</p>
              <div className="text-2xl font-bold text-cyan-700 mt-2">8</div>
            </div>
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