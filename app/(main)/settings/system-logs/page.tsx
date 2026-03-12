import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileHasRole } from '@/lib/auth-utils'
import { getSystemLogs, getSystemLogFilterOptions } from '@/app/actions/system-log-actions'
import { SystemLogsClient } from './system-logs-client'

/**
 * System Logs Page - Server Component
 * 
 * v0.76: System Audit & Logging Module
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * Provides:
 * - Initial data fetch for system logs
 * - Authentication and authorization check
 * - Filter options for dropdowns
 */
export default async function SystemLogsPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  // Get user profile and check authorization
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, email, full_name')
    .eq('user_id', user.id)
    .single()
  
  // Only admin and owner can access system logs
  const isAuthorized = profile && profileHasRole(profile as any, ['sysadmin', 'director', 'owner', 'marketing_manager', 'finance_manager', 'operations_manager']) // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!isAuthorized) {
    redirect('/dashboard')
  }
  
  // Fetch initial data in parallel
  const [logsResult, filterOptionsResult] = await Promise.all([
    getSystemLogs({}, { page: 1, page_size: 50 }),
    getSystemLogFilterOptions(),
  ])
  
  // Prepare initial data
  const initialData = logsResult.success && logsResult.data
    ? logsResult.data
    : { data: [], total: 0, page: 1, page_size: 50, total_pages: 0 }
  
  const filterOptions = filterOptionsResult.success && filterOptionsResult.data
    ? filterOptionsResult.data
    : { sources: [], modules: [], levels: ['error', 'warn', 'info', 'debug'] as const }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
        <p className="text-muted-foreground">
          View application logs, errors, and system events for debugging and monitoring
        </p>
      </div>

      <SystemLogsClient
        initialData={initialData}
        filterOptions={filterOptions}
        currentUser={{
          id: profile.id,
          email: profile.email,
          role: profile.role,
        }}
      />
    </div>
  )
}
