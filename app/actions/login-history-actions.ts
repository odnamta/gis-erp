'use server';

/**
 * Server Actions for Login History
 * v0.76: System Audit & Logging Module
 * 
 * Provides server actions for:
 * - Querying login history with pagination and filters
 * - Getting user session statistics
 * - Recording login/logout events
 * - Exporting login history
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { createClient } from '@/lib/supabase/server';
import {
  LoginHistoryEntry,
  LoginHistoryFilters,
  LoginHistoryPagination,
  PaginatedLoginHistory,
  SessionStatistics,
  RecordLoginInput,
  RecordFailedLoginInput,
} from '@/types/login-history';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  createLoginInput,
  createFailedLoginInput,
  createLogoutUpdate,
  calculateSessionStatistics,
  exportToCsv,
} from '@/lib/login-history-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

// =====================================================
// LOGIN HISTORY QUERY ACTIONS
// =====================================================

/**
 * Gets paginated login history with optional filters.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * - Supports filtering by user_id
 * - Supports filtering by status (success, failed)
 * - Supports filtering by date range
 * - Supports filtering by login_method
 */
export async function getLoginHistory(
  filters?: LoginHistoryFilters,
  pagination?: Partial<LoginHistoryPagination>
): Promise<ActionResult<PaginatedLoginHistory>> {
  try {
    const supabase = await createClient();
    
    // Validate and set pagination defaults
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.min(Math.max(1, pagination?.page_size ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const sortBy = pagination?.sort_by ?? 'login_at';
    const sortOrder = pagination?.sort_order ?? 'desc';
    
    // Build query
    let query = supabase
      .from('login_history' as AnyTable)
      .select('*', { count: 'exact' });
    
    // Apply filters
    // Filter by user_id (Requirement 6.1)
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    // Filter by status - single or array (Requirement 6.2)
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }
    
    // Filter by login_method - single or array (Requirement 6.4)
    if (filters?.login_method) {
      const methods = Array.isArray(filters.login_method) ? filters.login_method : [filters.login_method];
      query = query.in('login_method', methods);
    }
    
    // Filter by device_type - single or array
    if (filters?.device_type) {
      const deviceTypes = Array.isArray(filters.device_type) ? filters.device_type : [filters.device_type];
      query = query.in('device_type', deviceTypes);
    }
    
    // Filter by date range (Requirement 6.3)
    if (filters?.start_date) {
      query = query.gte('login_at', filters.start_date);
    }
    
    if (filters?.end_date) {
      // Add time to include the entire end date
      const endDateTime = filters.end_date.includes('T') 
        ? filters.end_date 
        : `${filters.end_date}T23:59:59.999Z`;
      query = query.lte('login_at', endDateTime);
    }
    
    // Apply sorting (default: most recent first)
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });
    
    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    
    const result: PaginatedLoginHistory = {
      data: (data || []) as unknown as LoginHistoryEntry[],
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching login history:', error);
    return { success: false, error: 'Failed to fetch login history' };
  }
}

/**
 * Gets session statistics for a specific user.
 * 
 * Requirement 6.5: Calculate and return session statistics including average session duration
 */
export async function getUserSessionStats(
  userId: string
): Promise<ActionResult<SessionStatistics>> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    const supabase = await createClient();
    
    // Fetch all login history for the user
    const { data, error } = await supabase
      .from('login_history' as AnyTable)
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false });
    
    if (error) throw error;
    
    const entries = (data || []) as unknown as LoginHistoryEntry[];
    
    // Calculate statistics using utility function
    const stats = calculateSessionStatistics(userId, entries);
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching user session stats:', error);
    return { success: false, error: 'Failed to fetch session statistics' };
  }
}

// =====================================================
// LOGIN/LOGOUT RECORDING ACTIONS
// =====================================================

/**
 * Records a successful login event.
 * 
 * Requirement 3.1: Record login event with timestamp and method
 */
