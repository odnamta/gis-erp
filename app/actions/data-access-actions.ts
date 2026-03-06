'use server';

/**
 * Server Actions for Data Access Logs
 * v0.76: System Audit & Logging Module
 * 
 * Provides server actions for:
 * - Querying data access logs with pagination and filters
 * - Logging data exports and sensitive data access
 * - Getting data access statistics
 * - Exporting data access logs
 * 
 * Requirements: 4.1, 4.2
 */

import { createClient } from '@/lib/supabase/server';
import {
  DataAccessLogEntry,
  DataAccessLogFilters,
  DataAccessLogPagination,
  PaginatedDataAccessLogs,
  DataAccessStats,
  LogDataExportInput,
  LogDataAccessInput,
} from '@/types/data-access-log';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  createDataExportLogInput,
  createDataAccessLogInput,
  calculateDataAccessStats,
  exportToCsv,
} from '@/lib/data-access-utils';

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
// DATA ACCESS LOG QUERY ACTIONS
// =====================================================

/**
 * Gets paginated data access logs with optional filters.
 * 
 * Requirements: 4.1, 4.2
 * - Supports filtering by user_id
 * - Supports filtering by data_type
 * - Supports filtering by entity_type
 * - Supports filtering by access_type (view, export, bulk_query, download)
 * - Supports filtering by file_format
 * - Supports filtering by date range
 * - Returns results sorted by timestamp descending
 */
