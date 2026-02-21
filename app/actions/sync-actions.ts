// =====================================================
// v0.69: SYNC SERVER ACTIONS
// Server actions for triggering and managing synchronization
// Requirements: 6.1, 9.5
// =====================================================
'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { revalidatePath } from 'next/cache';

const ADMIN_ROLES = ['owner', 'director', 'sysadmin'];
import {
  type SyncResult,
  type SyncLog,
  type SyncMapping,
  type IntegrationConnection,
  type ExternalIdMapping,
  type SyncError,
} from '@/types/integration';
import {
  createSyncContext,
  contextToResult,
  updateContextFromResults,
  processSyncBatch,
  checkTokenStatus,
  DEFAULT_RETRY_CONFIG,
  type SyncRecord,
  type ExternalApiAdapter,
} from '@/lib/sync-engine';
import {
  prepareSyncLogForCreate,
  prepareSyncCompletion,
  prepareSyncFailure,
  createSyncError,
} from '@/lib/sync-log-utils';
import { applyFieldMappings, evaluateFilterConditions } from '@/lib/sync-mapping-utils';
import { createMappingLookup } from '@/lib/external-id-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TriggerSyncInput {
  connectionId: string;
  mappingId?: string;
  syncType?: 'push' | 'pull' | 'full_sync';
}

// =====================================================
// TRIGGER MANUAL SYNC
// Requirements: 6.1 - Execute synchronization immediately when triggered
// =====================================================

/**
 * Triggers a manual synchronization for a connection or specific mapping
 * @param input - Sync trigger input
 * @returns Action result with sync result or error
 */
export async function triggerManualSync(
  input: TriggerSyncInput
): Promise<ActionResult<SyncResult>> {
  try {
    const profile = await getUserProfile();
    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const { connectionId, mappingId, syncType = 'push' } = input;

    if (!connectionId) {
      return { success: false, error: 'Connection ID is required' };
    }

    const supabase = await createClient();

    // Get connection details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connection, error: connError } = await (supabase as any)
      .from('integration_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return { 
        success: false, 
        error: connError?.code === 'PGRST116' ? 'Connection not found' : connError?.message || 'Connection not found'
      };
    }

    const conn = connection as IntegrationConnection;

    // Check if connection is active
    if (!conn.is_active) {
      return { success: false, error: 'Connection is not active' };
    }

    // Check token status
    const tokenStatus = checkTokenStatus(conn);
    if (!tokenStatus.valid && tokenStatus.requiresReauth) {
      return { 
        success: false, 
        error: 'Connection requires re-authentication. OAuth token expired and no refresh token available.' 
      };
    }

    // Get mappings to sync
    let mappings: SyncMapping[] = [];
    if (mappingId) {
      // Sync specific mapping
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mapping, error: mapError } = await (supabase as any)
        .from('sync_mappings')
        .select('*')
        .eq('id', mappingId)
        .eq('connection_id', connectionId)
        .single();

      if (mapError || !mapping) {
        return { success: false, error: 'Mapping not found' };
      }
      mappings = [mapping as SyncMapping];
    } else {
      // Sync all active mappings for connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allMappings, error: mapError } = await (supabase as any)
        .from('sync_mappings')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('is_active', true);

      if (mapError) {
        return { success: false, error: mapError.message };
      }
      mappings = (allMappings || []) as SyncMapping[];
    }

    if (mappings.length === 0) {
      return { success: false, error: 'No active mappings found for this connection' };
    }

    // Create sync log entry
    const logInput = prepareSyncLogForCreate({
      connection_id: connectionId,
      mapping_id: mappingId || null,
      sync_type: syncType,
    });

    if (!logInput.valid) {
      return { success: false, error: logInput.errors.join(', ') };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: syncLog, error: logError } = await (supabase as any)
      .from('sync_log')
      .insert(logInput.data)
      .select()
      .single();

    if (logError) {
      return { success: false, error: `Failed to create sync log: ${logError.message}` };
    }

    const log = syncLog as SyncLog;

    // Execute sync for each mapping
    const context = createSyncContext(connectionId, mappingId || null, syncType);
    const errors: SyncError[] = [];

    for (const mapping of mappings) {
      try {
        const mappingResult = await executeMappingSync(supabase, conn, mapping, syncType);
        
        // Update context with results
        context.recordsProcessed += mappingResult.records_processed;
        context.recordsCreated += mappingResult.records_created;
        context.recordsUpdated += mappingResult.records_updated;
        context.recordsFailed += mappingResult.records_failed;
        
        if (mappingResult.error_details) {
          errors.push(...mappingResult.error_details);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(createSyncError(mapping.id, 'MAPPING_ERROR', errorMsg));
        context.recordsFailed++;
      }
    }

    context.errors = errors;

    // Determine final status and update sync log
    const completionData = prepareSyncCompletion({
      records_processed: context.recordsProcessed,
      records_created: context.recordsCreated,
      records_updated: context.recordsUpdated,
      records_failed: context.recordsFailed,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('sync_log')
      .update({
        ...completionData,
        error_details: errors.length > 0 ? errors : null,
      })
      .eq('id', log.id);

    // Update connection last_sync_at
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('integration_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: errors.length > 0 ? `${errors.length} errors during sync` : null,
      })
      .eq('id', connectionId);

    revalidatePath('/settings/integrations');
    revalidatePath(`/settings/integrations/${connectionId}`);
    revalidatePath('/settings/integrations/history');

    const result = contextToResult(context, log.id);
    return { success: true, data: result };
  } catch (err) {
    console.error('Error triggering manual sync:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to trigger sync' 
    };
  }
}

