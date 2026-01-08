/**
 * Error Tracking Service
 * Implements error tracking, status management, and queries
 * 
 * Requirements:
 * - 1.1: Capture error type, message, stack trace, timestamp
 * - 1.3: Increment occurrence count for similar errors
 * - 1.4: Store user context (user_id, session_id)
 * - 1.5: Store request context (method, path, body, params)
 * - 3.1: Support error statuses: new, investigating, resolved, ignored
 * - 3.2: Record resolution details when resolved
 * - 3.4: Allow filtering by status, module, error type, date range
 */

import { createClient } from '@/lib/supabase/client';
import type {
  ErrorStatus,
  TrackErrorParams,
  ErrorFilters,
  ErrorTracking,
  ErrorSummary,
} from '@/types/error-handling';
import { generateErrorCode } from './handler';
import type { Json, Database } from '@/types/database';

/**
 * Track an error in the database
 * If an error with the same hash exists, increment occurrence count
 * Otherwise, create a new error record
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.5
 */
export async function trackError(params: TrackErrorParams): Promise<string> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Check for existing error with same hash
  const { data: existing } = await supabase
    .from('error_tracking')
    .select('id, occurrence_count')
    .eq('error_hash', params.errorHash || '')
    .single();

  if (existing) {
    // Increment occurrence count and update last_seen_at
    await supabase
      .from('error_tracking')
      .update({
        occurrence_count: (existing.occurrence_count || 0) + 1,
        last_seen_at: now,
      })
      .eq('id', existing.id);

    return existing.id;
  }

  // Create new error record
  const errorCode = generateErrorCode();
  const { data, error } = await supabase
    .from('error_tracking')
    .insert({
      error_code: errorCode,
      error_hash: params.errorHash || '',
      timestamp: now,
      error_type: params.errorType,
      error_message: params.errorMessage,
      error_stack: params.errorStack,
      module: params.module,
      function_name: params.functionName,
      user_id: params.userId,
      session_id: params.sessionId,
      request_method: params.requestMethod,
      request_path: params.requestPath,
      request_body: params.requestBody as unknown as Json,
      request_params: params.requestParams as unknown as Json,
      environment: params.environment || 'production',
      version: params.version,
      status: 'new',
      occurrence_count: 1,
      first_seen_at: now,
      last_seen_at: now,
    } as Database['public']['Tables']['error_tracking']['Insert'])
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to track error: ${error.message}`);
  }

  return data.id;
}

/**
 * Update error status
 * Records resolution details when status is 'resolved'
 * 
 * Requirements: 3.1, 3.2
 */
export async function updateErrorStatus(
  errorId: string,
  status: ErrorStatus,
  userId: string,
  notes?: string
): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { status };

  if (status === 'resolved') {
    updateData.resolved_at = now;
    updateData.resolved_by = userId;
    if (notes) {
      updateData.resolution_notes = notes;
    }
  }

  const { error } = await supabase
    .from('error_tracking')
    .update(updateData)
    .eq('id', errorId);

  if (error) {
    throw new Error(`Failed to update error status: ${error.message}`);
  }
}

/**
 * Get errors with optional filters
 * 
 * Requirement: 3.4
 */
export async function getErrors(filters?: ErrorFilters): Promise<ErrorTracking[]> {
  const supabase = createClient();

  let query = supabase
    .from('error_tracking')
    .select('*')
    .order('last_seen_at', { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.module) {
    if (Array.isArray(filters.module)) {
      query = query.in('module', filters.module);
    } else {
      query = query.eq('module', filters.module);
    }
  }

  if (filters?.error_type) {
    if (Array.isArray(filters.error_type)) {
      query = query.in('error_type', filters.error_type);
    } else {
      query = query.eq('error_type', filters.error_type);
    }
  }

  if (filters?.from_date) {
    query = query.gte('timestamp', filters.from_date);
  }

  if (filters?.to_date) {
    query = query.lte('timestamp', filters.to_date);
  }

  if (filters?.search) {
    query = query.or(
      `error_message.ilike.%${filters.search}%,error_code.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get errors: ${error.message}`);
  }

  return (data || []) as unknown as ErrorTracking[];
}

/**
 * Get error by ID
 */
export async function getErrorById(errorId: string): Promise<ErrorTracking | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('error_tracking')
    .select('*')
    .eq('id', errorId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get error: ${error.message}`);
  }

  return data as unknown as ErrorTracking;
}

/**
 * Top recurring error type for internal use
 */
interface TopRecurringError {
  error_hash: string;
  error_message: string;
  occurrence_count: number;
}

/**
 * Get error summary for dashboard
 * 
 * Requirements: 7.1, 7.2
 */
export async function getErrorSummary(): Promise<ErrorSummary> {
  const supabase = createClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('error_tracking')
    .select('status')
    .then(({ data }) => {
      const counts: Record<ErrorStatus, number> = {
        new: 0,
        investigating: 0,
        resolved: 0,
        ignored: 0,
      };
      data?.forEach((row) => {
        const status = row.status as ErrorStatus;
        if (status in counts) {
          counts[status]++;
        }
      });
      return { data: counts, error: null };
    });

  if (statusError) {
    throw new Error(`Failed to get error summary: ${statusError}`);
  }

  // Get top recurring errors
  const { data: topErrors, error: topError } = await supabase
    .from('error_tracking')
    .select('error_hash, error_type, error_message, module, occurrence_count, first_seen_at, last_seen_at, status')
    .order('occurrence_count', { ascending: false })
    .limit(10);

  if (topError) {
    throw new Error(`Failed to get top errors: ${topError.message}`);
  }

  // Get errors today
  const { count: errorsToday } = await supabase
    .from('error_tracking')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', todayStart);

  // Get errors this week
  const { count: errorsThisWeek } = await supabase
    .from('error_tracking')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', weekStart);

  // Get errors this month
  const { count: errorsThisMonth } = await supabase
    .from('error_tracking')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', monthStart);

  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const resolvedCount = statusCounts.resolved || 0;
  const resolutionRate = total > 0 ? (resolvedCount / total) * 100 : 0;

  return {
    total,
    by_status: statusCounts,
    top_errors: (topErrors || []) as unknown as ErrorSummary['top_errors'],
    errors_today: errorsToday || 0,
    errors_this_week: errorsThisWeek || 0,
    errors_this_month: errorsThisMonth || 0,
    resolution_rate: Math.round(resolutionRate * 100) / 100,
  };
}

/**
 * Get error by hash
 */
export async function getErrorByHash(errorHash: string): Promise<ErrorTracking | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('error_tracking')
    .select('*')
    .eq('error_hash', errorHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get error by hash: ${error.message}`);
  }

  return data as unknown as ErrorTracking;
}

/**
 * Bulk update error status
 */
export async function bulkUpdateErrorStatus(
  errorIds: string[],
  status: ErrorStatus,
  userId: string,
  notes?: string
): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { status };

  if (status === 'resolved') {
    updateData.resolved_at = now;
    updateData.resolved_by = userId;
    if (notes) {
      updateData.resolution_notes = notes;
    }
  }

  const { error } = await supabase
    .from('error_tracking')
    .update(updateData)
    .in('id', errorIds);

  if (error) {
    throw new Error(`Failed to bulk update error status: ${error.message}`);
  }
}
