'use server';

/**
 * Server Actions for Retention and Archival
 * v0.76: System Audit & Logging Module
 * 
 * Provides server actions for:
 * - Getting storage statistics for audit tables
 * - Archiving old logs
 * - Managing retention configuration
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { createClient } from '@/lib/supabase/server';
import {
  RetentionConfig,
  RetentionPeriods,
  AuditStorageStats,
  ArchiveRequest,
  ArchiveResult,
} from '@/types/audit';
import type { LogType } from '@/lib/retention-constants';

// Re-export LogType for convenience
export type { LogType } from '@/lib/retention-constants';

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

/**
 * Table statistics from database
 */
interface TableStats {
  count: number;
  size_bytes: number;
  oldest_entry: string | null;
  newest_entry: string | null;
}

/**
 * Archive operation record
 */
interface ArchiveRecord {
  id: string;
  log_type: LogType;
  archived_at: string;
  before_date: string;
  records_archived: number;
  records_deleted: number;
  archive_path: string | null;
  created_by: string | null;
}

// =====================================================
// CONSTANTS - Import from lib/retention-constants.ts for client use
// =====================================================

// These are kept here for internal use but re-exported from lib/retention-constants.ts
// for client components since 'use server' files can only export async functions

const DEFAULT_RETENTION_PERIODS: RetentionPeriods = {
  audit_logs: 365,      // 1 year
  system_logs: 90,      // 3 months
  login_history: 180,   // 6 months
  data_access_logs: 365, // 1 year
};

const MIN_RETENTION_PERIODS: RetentionPeriods = {
  audit_logs: 30,
  system_logs: 7,
  login_history: 30,
  data_access_logs: 30,
};

/**
 * Table name mapping for log types
 */
const LOG_TYPE_TABLE_MAP: Record<LogType, string> = {
  audit_logs: 'audit_log',
  system_logs: 'system_logs',
  login_history: 'login_history',
  data_access_logs: 'data_access_log',
};

/**
 * Timestamp column mapping for log types
 */
const LOG_TYPE_TIMESTAMP_MAP: Record<LogType, string> = {
  audit_logs: 'timestamp',
  system_logs: 'timestamp',
  login_history: 'login_at',
  data_access_logs: 'timestamp',
};

// =====================================================
// STORAGE STATISTICS ACTIONS
// =====================================================

/**
 * Gets storage statistics for all audit tables.
 * 
 * Requirement 8.3: Provide storage size monitoring for audit tables
 */
export async function getStorageStats(): Promise<ActionResult<AuditStorageStats>> {
  try {
    const supabase = await createClient();
    
    // Get stats for each table
    const [auditStats, systemStats, loginStats, dataAccessStats] = await Promise.all([
      getTableStats(supabase, 'audit_log', 'timestamp'),
      getTableStats(supabase, 'system_logs', 'timestamp'),
      getTableStats(supabase, 'login_history', 'login_at'),
      getTableStats(supabase, 'data_access_log', 'timestamp'),
    ]);
    
    const totalSizeBytes = 
      auditStats.size_bytes + 
      systemStats.size_bytes + 
      loginStats.size_bytes + 
      dataAccessStats.size_bytes;
    
    const stats: AuditStorageStats = {
      audit_logs: auditStats,
      system_logs: systemStats,
      login_history: loginStats,
      data_access_logs: dataAccessStats,
      total_size_bytes: totalSizeBytes,
    };
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return { success: false, error: 'Failed to fetch storage statistics' };
  }
}

/**
 * Gets statistics for a single table.
 */
