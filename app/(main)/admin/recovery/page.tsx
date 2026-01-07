import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDeletedRecordsAction, getRecoveryStatsAction } from '@/app/actions/recovery-actions'
import { RecoveryClient } from './recovery-client'

/**
 * Data Recovery Page - Server Component
 * 
 * v0.77: Error Handling & Recovery Module
 * Requirements: 4.3, 7.5
 */
export default async function RecoveryPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, email, full_name')
    .eq('user_id', user.id)
    .single()
  
  const isAuthorized = profile && ['admin', 'owner', 'super_admin'].includes(profile.role)
  if (!isAuthorized) {
    redirect('/dashboard')
  }
  
  const [recordsResult, statsResult] = await Promise.all([
    getDeletedRecordsAction({ recovered: false }),
    getRecoveryStatsAction(),
  ])
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = recordsResult.success && recordsResult.data ? recordsResult.data as any[] : []
  const stats = statsResult.success && statsResult.data ? statsResult.data : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Recovery</h2>
        <p className="text-muted-foreground">
          Recover deleted records within the 90-day retention period
        </p>
      </div>

      <RecoveryClient
        initialRecords={records}
        initialStats={stats}
        currentUser={{
          id: profile.id,
          email: profile.email,
          role: profile.role,
        }}
      />
    </div>
  )
}
