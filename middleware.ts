import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { DEFAULT_ROLE_HOMEPAGES, DEFAULT_FALLBACK_ROUTE } from '@/types/homepage-routing'
import { UserRole } from '@/types/permissions'
import {
  applySecurityHeaders,
  shouldSkipSecurityChecks,
} from '@/lib/security/middleware'
import { shouldExcludePath, shouldLogPageView } from '@/lib/page-view-tracker'

/**
 * User metadata stored in JWT app_metadata for fast access.
 * Synced on login and profile updates to avoid database queries in middleware.
 */
interface UserMetadataFromJWT {
  role: string
  is_active: boolean
  custom_homepage: string | null
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/account-deactivated']

// Routes that authenticated users without a role can access
// These routes are excluded from the role-required redirect
const NO_ROLE_REQUIRED_ROUTES = ['/request-access']

// Valid roles that grant access to the application
// Users without one of these roles will be redirected to /request-access
const VALID_ROLES: UserRole[] = [
  'owner',
  'director',
  'marketing_manager',
  'finance_manager',
  'operations_manager',
  'sysadmin',
  'administration',
  'finance',
  'marketing',
  'ops',
  'engineer',
  'hr',
  'hse',
  'agency',
  'customs',
]

// Routes restricted from ops users
const OPS_RESTRICTED_ROUTES = ['/customers', '/invoices', '/settings', '/reports']

// Routes restricted from sales users
const SALES_RESTRICTED_ROUTES = ['/job-orders', '/invoices', '/settings']

/**
 * Get the homepage route for a user based on their role and custom settings
 * Priority: custom_homepage > role_homepage > fallback
 */
function getHomepageForRole(role: string, customHomepage?: string | null): string {
  // Priority 1: Custom homepage override
  if (customHomepage) {
    return customHomepage
  }
  
  // Priority 2: Role-based homepage
  const roleHomepage = DEFAULT_ROLE_HOMEPAGES[role as UserRole]
  if (roleHomepage) {
    return roleHomepage
  }
  
  // Priority 3: Default fallback
  return DEFAULT_FALLBACK_ROUTE
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip security checks for static assets
  if (shouldSkipSecurityChecks(pathname)) {
    return NextResponse.next()
  }

  // CSP without nonce — Next.js inline scripts require unsafe-inline to function.
  // Nonce-based CSP needs custom Document/layout nonce threading which isn't implemented.
  const requestHeaders = new Headers(request.headers)

  const { supabaseResponse, user } = await updateSession(request, requestHeaders)

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // Redirect unauthenticated users to login (except for public routes)
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Check user profile for role restrictions, active status, and homepage routing
  if (user && !isPublicRoute) {
    // PERFORMANCE OPTIMIZATION: Read user metadata from JWT app_metadata instead of database
    // This eliminates 50-200ms latency on every page navigation.
    // Metadata is synced to JWT on login (auth callback) and profile updates.
    const appMetadata = user.app_metadata as UserMetadataFromJWT | undefined
    
    // Get role and active status from JWT metadata (fast path)
    // Falls back to database query only if metadata is missing (rare case for legacy sessions)
    let role: string | undefined = appMetadata?.role
    let isActive: boolean = appMetadata?.is_active !== false // Default to true
    let customHomepage: string | null = appMetadata?.custom_homepage ?? null
    
    // Fallback: Query database only if JWT metadata is missing
    // This handles legacy sessions before metadata sync was implemented
    if (!role) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll() {
              // We don't need to set cookies here
            },
          },
        }
      )

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, is_active, custom_homepage')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        role = profile.role
        isActive = profile.is_active
        customHomepage = profile.custom_homepage
      }
    }

    // Redirect deactivated users to account-deactivated page
    if (!isActive && pathname !== '/account-deactivated') {
      const deactivatedUrl = new URL('/account-deactivated', request.url)
      return NextResponse.redirect(deactivatedUrl)
    }

    // v0.84: Role Request System - Handle users without valid roles
    // Check if user has a valid role that grants access to the application
    const hasValidRole = role && VALID_ROLES.includes(role as UserRole)
    const isNoRoleRequiredRoute = NO_ROLE_REQUIRED_ROUTES.some(route => pathname.startsWith(route))
    
    // Redirect users WITHOUT a valid role to /request-access
    // (unless they're already on a no-role-required route)
    if (!hasValidRole && !isNoRoleRequiredRoute) {
      const requestAccessUrl = new URL('/request-access', request.url)
      return NextResponse.redirect(requestAccessUrl)
    }
    
    // Redirect users WITH a valid role AWAY from /request-access to their dashboard
    // (they don't need to request access if they already have a role)
    if (hasValidRole && isNoRoleRequiredRoute) {
      const homepage = getHomepageForRole(role!, customHomepage)
      const homepageUrl = new URL(homepage, request.url)
      return NextResponse.redirect(homepageUrl)
    }

    // v0.35: Role-based homepage routing
    // Redirect root path '/' or '/dashboard' (without sub-path) to role-specific dashboard
    // IMPORTANT: Prevent redirect loop by checking if already on target homepage
    if (pathname === '/' || pathname === '/dashboard') {
      const homepage = getHomepageForRole(role || 'viewer', customHomepage)

      // Prevent redirect to self (fixes ERR_TOO_MANY_REDIRECTS)
      if (homepage !== pathname) {
        const homepageUrl = new URL(homepage, request.url)
        return NextResponse.redirect(homepageUrl)
      }
    }

    // Redirect authenticated users away from login page to their homepage
    if (pathname === '/login') {
      const homepage = getHomepageForRole(role || 'viewer', customHomepage)

      // Prevent redirect to self
      if (homepage !== pathname) {
        const homepageUrl = new URL(homepage, request.url)
        return NextResponse.redirect(homepageUrl)
      }
    }

    // Check role-based restrictions
    const isOpsRestrictedRoute = OPS_RESTRICTED_ROUTES.some(route => pathname.startsWith(route))
    const isSalesRestrictedRoute = SALES_RESTRICTED_ROUTES.some(route => pathname.startsWith(route))

    // Redirect ops users to their dashboard for ops-restricted routes
    if (role === 'ops' && isOpsRestrictedRoute) {
      const homepage = getHomepageForRole('ops', customHomepage)
      const dashboardUrl = new URL(homepage, request.url)
      dashboardUrl.searchParams.set('restricted', 'true')
      return NextResponse.redirect(dashboardUrl)
    }

    // Redirect sales users to their dashboard for sales-restricted routes
    if (role === 'sales' && isSalesRestrictedRoute) {
      const homepage = getHomepageForRole('sales', customHomepage)
      const dashboardUrl = new URL(homepage, request.url)
      dashboardUrl.searchParams.set('restricted', 'true')
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Apply security headers to the response (Requirements 8.1-8.5)
  const response = applySecurityHeaders(supabaseResponse)

  // v0.13.1: Page view tracking (non-blocking, fire-and-forget)
  // Only track for authenticated users on non-excluded paths
  if (user && !isPublicRoute && !shouldExcludePath(pathname)) {
    // Check rate limiting before logging
    if (shouldLogPageView(user.id, pathname)) {
      // Fire-and-forget: Don't await, don't block the response
      const baseUrl = request.nextUrl.origin
      fetch(`${baseUrl}/api/activity/page-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          pagePath: pathname,
          sessionId: request.cookies.get('session_id')?.value,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        }),
      }).catch(() => {
        // Silently ignore errors - page view logging should never block navigation
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
