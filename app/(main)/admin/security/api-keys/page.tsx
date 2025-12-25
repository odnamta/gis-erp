import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAPIKeys } from '@/app/actions/api-keys'
import { APIKeysClient } from './api-keys-client'

/**
 * API Keys Page - Server Component
 * 
 * v0.79: Security Hardening Module
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 * 
 * Provides:
 * - API keys viewer with filtering
 * - Create/revoke actions
 * - Usage statistics
 */
export default async function APIKeysPage() {
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
  
  // Only admin and owner can access API keys management
  const isAuthorized = profile && ['admin', 'owner'].includes(profile.role)
  if (!isAuthorized) {
    redirect('/dashboard')
  }
  
  // Fetch initial data
  const keysResult = await getAPIKeys()
  
  const initialData = keysResult.success && keysResult.data
    ? keysResult.data
    : []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">API Keys</h2>
        <p className="text-muted-foreground">
          Manage API keys for external integrations
        </p>
      </div>

      <APIKeysClient
        initialData={initialData}
        currentUser={{
          id: profile.id,
          email: profile.email,
          role: profile.role,
        }}
      />
    </div>
  )
}
