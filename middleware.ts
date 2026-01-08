import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { DEFAULT_ROLE_HOMEPAGES, DEFAULT_FALLBACK_ROUTE } from '@/types/homepage-routing'
import { UserRole } from '@/types/permissions'
import {
  applySecurityHeaders,
  shouldSkipSecurityChecks,
} from '@/lib/security/middleware'

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

  const { supabaseResponse, user } = await updateSession(request)

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

    // v0.35: Role-based homepage routing
    // Redirect root path '/' or '/dashboard' (without sub-path) to role-specific dashboard
    if (pathname === '/' || pathname === '/dashboard') {
      const homepage = getHomepageForRole(role || 'viewer', customHomepage)
      const homepageUrl = new URL(homepage, request.url)
      return NextResponse.redirect(homepageUrl)
    }

    // Redirect authenticated users away from login page to their homepage
    if (pathname === '/login') {
      const homepage = getHomepageForRole(role || 'viewer', customHomepage)
      const homepageUrl = new URL(homepage, request.url)
      return NextResponse.redirect(homepageUrl)
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
  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
