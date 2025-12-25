import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSecurityEvents, getSecurityEventStats } from '@/app/actions/security-events'
import { SecurityEventsClient } from './security-events-client'

/**
 * Security Events Page - Server Component
 * 
 * v0.79: Security Hardening Module
 * Requirements: 3.1, 3.5
 * 
 * Provides:
 * - Security events viewer with filtering
 * - Event statistics summary
 * - Investigation workflow
 */
export default async function SecurityEventsPage() {
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
  
  // Only admin, owner, and manager can access security events
  const isAuthorized = profile && ['admin', 'owner', 'manager'].includes(profile.role)
  if (!isAuthorized) {
    redirect('/dashboard')
  }
  
  // Fetch initial data in parallel
  const [eventsResult, statsResult] = await Promise.all([
    getSecurityEvents({}, { page: 1, pageSize: 25 }),
    getSecurityEventStats(),
  ])
  
  const initialData = eventsResult.success && eventsResult.data
    ? eventsResult.data
    : { data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 }
  
  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : {
        totalEvents: 0,
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        investigatedCount: 0,
        uninvestigatedCount: 0,
      }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Security Events</h2>
        <p className="text-muted-foreground">
          Monitor and investigate security-related events in the system
        </p>
      </div>

      <SecurityEventsClient
        initialData={initialData}
        stats={stats}
        currentUser={{
          id: profile.id,
          email: profile.email,
          role: profile.role,
        }}
      />
    </div>
  )
}
