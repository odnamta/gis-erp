// =====================================================
// v0.69: SYNC ENGINE
// Core synchronization engine for external integrations
// Requirements: 6.1, 6.2, 9.1, 9.2, 9.3, 9.4
// =====================================================

import {
  type IntegrationConnection,
  type SyncMapping,
  type SyncResult,
  type SyncStatus,
  type SyncError,
  type ExternalIdMapping,
  type SyncLog,
} from '@/types/integration';
import { calculateRetryDelay, isTokenExpired } from '@/lib/integration-utils';
import { processSyncMapping, filterActiveMappings } from '@/lib/sync-mapping-utils';
import {
  prepareSyncLogForCreate,
  prepareSyncCompletion,
  prepareSyncFailure,
  prepareSyncProgress,
  createSyncError,
} from '@/lib/sync-log-utils';
import {
  determineOperation,
  createMappingLookup,
} from '@/lib/external-id-utils';

// =====================================================
// RETRY CONFIGURATION
// =====================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// =====================================================
// SYNC CONTEXT
// =====================================================

/**
 * Context for a sync operation, tracking progress and errors
 */
export interface SyncContext {
  connectionId: string;
  mappingId: string | null;
  syncType: 'push' | 'pull' | 'full_sync';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: SyncError[];
  startedAt: Date;
}

/**
 * Creates a new sync context
 */
export function createSyncContext(
  connectionId: string,
  mappingId: string | null,
  syncType: 'push' | 'pull' | 'full_sync'
): SyncContext {
  return {
    connectionId,
    mappingId,
    syncType,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
    startedAt: new Date(),
  };
}

/**
 * Updates sync context with a successful create
 */
export function recordCreate(context: SyncContext): SyncContext {
  return {
    ...context,
    recordsProcessed: context.recordsProcessed + 1,
    recordsCreated: context.recordsCreated + 1,
  };
}

/**
 * Updates sync context with a successful update
 */
export function recordUpdate(context: SyncContext): SyncContext {
  return {
    ...context,
    recordsProcessed: context.recordsProcessed + 1,
    recordsUpdated: context.recordsUpdated + 1,
  };
}

/**
 * Updates sync context with a failure
 */
export function recordFailure(
  context: SyncContext,
  recordId: string,
  errorCode: string,
  errorMessage: string
): SyncContext {
  return {
    ...context,
    recordsProcessed: context.recordsProcessed + 1,
    recordsFailed: context.recordsFailed + 1,
    errors: [...context.errors, createSyncError(recordId, errorCode, errorMessage)],
  };
}

/**
 * Converts sync context to sync result
 */
export function contextToResult(context: SyncContext, syncLogId: string): SyncResult {
  let status: SyncStatus;
  if (context.recordsFailed === 0 && context.recordsProcessed > 0) {
    status = 'completed';
  } else if (context.recordsFailed > 0 && context.recordsFailed < context.recordsProcessed) {
    status = 'partial';
  } else if (context.recordsFailed === context.recordsProcessed && context.recordsProcessed > 0) {
    status = 'failed';
  } else {
    status = 'completed'; // No records processed
  }

  return {
    sync_log_id: syncLogId,
    status,
    records_processed: context.recordsProcessed,
    records_created: context.recordsCreated,
    records_updated: context.recordsUpdated,
    records_failed: context.recordsFailed,
    error_details: context.errors.length > 0 ? context.errors : undefined,
  };
}

// =====================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// Requirements: 9.1, 9.2
// =====================================================

/**
 * Error types that are retryable
 */
export type RetryableErrorType = 
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'TOKEN_EXPIRED';

/**
 * Determines if an error is retryable
 */
export function isRetryableError(errorCode: string): boolean {
  const retryableCodes: string[] = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'SERVER_ERROR',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    '500',
    '502',
    '503',
    '504',
    '429',
  ];
  return retryableCodes.includes(errorCode);
}

/**
 * Determines if an error indicates token expiration
 */
export function isTokenExpiredError(errorCode: string): boolean {
  const tokenExpiredCodes = ['TOKEN_EXPIRED', '401', 'UNAUTHORIZED', 'INVALID_TOKEN'];
  return tokenExpiredCodes.includes(errorCode);
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  retryCount: number;
  tokenRefreshed: boolean;
}

