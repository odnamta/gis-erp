'use server';

// =====================================================
// v0.66: AUTOMATION LOGGING ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { AutomationLog, AutomationLogFilters, AutomationStatus } from '@/types/automation';
import { calculateExecutionTime, isValidAutomationStatus } from '@/lib/automation-utils';
import { Json } from '@/types/database';

/**
 * Creates a new automation log entry.
 */
export async function createAutomationLog(
  endpointId: string,
  executionId: string,
  triggerType: string,
  triggerData: Record<string, unknown>
): Promise<{ data: AutomationLog | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('automation_logs')
      .insert({
        endpoint_id: endpointId,
        execution_id: executionId,
        trigger_type: triggerType,
        trigger_data: triggerData as unknown as Json,
        status: 'running',
        triggered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as AutomationLog, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates an automation log with execution results.
 */
export async function updateAutomationLog(
  logId: string,
  updates: {
    status?: AutomationStatus;
    n8nExecutionId?: string;
    resultData?: Record<string, unknown>;
    errorMessage?: string;
    completedAt?: string;
  }
): Promise<{ data: AutomationLog | null; error: string | null }> {
  try {
    // Validate status if provided
    if (updates.status && !isValidAutomationStatus(updates.status)) {
      return { data: null, error: 'Invalid automation status' };
    }

    const supabase = await createClient();

    // First get the log to calculate execution time
    const { data: existingLog } = await supabase
      .from('automation_logs')
      .select('triggered_at')
      .eq('id', logId)
      .single();

    const completedAt = updates.completedAt || new Date().toISOString();
    let executionTimeMs: number | null = null;

    if (existingLog?.triggered_at && (updates.status === 'success' || updates.status === 'failed' || updates.status === 'timeout')) {
      executionTimeMs = calculateExecutionTime(existingLog.triggered_at, completedAt);
    }

    const updateData: Record<string, unknown> = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.n8nExecutionId) updateData.n8n_execution_id = updates.n8nExecutionId;
    if (updates.resultData !== undefined) updateData.result_data = updates.resultData;
    if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
    if (updates.status && updates.status !== 'running') {
      updateData.completed_at = completedAt;
      updateData.execution_time_ms = executionTimeMs;
    }

    const { data, error } = await supabase
      .from('automation_logs')
      .update(updateData)
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as AutomationLog, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets automation logs with optional filtering.
 */
export async function getAutomationLogs(
  filters?: AutomationLogFilters
): Promise<{ data: AutomationLog[]; error: string | null }> {
  try {
    const supabase = await createClient();

    let query = supabase.from('automation_logs').select('*');

    if (filters?.endpointId) {
      query = query.eq('endpoint_id', filters.endpointId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('triggered_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('triggered_at', filters.endDate);
    }

    query = query.order('triggered_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as AutomationLog[], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets a single automation log by ID.
 */
export async function getAutomationLogById(
  logId: string
): Promise<{ data: AutomationLog | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    return { data: data as AutomationLog, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets automation logs by execution ID.
 */
export async function getAutomationLogByExecutionId(
  executionId: string
): Promise<{ data: AutomationLog | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('execution_id', executionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    return { data: data as AutomationLog, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets recent logs for an endpoint.
 */
export async function getRecentLogsForEndpoint(
  endpointId: string,
  limit: number = 10
): Promise<{ data: AutomationLog[]; error: string | null }> {
  return getAutomationLogs({
    endpointId,
    limit,
  });
}

/**
 * Gets failed logs within a time period.
 */
export async function getFailedLogs(
  startDate?: string,
  endDate?: string,
  limit: number = 50
): Promise<{ data: AutomationLog[]; error: string | null }> {
  return getAutomationLogs({
    status: 'failed',
    startDate,
    endDate,
    limit,
  });
}

/**
 * Deletes old automation logs (cleanup).
 */
export async function cleanupOldLogs(
  olderThanDays: number = 90
): Promise<{ count: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from('automation_logs')
      .delete()
      .lt('triggered_at', cutoffDate.toISOString())
      .select();

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length || 0, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets log count by status for an endpoint.
 */
export async function getLogCountByStatus(
  endpointId?: string
): Promise<{ data: Record<AutomationStatus, number> | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const statuses: AutomationStatus[] = ['running', 'success', 'failed', 'timeout'];
    const counts: Record<AutomationStatus, number> = {
      running: 0,
      success: 0,
      failed: 0,
      timeout: 0,
    };

    for (const status of statuses) {
      let query = supabase
        .from('automation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      if (endpointId) {
        query = query.eq('endpoint_id', endpointId);
      }

      const { count, error } = await query;

      if (error) {
        return { data: null, error: error.message };
      }

      counts[status] = count || 0;
    }

    return { data: counts, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
