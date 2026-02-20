import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureUserProfile } from '@/lib/permissions-server'
import { recordSuccessfulLogin, recordFailedLoginAttempt } from '@/app/actions/auth-actions'
import { syncUserMetadataToAuth } from '@/lib/supabase/sync-user-metadata'
import { initializeOnboardingForUser } from '@/lib/onboarding-actions'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors from Google
  if (error) {
    // Record failed login attempt (Requirement 3.4)
    await recordFailedLoginAttempt(
      undefined, // email not available for OAuth errors
      errorDescription || error,
      'google'
    )
    
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[AUTH CALLBACK] Exchange code error:', exchangeError)
      await recordFailedLoginAttempt(
        undefined,
        exchangeError.message,
        'google'
      )

      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('error', exchangeError.message)
      return NextResponse.redirect(loginUrl)
    }

    // Ensure user profile exists and check if first login
    const profile = await ensureUserProfile()

    // Check if this is a first login (profile was just created or linked)
    if (profile) {
      const { data: { user } } = await supabase.auth.getUser()
      const now = new Date()

      // Check if user is new (created within last minute)
      const createdAt = new Date(profile.created_at)
      const isNewUser = (now.getTime() - createdAt.getTime() < 60000)

      // Initialize onboarding for new users
      if (user && isNewUser) {
        try {
          await initializeOnboardingForUser(user.id, profile.role)
        } catch (e) {
          console.error('[AUTH CALLBACK] Failed to initialize onboarding:', e)
        }
      }

      // Sync user metadata to JWT claims for middleware performance optimization
      // This eliminates the need for database queries on every page navigation
      if (user) {
        await syncUserMetadataToAuth(user.id, {
          role: profile.role,
          is_active: profile.is_active,
          custom_homepage: profile.custom_homepage,
        })
      }

      // Record successful login (Requirement 3.1)
      if (user) {
        await recordSuccessfulLogin(user.id, 'google')
      }
      
      // Check if last_login_at was just set (within last minute) - indicates first login
      const lastLogin = profile.last_login_at ? new Date(profile.last_login_at) : null
      const isFirstLogin = lastLogin && (now.getTime() - lastLogin.getTime() < 60000)

      // Send notification for new users (isNewUser already defined above)
      if (isNewUser && user) {
        try {
          const { notifyUserActivity } = await import('@/lib/notifications/notification-triggers')
          await notifyUserActivity(
            {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name || undefined,
              role: profile.role,
            },
            'first_login'
          )
        } catch (e) {
          console.error('Failed to send first login notification:', e)
        }
      }
    }

    // Successful authentication - redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', origin))
  }

  // No code provided - redirect to login with error
  // Record failed login attempt (Requirement 3.4)
  await recordFailedLoginAttempt(
    undefined,
    'Authentication failed. No authorization code provided.',
    'google'
  )
  
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'Authentication failed. Please try again.')
  return NextResponse.redirect(loginUrl)
}
