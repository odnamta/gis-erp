'use server';

/**
 * Server Actions for System Logs
 * v0.76: System Audit & Logging Module
 * 
 * Provides server actions for:
 * - Querying system logs with pagination and filters
 * - Getting log statistics for monitoring
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { ADMIN_ROLES } from '@/lib/permissions';
import {
  SystemLogEntry,
  SystemLogFilters,
  SystemLogPagination,
  PaginatedSystemLogs,
  SystemLogStats,
  SystemLogLevel,
} from '@/types/system-log';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  calculateLogStats,
} from '@/lib/system-log-utils';

async function requireSystemLogAccess(): Promise<{ authorized: true } | { authorized: false; error: string }> {
  const profile = await getUserProfile();
  if (!profile || !(ADMIN_ROLES as readonly string[]).includes(profile.role)) {
    return { authorized: false, error: 'Unauthorized: system logs require owner/director/sysadmin role' };
  }
  return { authorized: true };
}

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// SYSTEM LOG QUERY ACTIONS
// =====================================================

/**
 * Gets paginated system logs with optional filters.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * - Supports filtering by log level
 * - Supports filtering by source module
 * - Supports filtering by date range
 * - Supports text search in message content
 * - Returns results sorted by timestamp descending
 */
export async function getSystemLogs(
  filters?: SystemLogFilters,
  pagination?: Partial<SystemLogPagination>
): Promise<ActionResult<PaginatedSystemLogs>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = await createClient();

    // Validate and set pagination defaults
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.min(Math.max(1, pagination?.page_size ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const sortBy = pagination?.sort_by ?? 'timestamp';
    const sortOrder = pagination?.sort_order ?? 'desc';
    
    // Build query - using type assertion as system_logs table may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = supabase
      .from('system_logs')
      .select('*', { count: 'exact' });
    
    // Apply filters
    // Filter by level (single or array) - Requirement 7.1
    if (filters?.level) {
      const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
      query = query.in('level', levels);
    }
    
    // Filter by source (case-insensitive partial match) - Requirement 7.2
    if (filters?.source) {
      query = query.ilike('source', `%${filters.source}%`);
    }
    
    // Filter by module (case-insensitive partial match)
    if (filters?.module) {
      query = query.ilike('module', `%${filters.module}%`);
    }
    
    // Filter by user_id
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    // Filter by request_id
    if (filters?.request_id) {
      query = query.eq('request_id', filters.request_id);
    }
    
    // Filter by search term (searches in message) - Requirement 7.4
    if (filters?.search) {
      query = query.ilike('message', `%${filters.search}%`);
    }
    
    // Filter by date range - Requirement 7.3
    if (filters?.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }
    
    if (filters?.end_date) {
      // Add time to include the entire end date
      const endDateTime = filters.end_date.includes('T') 
        ? filters.end_date 
        : `${filters.end_date}T23:59:59.999Z`;
      query = query.lte('timestamp', endDateTime);
    }
    
    // Apply sorting - Requirement 7.5 (descending by default)
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });
    
    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    
    const result: PaginatedSystemLogs = {
      data: (data || []) as SystemLogEntry[],
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
    
    return { success: true, data: result };
  } catch (error) {
    console.error('getSystemLogs error:', error);
    return { success: false, error: 'Failed to fetch system logs' };
  }
}

/**
 * Gets system log statistics for monitoring dashboard.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * Returns statistics including:
 * - Total entries count
 * - Entries by log level
 * - Entries by source
 * - Entries by module
 * - Error rate
 * - Recent errors
 */
export async function getLogStatistics(
  filters?: SystemLogFilters
): Promise<ActionResult<SystemLogStats>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = await createClient();

    // Build query with filters - using type assertion as system_logs table may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = supabase.from('system_logs').select('*');
    
    // Apply date filters if provided
    if (filters?.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }
    if (filters?.end_date) {
      const endDateTime = filters.end_date.includes('T') 
        ? filters.end_date 
        : `${filters.end_date}T23:59:59.999Z`;
      query = query.lte('timestamp', endDateTime);
    }
    
    // Apply level filter if provided
    if (filters?.level) {
      const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
      query = query.in('level', levels);
    }
    
    // Apply source filter if provided
    if (filters?.source) {
      query = query.ilike('source', `%${filters.source}%`);
    }
    
    // Apply module filter if provided
    if (filters?.module) {
      query = query.ilike('module', `%${filters.module}%`);
    }
    
    const { data: entries, error } = await query.limit(10000);

    if (error) throw error;

    // Use the utility function to calculate stats
    const stats = calculateLogStats((entries || []) as SystemLogEntry[]);

    return { success: true, data: stats };
  } catch (error) {
    console.error('getLogStatistics error:', error);
    return { success: false, error: 'Failed to fetch log statistics' };
  }
}

// =====================================================
// ADDITIONAL QUERY ACTIONS
// =====================================================

