import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileHasRole } from '@/lib/auth-utils'
import { AssetsDashboardClient } from './assets-dashboard-client'
import { UserRole } from '@/types/permissions'
import { getAssetsDashboardMetrics } from '@/lib/dashboard/assets-data'

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
  const hasAccess = profileHasRole(profile as any, ['owner', 'director', 'operations_manager', 'ops']) || // eslint-disable-line @typescript-eslint/no-explicit-any
    (profile.role === 'operations_manager' && profile.department_scope?.includes('operations'))

  if (!hasAccess) {
    redirect('/dashboard')
  }

  // Fetch dashboard metrics server-side with caching
  const metrics = await getAssetsDashboardMetrics()

  return <AssetsDashboardClient userRole={profile.role as UserRole} metrics={metrics} />
}