/**
 * Async function type for retry operations
 */
export type RetryableOperation<T> = () => Promise<{ success: boolean; data?: T; error?: string; errorCode?: string }>;

/**
 * Token refresh function type
 */
export type TokenRefreshFn = () => Promise<{ success: boolean; error?: string }>;

/**
 * Executes an operation with retry logic and exponential backoff.
 * Requirements: 9.1 - Retry up to 3 times with exponential backoff
 * 
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param onTokenExpired - Optional callback to refresh token
 * @returns Result with retry count and token refresh status
 */
export async function retryWithBackoff<T>(
  operation: RetryableOperation<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onTokenExpired?: TokenRefreshFn
): Promise<RetryResult<T>> {
  let retryCount = 0;
  let tokenRefreshed = false;
  let lastError: string | undefined;
  let lastErrorCode: string | undefined;

  while (retryCount <= config.maxRetries) {
    try {
      const result = await operation();

      if (result.success) {
        return {
          success: true,
          data: result.data,
          retryCount,
          tokenRefreshed,
        };
      }

      // Check if token expired and we can refresh
      if (result.errorCode && isTokenExpiredError(result.errorCode) && onTokenExpired && !tokenRefreshed) {
        const refreshResult = await onTokenExpired();
        if (refreshResult.success) {
          tokenRefreshed = true;
          // Retry immediately after token refresh (don't count as retry)
          continue;
        } else {
          // Token refresh failed, return immediately
          return {
            success: false,
            error: 'Token refresh failed: ' + (refreshResult.error || 'Unknown error'),
            errorCode: 'TOKEN_REFRESH_FAILED',
            retryCount,
            tokenRefreshed: false,
          };
        }
      }

      // Check if error is retryable
      if (result.errorCode && !isRetryableError(result.errorCode)) {
        // Non-retryable error, return immediately
        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          retryCount,
          tokenRefreshed,
        };
      }

      lastError = result.error;
      lastErrorCode = result.errorCode;

    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      lastErrorCode = 'EXCEPTION';
    }

    // If we've exhausted retries, break
    if (retryCount >= config.maxRetries) {
      break;
    }

    // Calculate delay and wait
    const delay = calculateRetryDelay(retryCount, config.baseDelayMs, config.maxDelayMs);
    await sleep(delay);
    retryCount++;
  }

  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    errorCode: lastErrorCode || 'MAX_RETRIES',
    retryCount,
    tokenRefreshed,
  };
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =====================================================
// SYNC RECORD PROCESSOR
// Requirements: 9.2 - Continue processing on individual record failures
// =====================================================

/**
 * Record to sync with its local ID
 */
export interface SyncRecord {
  localId: string;
  data: Record<string, unknown>;
}

/**
 * Result of processing a single record
 */
export interface RecordSyncResult {
  localId: string;
  success: boolean;
  operation: 'create' | 'update';
  externalId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * External API adapter interface
 */
export interface ExternalApiAdapter {
  createRecord(data: Record<string, unknown>): Promise<{ success: boolean; externalId?: string; error?: string; errorCode?: string }>;
  updateRecord(externalId: string, data: Record<string, unknown>): Promise<{ success: boolean; error?: string; errorCode?: string }>;
  fetchRecords?(filters?: Record<string, unknown>): Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string; errorCode?: string }>;
}

/**
 * Processes a batch of records for sync, continuing on individual failures.
 * Requirements: 9.2 - Individual record failures don't stop batch processing
 * 
 * @param records - Records to sync
 * @param existingMappings - Existing external ID mappings
 * @param adapter - External API adapter
 * @param retryConfig - Retry configuration
 * @param onTokenExpired - Token refresh callback
 * @returns Array of record sync results
 */
