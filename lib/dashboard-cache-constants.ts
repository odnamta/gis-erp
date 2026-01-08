/**
 * Dashboard Cache Constants
 * Separated from server actions to avoid 'use server' restrictions
 */

// Cache key prefixes for different dashboard sections
export const CACHE_KEYS = {
  OWNER_DASHBOARD: 'owner-dashboard',
  OWNER_KPIS: 'owner-kpis',
  OWNER_USER_METRICS: 'owner-user-metrics',
  OWNER_SYSTEM_KPIS: 'owner-system-kpis',
  OWNER_RECENT_LOGINS: 'owner-recent-logins',
  OPS_DASHBOARD: 'ops-dashboard',
  FINANCE_DASHBOARD: 'finance-dashboard',
  SALES_DASHBOARD: 'sales-dashboard',
  MANAGER_DASHBOARD: 'manager-dashboard',
  ADMIN_DASHBOARD: 'admin-dashboard',
} as const

// TTL configurations (in milliseconds)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute - for frequently changing data
  DEFAULT: 5 * 60 * 1000,    // 5 minutes - default
  LONG: 15 * 60 * 1000,      // 15 minutes - for stable data
} as const
