import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBlockedIPs, getIPBlockStats } from '@/app/actions/ip-blocking'
import { BlockedIPsClient } from './blocked-ips-client'

/**
 * Blocked IPs Page - Server Component
 * 
 * v0.79: Security Hardening Module
 * Requirements: 6.1, 6.2
 * 
 * Provides:
 * - Blocked IPs viewer with filtering
 * - Block/unblock actions
 * - Block statistics
 */
export default async function BlockedIPsPage() {
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
  
  // Only admin and owner can access blocked IPs management
  const isAuthorized = profile && ['admin', 'owner'].includes(profile.role)
  if (!isAuthorized) {
    redirect('/dashboard')
  }
  
  // Fetch initial data in parallel
  const [blockedIPsResult, statsResult] = await Promise.all([
    getBlockedIPs(false, false),
    getIPBlockStats(),
  ])
  
  const initialData = blockedIPsResult.success && blockedIPsResult.data
    ? blockedIPsResult.data
    : []
  
  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : {
        totalActive: 0,
        totalInactive: 0,
        permanentBlocks: 0,
        temporaryBlocks: 0,
        expiringWithin24h: 0,
      }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Blocked IPs</h2>
        <p className="text-muted-foreground">
          Manage blocked IP addresses and view block statistics
        </p>
      </div>

      <BlockedIPsClient
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