export async function getDataAccessLogs(
  filters?: DataAccessLogFilters,
  pagination?: Partial<DataAccessLogPagination>
): Promise<ActionResult<PaginatedDataAccessLogs>> {
  try {
    const supabase = await createClient();
    
    // Validate and set pagination defaults
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.min(Math.max(1, pagination?.page_size ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const sortBy = pagination?.sort_by ?? 'timestamp';
    const sortOrder = pagination?.sort_order ?? 'desc';
    
    // Build query
    let query = supabase
      .from('data_access_log' as AnyTable)
      .select('*', { count: 'exact' });
    
    // Apply filters
    // Filter by user_id
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    // Filter by data_type (partial match, case-insensitive)
    if (filters?.data_type) {
      query = query.ilike('data_type', `%${filters.data_type}%`);
    }
    
    // Filter by entity_type (partial match, case-insensitive)
    if (filters?.entity_type) {
      query = query.ilike('entity_type', `%${filters.entity_type}%`);
    }
    
    // Filter by access_type - single or array
    if (filters?.access_type) {
      const accessTypes = Array.isArray(filters.access_type) 
        ? filters.access_type 
        : [filters.access_type];
      query = query.in('access_type', accessTypes);
    }
    
    // Filter by file_format - single or array
    if (filters?.file_format) {
      const formats = Array.isArray(filters.file_format) 
        ? filters.file_format 
        : [filters.file_format];
      query = query.in('file_format', formats);
    }
    
    // Filter by date range
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
    
    const result: PaginatedDataAccessLogs = {
      data: (data ?? []) as unknown as DataAccessLogEntry[],
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
    
    return { success: true, data: result };
  } catch {
    return { success: false, error: 'Failed to fetch data access logs' };
  }
}

// =====================================================
// DATA ACCESS LOGGING ACTIONS
// =====================================================

/**
 * Logs a data export operation.
 * 
 * Requirement 4.1: Record export with data type, format, and record count
 * 
 * Property 9: Data Export Logging
 * For any data export operation, the data_access_log entry SHALL contain 
 * the data_type, file_format, and records_count, and access_type SHALL be 'export'.
 */
export async function logDataExport(
  input: LogDataExportInput
): Promise<ActionResult<DataAccessLogEntry>> {
  try {
    // Validate required fields
    if (!input.user_id) {
      return { success: false, error: 'User ID is required' };
    }
    if (!input.data_type) {
      return { success: false, error: 'Data type is required' };
    }
    if (!input.file_format) {
      return { success: false, error: 'File format is required' };
    }
    if (input.records_count === undefined || input.records_count === null) {
      return { success: false, error: 'Records count is required' };
    }
    
    const supabase = await createClient();
    
    // Create export log entry using utility function
    const exportEntry = createDataExportLogInput(input);
    
    const { data, error } = await supabase
      .from('data_access_log' as AnyTable)
      .insert(exportEntry)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data: data as unknown as DataAccessLogEntry };
  } catch {
    return { success: false, error: 'Failed to log data export' };
  }
}

/**
 * Logs a data access operation.
 * 
 * Requirement 4.2: Record access type and entity details
 */
export async function logDataAccess(
  input: LogDataAccessInput
): Promise<ActionResult<DataAccessLogEntry>> {
  try {
    // Validate required fields
    if (!input.user_id) {
      return { success: false, error: 'User ID is required' };
    }
    if (!input.data_type) {
      return { success: false, error: 'Data type is required' };
    }
    if (!input.access_type) {
      return { success: false, error: 'Access type is required' };
    }
    
    const supabase = await createClient();
    
    // Create access log entry using utility function
    const accessEntry = createDataAccessLogInput(input);
    
    const { data, error } = await supabase
      .from('data_access_log' as AnyTable)
      .insert(accessEntry)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data: data as unknown as DataAccessLogEntry };
  } catch {
    return { success: false, error: 'Failed to log data access' };
  }
}

// =====================================================
// DATA ACCESS STATISTICS ACTIONS
// =====================================================

/**
 * Gets data access statistics for dashboard display.
 * 
 * Requirements: 4.1, 4.2
 */
export async function getDataAccessStats(
  filters?: DataAccessLogFilters
): Promise<ActionResult<DataAccessStats>> {
  try {
    const supabase = await createClient();
    
    // Build base query with filters
    let query = supabase.from('data_access_log' as AnyTable).select('*');
    
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
    
    // Apply user filter if provided
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    const { data: entries, error } = await query;
    
    if (error) throw error;
    
    const logs = (entries ?? []) as unknown as DataAccessLogEntry[];
    
    // Calculate statistics using utility function
    const stats = calculateDataAccessStats(logs);
    
    return { success: true, data: stats };
  } catch {
    return { success: false, error: 'Failed to fetch data access statistics' };
  }
}

// =====================================================
// EXPORT ACTIONS
// =====================================================

/**
 * Exports data access logs to CSV format.
 * 
 * Requirements: 4.1, 4.2
 */
export async function exportDataAccessLogs(
  filters?: DataAccessLogFilters,
  maxRecords: number = 10000
): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('data_access_log' as AnyTable)
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(maxRecords);
    
    // Apply filters
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.data_type) {
      query = query.ilike('data_type', `%${filters.data_type}%`);
    }
    if (filters?.entity_type) {
      query = query.ilike('entity_type', `%${filters.entity_type}%`);
    }
    if (filters?.access_type) {
      const accessTypes = Array.isArray(filters.access_type) 
        ? filters.access_type 
        : [filters.access_type];
      query = query.in('access_type', accessTypes);
    }
    if (filters?.file_format) {
      const formats = Array.isArray(filters.file_format) 
        ? filters.file_format 
        : [filters.file_format];
      query = query.in('file_format', formats);
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
    
    const entries = (data ?? []) as unknown as DataAccessLogEntry[];
    
    // Generate CSV using utility function
    const csv = exportToCsv(entries);
    
    return { success: true, data: csv };
  } catch {
    return { success: false, error: 'Failed to export data access logs' };
  }
}

// =====================================================
// UTILITY ACTIONS
// =====================================================

/**
 * Gets distinct values for filter dropdowns.
 */
