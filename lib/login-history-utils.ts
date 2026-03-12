/**
 * Login History Utility Functions
 * v0.76: System Audit & Logging Module
 * 
 * Provides utility functions for login history tracking, including:
 * - Recording login/logout events
 * - Recording failed login attempts
 * - Querying login history with filters
 * - Session statistics calculation
 * - User agent parsing
 */

import {
  LoginHistoryEntry,
  RecordLoginInput,
  RecordFailedLoginInput,
  LoginHistoryFilters,
  LoginHistoryPagination,
  PaginatedLoginHistory,
  SessionStatistics,
  ParsedUserAgent,
  LoginMethod,
  DeviceType,
  LoginStatus,
} from '@/types/login-history';

// =====================================================
// Constants
// =====================================================

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Login status labels for display
 */
export const LOGIN_STATUS_LABELS: Record<LoginStatus, string> = {
  success: 'Success',
  failed: 'Failed',
};

/**
 * Login status colors for UI
 */
export const LOGIN_STATUS_COLORS: Record<LoginStatus, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Login method labels for display
 */
export const LOGIN_METHOD_LABELS: Record<LoginMethod, string> = {
  password: 'Password',
  google: 'Google',
  magic_link: 'Magic Link',
};

/**
 * Device type labels for display
 */
export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
};

// =====================================================
// User Agent Parsing
// =====================================================

/**
 * Browser detection patterns
 */
const BROWSER_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /Edg\/(\d+)/, name: 'Edge' },
  { pattern: /OPR\/(\d+)/, name: 'Opera' },
  { pattern: /Chrome\/(\d+)/, name: 'Chrome' },
  { pattern: /Firefox\/(\d+)/, name: 'Firefox' },
  { pattern: /Safari\/(\d+)/, name: 'Safari' },
  { pattern: /MSIE (\d+)/, name: 'Internet Explorer' },
  { pattern: /Trident\/.*rv:(\d+)/, name: 'Internet Explorer' },
];

/**
 * OS detection patterns
 */
const OS_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /Windows NT 10/, name: 'Windows 10' },
  { pattern: /Windows NT 6\.3/, name: 'Windows 8.1' },
  { pattern: /Windows NT 6\.2/, name: 'Windows 8' },
  { pattern: /Windows NT 6\.1/, name: 'Windows 7' },
  { pattern: /Windows/, name: 'Windows' },
  { pattern: /Mac OS X (\d+[._]\d+)/, name: 'macOS' },
  { pattern: /Macintosh/, name: 'macOS' },
  { pattern: /Android (\d+)/, name: 'Android' },
  { pattern: /iPhone OS (\d+)/, name: 'iOS' },
  { pattern: /iPad.*OS (\d+)/, name: 'iPadOS' },
  { pattern: /Linux/, name: 'Linux' },
  { pattern: /Ubuntu/, name: 'Ubuntu' },
  { pattern: /CrOS/, name: 'Chrome OS' },
];

/**
 * Parses a user agent string to extract device, browser, and OS information.
 * 
 * Property 7: User Agent Parsing
 * For any valid user agent string, the parseUserAgent function SHALL extract 
 * and return device_type (desktop, mobile, or tablet), browser name, and 
 * operating system name.
 * 
 * @param userAgent - The user agent string to parse
 * @returns Parsed user agent information
 */
export function parseUserAgent(userAgent: string): ParsedUserAgent {
  if (!userAgent || userAgent.trim() === '') {
    return {
      device_type: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
    };
  }

  const _ua = userAgent.toLowerCase();

  // Detect device type
  let device_type: DeviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(userAgent)) {
    device_type = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    device_type = 'tablet';
  }

  // Detect browser
  let browser = 'Unknown';
  for (const { pattern, name } of BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      browser = name;
      break;
    }
  }

  // Detect OS
  let os = 'Unknown';
  for (const { pattern, name } of OS_PATTERNS) {
    if (pattern.test(userAgent)) {
      os = name;
      break;
    }
  }

  return {
    device_type,
    browser,
    os,
  };
}

// =====================================================
// Login Record Creation
// =====================================================

