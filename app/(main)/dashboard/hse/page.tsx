import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HSEDashboardPage() {
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

  // Check access: hse role or manager with hse scope
  const hasAccess = profile.role === 'hse' || 
    (profile.role === 'manager' && profile.department_scope?.includes('hse')) ||
    ['owner', 'director'].includes(profile.role)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Health, Safety & Environment</h1>
        <p className="text-muted-foreground">
          Monitor safety incidents, training compliance, and environmental metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Safety Incidents</h3>
          <p className="text-sm text-muted-foreground">This month&apos;s incidents</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Training Compliance</h3>
          <p className="text-sm text-muted-foreground">Safety training status</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">PPE Compliance</h3>
          <p className="text-sm text-muted-foreground">Personal protective equipment</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Safety Permits</h3>
          <p className="text-sm text-muted-foreground">Active work permits</p>
        </div>
      </div>
    </div>
  )
}