export async function processSyncBatch(
  records: SyncRecord[],
  existingMappings: Map<string, ExternalIdMapping>,
  adapter: ExternalApiAdapter,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  onTokenExpired?: TokenRefreshFn
): Promise<RecordSyncResult[]> {
  const results: RecordSyncResult[] = [];

  for (const record of records) {
    const existingMapping = existingMappings.get(record.localId) || null;
    const operation = determineOperation(existingMapping);

    let result: RecordSyncResult;

    if (operation === 'create') {
      const retryResult = await retryWithBackoff(
        () => adapter.createRecord(record.data),
        retryConfig,
        onTokenExpired
      );

      // Extract externalId from the result data
      const externalId = retryResult.success && retryResult.data 
        ? (retryResult.data as { externalId?: string }).externalId 
        : undefined;

      result = {
        localId: record.localId,
        success: retryResult.success,
        operation: 'create',
        externalId,
        error: retryResult.error,
        errorCode: retryResult.errorCode,
      };
    } else {
      const externalId = existingMapping!.external_id;
      const retryResult = await retryWithBackoff(
        () => adapter.updateRecord(externalId, record.data),
        retryConfig,
        onTokenExpired
      );

      result = {
        localId: record.localId,
        success: retryResult.success,
        operation: 'update',
        externalId,
        error: retryResult.error,
        errorCode: retryResult.errorCode,
      };
    }

    results.push(result);
  }

  return results;
}

// =====================================================
// PUSH SYNC EXECUTION
// Requirements: 6.1 - Manual sync execution
// =====================================================

/**
 * Input for push sync operation
 */
export interface PushSyncInput {
  connection: IntegrationConnection;
  mapping: SyncMapping;
  records: Record<string, unknown>[];
  existingMappings: ExternalIdMapping[];
  adapter: ExternalApiAdapter;
  retryConfig?: RetryConfig;
  onTokenExpired?: TokenRefreshFn;
}

/**
 * Executes a push sync operation.
 * Requirements: 6.1 - Execute synchronization immediately
 * 
 * @param input - Push sync input
 * @returns Sync context with results
 */
export function executePushSync(input: PushSyncInput): {
  preparedRecords: SyncRecord[];
  context: SyncContext;
  mappingLookup: Map<string, ExternalIdMapping>;
} {
  const {
    connection,
    mapping,
    records,
    existingMappings,
  } = input;

  // Create sync context
  const context = createSyncContext(connection.id, mapping.id, 'push');

  // Process records through mapping (filter + transform)
  const processedRecords = processSyncMapping(records, mapping);

  // Create mapping lookup
  const mappingLookup = createMappingLookup(existingMappings);

  // Prepare sync records with local IDs
  const preparedRecords: SyncRecord[] = processedRecords.map((data, index) => ({
    localId: (records[index] as Record<string, unknown>).id as string || `record-${index}`,
    data,
  }));

  return {
    preparedRecords,
    context,
    mappingLookup,
  };
}

/**
 * Updates sync context based on batch results
 */
export function updateContextFromResults(
  context: SyncContext,
  results: RecordSyncResult[]
): SyncContext {
  let updatedContext = context;

  for (const result of results) {
    if (result.success) {
      if (result.operation === 'create') {
        updatedContext = recordCreate(updatedContext);
      } else {
        updatedContext = recordUpdate(updatedContext);
      }
    } else {
      updatedContext = recordFailure(
        updatedContext,
        result.localId,
        result.errorCode || 'UNKNOWN',
        result.error || 'Unknown error'
      );
    }
  }

  return updatedContext;
}

// =====================================================
// PULL SYNC EXECUTION
// Requirements: 6.1 - Execute synchronization immediately
// =====================================================

/**
 * Input for pull sync operation
 */
export interface PullSyncInput {
  connection: IntegrationConnection;
  mapping: SyncMapping;
  adapter: ExternalApiAdapter;
  retryConfig?: RetryConfig;
  onTokenExpired?: TokenRefreshFn;
}

/**
 * Result of pull sync preparation
 */
export interface PullSyncPreparation {
  context: SyncContext;
  fetchOperation: () => Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string; errorCode?: string }>;
}

/**
 * Prepares a pull sync operation.
 * Requirements: 6.1 - Execute synchronization immediately
 * 
 * @param input - Pull sync input
 * @returns Prepared pull sync operation
 */
export function preparePullSync(input: PullSyncInput): PullSyncPreparation {
  const { connection, mapping, adapter } = input;

  // Create sync context
  const context = createSyncContext(connection.id, mapping.id, 'pull');

  // Create fetch operation
  const fetchOperation = async () => {
    if (!adapter.fetchRecords) {
      return { success: false, error: 'Adapter does not support pull sync', errorCode: 'NOT_SUPPORTED' };
    }
    return adapter.fetchRecords();
  };

  return {
    context,
    fetchOperation,
  };
}