/**
 * Creates a login history input for a successful login.
 * 
 * Property 6: Login Session Lifecycle
 * For any successful login followed by a logout, the login_history record 
 * SHALL have login_at set to the login time.
 * 
 * @param input - Login input data
 * @returns LoginHistoryEntry ready for database insertion (without id)
 */
export function createLoginInput(input: RecordLoginInput): Omit<LoginHistoryEntry, 'id'> {
  const parsedUA = input.user_agent ? parseUserAgent(input.user_agent) : null;

  return {
    user_id: input.user_id,
    login_at: new Date().toISOString(),
    logout_at: null,
    session_duration_minutes: null,
    login_method: input.login_method || 'password',
    ip_address: input.ip_address || null,
    user_agent: input.user_agent || null,
    device_type: input.device_type || parsedUA?.device_type || null,
    browser: input.browser || parsedUA?.browser || null,
    os: input.os || parsedUA?.os || null,
    country: input.country || null,
    city: input.city || null,
    status: 'success',
    failure_reason: null,
  };
}

/**
 * Creates a login history input for a failed login attempt.
 * 
 * Property 8: Failed Login Recording
 * For any failed login attempt, the login_history record SHALL have status 
 * set to 'failed' and failure_reason SHALL contain a non-empty description 
 * of the failure.
 * 
 * @param input - Failed login input data
 * @returns LoginHistoryEntry ready for database insertion (without id)
 */
export function createFailedLoginInput(
  input: RecordFailedLoginInput
): Omit<LoginHistoryEntry, 'id'> {
  const parsedUA = input.user_agent ? parseUserAgent(input.user_agent) : null;

  return {
    user_id: input.user_id || '',
    login_at: new Date().toISOString(),
    logout_at: null,
    session_duration_minutes: null,
    login_method: input.login_method || 'password',
    ip_address: input.ip_address || null,
    user_agent: input.user_agent || null,
    device_type: parsedUA?.device_type || null,
    browser: parsedUA?.browser || null,
    os: parsedUA?.os || null,
    country: null,
    city: null,
    status: 'failed',
    failure_reason: input.failure_reason || 'Unknown error',
  };
}

// =====================================================
// Session Duration Calculation
// =====================================================

/**
 * Calculates session duration in minutes between login and logout times.
 * 
 * Property 6: Login Session Lifecycle
 * For any successful login followed by a logout, session_duration_minutes 
 * SHALL equal the difference between logout_at and login_at in minutes (rounded).
 * 
 * @param loginAt - Login timestamp (ISO string or Date)
 * @param logoutAt - Logout timestamp (ISO string or Date)
 * @returns Session duration in minutes (rounded)
 */
export function calculateSessionDuration(
  loginAt: string | Date,
  logoutAt: string | Date
): number {
  const login = loginAt instanceof Date ? loginAt : new Date(loginAt);
  const logout = logoutAt instanceof Date ? logoutAt : new Date(logoutAt);

  const durationMs = logout.getTime() - login.getTime();
  const durationMinutes = durationMs / (1000 * 60);

  return Math.round(durationMinutes);
}

/**
 * Creates logout update data with calculated session duration.
 * 
 * @param loginAt - Original login timestamp
 * @param logoutAt - Logout timestamp (defaults to now)
 * @returns Update data for the login history record
 */
export function createLogoutUpdate(
  loginAt: string | Date,
  logoutAt?: string | Date
): { logout_at: string; session_duration_minutes: number } {
  const logout = logoutAt || new Date();
  const logoutIso = logout instanceof Date ? logout.toISOString() : logout;

  return {
    logout_at: logoutIso,
    session_duration_minutes: calculateSessionDuration(loginAt, logout),
  };
}

// =====================================================
// Login History Filtering
// =====================================================

/**
 * Filters login history entries based on provided criteria.
 * 
 * Property 11: Login History Filter Correctness
 * For any combination of login history filters (user_id, status, login_method, 
 * date range), all returned entries SHALL match ALL specified filter criteria.
 * 
 * @param entries - Array of login history entries to filter
 * @param filters - Filter criteria
 * @returns Filtered array of login history entries
 */
