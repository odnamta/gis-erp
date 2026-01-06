/**
 * Retention Constants
 * Moved from retention-actions.ts because 'use server' files can only export async functions
 */

/**
 * Log type for retention operations
 */
export type LogType = 'audit_logs' | 'system_logs' | 'login_history' | 'data_access_logs'

/**
 * Retention periods type
 */
export type RetentionPeriods = Record<LogType, number>

/**
 * Default retention periods in days
 */
export const DEFAULT_RETENTION_PERIODS: RetentionPeriods = {
  audit_logs: 365,      // 1 year
  system_logs: 90,      // 3 months
  login_history: 180,   // 6 months
  data_access_logs: 365, // 1 year
}

/**
 * Minimum retention periods in days (for safety)
 */
export const MIN_RETENTION_PERIODS: RetentionPeriods = {
  audit_logs: 30,
  system_logs: 7,
  login_history: 30,
  data_access_logs: 30,
}
