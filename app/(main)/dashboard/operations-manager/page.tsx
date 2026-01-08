import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OperationsManagerDashboardPage() {
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

  // Check access: operations_manager role or owner/director
  const hasAccess = profile.role === 'operations_manager' || 
    ['owner', 'director'].includes(profile.role)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Reza&apos;s focused view: Operations execution, asset management, and team performance
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
              <div className="text-2xl font-bold text-green-700 mt-2">8</div>
            </div>
            <div className="rounded-lg border p-4 bg-green-50">
              <h3 className="font-semibold">Pending Handover</h3>
              <p className="text-sm text-muted-foreground">Completed jobs awaiting finance</p>
              <div className="text-2xl font-bold text-green-700 mt-2">3</div>
            </div>
            <div className="rounded-lg border p-4 bg-green-50">
              <h3 className="font-semibold">Team Utilization</h3>
              <p className="text-sm text-muted-foreground">Current workforce usage</p>
              <div className="text-2xl font-bold text-green-700 mt-2">87%</div>
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
              <div className="text-2xl font-bold text-amber-700 mt-2">24 / 32</div>
            </div>
            <div className="rounded-lg border p-4 bg-amber-50">
              <h3 className="font-semibold">Maintenance Due</h3>
              <p className="text-sm text-muted-foreground">Equipment needing service</p>
              <div className="text-2xl font-bold text-amber-700 mt-2">5</div>
            </div>
            <div className="rounded-lg border p-4 bg-amber-50">
              <h3 className="font-semibold">Asset Utilization</h3>
              <p className="text-sm text-muted-foreground">Equipment usage rate</p>
              <div className="text-2xl font-bold text-amber-700 mt-2">78%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">On-Time Delivery</h3>
          <div className="text-2xl font-bold text-green-600 mt-2">94%</div>
          <p className="text-sm text-green-600">+2% vs last month</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Safety Score</h3>
          <div className="text-2xl font-bold text-blue-600 mt-2">98.5</div>
          <p className="text-sm text-blue-600">Zero incidents</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Cost Efficiency</h3>
          <div className="text-2xl font-bold text-purple-600 mt-2">96%</div>
          <p className="text-sm text-purple-600">Within budget</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Equipment Uptime</h3>
          <div className="text-2xl font-bold text-amber-600 mt-2">92%</div>
          <p className="text-sm text-amber-600">Above target</p>
        </div>
      </div>

      {/* Cross-Department Notifications */}
      <div className="rounded-lg border p-4 bg-blue-50">
        <h3 className="font-semibold text-blue-700 mb-2">Cross-Department Updates</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Marketing: 3 new projects awarded, planning required</span>
            <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
          </div>
          <div className="flex justify-between">
            <span>Finance: Equipment budget variance detected</span>
            <span className="text-blue-600 cursor-pointer hover:underline">View →</span>
          </div>
        </div>
      </div>
    </div>
  )
}