export function filterLoginHistory(
  entries: LoginHistoryEntry[],
  filters: LoginHistoryFilters
): LoginHistoryEntry[] {
  return entries.filter((entry) => {
    // Filter by user_id
    if (filters.user_id && entry.user_id !== filters.user_id) {
      return false;
    }

    // Filter by status (single or array)
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(entry.status)) {
        return false;
      }
    }

    // Filter by login_method (single or array)
    if (filters.login_method) {
      const methods = Array.isArray(filters.login_method)
        ? filters.login_method
        : [filters.login_method];
      if (!methods.includes(entry.login_method)) {
        return false;
      }
    }

    // Filter by device_type (single or array)
    if (filters.device_type) {
      const deviceTypes = Array.isArray(filters.device_type)
        ? filters.device_type
        : [filters.device_type];
      if (!entry.device_type || !deviceTypes.includes(entry.device_type)) {
        return false;
      }
    }

    // Filter by date range (login_at)
    if (filters.start_date) {
      const entryDate = new Date(entry.login_at);
      const startDate = new Date(filters.start_date);
      startDate.setHours(0, 0, 0, 0);
      if (entryDate < startDate) {
        return false;
      }
    }

    if (filters.end_date) {
      const entryDate = new Date(entry.login_at);
      const endDate = new Date(filters.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (entryDate > endDate) {
        return false;
      }
    }

    return true;
  });
}

// =====================================================
// Login History Sorting
// =====================================================

/**
 * Sorts login history entries by specified field.
 * 
 * Property 13: Query Results Timestamp Ordering
 * For any query result from login_history, the entries SHALL be sorted by 
 * timestamp in descending order (most recent first).
 * 
 * @param entries - Array of login history entries to sort
 * @param sortBy - Field to sort by (default: login_at)
 * @param sortOrder - Sort order (default: desc)
 * @returns Sorted array of login history entries
 */
