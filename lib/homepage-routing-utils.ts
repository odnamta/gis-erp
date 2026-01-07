// =====================================================
// v0.35: Role-Based Homepage Routing Utilities
// =====================================================

import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/permissions'
import {
  RedirectCondition,
  RedirectRule,
  RoleHomepage,
  HomepageResolutionResult,
  DEFAULT_ROLE_HOMEPAGES,
  DEFAULT_FALLBACK_ROUTE,
} from '@/types/homepage-routing'

/**
 * Get the default homepage route for a role (static mapping)
 * Used as fallback when database is unavailable
 */
export function getRoleHomepage(role: UserRole): string {
  return DEFAULT_ROLE_HOMEPAGES[role] || DEFAULT_FALLBACK_ROUTE
}

/**
 * Get role homepage configuration from database
 */
export async function getRoleHomepageConfig(role: string): Promise<RoleHomepage | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('role_homepages')
      .select('*')
      .eq('role', role)
      .single()

    if (error || !data) {
      return null
    }

    return data as unknown as RoleHomepage
  } catch {
    return null
  }
}

/**
 * Check if user has pending approvals (BKK with status 'pending')
 * Only returns true for owner/admin/manager roles
 */
export async function hasPendingApprovals(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // First check user role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
      return false
    }

    // Check for pending BKK approvals
    const { count } = await supabase
      .from('bukti_kas_keluar')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return (count || 0) > 0
  } catch {
    return false
  }
}

/**
 * Check if user has urgent items requiring immediate attention
 * Currently checks for overdue invoices or critical budget alerts
 */
export async function hasUrgentItems(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // Check for overdue invoices
    const { count: overdueCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue')

    if ((overdueCount || 0) > 0) {
      return true
    }

    // Check for critical budget alerts (exceeded by more than 20%)
    const { count: alertCount } = await supabase
      .from('pjo_cost_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'exceeded')

    return (alertCount || 0) > 5 // More than 5 exceeded items is urgent
  } catch {
    return false
  }
}

/**
 * Check if this is the user's first login today
 */
export async function isFirstLoginToday(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('last_login_at')
      .eq('user_id', userId)
      .single()

    if (!profile?.last_login_at) {
      return true
    }

    const lastLogin = new Date(profile.last_login_at)
    const today = new Date()
    
    return lastLogin.toDateString() !== today.toDateString()
  } catch {
    return false
  }
}

/**
 * Evaluate a redirect condition for a user
 */
export async function evaluateCondition(
  userId: string,
  condition: RedirectCondition
): Promise<boolean> {
  try {
    switch (condition) {
      case 'has_pending_approvals':
        return await hasPendingApprovals(userId)
      case 'has_urgent_items':
        return await hasUrgentItems(userId)
      case 'first_login_today':
        return await isFirstLoginToday(userId)
      default:
        return false
    }
  } catch {
    // On error, treat condition as false to avoid blocking routing
    return false
  }
}

/**
 * Evaluate redirect rules in order and return the first matching route
 */
export async function evaluateRedirectRules(
  userId: string,
  rules: RedirectRule[]
): Promise<{ route: string; condition: RedirectCondition } | null> {
  for (const rule of rules) {
    const matches = await evaluateCondition(userId, rule.condition)
    if (matches) {
      return { route: rule.route, condition: rule.condition }
    }
  }
  return null
}

/**
 * Get the resolved homepage for a user
 * Priority: custom_homepage > redirect_rules > role_homepage > fallback
 */
export async function getUserHomepage(userId: string): Promise<HomepageResolutionResult> {
  try {
    const supabase = await createClient()
    
    // Get user profile with custom_homepage and role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, custom_homepage')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return {
        route: DEFAULT_FALLBACK_ROUTE,
        source: 'fallback',
      }
    }

    // Priority 1: Custom homepage override
    if (profile.custom_homepage) {
      return {
        route: profile.custom_homepage,
        source: 'custom',
      }
    }

    // Get role configuration from database
    const roleConfig = await getRoleHomepageConfig(profile.role)

    if (roleConfig) {
      // Priority 2: Check redirect rules
      if (roleConfig.redirect_rules && roleConfig.redirect_rules.length > 0) {
        const redirectMatch = await evaluateRedirectRules(userId, roleConfig.redirect_rules)
        if (redirectMatch) {
          return {
            route: redirectMatch.route,
            source: 'redirect_rule',
            matchedCondition: redirectMatch.condition,
          }
        }
      }

      // Priority 3: Role default homepage
      return {
        route: roleConfig.homepage_route || roleConfig.fallback_route || DEFAULT_FALLBACK_ROUTE,
        source: 'role_default',
      }
    }

    // Priority 4: Static fallback for known roles
    const staticRoute = getRoleHomepage(profile.role as UserRole)
    if (staticRoute !== DEFAULT_FALLBACK_ROUTE) {
      return {
        route: staticRoute,
        source: 'role_default',
      }
    }

    // Final fallback
    return {
      route: DEFAULT_FALLBACK_ROUTE,
      source: 'fallback',
    }
  } catch {
    return {
      route: DEFAULT_FALLBACK_ROUTE,
      source: 'fallback',
    }
  }
}

/**
 * Get homepage route by role (for use in middleware where we have role but not full user context)
 */
export async function getHomepageByRole(role: string): Promise<string> {
  const roleConfig = await getRoleHomepageConfig(role)
  if (roleConfig) {
    return roleConfig.homepage_route
  }
  return getRoleHomepage(role as UserRole)
}