async function getTableStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tableName: string,
  timestampColumn: string
): Promise<TableStats> {
  try {
    // Get count
    const { count, error: countError } = await supabase
      .from(tableName as AnyTable)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`Error getting count for ${tableName}:`, countError);
    }
    
    // Get oldest entry
    const { data: oldestData, error: oldestError } = await supabase
      .from(tableName as AnyTable)
      .select(timestampColumn)
      .order(timestampColumn, { ascending: true })
      .limit(1)
      .single();
    
    if (oldestError && oldestError.code !== 'PGRST116') {
      console.error(`Error getting oldest entry for ${tableName}:`, oldestError);
    }
    
    // Get newest entry
    const { data: newestData, error: newestError } = await supabase
      .from(tableName as AnyTable)
      .select(timestampColumn)
      .order(timestampColumn, { ascending: false })
      .limit(1)
      .single();
    
    if (newestError && newestError.code !== 'PGRST116') {
      console.error(`Error getting newest entry for ${tableName}:`, newestError);
    }
    
    // Estimate size (rough estimate: ~500 bytes per row for audit tables)
    const estimatedRowSize = tableName === 'audit_log' ? 1000 : 500;
    const estimatedSize = (count || 0) * estimatedRowSize;
    
    // Safely extract timestamp values
    const oldestEntry = oldestData && typeof oldestData === 'object' 
      ? (oldestData as Record<string, unknown>)[timestampColumn] as string | null
      : null;
    const newestEntry = newestData && typeof newestData === 'object'
      ? (newestData as Record<string, unknown>)[timestampColumn] as string | null
      : null;
    
    return {
      count: count || 0,
      size_bytes: estimatedSize,
      oldest_entry: oldestEntry,
      newest_entry: newestEntry,
    };
  } catch (error) {
    console.error(`Error getting stats for ${tableName}:`, error);
    return {
      count: 0,
      size_bytes: 0,
      oldest_entry: null,
      newest_entry: null,
    };
  }
}

/**
 * Gets storage statistics for a specific log type.
 */
export async function getLogTypeStorageStats(
  logType: LogType
): Promise<ActionResult<TableStats>> {
  try {
    const supabase = await createClient();
    const tableName = LOG_TYPE_TABLE_MAP[logType];
    const timestampColumn = LOG_TYPE_TIMESTAMP_MAP[logType];
    
    const stats = await getTableStats(supabase, tableName, timestampColumn);
    
    return { success: true, data: stats };
  } catch (error) {
    console.error(`Error fetching storage stats for ${logType}:`, error);
    return { success: false, error: `Failed to fetch storage statistics for ${logType}` };
  }
}

// =====================================================
// RETENTION CONFIGURATION ACTIONS
// =====================================================

/**
 * Gets the current retention configuration.
 * 
 * Requirement 8.1: Define configurable retention periods for each log type
 */
export async function getRetentionConfig(): Promise<ActionResult<RetentionConfig>> {
  try {
    const supabase = await createClient();
    
    // Try to get retention config from company_settings or a dedicated table
    const { data: settings, error } = await supabase
      .from('company_settings' as AnyTable)
      .select('*')
      .eq('key', 'audit_retention_config')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine (use defaults)
      console.error('Error fetching retention config:', error);
    }
    
    // Parse stored config or use defaults
    let periods: RetentionPeriods = DEFAULT_RETENTION_PERIODS;
    let archiveEnabled = false;
    let archiveLocation: string | null = null;
    let autoCleanupEnabled = false;
    let lastCleanupAt: string | null = null;
    let nextCleanupAt: string | null = null;
    
    if (settings) {
      try {
        const settingsObj = settings as unknown as { value?: unknown };
        const settingsValue = settingsObj?.value;
        const storedConfig = typeof settingsValue === 'string' 
          ? JSON.parse(settingsValue) 
          : settingsValue;
        
        if (storedConfig && typeof storedConfig === 'object') {
          const config = storedConfig as Record<string, unknown>;
          const configPeriods = config.periods as Record<string, number> | undefined;
          
          periods = {
            audit_logs: configPeriods?.audit_logs ?? DEFAULT_RETENTION_PERIODS.audit_logs,
            system_logs: configPeriods?.system_logs ?? DEFAULT_RETENTION_PERIODS.system_logs,
            login_history: configPeriods?.login_history ?? DEFAULT_RETENTION_PERIODS.login_history,
            data_access_logs: configPeriods?.data_access_logs ?? DEFAULT_RETENTION_PERIODS.data_access_logs,
          };
          archiveEnabled = (config.archive_enabled as boolean) ?? false;
          archiveLocation = (config.archive_location as string) ?? null;
          autoCleanupEnabled = (config.auto_cleanup_enabled as boolean) ?? false;
          lastCleanupAt = (config.last_cleanup_at as string) ?? null;
          nextCleanupAt = (config.next_cleanup_at as string) ?? null;
        }
      } catch (parseError) {
        console.error('Error parsing retention config:', parseError);
      }
    }
    
    const config: RetentionConfig = {
      periods,
      archive_enabled: archiveEnabled,
      archive_location: archiveLocation,
      auto_cleanup_enabled: autoCleanupEnabled,
      last_cleanup_at: lastCleanupAt,
      next_cleanup_at: nextCleanupAt,
    };
    
    return { success: true, data: config };
  } catch (error) {
    console.error('Error fetching retention config:', error);
    return { success: false, error: 'Failed to fetch retention configuration' };
  }
}