// =====================================================
// RETRY FAILED SYNC
// Requirements: 9.5 - Provide option to retry failed records only
// =====================================================

/**
 * Retries a failed synchronization, processing only failed records
 * @param syncLogId - ID of the failed sync log to retry
 * @returns Action result with new sync result or error
 */
export async function retryFailedSync(
  syncLogId: string
): Promise<ActionResult<SyncResult>> {
  try {
    const profile = await getUserProfile();
    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!syncLogId) {
      return { success: false, error: 'Sync log ID is required' };
    }

    const supabase = await createClient();

    // Get the failed sync log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: originalLog, error: logError } = await (supabase as any)
      .from('sync_log')
      .select('*')
      .eq('id', syncLogId)
      .single();

    if (logError || !originalLog) {
      return { 
        success: false, 
        error: logError?.code === 'PGRST116' ? 'Sync log not found' : logError?.message || 'Sync log not found'
      };
    }

    const log = originalLog as SyncLog;

    // Check if sync can be retried (must be failed or partial)
    if (log.status !== 'failed' && log.status !== 'partial') {
      return { 
        success: false, 
        error: `Cannot retry sync with status '${log.status}'. Only failed or partial syncs can be retried.` 
      };
    }

    // Get connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connection, error: connError } = await (supabase as any)
      .from('integration_connections')
      .select('*')
      .eq('id', log.connection_id)
      .single();

    if (connError || !connection) {
      return { success: false, error: 'Connection not found' };
    }

    const conn = connection as IntegrationConnection;

    // Check if connection is active
    if (!conn.is_active) {
      return { success: false, error: 'Connection is not active' };
    }

    // Check token status
    const tokenStatus = checkTokenStatus(conn);
    if (!tokenStatus.valid && tokenStatus.requiresReauth) {
      return { 
        success: false, 
        error: 'Connection requires re-authentication' 
      };
    }

    // Get failed record IDs from error_details
    const failedRecordIds = (log.error_details || []).map(e => e.record_id).filter(id => id);

    if (failedRecordIds.length === 0) {
      return { 
        success: false, 
        error: 'No failed records found to retry' 
      };
    }

    // Create new sync log for retry
    const retryLogInput = prepareSyncLogForCreate({
      connection_id: log.connection_id,
      mapping_id: log.mapping_id,
      sync_type: log.sync_type,
    });

    if (!retryLogInput.valid) {
      return { success: false, error: retryLogInput.errors.join(', ') };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: retrySyncLog, error: retryLogError } = await (supabase as any)
      .from('sync_log')
      .insert(retryLogInput.data)
      .select()
      .single();

    if (retryLogError) {
      return { success: false, error: `Failed to create retry sync log: ${retryLogError.message}` };
    }

    const retryLog = retrySyncLog as SyncLog;

    // Get mapping if specified
    let mapping: SyncMapping | null = null;
    if (log.mapping_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mappingData } = await (supabase as any)
        .from('sync_mappings')
        .select('*')
        .eq('id', log.mapping_id)
        .single();
      mapping = mappingData as SyncMapping | null;
    }

    // Execute retry sync
    const context = createSyncContext(log.connection_id, log.mapping_id, log.sync_type);
    const errors: SyncError[] = [];

    if (mapping) {
      try {
        // Retry only failed records
        const retryResult = await executeRetrySync(supabase, conn, mapping, failedRecordIds);
        
        context.recordsProcessed = retryResult.records_processed;
        context.recordsCreated = retryResult.records_created;
        context.recordsUpdated = retryResult.records_updated;
        context.recordsFailed = retryResult.records_failed;
        
        if (retryResult.error_details) {
          errors.push(...retryResult.error_details);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(createSyncError('', 'RETRY_ERROR', errorMsg));
        context.recordsFailed = failedRecordIds.length;
      }
    } else {
      // No mapping specified, mark all as failed
      for (const recordId of failedRecordIds) {
        errors.push(createSyncError(recordId, 'NO_MAPPING', 'No mapping found for retry'));
      }
      context.recordsFailed = failedRecordIds.length;
    }

    context.errors = errors;

    // Update retry sync log
    const completionData = prepareSyncCompletion({
      records_processed: context.recordsProcessed,
      records_created: context.recordsCreated,
      records_updated: context.recordsUpdated,
      records_failed: context.recordsFailed,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('sync_log')
      .update({
        ...completionData,
        error_details: errors.length > 0 ? errors : null,
      })
      .eq('id', retryLog.id);

    // Update connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('integration_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: errors.length > 0 ? `${errors.length} errors during retry` : null,
      })
      .eq('id', log.connection_id);

    revalidatePath('/settings/integrations');
    revalidatePath(`/settings/integrations/${log.connection_id}`);
    revalidatePath('/settings/integrations/history');

    const result = contextToResult(context, retryLog.id);
    return { success: true, data: result };
  } catch (err) {
    console.error('Error retrying failed sync:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to retry sync' 
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Executes sync for a single mapping
 */
async function executeMappingSync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connection: IntegrationConnection,
  mapping: SyncMapping,
  syncType: 'push' | 'pull' | 'full_sync'
): Promise<{
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_details?: SyncError[];
}> {
  const errors: SyncError[] = [];
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsFailed = 0;

  if (syncType === 'push' || syncType === 'full_sync') {
    // Get records from local table
    const { data: localRecords, error: fetchError } = await supabase
      .from(mapping.local_table)
      .select('*');

    if (fetchError) {
      errors.push(createSyncError('', 'FETCH_ERROR', fetchError.message));
      return { records_processed: 0, records_created: 0, records_updated: 0, records_failed: 1, error_details: errors };
    }

    if (!localRecords || localRecords.length === 0) {
      return { records_processed: 0, records_created: 0, records_updated: 0, records_failed: 0 };
    }

    // Apply filter conditions
    let filteredRecords = localRecords;
    if (mapping.filter_conditions && mapping.filter_conditions.length > 0) {
      filteredRecords = localRecords.filter((record: Record<string, unknown>) => 
        evaluateFilterConditions(record, mapping.filter_conditions!)
      );
    }

    // Get existing external ID mappings
    const { data: existingMappings } = await supabase
      .from('external_id_mappings')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('local_table', mapping.local_table);

    const mappingLookup = createMappingLookup((existingMappings || []) as ExternalIdMapping[]);

    // Process each record
    for (const record of filteredRecords) {
      try {
        const localId = record.id as string;
        const existingMapping = mappingLookup.get(localId);
        
        // Transform record using field mappings
        const transformedData = applyFieldMappings(record, mapping.field_mappings);

        // Simulate external API call (in production, this would call the actual API)
        const isCreate = !existingMapping;
        
        // For now, simulate success
        // In production, this would use the actual external API adapter
        const externalId = existingMapping?.external_id || `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (isCreate) {
          // Create external ID mapping
          await supabase
            .from('external_id_mappings')
            .insert({
              connection_id: connection.id,
              local_table: mapping.local_table,
              local_id: localId,
              external_id: externalId,
              external_data: transformedData,
              synced_at: new Date().toISOString(),
            });
          recordsCreated++;
        } else {
          // Update external ID mapping
          await supabase
            .from('external_id_mappings')
            .update({
              external_data: transformedData,
              synced_at: new Date().toISOString(),
            })
            .eq('id', existingMapping.id);
          recordsUpdated++;
        }

        recordsProcessed++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(createSyncError(record.id as string, 'SYNC_ERROR', errorMsg));
        recordsFailed++;
        recordsProcessed++;
      }
    }
  }

  return {
    records_processed: recordsProcessed,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
    records_failed: recordsFailed,
    error_details: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Executes retry sync for specific failed records
 */
async function executeRetrySync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  connection: IntegrationConnection,
  mapping: SyncMapping,
  failedRecordIds: string[]
): Promise<{
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_details?: SyncError[];
}> {
  const errors: SyncError[] = [];
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsFailed = 0;

  // Get only the failed records
  const { data: localRecords, error: fetchError } = await supabase
    .from(mapping.local_table)
    .select('*')
    .in('id', failedRecordIds);

  if (fetchError) {
    errors.push(createSyncError('', 'FETCH_ERROR', fetchError.message));
    return { records_processed: 0, records_created: 0, records_updated: 0, records_failed: failedRecordIds.length, error_details: errors };
  }

  if (!localRecords || localRecords.length === 0) {
    return { records_processed: 0, records_created: 0, records_updated: 0, records_failed: 0 };
  }

  // Get existing external ID mappings
  const { data: existingMappings } = await supabase
    .from('external_id_mappings')
    .select('*')
    .eq('connection_id', connection.id)
    .eq('local_table', mapping.local_table)
    .in('local_id', failedRecordIds);

  const mappingLookup = createMappingLookup((existingMappings || []) as ExternalIdMapping[]);

  // Process each failed record
  for (const record of localRecords) {
    try {
      const localId = record.id as string;
      const existingMapping = mappingLookup.get(localId);
      
      // Transform record using field mappings
      const transformedData = applyFieldMappings(record, mapping.field_mappings);

      const isCreate = !existingMapping;
      const externalId = existingMapping?.external_id || `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (isCreate) {
        await supabase
          .from('external_id_mappings')
          .insert({
            connection_id: connection.id,
            local_table: mapping.local_table,
            local_id: localId,
            external_id: externalId,
            external_data: transformedData,
            synced_at: new Date().toISOString(),
          });
        recordsCreated++;
      } else {
        await supabase
          .from('external_id_mappings')
          .update({
            external_data: transformedData,
            synced_at: new Date().toISOString(),
          })
          .eq('id', existingMapping.id);
        recordsUpdated++;
      }

      recordsProcessed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(createSyncError(record.id as string, 'RETRY_SYNC_ERROR', errorMsg));
      recordsFailed++;
      recordsProcessed++;
    }
  }

  return {
    records_processed: recordsProcessed,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
    records_failed: recordsFailed,
    error_details: errors.length > 0 ? errors : undefined,
  };
}

// =====================================================
// ADDITIONAL SYNC ACTIONS
// =====================================================

/**
 * Gets sync status for a connection
 */
export async function getSyncStatus(
  connectionId: string
): Promise<ActionResult<{
  lastSync: SyncLog | null;
  isRunning: boolean;
  totalSyncs: number;
  successRate: number;
}>> {
  try {
    const profile = await getUserProfile();
    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!connectionId) {
      return { success: false, error: 'Connection ID is required' };
    }

    const supabase = await createClient();

    // Get recent sync logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logs, error } = await (supabase as any)
      .from('sync_log')
      .select('*')
      .eq('connection_id', connectionId)
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, error: error.message };
    }

    const syncLogs = (logs || []) as SyncLog[];
    const lastSync = syncLogs[0] || null;
    const isRunning = syncLogs.some(l => l.status === 'running');
    const totalSyncs = syncLogs.length;
    const successfulSyncs = syncLogs.filter(l => l.status === 'completed').length;
    const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;

    return {
      success: true,
      data: {
        lastSync,
        isRunning,
        totalSyncs,
        successRate: Math.round(successRate * 100) / 100,
      },
    };
  } catch (err) {
    console.error('Error getting sync status:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to get sync status' 
    };
  }
}

/**
 * Cancels a running sync (if possible)
 */
export async function cancelSync(
  syncLogId: string
): Promise<ActionResult<void>> {
  try {
    const profile = await getUserProfile();
    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!syncLogId) {
      return { success: false, error: 'Sync log ID is required' };
    }

    const supabase = await createClient();

    // Get sync log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: log, error: fetchError } = await (supabase as any)
      .from('sync_log')
      .select('*')
      .eq('id', syncLogId)
      .single();

    if (fetchError || !log) {
      return { success: false, error: 'Sync log not found' };
    }

    if (log.status !== 'running') {
      return { success: false, error: 'Can only cancel running syncs' };
    }

    // Mark as failed with cancellation
    const failureData = prepareSyncFailure([
      createSyncError('', 'CANCELLED', 'Sync was cancelled by user'),
    ], {
      records_processed: log.records_processed,
      records_created: log.records_created,
      records_updated: log.records_updated,
      records_failed: log.records_failed,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('sync_log')
      .update(failureData)
      .eq('id', syncLogId);

    revalidatePath('/settings/integrations');
    revalidatePath('/settings/integrations/history');

    return { success: true };
  } catch (err) {
    console.error('Error cancelling sync:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to cancel sync' 
    };
  }
}
