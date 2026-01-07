'use server';

// =====================================================
// v0.66: AUTOMATION STATISTICS ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { AutomationStatsResponse, EndpointMetrics } from '@/types/automation';

const DEFAULT_PERIOD_DAYS = 30;

/**
 * Gets automation statistics for a specified period.
 */
export async function getAutomationStats(
  days: number = DEFAULT_PERIOD_DAYS
): Promise<{ data: AutomationStatsResponse | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Get all logs within the period
    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('endpoint_id, status, execution_time_ms')
      .gte('triggered_at', startDate.toISOString())
      .lte('triggered_at', endDate.toISOString());

    if (logsError) {
      return { data: null, error: logsError.message };
    }

    // Get all endpoints for name mapping
    const { data: endpoints, error: endpointsError } = await supabase
      .from('webhook_endpoints')
      .select('id, endpoint_name');

    if (endpointsError) {
      return { data: null, error: endpointsError.message };
    }

    const endpointMap = new Map(endpoints?.map(e => [e.id, e.endpoint_name]) || []);

    // Calculate statistics
    const totalExecutions = logs?.length || 0;
    const successCount = logs?.filter(l => l.status === 'success').length || 0;
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

    // Calculate average execution time (only for completed executions)
    const completedLogs = logs?.filter(l => l.execution_time_ms !== null) || [];
    const totalExecutionTime = completedLogs.reduce((sum, l) => sum + (l.execution_time_ms || 0), 0);
    const avgExecutionTimeMs = completedLogs.length > 0 ? totalExecutionTime / completedLogs.length : 0;

    // Group by endpoint
    const endpointStats = new Map<string, { total: number; success: number }>();
    
    for (const log of logs || []) {
      if (!log.endpoint_id) continue;
      
      if (!endpointStats.has(log.endpoint_id)) {
        endpointStats.set(log.endpoint_id, { total: 0, success: 0 });
      }
      
      const stats = endpointStats.get(log.endpoint_id)!;
      stats.total++;
      if (log.status === 'success') {
        stats.success++;
      }
    }

    const byEndpoint = Array.from(endpointStats.entries()).map(([id, stats]) => ({
      endpoint: endpointMap.get(id) || 'Unknown',
      endpointId: id,
      count: stats.total,
      successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 1000) / 10 : 0,
    }));

    // Sort by count descending
    byEndpoint.sort((a, b) => b.count - a.count);

    return {
      data: {
        totalExecutions,
        successRate: Math.round(successRate * 10) / 10,
        avgExecutionTimeMs: Math.round(avgExecutionTimeMs),
        byEndpoint,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets metrics for a specific endpoint.
 */
export async function getEndpointMetrics(
  endpointId: string,
  days: number = DEFAULT_PERIOD_DAYS
): Promise<{ data: EndpointMetrics | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get logs for this endpoint
    const { data: logs, error } = await supabase
      .from('automation_logs')
      .select('status, execution_time_ms')
      .eq('endpoint_id', endpointId)
      .gte('triggered_at', startDate.toISOString());

    if (error) {
      return { data: null, error: error.message };
    }

    const totalTriggers = logs?.length || 0;
    const successCount = logs?.filter(l => l.status === 'success').length || 0;
    const failureCount = logs?.filter(l => l.status === 'failed' || l.status === 'timeout').length || 0;

    // Calculate average execution time
    const completedLogs = logs?.filter(l => l.execution_time_ms !== null) || [];
    const totalExecutionTime = completedLogs.reduce((sum, l) => sum + (l.execution_time_ms || 0), 0);
    const avgExecutionTime = completedLogs.length > 0 ? totalExecutionTime / completedLogs.length : 0;

    return {
      data: {
        totalTriggers,
        successCount,
        failureCount,
        avgExecutionTime: Math.round(avgExecutionTime),
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets daily execution counts for charting.
 */
export async function getDailyExecutionCounts(
  days: number = 30,
  endpointId?: string
): Promise<{ data: Array<{ date: string; total: number; success: number; failed: number }> | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('automation_logs')
      .select('triggered_at, status')
      .gte('triggered_at', startDate.toISOString());

    if (endpointId) {
      query = query.eq('endpoint_id', endpointId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    // Group by date
    const dailyCounts = new Map<string, { total: number; success: number; failed: number }>();

    for (const log of logs || []) {
      const date = new Date(log.triggered_at).toISOString().split('T')[0];
      
      if (!dailyCounts.has(date)) {
        dailyCounts.set(date, { total: 0, success: 0, failed: 0 });
      }
      
      const counts = dailyCounts.get(date)!;
      counts.total++;
      if (log.status === 'success') {
        counts.success++;
      } else if (log.status === 'failed' || log.status === 'timeout') {
        counts.failed++;
      }
    }

    // Convert to array and sort by date
    const result = Array.from(dailyCounts.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets top endpoints by execution count.
 */
export async function getTopEndpoints(
  limit: number = 5,
  days: number = DEFAULT_PERIOD_DAYS
): Promise<{ data: Array<{ endpointId: string; endpointName: string; count: number; successRate: number }> | null; error: string | null }> {
  try {
    const { data: stats, error } = await getAutomationStats(days);

    if (error || !stats) {
      return { data: null, error: error || 'Failed to get stats' };
    }

    const topEndpoints = stats.byEndpoint
      .slice(0, limit)
      .map(e => ({
        endpointId: e.endpointId,
        endpointName: e.endpoint,
        count: e.count,
        successRate: e.successRate,
      }));

    return { data: topEndpoints, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets recent failures for monitoring.
 */
export async function getRecentFailures(
  limit: number = 10
): Promise<{ data: Array<{ id: string; endpointId: string; executionId: string; errorMessage: string; triggeredAt: string }> | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from('automation_logs')
      .select('id, endpoint_id, execution_id, error_message, triggered_at')
      .in('status', ['failed', 'timeout'])
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    const result = ((logs || []) as any[]).map(log => ({
      id: log.id,
      endpointId: log.endpoint_id || '',
      executionId: log.execution_id || '',
      errorMessage: log.error_message || 'Unknown error',
      triggeredAt: log.triggered_at,
    }));

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
