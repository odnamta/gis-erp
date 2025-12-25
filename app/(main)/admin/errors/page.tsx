import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getErrorsAction, getErrorSummaryAction } from '@/app/actions/error-tracking-actions'
import { ErrorDashboardClient } from './error-dashboard-client'

/**
 * Error Tracking Dashboard Page - Server Component
 * 
 * v0.77: Error Handling & Recovery Module
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export default async function ErrorDashboardPage() {
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
  
  const [errorsResult, summaryResult] = await Promise.all([
    getErrorsAction(),
    getErrorSummaryAction(),
  ])
  
  const errors = errorsResult.success && errorsResult.data ? errorsResult.data : []
  const summary = summaryResult.success && summaryResult.data ? summaryResult.data : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Error Tracking</h2>
        <p className="text-muted-foreground">
          Monitor application errors, track resolution status, and analyze error patterns
        </p>
      </div>

      <ErrorDashboardClient
        initialErrors={errors}
        initialSummary={summary}
        currentUser={{
          id: profile.id,
          email: profile.email,
          role: profile.role,
        }}
      />
    </div>
  )
}