export async function getDataAccessFilterOptions(): Promise<ActionResult<{
  dataTypes: string[];
  entityTypes: string[];
  accessTypes: string[];
  fileFormats: string[];
}>> {
  try {
    const supabase = await createClient();
    
    // Get distinct data types
    const { data: dataTypeData } = await supabase
      .from('data_access_log' as AnyTable)
      .select('data_type')
      .not('data_type', 'is', null);
    
    const rawDataTypes = (dataTypeData ?? []) as unknown as Array<{ data_type: string }>;
    const dataTypes = [...new Set(rawDataTypes.map(d => d.data_type))].filter(Boolean).sort();

    // Get distinct entity types
    const { data: entityTypeData } = await supabase
      .from('data_access_log' as AnyTable)
      .select('entity_type')
      .not('entity_type', 'is', null);

    const rawEntityTypes = (entityTypeData ?? []) as unknown as Array<{ entity_type: string }>;
    const entityTypes = [...new Set(rawEntityTypes.map(d => d.entity_type))].filter(Boolean).sort();

    // Get distinct access types
    const { data: accessTypeData } = await supabase
      .from('data_access_log' as AnyTable)
      .select('access_type')
      .not('access_type', 'is', null);

    const rawAccessTypes = (accessTypeData ?? []) as unknown as Array<{ access_type: string }>;
    const accessTypes = [...new Set(rawAccessTypes.map(d => d.access_type))].filter(Boolean).sort();

    // Get distinct file formats
    const { data: formatData } = await supabase
      .from('data_access_log' as AnyTable)
      .select('file_format')
      .not('file_format', 'is', null);

    const rawFormats = (formatData ?? []) as unknown as Array<{ file_format: string }>;
    const fileFormats = [...new Set(rawFormats.map(d => d.file_format))].filter(Boolean).sort();
    
    return {
      success: true,
      data: {
        dataTypes: dataTypes as string[],
        entityTypes: entityTypes as string[],
        accessTypes: accessTypes as string[],
        fileFormats: fileFormats as string[],
      },
    };
  } catch {
    return { success: false, error: 'Failed to fetch filter options' };
  }
}

/**
 * Gets data access logs for a specific user.
 */
export async function getUserDataAccessLogs(
  userId: string,
  limit: number = 100
): Promise<ActionResult<DataAccessLogEntry[]>> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('data_access_log' as AnyTable)
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return { success: true, data: (data ?? []) as unknown as DataAccessLogEntry[] };
  } catch {
    return { success: false, error: 'Failed to fetch user data access logs' };
  }
}

/**
 * Gets data access logs for a specific entity.
 */
export async function getEntityDataAccessLogs(
  entityType: string,
  entityId: string,
  limit: number = 100
): Promise<ActionResult<DataAccessLogEntry[]>> {
  try {
    if (!entityType || !entityId) {
      return { success: false, error: 'Entity type and ID are required' };
    }
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('data_access_log' as AnyTable)
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return { success: true, data: (data ?? []) as unknown as DataAccessLogEntry[] };
  } catch {
    return { success: false, error: 'Failed to fetch entity data access logs' };
  }
}

/**
 * Gets recent export logs for monitoring.
 */
export async function getRecentExports(
  withinHours: number = 24,
  limit: number = 50
): Promise<ActionResult<DataAccessLogEntry[]>> {
  try {
    const supabase = await createClient();
    
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - withinHours);
    
    const { data, error } = await supabase
      .from('data_access_log' as AnyTable)
      .select('*')
      .eq('access_type', 'export')
      .gte('timestamp', cutoffTime.toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return { success: true, data: (data ?? []) as unknown as DataAccessLogEntry[] };
  } catch {
    return { success: false, error: 'Failed to fetch recent exports' };
  }
}

/**
 * Gets data access summary for dashboard.
 */
export async function getDataAccessSummary(
  days: number = 7
): Promise<ActionResult<{
  totalAccesses: number;
  totalExports: number;
  totalRecordsExported: number;
  uniqueUsers: number;
  topDataTypes: Array<{ data_type: string; count: number }>;
}>> {
  try {
    const supabase = await createClient();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('data_access_log' as AnyTable)
      .select('*')
      .gte('timestamp', startDate.toISOString());
    
    if (error) throw error;
    
    const entries = (data ?? []) as unknown as DataAccessLogEntry[];
    
    const totalAccesses = entries.length;
    const totalExports = entries.filter(e => e.access_type === 'export').length;
    const totalRecordsExported = entries
      .filter(e => e.access_type === 'export' && e.records_count !== null)
      .reduce((sum, e) => sum + (e.records_count || 0), 0);
    const uniqueUsers = new Set(entries.map(e => e.user_id)).size;
    
    // Calculate top data types
    const dataTypeMap = new Map<string, number>();
    for (const entry of entries) {
      dataTypeMap.set(entry.data_type, (dataTypeMap.get(entry.data_type) || 0) + 1);
    }
    const topDataTypes = Array.from(dataTypeMap.entries())
      .map(([data_type, count]) => ({ data_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      success: true,
      data: {
        totalAccesses,
        totalExports,
        totalRecordsExported,
        uniqueUsers,
        topDataTypes,
      },
    };
  } catch {
    return { success: false, error: 'Failed to fetch data access summary' };
  }
}