/**
 * Executes a pull sync operation with retry logic.
 * Requirements: 6.1 - Execute synchronization immediately
 * 
 * @param input - Pull sync input
 * @returns Sync context with fetched data or error
 */
export async function executePullSync(input: PullSyncInput): Promise<{
  context: SyncContext;
  data: Record<string, unknown>[] | null;
  error?: string;
  errorCode?: string;
}> {
  const { connection, mapping, adapter, retryConfig = DEFAULT_RETRY_CONFIG, onTokenExpired } = input;

  // Create sync context
  const context = createSyncContext(connection.id, mapping.id, 'pull');

  // Check if adapter supports pull
  if (!adapter.fetchRecords) {
    return {
      context: recordFailure(context, '', 'NOT_SUPPORTED', 'Adapter does not support pull sync'),
      data: null,
      error: 'Adapter does not support pull sync',
      errorCode: 'NOT_SUPPORTED',
    };
  }

  // Execute fetch with retry
  const result = await retryWithBackoff(
    () => adapter.fetchRecords!(),
    retryConfig,
    onTokenExpired
  );

  if (!result.success) {
    return {
      context: recordFailure(context, '', result.errorCode || 'FETCH_ERROR', result.error || 'Failed to fetch records'),
      data: null,
      error: result.error,
      errorCode: result.errorCode,
    };
  }

  // Extract data from result - handle both direct array and nested data
  let records: Record<string, unknown>[] = [];
  if (result.data) {
    // Check if data is directly an array (from fetchRecords returning { success, data: [...] })
    if (Array.isArray(result.data)) {
      records = result.data as Record<string, unknown>[];
    } else if (typeof result.data === 'object' && 'data' in result.data && Array.isArray((result.data as Record<string, unknown>).data)) {
      // Handle nested data structure
      records = (result.data as Record<string, unknown>).data as Record<string, unknown>[];
    }
  }

  // Update context with record count
  let updatedContext = context;
  for (let i = 0; i < records.length; i++) {
    updatedContext = recordCreate(updatedContext);
  }

  return {
    context: updatedContext,
    data: records,
  };
}

// =====================================================
// FULL SYNC EXECUTION
// Requirements: 6.1, 6.2 - Execute full synchronization
// =====================================================

/**
 * Input for full sync operation
 */
export interface FullSyncInput {
  connection: IntegrationConnection;
  mappings: SyncMapping[];
}

/**
 * Prepares a full sync operation for all active mappings.
 * Requirements: 6.1, 6.2 - Execute full synchronization
 * 
 * @param input - Full sync input
 * @returns Array of active mappings to sync
 */
export function prepareFullSync(input: FullSyncInput): {
  activeMappings: SyncMapping[];
  context: SyncContext;
} {
  const { connection, mappings } = input;

  // Filter to only active mappings
  const activeMappings = filterActiveMappings(mappings);

  // Create sync context for full sync
  const context = createSyncContext(connection.id, null, 'full_sync');

  return {
    activeMappings,
    context,
  };
}

/**
 * Result of executing a full sync
 */
export interface FullSyncResult {
  context: SyncContext;
  mappingResults: Array<{
    mappingId: string;
    success: boolean;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsFailed: number;
    error?: string;
  }>;
}

/**
 * Executes a full sync operation for all active mappings.
 * Requirements: 6.1, 6.2 - Execute full synchronization
 * 
 * This function orchestrates sync for all active mappings on a connection.
 * It aggregates results from individual mapping syncs.
 * 
 * @param input - Full sync input
 * @param getMappingRecords - Function to get records for a mapping
 * @param getExistingMappings - Function to get existing external ID mappings
 * @param adapter - External API adapter
 * @param retryConfig - Retry configuration
 * @param onTokenExpired - Token refresh callback
 * @returns Full sync result with aggregated context
 */
