import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionsClient } from './sessions-client'

/**
 * Active Sessions Page - Server Component
 * 
 * v0.79: Security Hardening Module
 * Requirements: 5.1, 5.5, 5.6
 * 
 * Provides:
 * - Active sessions viewer per user
 * - Session termination actions
 * - Session statistics
 */
export default async function SessionsPage() {
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
  
  // Only admin and owner can access sessions management
  const isAuthorized = profile && ['admin', 'owner'].includes(profile.role)
  if (!isAuthorized) {
    redirect('/dashboard')
  }
  
  // Get list of users with their session counts
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role')
    .order('full_name')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Active Sessions</h2>
        <p className="text-muted-foreground">
          View and manage user sessions across the system
        </p>
      </div>

      <SessionsClient
        users={users || []}
        currentUser={{
          id: profile.id,
          email: profile.email,
          role: profile.role,
        }}
      />
    </div>
  )
}