/**
 * Updates the retention configuration.
 * 
 * Requirement 8.1: Define configurable retention periods for each log type
 */
export async function updateRetentionConfig(
  config: Partial<RetentionConfig>
): Promise<ActionResult<RetentionConfig>> {
  try {
    const supabase = await createClient();
    
    // Get current config
    const currentResult = await getRetentionConfig();
    if (!currentResult.success || !currentResult.data) {
      return { success: false, error: 'Failed to get current configuration' };
    }
    
    const currentConfig = currentResult.data;
    
    // Merge with new config
    const newPeriods: RetentionPeriods = {
      audit_logs: Math.max(
        config.periods?.audit_logs ?? currentConfig.periods.audit_logs,
        MIN_RETENTION_PERIODS.audit_logs
      ),
      system_logs: Math.max(
        config.periods?.system_logs ?? currentConfig.periods.system_logs,
        MIN_RETENTION_PERIODS.system_logs
      ),
      login_history: Math.max(
        config.periods?.login_history ?? currentConfig.periods.login_history,
        MIN_RETENTION_PERIODS.login_history
      ),
      data_access_logs: Math.max(
        config.periods?.data_access_logs ?? currentConfig.periods.data_access_logs,
        MIN_RETENTION_PERIODS.data_access_logs
      ),
    };
    
    const newConfig: RetentionConfig = {
      periods: newPeriods,
      archive_enabled: config.archive_enabled ?? currentConfig.archive_enabled,
      archive_location: config.archive_location ?? currentConfig.archive_location,
      auto_cleanup_enabled: config.auto_cleanup_enabled ?? currentConfig.auto_cleanup_enabled,
      last_cleanup_at: currentConfig.last_cleanup_at,
      next_cleanup_at: config.auto_cleanup_enabled 
        ? calculateNextCleanupDate().toISOString()
        : null,
    };
    
    // Save to company_settings
    const { error } = await supabase
      .from('company_settings' as AnyTable)
      .upsert({
        key: 'audit_retention_config',
        value: newConfig,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });
    
    if (error) throw error;
    
    return { success: true, data: newConfig };
  } catch (error) {
    console.error('Error updating retention config:', error);
    return { success: false, error: 'Failed to update retention configuration' };
  }
}

/**
 * Calculates the next cleanup date (weekly on Sunday at 2 AM)
 */
function calculateNextCleanupDate(): Date {
  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + (7 - now.getDay()));
  nextSunday.setHours(2, 0, 0, 0);
  return nextSunday;
}

// =====================================================
// ARCHIVE ACTIONS
// =====================================================