export async function executeFullSync(
  input: FullSyncInput,
  getMappingRecords: (mapping: SyncMapping) => Promise<Record<string, unknown>[]>,
  getExistingMappings: (connectionId: string, localTable: string) => Promise<ExternalIdMapping[]>,
  adapter: ExternalApiAdapter,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  onTokenExpired?: TokenRefreshFn
): Promise<FullSyncResult> {
  const { connection, mappings } = input;

  // Filter to only active mappings
  const activeMappings = filterActiveMappings(mappings);

  // Create sync context for full sync
  let context = createSyncContext(connection.id, null, 'full_sync');

  const mappingResults: FullSyncResult['mappingResults'] = [];

  // Process each mapping
  for (const mapping of activeMappings) {
    try {
      // Get records for this mapping
      const records = await getMappingRecords(mapping);
      
      // Get existing external ID mappings
      const existingMappings = await getExistingMappings(connection.id, mapping.local_table);

      // Execute push sync for this mapping
      const pushInput: PushSyncInput = {
        connection,
        mapping,
        records,
        existingMappings,
        adapter,
        retryConfig,
        onTokenExpired,
      };

      const { preparedRecords, mappingLookup } = executePushSync(pushInput);

      // Process the batch
      const results = await processSyncBatch(
        preparedRecords,
        mappingLookup,
        adapter,
        retryConfig,
        onTokenExpired
      );

      // Aggregate results
      const failCount = results.filter(r => !r.success).length;
      const createCount = results.filter(r => r.success && r.operation === 'create').length;
      const updateCount = results.filter(r => r.success && r.operation === 'update').length;

      mappingResults.push({
        mappingId: mapping.id,
        success: failCount === 0,
        recordsProcessed: results.length,
        recordsCreated: createCount,
        recordsUpdated: updateCount,
        recordsFailed: failCount,
      });

      // Update overall context
      for (const result of results) {
        if (result.success) {
          if (result.operation === 'create') {
            context = recordCreate(context);
          } else {
            context = recordUpdate(context);
          }
        } else {
          context = recordFailure(
            context,
            result.localId,
            result.errorCode || 'UNKNOWN',
            result.error || 'Unknown error'
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      mappingResults.push({
        mappingId: mapping.id,
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        error: errorMessage,
      });
      context = recordFailure(context, mapping.id, 'MAPPING_ERROR', errorMessage);
    }
  }

  return {
    context,
    mappingResults,
  };
}

/**
 * Input for retry failed sync operation
 */
export interface RetryFailedInput {
  syncLog: SyncLog;
  failedRecordIds: string[];
  records: Record<string, unknown>[];
  existingMappings: ExternalIdMapping[];
  adapter: ExternalApiAdapter;
  retryConfig?: RetryConfig;
  onTokenExpired?: TokenRefreshFn;
}

/**
 * Retries failed records from a previous sync operation.
 * Requirements: 9.5 - Provide option to retry failed records only
 * 
 * @param input - Retry failed input
 * @returns Sync context with retry results
 */
export async function retryFailedSync(input: RetryFailedInput): Promise<{
  context: SyncContext;
  results: RecordSyncResult[];
}> {
  const {
    syncLog,
    failedRecordIds,
    records,
    existingMappings,
    adapter,
    retryConfig = DEFAULT_RETRY_CONFIG,
    onTokenExpired,
  } = input;

  // Create sync context
  const context = createSyncContext(syncLog.connection_id, syncLog.mapping_id, syncLog.sync_type);

  // Filter records to only failed ones
  const failedRecords = records.filter(r => {
    const id = (r as Record<string, unknown>).id as string;
    return failedRecordIds.includes(id);
  });

  // Prepare sync records
  const preparedRecords: SyncRecord[] = failedRecords.map(data => ({
    localId: (data as Record<string, unknown>).id as string,
    data,
  }));

  // Create mapping lookup
  const mappingLookup = createMappingLookup(existingMappings);

  // Process the batch
  const results = await processSyncBatch(
    preparedRecords,
    mappingLookup,
    adapter,
    retryConfig,
    onTokenExpired
  );

  // Update context from results
  const updatedContext = updateContextFromResults(context, results);

  return {
    context: updatedContext,
    results,
  };
}

// =====================================================
// TOKEN REFRESH HANDLING
// Requirements: 9.3, 9.4 - Token refresh on expiration
// =====================================================

/**
 * Connection status after token check
 */
export interface TokenStatus {
  valid: boolean;
  expired: boolean;
  requiresReauth: boolean;
  message: string;
}

/**
 * Checks the token status of a connection.
 * Requirements: 9.3 - Attempt token refresh before failing
 * 
 * @param connection - Integration connection
 * @returns Token status
 */
export function checkTokenStatus(connection: IntegrationConnection): TokenStatus {
  // No OAuth tokens configured
  if (!connection.access_token) {
    return {
      valid: true,
      expired: false,
      requiresReauth: false,
      message: 'No OAuth tokens configured (using API key or other auth)',
    };
  }

  // Check if token is expired
  if (isTokenExpired(connection.token_expires_at)) {
    // Check if we have a refresh token
    if (connection.refresh_token) {
      return {
        valid: false,
        expired: true,
        requiresReauth: false,
        message: 'Token expired, refresh available',
      };
    } else {
      return {
        valid: false,
        expired: true,
        requiresReauth: true,
        message: 'Token expired, re-authentication required',
      };
    }
  }

  return {
    valid: true,
    expired: false,
    requiresReauth: false,
    message: 'Token valid',
  };
}

/**
 * Creates a token refresh function for a connection.
 * Requirements: 9.3, 9.4 - Token refresh handling
 * 
 * @param connection - Integration connection
 * @param refreshCallback - Callback to perform actual token refresh
 * @returns Token refresh function or undefined if not applicable
 */
export function createTokenRefreshFn(
  connection: IntegrationConnection,
  refreshCallback: (connectionId: string, refreshToken: string) => Promise<{ success: boolean; error?: string }>
): TokenRefreshFn | undefined {
  if (!connection.refresh_token) {
    return undefined;
  }

  return async () => {
    return refreshCallback(connection.id, connection.refresh_token!);
  };
}

// =====================================================
// SYNC RESULT HELPERS
// =====================================================

/**
 * Creates a successful sync result
 */
export function createSuccessResult(
  syncLogId: string,
  context: SyncContext
): SyncResult {
  return {
    sync_log_id: syncLogId,
    status: 'completed',
    records_processed: context.recordsProcessed,
    records_created: context.recordsCreated,
    records_updated: context.recordsUpdated,
    records_failed: context.recordsFailed,
  };
}

/**
 * Creates a failed sync result
 */
export function createFailedResult(
  syncLogId: string,
  error: string,
  errorCode: string
): SyncResult {
  return {
    sync_log_id: syncLogId,
    status: 'failed',
    records_processed: 0,
    records_created: 0,
    records_updated: 0,
    records_failed: 0,
    error_details: [createSyncError('', errorCode, error)],
  };
}

/**
 * Creates a partial sync result
 */
export function createPartialResult(
  syncLogId: string,
  context: SyncContext
): SyncResult {
  return {
    sync_log_id: syncLogId,
    status: 'partial',
    records_processed: context.recordsProcessed,
    records_created: context.recordsCreated,
    records_updated: context.recordsUpdated,
    records_failed: context.recordsFailed,
    error_details: context.errors,
  };
}

// =====================================================
// SYNC LOG PREPARATION HELPERS
// =====================================================

/**
 * Prepares sync log data for starting a sync
 */
export function prepareSyncLogStart(
  connectionId: string,
  mappingId: string | null,
  syncType: 'push' | 'pull' | 'full_sync'
) {
  return prepareSyncLogForCreate({
    connection_id: connectionId,
    mapping_id: mappingId,
    sync_type: syncType,
  });
}

/**
 * Prepares sync log data for completion
 */
export function prepareSyncLogComplete(context: SyncContext) {
  return prepareSyncCompletion({
    records_processed: context.recordsProcessed,
    records_created: context.recordsCreated,
    records_updated: context.recordsUpdated,
    records_failed: context.recordsFailed,
  });
}

/**
 * Prepares sync log data for failure
 */
export function prepareSyncLogFail(errors: SyncError[]) {
  return prepareSyncFailure(errors);
}

/**
 * Prepares sync log data for progress update
 */
export function prepareSyncLogProgress(context: SyncContext) {
  return prepareSyncProgress({
    records_processed: context.recordsProcessed,
    records_created: context.recordsCreated,
    records_updated: context.recordsUpdated,
    records_failed: context.recordsFailed,
  });
}