/**
 * Gets logs for a specific request ID (for request tracing).
 * Useful for debugging and correlating logs across a single request.
 */
export async function getLogsByRequestId(
  requestId: string
): Promise<ActionResult<SystemLogEntry[]>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    if (!requestId) {
      return { success: false, error: 'Request ID is required' };
    }

    const supabase = await createClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('request_id', requestId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    return { success: true, data: (data || []) as SystemLogEntry[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch logs by request ID' };
  }
}

/**
 * Gets recent error logs for quick monitoring.
 * Returns the most recent error-level logs.
 */
export async function getRecentErrors(
  limit: number = 10
): Promise<ActionResult<SystemLogEntry[]>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('level', 'error')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return { success: true, data: (data || []) as SystemLogEntry[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch recent errors' };
  }
}

/**
 * Gets logs at or above a certain severity level.
 * Useful for filtering to see only important logs.
 */
export async function getLogsAtOrAboveLevel(
  minLevel: SystemLogLevel,
  pagination?: Partial<SystemLogPagination>
): Promise<ActionResult<PaginatedSystemLogs>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    // Map levels to severity (lower = more severe)
    const levelSeverity: Record<SystemLogLevel, number> = {
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
    };
    
    const minSeverity = levelSeverity[minLevel];
    const includedLevels = (Object.entries(levelSeverity) as [SystemLogLevel, number][])
      .filter(([, severity]) => severity <= minSeverity)
      .map(([level]) => level);
    
    return getSystemLogs({ level: includedLevels }, pagination);
  } catch (error) {
    return { success: false, error: 'Failed to fetch logs' };
  }
}

// =====================================================
// EXPORT ACTIONS
// =====================================================

/**
 * Exports system logs to CSV format.
 */
export async function exportSystemLogs(
  filters?: SystemLogFilters,
  maxRecords: number = 10000
): Promise<ActionResult<string>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = await createClient();

    // Build query with filters - using type assertion as system_logs table may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(maxRecords);
    
    // Apply filters
    if (filters?.level) {
      const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
      query = query.in('level', levels);
    }
    if (filters?.source) {
      query = query.ilike('source', `%${filters.source}%`);
    }
    if (filters?.module) {
      query = query.ilike('module', `%${filters.module}%`);
    }
    if (filters?.search) {
      query = query.ilike('message', `%${filters.search}%`);
    }
    if (filters?.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }
    if (filters?.end_date) {
      const endDateTime = filters.end_date.includes('T') 
        ? filters.end_date 
        : `${filters.end_date}T23:59:59.999Z`;
      query = query.lte('timestamp', endDateTime);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const logs = (data || []) as SystemLogEntry[];
    
    // Generate CSV
    const headers = [
      'Timestamp',
      'Level',
      'Source',
      'Message',
      'Module',
      'Function',
      'Error Type',
      'Request ID',
      'User ID',
    ];
    
    const rows = logs.map(entry => {
      return [
        entry.timestamp,
        entry.level,
        entry.source,
        entry.message,
        entry.module || '',
        entry.function_name || '',
        entry.error_type || '',
        entry.request_id || '',
        entry.user_id || '',
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    return { success: true, data: csv };
  } catch (error) {
    return { success: false, error: 'Failed to export system logs' };
  }
}

// =====================================================
// UTILITY ACTIONS
// =====================================================

/**
 * Gets distinct values for filter dropdowns.
 */
export async function getSystemLogFilterOptions(): Promise<ActionResult<{
  sources: string[];
  modules: string[];
  levels: SystemLogLevel[];
}>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    const supabase = await createClient();
    
    // Get distinct sources - using type assertion as system_logs table may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sourceData } = await supabase
      .from('system_logs')
      .select('source')
      .not('source', 'is', null);
    
    const sources = [...new Set((sourceData || []).map((d: { source: string }) => d.source))].filter(Boolean).sort() as string[];
    
    // Get distinct modules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: moduleData } = await supabase
      .from('system_logs')
      .select('module')
      .not('module', 'is', null);
    
    const modules = [...new Set((moduleData || []).map((d) => d.module).filter(Boolean))].sort() as string[];
    
    // Levels are predefined
    const levels: SystemLogLevel[] = ['error', 'warn', 'info', 'debug'];
    
    return {
      success: true,
      data: {
        sources,
        modules,
        levels,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch filter options' };
  }
}

/**
 * Gets a single system log entry by ID.
 */
export async function getSystemLogById(
  id: string
): Promise<ActionResult<SystemLogEntry>> {
  try {
    const auth = await requireSystemLogAccess();
    if (!auth.authorized) return { success: false, error: auth.error };

    if (!id) {
      return { success: false, error: 'Log ID is required' };
    }

    const supabase = await createClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return { success: false, error: 'Log entry not found' };
    }
    
    return { success: true, data: data as SystemLogEntry };
  } catch (error) {
    return { success: false, error: 'Failed to fetch system log' };
  }
}