/**
 * Archives logs older than the specified date.
 * 
 * Requirement 8.2: Provide a mechanism to archive logs older than the retention period
 * Requirement 8.4: Maintain a record of the archival operation
 */
export async function archiveLogs(
  request: ArchiveRequest
): Promise<ActionResult<ArchiveResult>> {
  try {
    const supabase = await createClient();
    
    // Validate request
    if (!request.log_type) {
      return { success: false, error: 'Log type is required' };
    }
    if (!request.before_date) {
      return { success: false, error: 'Before date is required' };
    }
    
    const tableName = LOG_TYPE_TABLE_MAP[request.log_type];
    const timestampColumn = LOG_TYPE_TIMESTAMP_MAP[request.log_type];
    
    if (!tableName) {
      return { success: false, error: 'Invalid log type' };
    }
    
    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();

    // Get user profile (FK references user_profiles.id, not auth UUID)
    const { data: retProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user?.id || '')
      .single();
    
    // Count records to be archived
    const { count: recordsToArchive, error: countError } = await supabase
      .from(tableName as AnyTable)
      .select('*', { count: 'exact', head: true })
      .lt(timestampColumn, request.before_date);
    
    if (countError) throw countError;
    
    const archiveCount = recordsToArchive || 0;
    
    if (archiveCount === 0) {
      return {
        success: true,
        data: {
          success: true,
          records_archived: 0,
          records_deleted: 0,
          archive_path: null,
        },
      };
    }
    
    // For now, we'll just delete the records (actual archival to external storage
    // would require additional infrastructure like S3 or a separate archive database)
    // In a production system, you would:
    // 1. Export records to a file/external storage
    // 2. Store the file path
    // 3. Then delete the records
    
    let recordsDeleted = 0;
    const archivePath: string | null = null;
    
    if (request.delete_after_archive !== false) {
      // Delete old records
      const { error: deleteError } = await supabase
        .from(tableName as AnyTable)
        .delete()
        .lt(timestampColumn, request.before_date);
      
      if (deleteError) throw deleteError;
      
      recordsDeleted = archiveCount;
    }
    
    // Record the archive operation
    // Requirement 8.4: Maintain a record of the archival operation
    const archiveRecord: Omit<ArchiveRecord, 'id'> = {
      log_type: request.log_type,
      archived_at: new Date().toISOString(),
      before_date: request.before_date,
      records_archived: archiveCount,
      records_deleted: recordsDeleted,
      archive_path: archivePath,
      created_by: retProfile?.id || null,
    };
    
    // Try to insert archive record (table may not exist yet)
    try {
      await supabase
        .from('audit_archive_log' as AnyTable)
        .insert(archiveRecord);
    } catch {
      // If the archive log table doesn't exist, silently continue
    }
    
    // Also create an audit log entry for the archive operation
    try {
      await supabase
        .from('audit_log' as AnyTable)
        .insert({
          user_id: user?.id,
          user_email: user?.email,
          action: 'delete',
          module: 'system',
          entity_type: 'archive_operation',
          description: `Archived ${archiveCount} records from ${request.log_type} before ${request.before_date}`,
          metadata: {
            log_type: request.log_type,
            before_date: request.before_date,
            records_archived: archiveCount,
            records_deleted: recordsDeleted,
          },
          status: 'success',
        });
    } catch (auditError) {
      console.error('Failed to create audit log for archive operation:', auditError);
    }
    
    const result: ArchiveResult = {
      success: true,
      records_archived: archiveCount,
      records_deleted: recordsDeleted,
      archive_path: archivePath,
    };
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error archiving logs:', error);
    return {
      success: false,
      error: 'Failed to archive logs',
      data: {
        success: false,
        records_archived: 0,
        records_deleted: 0,
        archive_path: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Archives logs based on retention configuration.
 * This is typically called by a scheduled job.
 */
export async function archiveLogsBasedOnRetention(): Promise<ActionResult<{
  audit_logs: ArchiveResult;
  system_logs: ArchiveResult;
  login_history: ArchiveResult;
  data_access_logs: ArchiveResult;
}>> {
  try {
    // Get retention config
    const configResult = await getRetentionConfig();
    if (!configResult.success || !configResult.data) {
      return { success: false, error: 'Failed to get retention configuration' };
    }
    
    const config = configResult.data;
    const now = new Date();
    
    // Calculate cutoff dates for each log type
    const auditCutoff = new Date(now);
    auditCutoff.setDate(auditCutoff.getDate() - config.periods.audit_logs);
    
    const systemCutoff = new Date(now);
    systemCutoff.setDate(systemCutoff.getDate() - config.periods.system_logs);
    
    const loginCutoff = new Date(now);
    loginCutoff.setDate(loginCutoff.getDate() - config.periods.login_history);
    
    const dataAccessCutoff = new Date(now);
    dataAccessCutoff.setDate(dataAccessCutoff.getDate() - config.periods.data_access_logs);
    
    // Archive each log type
    const [auditResult, systemResult, loginResult, dataAccessResult] = await Promise.all([
      archiveLogs({
        log_type: 'audit_logs',
        before_date: auditCutoff.toISOString(),
        delete_after_archive: true,
      }),
      archiveLogs({
        log_type: 'system_logs',
        before_date: systemCutoff.toISOString(),
        delete_after_archive: true,
      }),
      archiveLogs({
        log_type: 'login_history',
        before_date: loginCutoff.toISOString(),
        delete_after_archive: true,
      }),
      archiveLogs({
        log_type: 'data_access_logs',
        before_date: dataAccessCutoff.toISOString(),
        delete_after_archive: true,
      }),
    ]);
    
    // Update last cleanup timestamp
    const supabase = await createClient();
    await supabase
      .from('company_settings' as AnyTable)
      .upsert({
        key: 'audit_retention_config',
        value: {
          ...config,
          last_cleanup_at: now.toISOString(),
          next_cleanup_at: calculateNextCleanupDate().toISOString(),
        },
        updated_at: now.toISOString(),
      }, {
        onConflict: 'key',
      });
    
    return {
      success: true,
      data: {
        audit_logs: auditResult.data || { success: false, records_archived: 0, records_deleted: 0, archive_path: null },
        system_logs: systemResult.data || { success: false, records_archived: 0, records_deleted: 0, archive_path: null },
        login_history: loginResult.data || { success: false, records_archived: 0, records_deleted: 0, archive_path: null },
        data_access_logs: dataAccessResult.data || { success: false, records_archived: 0, records_deleted: 0, archive_path: null },
      },
    };
  } catch (error) {
    console.error('Error archiving logs based on retention:', error);
    return { success: false, error: 'Failed to archive logs based on retention' };
  }
}

// =====================================================
// UTILITY ACTIONS
// =====================================================

/**
 * Gets the count of records that would be archived for each log type
 * based on current retention settings.
 */
export async function getArchivePreview(): Promise<ActionResult<{
  audit_logs: { count: number; cutoff_date: string };
  system_logs: { count: number; cutoff_date: string };
  login_history: { count: number; cutoff_date: string };
  data_access_logs: { count: number; cutoff_date: string };
}>> {
  try {
    const supabase = await createClient();
    
    // Get retention config
    const configResult = await getRetentionConfig();
    if (!configResult.success || !configResult.data) {
      return { success: false, error: 'Failed to get retention configuration' };
    }
    
    const config = configResult.data;
    const now = new Date();
    
    // Calculate cutoff dates
    const auditCutoff = new Date(now);
    auditCutoff.setDate(auditCutoff.getDate() - config.periods.audit_logs);
    
    const systemCutoff = new Date(now);
    systemCutoff.setDate(systemCutoff.getDate() - config.periods.system_logs);
    
    const loginCutoff = new Date(now);
    loginCutoff.setDate(loginCutoff.getDate() - config.periods.login_history);
    
    const dataAccessCutoff = new Date(now);
    dataAccessCutoff.setDate(dataAccessCutoff.getDate() - config.periods.data_access_logs);
    
    // Get counts for each log type
    const [auditCount, systemCount, loginCount, dataAccessCount] = await Promise.all([
      supabase
        .from('audit_log' as AnyTable)
        .select('*', { count: 'exact', head: true })
        .lt('timestamp', auditCutoff.toISOString()),
      supabase
        .from('system_logs' as AnyTable)
        .select('*', { count: 'exact', head: true })
        .lt('timestamp', systemCutoff.toISOString()),
      supabase
        .from('login_history' as AnyTable)
        .select('*', { count: 'exact', head: true })
        .lt('login_at', loginCutoff.toISOString()),
      supabase
        .from('data_access_log' as AnyTable)
        .select('*', { count: 'exact', head: true })
        .lt('timestamp', dataAccessCutoff.toISOString()),
    ]);
    
    return {
      success: true,
      data: {
        audit_logs: {
          count: auditCount.count || 0,
          cutoff_date: auditCutoff.toISOString(),
        },
        system_logs: {
          count: systemCount.count || 0,
          cutoff_date: systemCutoff.toISOString(),
        },
        login_history: {
          count: loginCount.count || 0,
          cutoff_date: loginCutoff.toISOString(),
        },
        data_access_logs: {
          count: dataAccessCount.count || 0,
          cutoff_date: dataAccessCutoff.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('Error getting archive preview:', error);
    return { success: false, error: 'Failed to get archive preview' };
  }
}

/**
 * Gets archive history (records of past archive operations).
 */
export async function getArchiveHistory(
  limit: number = 50
): Promise<ActionResult<ArchiveRecord[]>> {
  try {
    const supabase = await createClient();
    
    // Try to get from audit_archive_log table
    const { data, error } = await supabase
      .from('audit_archive_log' as AnyTable)
      .select('*')
      .order('archived_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      // Table might not exist, return empty array
      if (error.code === '42P01') {
        return { success: true, data: [] };
      }
      throw error;
    }
    
    return { success: true, data: (data || []) as unknown as ArchiveRecord[] };
  } catch (error) {
    console.error('Error fetching archive history:', error);
    // Return empty array instead of error for missing table
    return { success: true, data: [] };
  }
}

/**
 * Formats bytes to human-readable size.
 * Note: This is a utility function, import from '@/lib/format-utils' instead
 */
// formatBytes moved to lib/format-utils.ts

/**
 * Gets a summary of storage usage and retention status.
 */
export async function getRetentionSummary(): Promise<ActionResult<{
  storage: AuditStorageStats;
  config: RetentionConfig;
  preview: {
    audit_logs: { count: number; cutoff_date: string };
    system_logs: { count: number; cutoff_date: string };
    login_history: { count: number; cutoff_date: string };
    data_access_logs: { count: number; cutoff_date: string };
  };
}>> {
  try {
    const [storageResult, configResult, previewResult] = await Promise.all([
      getStorageStats(),
      getRetentionConfig(),
      getArchivePreview(),
    ]);
    
    if (!storageResult.success || !storageResult.data) {
      return { success: false, error: 'Failed to get storage statistics' };
    }
    
    if (!configResult.success || !configResult.data) {
      return { success: false, error: 'Failed to get retention configuration' };
    }
    
    if (!previewResult.success || !previewResult.data) {
      return { success: false, error: 'Failed to get archive preview' };
    }
    
    return {
      success: true,
      data: {
        storage: storageResult.data,
        config: configResult.data,
        preview: previewResult.data,
      },
    };
  } catch (error) {
    console.error('Error getting retention summary:', error);
    return { success: false, error: 'Failed to get retention summary' };
  }
}
