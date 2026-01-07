'use server';

/**
 * Server Actions for Audit Logs
 * v0.76: System Audit & Logging Module
 * 
 * Provides server actions for:
 * - Querying audit logs with pagination and filters
 * - Getting entity audit history
 * - Creating manual audit entries
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { createClient } from '@/lib/supabase/server';
import {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogPagination,
  PaginatedAuditLogs,
  AuditLogStats,
} from '@/types/audit';
import { UserRole } from '@/types/permissions';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  calculateChangedFields,
} from '@/lib/system-audit-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type alias for bypassing strict table type checking
// The audit_log table exists but may not be in generated types yet
type AuditLogTable = 'audit_log';

// =====================================================
// AUDIT LOG QUERY ACTIONS
// =====================================================

/**
 * Gets paginated audit logs with optional filters.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * - Supports filtering by user_id, user_email, user_role
 * - Supports filtering by entity_type and entity_id
 * - Supports filtering by date range
 * - Supports filtering by action type
 * - Supports filtering by module
 * - Returns results sorted by timestamp descending
 */
export async function getAuditLogs(
  filters?: AuditLogFilters,
  pagination?: Partial<AuditLogPagination>
): Promise<ActionResult<PaginatedAuditLogs>> {
  try {
    const supabase = await createClient();
    
    // Validate and set pagination defaults
    const page = Math.max(1, pagination?.page ?? 1);
    const pageSize = Math.min(Math.max(1, pagination?.page_size ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const sortBy = pagination?.sort_by ?? 'timestamp';
    const sortOrder = pagination?.sort_order ?? 'desc';
    
    // Build query
    // Note: Using type assertion as audit_log table may not be in generated types yet
    let query = supabase
      .from('audit_log' as AuditLogTable as 'activity_log')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    if (filters?.user_email) {
      query = query.ilike('user_email', `%${filters.user_email}%`);
    }
    
    // Filter by action (single or array)
    if (filters?.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      query = query.in('action', actions);
    }
    
    // Filter by module (single or array)
    if (filters?.module) {
      const modules = Array.isArray(filters.module) ? filters.module : [filters.module];
      query = query.in('module', modules);
    }
    
    // Filter by entity_type (single or array)
    if (filters?.entity_type) {
      const entityTypes = Array.isArray(filters.entity_type) ? filters.entity_type : [filters.entity_type];
      query = query.in('entity_type', entityTypes);
    }
    
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    
    // Filter by status (single or array)
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
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
    
    // Filter by search term
    if (filters?.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,entity_reference.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%`
      );
    }
    
    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });
    
    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    
    const result: PaginatedAuditLogs = {
      logs: (data || []) as AuditLogEntry[],
      data: (data || []) as AuditLogEntry[],
      total,
      page,
      pageSize: pageSize,
      totalPages: totalPages,
      hasMore: page < totalPages,
    };
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { success: false, error: 'Failed to fetch audit logs' };
  }
}

/**
 * Gets audit history for a specific entity.
 * Returns all audit log entries for the given entity type and ID,
 * sorted by timestamp descending (most recent first).
 * 
 * Requirements: 5.2 (entity_type and entity_id filtering)
 */
export async function getEntityHistory(
  entityType: string,
  entityId: string,
  limit?: number
): Promise<ActionResult<AuditLogEntry[]>> {
  try {
    if (!entityType || !entityId) {
      return { success: false, error: 'Entity type and ID are required' };
    }
    
    const supabase = await createClient();
    
    let query = supabase
      .from('audit_log' as AuditLogTable as 'activity_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false });
    
    if (limit && limit > 0) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { success: true, data: (data || []) as AuditLogEntry[] };
  } catch (error) {
    console.error('Error fetching entity history:', error);
    return { success: false, error: 'Failed to fetch entity history' };
  }
}

/**
 * Creates a manual audit log entry.
 * Used for logging actions that are not automatically captured by triggers.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function createManualAuditEntry(
  input: CreateAuditLogInput
): Promise<ActionResult<AuditLogEntry>> {
  try {
    // Validate required fields
    if (!input.action) {
      return { success: false, error: 'Action is required' };
    }
    if (!input.module) {
      return { success: false, error: 'Module is required' };
    }
    if (!input.entity_type) {
      return { success: false, error: 'Entity type is required' };
    }
    
    const supabase = await createClient();
    
    // Get current user if not provided
    let userId = input.user_id;
    let userEmail = input.user_email;
    let userRole = input.user_role;
    
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = userEmail || user.email;
        
        // Try to get user role from user_profiles
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userRole = userRole || profile.role as UserRole | undefined;
        }
      }
    }
    
    // Calculate changed fields if old and new values provided
    const changedFields = input.changed_fields ?? (
      input.old_values && input.new_values
        ? calculateChangedFields(input.old_values, input.new_values)
        : null
    );
    
    // Prepare audit log entry
    const auditEntry = {
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      action: input.action,
      module: input.module,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      entity_reference: input.entity_reference,
      description: input.description,
      old_values: input.old_values,
      new_values: input.new_values,
      changed_fields: changedFields,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      session_id: input.session_id,
      request_method: input.request_method,
      request_path: input.request_path,
      status: input.status ?? 'success',
      error_message: input.error_message,
      metadata: input.metadata ?? {},
    };
    
    const { data, error } = await supabase
      .from('audit_log' as AuditLogTable as 'activity_log')
      .insert(auditEntry as any)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data: data as AuditLogEntry };
  } catch (error) {
    console.error('Error creating audit entry:', error);
    return { success: false, error: 'Failed to create audit entry' };
  }
}

// =====================================================
// AUDIT LOG STATISTICS ACTIONS
// =====================================================

/**
 * Gets audit log statistics for dashboard display.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export async function getAuditLogStats(
  filters?: AuditLogFilters
): Promise<ActionResult<AuditLogStats>> {
  try {
    const supabase = await createClient();
    
    // Build base query with filters
    let baseQuery = supabase.from('audit_log' as AuditLogTable as 'activity_log').select('*');
    
    // Apply date filters if provided
    if (filters?.start_date) {
      baseQuery = baseQuery.gte('timestamp', filters.start_date);
    }
    if (filters?.end_date) {
      const endDateTime = filters.end_date.includes('T') 
        ? filters.end_date 
        : `${filters.end_date}T23:59:59.999Z`;
      baseQuery = baseQuery.lte('timestamp', endDateTime);
    }
    
    const { data: entries, error } = await baseQuery;
    
    if (error) throw error;
    
    const logs = entries || [];
    
    // Calculate statistics
    const totalEntries = logs.length;
    
    // Count by action (using action_type column)
    const entriesByAction: Record<string, number> = {};
    for (const log of logs) {
      const action = (log as { action_type?: string }).action_type || 'unknown';
      entriesByAction[action] = (entriesByAction[action] || 0) + 1;
    }
    
    // Count by module (using document_type as proxy)
    const moduleCountMap: Record<string, number> = {};
    for (const log of logs) {
      const moduleName = (log as { document_type?: string }).document_type || 'unknown';
      moduleCountMap[moduleName] = (moduleCountMap[moduleName] || 0) + 1;
    }
    const entriesByModule = Object.entries(moduleCountMap)
      .map(([moduleName, count]) => ({ module: moduleName, count }))
      .sort((a, b) => b.count - a.count);
    
    // Count by entity type (using document_type)
    const entityTypeCountMap: Record<string, number> = {};
    for (const log of logs) {
      const entityType = (log as { document_type?: string }).document_type || 'unknown';
      entityTypeCountMap[entityType] = (entityTypeCountMap[entityType] || 0) + 1;
    }
    const entriesByEntityType = Object.entries(entityTypeCountMap)
      .map(([entity_type, count]) => ({ entity_type, count }))
      .sort((a, b) => b.count - a.count);
    
    // Top users (using user_name)
    const userCountMap: Record<string, { user_email: string | null; count: number }> = {};
    for (const log of logs) {
      if (log.user_id) {
        if (!userCountMap[log.user_id]) {
          userCountMap[log.user_id] = { user_email: (log as { user_name?: string }).user_name || null, count: 0 };
        }
        userCountMap[log.user_id].count++;
      }
    }
    const topUsers = Object.entries(userCountMap)
      .map(([user_id, data]) => ({ user_id, user_email: data.user_email, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Calculate failure rate (activity_log doesn't have status, so skip)
    const failureRate = 0;
    
    const stats: AuditLogStats = {
      total_entries: totalEntries,
      entries_today: 0, // Not calculated in this context
      entries_this_week: 0, // Not calculated in this context
      entries_this_month: 0, // Not calculated in this context
      by_action: entriesByAction,
      by_module: moduleCountMap,
      by_user: topUsers.map(u => ({ user_id: u.user_id, user_email: u.user_email || '', count: u.count })),
      entries_by_action: entriesByAction,
      entries_by_module: moduleCountMap,
      entries_by_user: topUsers.map(u => ({ user_id: u.user_id, user_email: u.user_email || '', count: u.count })),
    };
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    return { success: false, error: 'Failed to fetch audit log statistics' };
  }
}

// =====================================================
// EXPORT ACTIONS
// =====================================================

/**
 * Exports audit logs to CSV format.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export async function exportAuditLogs(
  filters?: AuditLogFilters,
  maxRecords: number = 10000
): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('audit_log' as AuditLogTable as 'activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(maxRecords);
    
    // Apply filters
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.user_email) {
      query = query.ilike('user_email', `%${filters.user_email}%`);
    }
    if (filters?.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      query = query.in('action', actions);
    }
    if (filters?.module) {
      const modules = Array.isArray(filters.module) ? filters.module : [filters.module];
      query = query.in('module', modules);
    }
    if (filters?.entity_type) {
      const entityTypes = Array.isArray(filters.entity_type) ? filters.entity_type : [filters.entity_type];
      query = query.in('entity_type', entityTypes);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
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
    
    const logs = (data || []) as AuditLogEntry[];
    
    // Generate CSV
    const headers = [
      'Timestamp',
      'User Email',
      'User Role',
      'Action',
      'Module',
      'Entity Type',
      'Entity ID',
      'Entity Reference',
      'Description',
      'Changed Fields',
      'Status',
      'IP Address',
    ];
    
    const rows = logs.map(entry => {
      return [
        entry.timestamp,
        entry.user_email || '',
        entry.user_role || '',
        entry.action,
        entry.module,
        entry.entity_type,
        entry.entity_id || '',
        entry.entity_reference || '',
        entry.description || '',
        entry.changed_fields?.join(', ') || '',
        entry.status || '',
        entry.ip_address || '',
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    return { success: true, data: csv };
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return { success: false, error: 'Failed to export audit logs' };
  }
}

// =====================================================
// UTILITY ACTIONS
// =====================================================

/**
 * Gets distinct values for filter dropdowns.
 */
export async function getAuditLogFilterOptions(): Promise<ActionResult<{
  modules: string[];
  entityTypes: string[];
  actions: string[];
}>> {
  try {
    const supabase = await createClient();
    
    // Get distinct modules - using activity_log's document_type as proxy
    const { data: moduleData } = await supabase
      .from('activity_log')
      .select('document_type')
      .not('document_type', 'is', null);
    
    const modules = [...new Set((moduleData || []).map(d => d.document_type))].filter(Boolean).sort();
    
    // Get distinct entity types - using activity_log's document_type
    const { data: entityTypeData } = await supabase
      .from('activity_log')
      .select('document_type')
      .not('document_type', 'is', null);
    
    const entityTypes = [...new Set((entityTypeData || []).map(d => d.document_type))].filter(Boolean).sort();
    
    // Get distinct actions - using activity_log's action_type
    const { data: actionData } = await supabase
      .from('activity_log')
      .select('action_type')
      .not('action_type', 'is', null);
    
    const actions = [...new Set((actionData || []).map(d => d.action_type))].filter(Boolean).sort();
    
    return {
      success: true,
      data: {
        modules: modules as string[],
        entityTypes: entityTypes as string[],
        actions: actions as string[],
      },
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return { success: false, error: 'Failed to fetch filter options' };
  }
}
