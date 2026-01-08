import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HRDashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, department_scope')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check access: hr role or manager with hr scope
  const hasAccess = profile.role === 'hr' || 
    (profile.role === 'manager' && profile.department_scope?.includes('hr')) ||
    ['owner', 'director'].includes(profile.role)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Human Resources Dashboard</h1>
        <p className="text-muted-foreground">
          Manage employees, attendance, payroll, and training
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Employee Count</h3>
          <p className="text-sm text-muted-foreground">Active employees</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Attendance</h3>
          <p className="text-sm text-muted-foreground">Today&apos;s attendance rate</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Leave Requests</h3>
          <p className="text-sm text-muted-foreground">Pending approvals</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Training</h3>
          <p className="text-sm text-muted-foreground">Training compliance</p>
        </div>
      </div>
    </div>
  )
}