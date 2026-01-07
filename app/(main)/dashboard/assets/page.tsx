import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssetsDashboardClient } from './assets-dashboard-client'
import { UserRole } from '@/types/permissions'

export default async function AssetsDashboardPage() {
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

  // Check if user has access to assets dashboard
  const hasAccess = ['owner', 'director', 'manager', 'ops'].includes(profile.role) ||
    (profile.role === 'manager' && profile.department_scope?.includes('operations'))

  if (!hasAccess) {
    redirect('/dashboard')
  }

  return <AssetsDashboardClient userRole={profile.role as UserRole} />
}