export function sortLoginHistory(
  entries: LoginHistoryEntry[],
  sortBy: keyof LoginHistoryEntry = 'login_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): LoginHistoryEntry[] {
  return [...entries].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? -1 : 1;
    if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? 1 : -1;

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (aVal < bVal) {
      comparison = -1;
    } else if (aVal > bVal) {
      comparison = 1;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

// =====================================================
// Login History Pagination
// =====================================================

/**
 * Paginates login history entries.
 * 
 * @param entries - Array of login history entries to paginate
 * @param pagination - Pagination options
 * @returns Paginated result with metadata
 */
export function paginateLoginHistory(
  entries: LoginHistoryEntry[],
  pagination: LoginHistoryPagination
): PaginatedLoginHistory {
  const { page, page_size, sort_by = 'login_at', sort_order = 'desc' } = pagination;

  // Validate pagination
  const validPageSize = Math.min(Math.max(1, page_size), MAX_PAGE_SIZE);
  const validPage = Math.max(1, page);

  // Sort entries
  const sorted = sortLoginHistory(entries, sort_by, sort_order);

  // Calculate pagination
  const total = sorted.length;
  const total_pages = Math.ceil(total / validPageSize);
  const offset = (validPage - 1) * validPageSize;

  // Slice for current page
  const data = sorted.slice(offset, offset + validPageSize);

  return {
    data,
    total,
    page: validPage,
    page_size: validPageSize,
    total_pages,
  };
}

// =====================================================
// Session Statistics
// =====================================================

/**
 * Calculates session statistics for a user from login history entries.
 * 
 * Property 14: Session Statistics Calculation
 * For any set of login_history records for a user with non-null 
 * session_duration_minutes, the calculated average session duration SHALL 
 * equal the sum of all session durations divided by the count of sessions.
 * 
 * @param userId - The user ID to calculate statistics for
 * @param entries - Array of login history entries (should be filtered to user)
 * @returns Session statistics for the user
 */
export function calculateSessionStatistics(
  userId: string,
  entries: LoginHistoryEntry[]
): SessionStatistics {
  // Filter to user's entries
  const userEntries = entries.filter((e) => e.user_id === userId);

  // Count successful and failed logins
  const successfulLogins = userEntries.filter((e) => e.status === 'success').length;
  const failedLogins = userEntries.filter((e) => e.status === 'failed').length;

  // Calculate session durations (only for completed sessions)
  const sessionsWithDuration = userEntries.filter(
    (e) => e.status === 'success' && e.session_duration_minutes !== null
  );

  const totalSessionTime = sessionsWithDuration.reduce(
    (sum, e) => sum + (e.session_duration_minutes || 0),
    0
  );

  const averageSessionDuration =
    sessionsWithDuration.length > 0
      ? totalSessionTime / sessionsWithDuration.length
      : 0;

  // Find last login/logout
  const sortedByLogin = [...userEntries]
    .filter((e) => e.status === 'success')
    .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());

  const lastLogin = sortedByLogin[0];

  const sortedByLogout = [...userEntries]
    .filter((e) => e.logout_at !== null)
    .sort((a, b) => new Date(b.logout_at!).getTime() - new Date(a.logout_at!).getTime());

  const lastLogout = sortedByLogout[0];

  // Find most used device type
  const deviceCounts = new Map<DeviceType, number>();
  for (const entry of userEntries) {
    if (entry.device_type) {
      deviceCounts.set(entry.device_type, (deviceCounts.get(entry.device_type) || 0) + 1);
    }
  }
  const mostUsedDevice = deviceCounts.size > 0
    ? Array.from(deviceCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Find most used browser
  const browserCounts = new Map<string, number>();
  for (const entry of userEntries) {
    if (entry.browser) {
      browserCounts.set(entry.browser, (browserCounts.get(entry.browser) || 0) + 1);
    }
  }
  const mostUsedBrowser = browserCounts.size > 0
    ? Array.from(browserCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Get unique login methods used
  const loginMethodsUsed = Array.from(
    new Set(userEntries.map((e) => e.login_method))
  );

  return {
    user_id: userId,
    total_sessions: userEntries.length,
    successful_logins: successfulLogins,
    failed_logins: failedLogins,
    average_session_duration_minutes: Math.round(averageSessionDuration * 100) / 100,
    total_session_time_minutes: totalSessionTime,
    last_login_at: lastLogin?.login_at || null,
    last_logout_at: lastLogout?.logout_at || null,
    most_used_device: mostUsedDevice,
    most_used_browser: mostUsedBrowser,
    login_methods_used: loginMethodsUsed,
  };
}

// =====================================================
// Formatting Functions
// =====================================================

/**
 * Formats login status for display.
 */
export function formatLoginStatus(status: LoginStatus): string {
  return LOGIN_STATUS_LABELS[status];
}

/**
 * Gets login status badge color class.
 */
export function getLoginStatusColor(status: LoginStatus): string {
  return LOGIN_STATUS_COLORS[status];
}

/**
 * Formats login method for display.
 */
export function formatLoginMethod(method: LoginMethod): string {
  return LOGIN_METHOD_LABELS[method];
}

/**
 * Formats device type for display.
 */
export function formatDeviceType(deviceType: DeviceType | null): string {
  if (!deviceType) return 'Unknown';
  return DEVICE_TYPE_LABELS[deviceType];
}

/**
 * Formats session duration for display.
 */
export function formatSessionDuration(minutes: number | null): string {
  if (minutes === null) return 'Active';
  if (minutes < 1) return 'Less than a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formats login timestamp for display.
 */
export function formatLoginTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formats device info for display.
 */
export function formatDeviceInfo(entry: LoginHistoryEntry): string {
  const parts: string[] = [];

  if (entry.browser) parts.push(entry.browser);
  if (entry.os) parts.push(`on ${entry.os}`);
  if (entry.device_type) parts.push(`(${formatDeviceType(entry.device_type)})`);

  return parts.length > 0 ? parts.join(' ') : 'Unknown device';
}

/**
 * Formats location info for display.
 */
export function formatLocationInfo(entry: LoginHistoryEntry): string {
  const parts: string[] = [];

  if (entry.city) parts.push(entry.city);
  if (entry.country) parts.push(entry.country);

  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}

// =====================================================
// Validation Functions
// =====================================================

/**
 * Validates if a string is a valid login method.
 */
export function isValidLoginMethod(method: string): method is LoginMethod {
  return ['password', 'google', 'magic_link'].includes(method);
}

/**
 * Validates if a string is a valid login status.
 */
export function isValidLoginStatus(status: string): status is LoginStatus {
  return ['success', 'failed'].includes(status);
}

/**
 * Validates if a string is a valid device type.
 */
export function isValidDeviceType(deviceType: string): deviceType is DeviceType {
  return ['desktop', 'mobile', 'tablet'].includes(deviceType);
}

/**
 * Validates login input.
 */
export function validateLoginInput(input: Partial<RecordLoginInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.user_id || input.user_id.trim() === '') {
    errors.push('User ID is required');
  }

  if (input.login_method && !isValidLoginMethod(input.login_method)) {
    errors.push('Invalid login method');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates failed login input.
 */
export function validateFailedLoginInput(input: Partial<RecordFailedLoginInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.failure_reason || input.failure_reason.trim() === '') {
    errors.push('Failure reason is required');
  }

  if (input.login_method && !isValidLoginMethod(input.login_method)) {
    errors.push('Invalid login method');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =====================================================
// Export Helpers
// =====================================================

/**
 * Formats login history entry for CSV export.
 */
export function formatForCsvExport(entry: LoginHistoryEntry): Record<string, string> {
  return {
    login_at: entry.login_at,
    logout_at: entry.logout_at || '',
    session_duration: entry.session_duration_minutes?.toString() || '',
    status: formatLoginStatus(entry.status),
    login_method: formatLoginMethod(entry.login_method),
    device_type: formatDeviceType(entry.device_type),
    browser: entry.browser || '',
    os: entry.os || '',
    ip_address: entry.ip_address || '',
    country: entry.country || '',
    city: entry.city || '',
    failure_reason: entry.failure_reason || '',
  };
}

/**
 * Exports login history to CSV format.
 */
export function exportToCsv(entries: LoginHistoryEntry[]): string {
  const headers = [
    'Login At',
    'Logout At',
    'Duration (min)',
    'Status',
    'Method',
    'Device',
    'Browser',
    'OS',
    'IP Address',
    'Country',
    'City',
    'Failure Reason',
  ];

  const rows = entries.map((entry) => {
    const formatted = formatForCsvExport(entry);
    return [
      formatted.login_at,
      formatted.logout_at,
      formatted.session_duration,
      formatted.status,
      formatted.login_method,
      formatted.device_type,
      formatted.browser,
      formatted.os,
      formatted.ip_address,
      formatted.country,
      formatted.city,
      formatted.failure_reason,
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// =====================================================
// Query Helpers
// =====================================================

/**
 * Gets active sessions (logged in but not logged out).
 */
export function getActiveSessions(entries: LoginHistoryEntry[]): LoginHistoryEntry[] {
  return entries.filter((e) => e.status === 'success' && e.logout_at === null);
}

/**
 * Gets failed login attempts.
 */
export function getFailedLogins(entries: LoginHistoryEntry[]): LoginHistoryEntry[] {
  return entries.filter((e) => e.status === 'failed');
}

/**
 * Gets recent failed login attempts for a user (for security alerts).
 */
export function getRecentFailedLogins(
  entries: LoginHistoryEntry[],
  userId: string,
  withinMinutes: number = 30
): LoginHistoryEntry[] {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - withinMinutes);

  return entries.filter(
    (e) =>
      e.user_id === userId &&
      e.status === 'failed' &&
      new Date(e.login_at) >= cutoff
  );
}

/**
 * Checks if there are suspicious login patterns (multiple failed attempts).
 */
export function hasSuspiciousActivity(
  entries: LoginHistoryEntry[],
  userId: string,
  threshold: number = 5,
  withinMinutes: number = 30
): boolean {
  const recentFailed = getRecentFailedLogins(entries, userId, withinMinutes);
  return recentFailed.length >= threshold;
}

/**
 * Gets login history for a specific user.
 */
export function getUserLoginHistory(
  entries: LoginHistoryEntry[],
  userId: string
): LoginHistoryEntry[] {
  return entries
    .filter((e) => e.user_id === userId)
    .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());
}
