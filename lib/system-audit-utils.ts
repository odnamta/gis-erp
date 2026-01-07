/**
 * System Audit & Logging Utility Functions
 * v0.76: System Audit & Logging Module
 * 
 * Provides utility functions for audit logging, including:
 * - Creating audit log entries
 * - Querying audit logs with filters
 * - Getting entity audit history
 * - Calculating changed fields between objects
 * - Formatting audit log descriptions
 */

import {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogPagination,
  PaginatedAuditLogs,
  AuditAction,
  AuditStatus,
  ChangedField,
  FormattedAuditDescription,
} from '@/types/audit';

// =====================================================
// Constants
// =====================================================

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Action type labels for display
 */
export const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  view: 'Viewed',
  export: 'Exported',
  approve: 'Approved',
  reject: 'Rejected',
  submit: 'Submitted',
  cancel: 'Cancelled',
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
};

/**
 * Module labels for display
 */
export const MODULE_LABELS: Record<string, string> = {
  customers: 'Customers',
  projects: 'Projects',
  quotations: 'Quotations',
  pjo: 'Proforma Job Orders',
  job_orders: 'Job Orders',
  invoices: 'Invoices',
  employees: 'Employees',
  vendors: 'Vendors',
  equipment: 'Equipment',
  settings: 'Settings',
  users: 'Users',
  public: 'System',
};

// =====================================================
// Changed Fields Calculation
// =====================================================

/**
 * Calculates the list of fields that changed between two objects.
 * 
 * Property 2: Changed Fields Calculation Correctness
 * For any two JSON objects representing old and new values, the calculated 
 * changed_fields array SHALL contain exactly the keys where the values differ 
 * between the two objects, and SHALL not contain any keys where values are identical.
 * 
 * @param oldValues - The original object values
 * @param newValues - The new object values
 * @returns Array of field names that have different values
 */
export function calculateChangedFields(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined
): string[] {
  // Handle null/undefined cases
  if (!oldValues && !newValues) {
    return [];
  }
  
  if (!oldValues) {
    // All fields in newValues are "changed" (new)
    return newValues ? Object.keys(newValues) : [];
  }
  
  if (!newValues) {
    // All fields in oldValues are "changed" (deleted)
    return Object.keys(oldValues);
  }

  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

  for (const key of allKeys) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];

    // Deep comparison for objects and arrays
    if (!deepEqual(oldVal, newVal)) {
      changedFields.push(key);
    }
  }

  return changedFields.sort();
}

/**
 * Deep equality comparison for values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Handle identical references and primitives
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  return false;
}

/**
 * Gets detailed changed field information with old and new values
 */
export function getChangedFieldDetails(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined
): ChangedField[] {
  const changedFieldNames = calculateChangedFields(oldValues, newValues);
  
  return changedFieldNames.map((field) => ({
    field,
    old_value: oldValues?.[field] ?? null,
    new_value: newValues?.[field] ?? null,
  }));
}

// =====================================================
// Audit Log Description Formatting
// =====================================================

/**
 * Formats an audit log entry into a human-readable description.
 * 
 * @param entry - The audit log entry to format
 * @returns Formatted description object with summary and details
 */
export function formatAuditLogDescription(entry: AuditLogEntry): FormattedAuditDescription {
  const actionLabel = ACTION_LABELS[entry.action || ''] || entry.action || '';
  const moduleLabel = MODULE_LABELS[entry.module || ''] || entry.module || '';
  
  // Build summary
  let summary = `${actionLabel} ${entry.entity_type || ''}`;
  if (entry.entity_reference) {
    summary += ` (${entry.entity_reference})`;
  }
  
  // Build details
  let details: string | null = null;
  if (entry.description) {
    details = entry.description;
  }
  
  // Build changed fields summary
  let changed_fields_summary: string | null = null;
  if (entry.changed_fields && entry.changed_fields.length > 0) {
    if (entry.changed_fields.length <= 3) {
      changed_fields_summary = `Changed: ${entry.changed_fields.join(', ')}`;
    } else {
      changed_fields_summary = `Changed ${entry.changed_fields.length} fields: ${entry.changed_fields.slice(0, 3).join(', ')}...`;
    }
  }
  
  return {
    action: actionLabel,
    module: moduleLabel,
    entityReference: entry.entity_reference ?? undefined,
    description: details || summary,
    summary,
    changed_fields_summary: changed_fields_summary ?? undefined,
  };
}

/**
 * Formats action type for display
 */
