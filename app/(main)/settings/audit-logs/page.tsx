import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuditLogs, getAuditLogFilterOptions } from '@/app/actions/audit-actions'
import { AuditLogsClient } from './audit-logs-client'
import { PaginatedAuditLogs } from '@/types/audit'

/**
 * Audit Logs Page - Server Component
 * 
 * v0.76: System Audit & Logging Module
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * 
 * Provides:
 * - Initial data fetch for audit logs
 * - Authentication and authorization check
 * - Filter options for dropdowns
 */
export default async function AuditLogsPage() {
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
  
  // Only admin and owner can access audit logs
  const isAuthorized = profile && ['admin', 'owner', 'manager'].includes(profile.role)
  if (!isAuthorized) {
    redirect('/dashboard')
  }
  
  // Fetch initial data in parallel
  const [logsResult, filterOptionsResult, usersResult] = await Promise.all([
    getAuditLogs({}, { page: 1, page_size: 25 }),
    getAuditLogFilterOptions(),
    // Get users for filter dropdown
    supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .order('full_name', { ascending: true }),
  ])
  
  // Prepare initial data
  const initialData: PaginatedAuditLogs = logsResult.success && logsResult.data
    ? logsResult.data
    : { data: [], logs: [], total: 0, page: 1, pageSize: 25, totalPages: 0, hasMore: false }
  
  const filterOptions = filterOptionsResult.success && filterOptionsResult.data
    ? filterOptionsResult.data
    : { modules: [], entityTypes: [], actions: [] }
  
  const users = (usersResult.data || []).map(u => ({
    id: u.id,
    email: u.email || '',
    name: u.full_name || u.email || '',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          View and search system audit trail for all user actions
        </p>
      </div>

      <AuditLogsClient
        initialData={initialData}
        filterOptions={filterOptions}
        users={users}
        currentUser={{
          id: profile.id,
          email: profile.email,
          role: profile.role,
        }}
      />
    </div>
  )
}