export async function recordLogin(
  input: RecordLoginInput
): Promise<ActionResult<LoginHistoryEntry>> {
  try {
    if (!input.user_id) {
      return { success: false, error: 'User ID is required' };
    }
    
    const supabase = await createClient();
    
    // Create login entry using utility function
    const loginEntry = createLoginInput(input);
    
    const { data, error } = await supabase
      .from('login_history' as AnyTable)
      .insert(loginEntry)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data: data as unknown as LoginHistoryEntry };
  } catch (error) {
    console.error('Error recording login:', error);
    return { success: false, error: 'Failed to record login' };
  }
}

/**
 * Records a logout event and calculates session duration.
 * 
 * Requirement 3.2: Update record with logout time and calculate session duration
 */
export async function recordLogout(
  userId: string
): Promise<ActionResult<LoginHistoryEntry>> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    const supabase = await createClient();
    
    // Find the most recent login without a logout
    const { data: activeSession, error: findError } = await supabase
      .from('login_history' as AnyTable)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'success')
      .is('logout_at', null)
      .order('login_at', { ascending: false })
      .limit(1)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }
    
    if (!activeSession) {
      return { success: false, error: 'No active session found for user' };
    }
    
    // Cast to any to access properties
    const session = activeSession as any;
    
    // Calculate logout update using utility function
    const logoutUpdate = createLogoutUpdate(session.login_at);
    
    const { data, error } = await supabase
      .from('login_history' as AnyTable)
      .update(logoutUpdate)
      .eq('id', session.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data: data as unknown as LoginHistoryEntry };
  } catch (error) {
    console.error('Error recording logout:', error);
    return { success: false, error: 'Failed to record logout' };
  }
}

/**
 * Records a failed login attempt.
 * 
 * Requirement 3.4: Record failure with reason
 */
export async function recordFailedLogin(
  input: RecordFailedLoginInput
): Promise<ActionResult<LoginHistoryEntry>> {
  try {
    if (!input.failure_reason) {
      return { success: false, error: 'Failure reason is required' };
    }
    
    const supabase = await createClient();
    
    // Create failed login entry using utility function
    const failedEntry = createFailedLoginInput(input);
    
    const { data, error } = await supabase
      .from('login_history' as AnyTable)
      .insert(failedEntry)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data: data as unknown as LoginHistoryEntry };
  } catch (error) {
    console.error('Error recording failed login:', error);
    return { success: false, error: 'Failed to record failed login' };
  }
}

// =====================================================
// EXPORT ACTIONS
// =====================================================

/**
 * Exports login history to CSV format.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export async function exportLoginHistory(
  filters?: LoginHistoryFilters,
  maxRecords: number = 10000
): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('login_history' as AnyTable)
      .select('*')
      .order('login_at', { ascending: false })
      .limit(maxRecords);
    
    // Apply filters
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }
    if (filters?.login_method) {
      const methods = Array.isArray(filters.login_method) ? filters.login_method : [filters.login_method];
      query = query.in('login_method', methods);
    }
    if (filters?.start_date) {
      query = query.gte('login_at', filters.start_date);
    }
    if (filters?.end_date) {
      const endDateTime = filters.end_date.includes('T') 
        ? filters.end_date 
        : `${filters.end_date}T23:59:59.999Z`;
      query = query.lte('login_at', endDateTime);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const entries = (data || []) as unknown as LoginHistoryEntry[];
    
    // Generate CSV using utility function
    const csv = exportToCsv(entries);
    
    return { success: true, data: csv };
  } catch (error) {
    console.error('Error exporting login history:', error);
    return { success: false, error: 'Failed to export login history' };
  }
}

// =====================================================
// UTILITY ACTIONS
// =====================================================

/**
 * Gets distinct values for filter dropdowns.
 */