export function formatAction(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats module name for display
 */
export function formatModule(module: string): string {
  return MODULE_LABELS[module] || module.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// =====================================================
// Audit Log Filtering
// =====================================================

/**
 * Filters audit log entries based on provided criteria.
 * 
 * Property 10: Audit Log Filter Correctness
 * For any combination of audit log filters (user_id, entity_type, entity_id, 
 * action, module, date range), all returned entries SHALL match ALL specified 
 * filter criteria, and no entries matching the criteria SHALL be excluded.
 * 
 * @param entries - Array of audit log entries to filter
 * @param filters - Filter criteria
 * @returns Filtered array of audit log entries
 */
export function filterAuditLogs(
  entries: AuditLogEntry[],
  filters: AuditLogFilters
): AuditLogEntry[] {
  return entries.filter((entry) => {
    // Filter by user_id
    if (filters.user_id && entry.user_id !== filters.user_id) {
      return false;
    }

    // Filter by user_email (case-insensitive partial match)
    if (filters.user_email) {
      if (!entry.user_email) return false;
      if (!entry.user_email.toLowerCase().includes(filters.user_email.toLowerCase())) {
        return false;
      }
    }

    // Filter by action (single or array)
    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action];
      if (!actions.includes(entry.action as AuditAction)) {
        return false;
      }
    }

    // Filter by module (single or array)
    if (filters.module) {
      const modules = Array.isArray(filters.module) ? filters.module : [filters.module];
      if (!entry.module || !modules.includes(entry.module)) {
        return false;
      }
    }

    // Filter by entity_type (single or array)
    if (filters.entity_type) {
      const entityTypes = Array.isArray(filters.entity_type) ? filters.entity_type : [filters.entity_type];
      if (!entry.entity_type || !entityTypes.includes(entry.entity_type)) {
        return false;
      }
    }

    // Filter by entity_id
    if (filters.entity_id && entry.entity_id !== filters.entity_id) {
      return false;
    }

    // Filter by status (single or array)
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!entry.status || !statuses.includes(entry.status)) {
        return false;
      }
    }

    // Filter by date range
    if (filters.start_date) {
      const entryDate = new Date(entry.timestamp || '');
      const startDate = new Date(filters.start_date);
      startDate.setHours(0, 0, 0, 0);
      if (entryDate < startDate) {
        return false;
      }
    }

    if (filters.end_date) {
      const entryDate = new Date(entry.timestamp || '');
      const endDate = new Date(filters.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (entryDate > endDate) {
        return false;
      }
    }

    // Filter by search term (searches in description, entity_reference, user_email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableFields = [
        entry.description,
        entry.entity_reference,
        entry.user_email,
        entry.entity_type,
        entry.action,
      ].filter(Boolean);
      
      const matchesSearch = searchableFields.some((field) =>
        field?.toLowerCase().includes(searchLower)
      );
      
      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts audit log entries by timestamp (descending by default)
 */
export function sortAuditLogs(
  entries: AuditLogEntry[],
  sortBy: keyof AuditLogEntry = 'timestamp',
  sortOrder: 'asc' | 'desc' = 'desc'
): AuditLogEntry[] {
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

/**
 * Paginates audit log entries
 */
export function paginateAuditLogs(
  entries: AuditLogEntry[],
  pagination: AuditLogPagination
): PaginatedAuditLogs {
  const { page, pageSize, page_size, sort_by = 'timestamp', sort_order = 'desc' } = pagination;
  const effectivePageSize = page_size ?? pageSize;
  
  // Validate pagination
  const validPageSize = Math.min(Math.max(1, effectivePageSize), MAX_PAGE_SIZE);
  const validPage = Math.max(1, page);
  
  // Sort entries
  const sorted = sortAuditLogs(entries, sort_by as keyof AuditLogEntry, sort_order);
  
  // Calculate pagination
  const total = sorted.length;
  const totalPages = Math.ceil(total / validPageSize);
  const offset = (validPage - 1) * validPageSize;
  
  // Slice for current page
  const data = sorted.slice(offset, offset + validPageSize);
  
  return {
    logs: data,
    data,
    total,
    page: validPage,
    pageSize: validPageSize,
    page_size: validPageSize,
    totalPages,
    total_pages: totalPages,
    hasMore: validPage < totalPages,
  };
}

// =====================================================
// Entity Audit History
// =====================================================

/**
 * Gets audit history for a specific entity
 */
export function getEntityAuditHistory(
  entries: AuditLogEntry[],
  entityType: string,
  entityId: string
): AuditLogEntry[] {
  const filtered = entries.filter(
    (entry) => entry.entity_type === entityType && entry.entity_id === entityId
  );
  
  // Sort by timestamp descending (most recent first)
  return sortAuditLogs(filtered, 'timestamp', 'desc');
}

// =====================================================
// Audit Log Creation Helpers
// =====================================================

/**
 * Creates an audit log input object with defaults
 */
export function createAuditLogInput(
  input: Partial<CreateAuditLogInput> & Pick<CreateAuditLogInput, 'action' | 'module' | 'entity_type'>
): CreateAuditLogInput {
  return {
    action: input.action,
    module: input.module,
    entity_type: input.entity_type,
    user_id: input.user_id,
    user_email: input.user_email,
    user_role: input.user_role,
    entity_id: input.entity_id,
    entity_reference: input.entity_reference,
    description: input.description,
    old_values: input.old_values,
    new_values: input.new_values,
    changed_fields: input.changed_fields ?? (
      input.old_values && input.new_values
        ? calculateChangedFields(input.old_values, input.new_values)
        : undefined
    ),
    ip_address: input.ip_address,
    user_agent: input.user_agent,
    session_id: input.session_id,
    request_method: input.request_method,
    request_path: input.request_path,
    status: input.status ?? 'success',
    error_message: input.error_message,
    metadata: input.metadata ?? {},
  };
}

/**
 * Validates audit log input
 */
export function validateAuditLogInput(input: Partial<CreateAuditLogInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.action) {
    errors.push('Action is required');
  }

  if (!input.module) {
    errors.push('Module is required');
  }

  if (!input.entity_type) {
    errors.push('Entity type is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =====================================================
// Statistics and Aggregation
// =====================================================

/**
 * Counts audit logs by action type
 */
export function countByAction(entries: AuditLogEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const entry of entries) {
    const action = entry.action || 'unknown';
    counts[action] = (counts[action] || 0) + 1;
  }
  
  return counts;
}

/**
 * Counts audit logs by module
 */
export function countByModule(entries: AuditLogEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const entry of entries) {
    const moduleName = entry.module || 'unknown';
    counts[moduleName] = (counts[moduleName] || 0) + 1;
  }
  
  return counts;
}

/**
 * Counts audit logs by entity type
 */
export function countByEntityType(entries: AuditLogEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const entry of entries) {
    const entityType = entry.entity_type || 'unknown';
    counts[entityType] = (counts[entityType] || 0) + 1;
  }
  
  return counts;
}

/**
 * Gets unique users from audit logs
 */
export function getUniqueUsers(entries: AuditLogEntry[]): Array<{
  user_id: string;
  user_email: string | null;
  count: number;
}> {
  const userMap = new Map<string, { user_email: string | null; count: number }>();
  
  for (const entry of entries) {
    if (entry.user_id) {
      const existing = userMap.get(entry.user_id);
      if (existing) {
        existing.count++;
      } else {
        userMap.set(entry.user_id, {
          user_email: entry.user_email ?? null,
          count: 1,
        });
      }
    }
  }
  
  return Array.from(userMap.entries())
    .map(([user_id, data]) => ({
      user_id,
      user_email: data.user_email,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculates failure rate from audit logs
 */
export function calculateFailureRate(entries: AuditLogEntry[]): number {
  if (entries.length === 0) return 0;
  
  const failures = entries.filter((e) => e.status === 'failure').length;
  return (failures / entries.length) * 100;
}

// =====================================================
// Export Helpers
// =====================================================

/**
 * Formats audit log entry for CSV export
 */
export function formatForCsvExport(entry: AuditLogEntry): Record<string, string> {
  return {
    timestamp: entry.timestamp || '',
    user_email: entry.user_email || '',
    user_role: entry.user_role || '',
    action: formatAction(entry.action || ''),
    module: formatModule(entry.module || ''),
    entity_type: entry.entity_type || '',
    entity_id: entry.entity_id || '',
    entity_reference: entry.entity_reference || '',
    description: entry.description || '',
    changed_fields: entry.changed_fields?.join(', ') || '',
    status: entry.status || '',
    ip_address: entry.ip_address || '',
  };
}

/**
 * Exports audit logs to CSV format
 */
export function exportToCsv(entries: AuditLogEntry[]): string {
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
  
  const rows = entries.map((entry) => {
    const formatted = formatForCsvExport(entry);
    return [
      formatted.timestamp,
      formatted.user_email,
      formatted.user_role,
      formatted.action,
      formatted.module,
      formatted.entity_type,
      formatted.entity_id,
      formatted.entity_reference,
      formatted.description,
      formatted.changed_fields,
      formatted.status,
      formatted.ip_address,
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}