export async function getLoginHistoryFilterOptions(): Promise<ActionResult<{
  loginMethods: string[];
  deviceTypes: string[];
  browsers: string[];
  operatingSystems: string[];
}>> {
  try {
    const supabase = await createClient();
    
    // Get distinct login methods
    const { data: methodData } = await supabase
      .from('login_history' as AnyTable)
      .select('login_method')
      .not('login_method', 'is', null);
    
    const loginMethods = [...new Set(((methodData || []) as any[]).map((d) => d.login_method))].filter(Boolean).sort();
    
    // Get distinct device types
    const { data: deviceData } = await supabase
      .from('login_history' as AnyTable)
      .select('device_type')
      .not('device_type', 'is', null);
    
    const deviceTypes = [...new Set(((deviceData || []) as any[]).map((d) => d.device_type))].filter(Boolean).sort();
    
    // Get distinct browsers
    const { data: browserData } = await supabase
      .from('login_history' as AnyTable)
      .select('browser')
      .not('browser', 'is', null);
    
    const browsers = [...new Set(((browserData || []) as any[]).map((d) => d.browser))].filter(Boolean).sort();
    
    // Get distinct operating systems
    const { data: osData } = await supabase
      .from('login_history' as AnyTable)
      .select('os')
      .not('os', 'is', null);
    
    const operatingSystems = [...new Set(((osData || []) as any[]).map((d) => d.os))].filter(Boolean).sort();
    
    return {
      success: true,
      data: {
        loginMethods: loginMethods as string[],
        deviceTypes: deviceTypes as string[],
        browsers: browsers as string[],
        operatingSystems: operatingSystems as string[],
      },
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return { success: false, error: 'Failed to fetch filter options' };
  }
}

/**
 * Gets active sessions (users currently logged in).
 */
export async function getActiveSessions(): Promise<ActionResult<LoginHistoryEntry[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('login_history' as AnyTable)
      .select('*')
      .eq('status', 'success')
      .is('logout_at', null)
      .order('login_at', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, data: (data || []) as unknown as LoginHistoryEntry[] };
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return { success: false, error: 'Failed to fetch active sessions' };
  }
}

/**
 * Gets recent failed login attempts for security monitoring.
 */
export async function getRecentFailedLogins(
  withinMinutes: number = 30,
  limit: number = 50
): Promise<ActionResult<LoginHistoryEntry[]>> {
  try {
    const supabase = await createClient();
    
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - withinMinutes);
    
    const { data, error } = await supabase
      .from('login_history' as AnyTable)
      .select('*')
      .eq('status', 'failed')
      .gte('login_at', cutoffTime.toISOString())
      .order('login_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return { success: true, data: (data || []) as unknown as LoginHistoryEntry[] };
  } catch (error) {
    console.error('Error fetching recent failed logins:', error);
    return { success: false, error: 'Failed to fetch recent failed logins' };
  }
}

/**
 * Gets login history summary for dashboard.
 */
export async function getLoginHistorySummary(
  days: number = 7
): Promise<ActionResult<{
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  averageSessionDuration: number;
}>> {
  try {
    const supabase = await createClient();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('login_history' as AnyTable)
      .select('*')
      .gte('login_at', startDate.toISOString());
    
    if (error) throw error;
    
    const entries = (data || []) as unknown as LoginHistoryEntry[];
    
    const totalLogins = entries.length;
    const successfulLogins = entries.filter(e => e.status === 'success').length;
    const failedLogins = entries.filter(e => e.status === 'failed').length;
    const uniqueUsers = new Set(entries.map(e => e.user_id)).size;
    
    // Calculate average session duration
    const sessionsWithDuration = entries.filter(
      e => e.status === 'success' && e.session_duration_minutes !== null
    );
    const totalDuration = sessionsWithDuration.reduce(
      (sum, e) => sum + (e.session_duration_minutes || 0),
      0
    );
    const averageSessionDuration = sessionsWithDuration.length > 0
      ? Math.round((totalDuration / sessionsWithDuration.length) * 100) / 100
      : 0;
    
    return {
      success: true,
      data: {
        totalLogins,
        successfulLogins,
        failedLogins,
        uniqueUsers,
        averageSessionDuration,
      },
    };
  } catch (error) {
    console.error('Error fetching login history summary:', error);
    return { success: false, error: 'Failed to fetch login history summary' };
  }
}
