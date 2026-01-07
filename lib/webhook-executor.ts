'use server';

// =====================================================
// v0.66: WEBHOOK EXECUTION LOGIC
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { WebhookEndpoint, AutomationLog, WebhookPayload } from '@/types/automation';
import { generateExecutionId, calculateExecutionTime } from '@/lib/automation-utils';

interface TriggerResult {
  success: boolean;
  executionId: string;
  error?: string;
}

interface WebhookResponse {
  status: number;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Validates that an endpoint exists and is active.
 */
export async function validateEndpoint(
  endpointCode: string
): Promise<{ valid: boolean; endpoint: WebhookEndpoint | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('endpoint_code', endpointCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, endpoint: null, error: `Endpoint ${endpointCode} not found` };
      }
      return { valid: false, endpoint: null, error: error.message };
    }

    const endpoint = data as WebhookEndpoint;

    if (!endpoint.is_active) {
      return { valid: false, endpoint, error: `Endpoint ${endpointCode} is inactive` };
    }

    return { valid: true, endpoint, error: null };
  } catch (err) {
    return { valid: false, endpoint: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Creates an automation log entry for tracking execution.
 */
async function createExecutionLog(
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
        trigger_data: triggerData as unknown as never,
        status: 'running',
        triggered_at: new Date().toISOString(),
      } as never)
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
 * Updates an automation log with the execution result.
 */
async function updateExecutionLog(
  logId: string,
  status: 'success' | 'failed' | 'timeout',
  resultData?: Record<string, unknown>,
  errorMessage?: string,
  triggeredAt?: string
): Promise<{ data: AutomationLog | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const completedAt = new Date().toISOString();
    
    let executionTimeMs: number | null = null;
    if (triggeredAt) {
      executionTimeMs = calculateExecutionTime(triggeredAt, completedAt);
    }

    const { data, error } = await supabase
      .from('automation_logs')
      .update({
        status,
        result_data: (resultData || null) as unknown as never,
        error_message: errorMessage || null,
        completed_at: completedAt,
        execution_time_ms: executionTimeMs,
      })
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
 * Sends the actual HTTP request to the webhook URL.
 */
export async function sendWebhookRequest(
  webhookUrl: string,
  webhookSecret: string | null,
  payload: WebhookPayload
): Promise<WebhookResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        status: response.status,
        error: `Webhook returned ${response.status}: ${response.statusText}`,
      };
    }

    let data: Record<string, unknown> | undefined;
    try {
      data = await response.json();
    } catch {
      // Response might not be JSON
      data = { message: 'Success' };
    }

    return { status: response.status, data };
  } catch (err) {
    return {
      status: 0,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Handles the webhook response and updates the log accordingly.
 */
export async function handleWebhookResponse(
  logId: string,
  response: WebhookResponse,
  triggeredAt: string
): Promise<{ data: AutomationLog | null; error: string | null }> {
  if (response.status >= 200 && response.status < 300) {
    return updateExecutionLog(logId, 'success', response.data, undefined, triggeredAt);
  } else {
    return updateExecutionLog(logId, 'failed', undefined, response.error, triggeredAt);
  }
}

/**
 * Triggers a webhook manually with the given payload.
 */
export async function triggerWebhook(
  endpointCode: string,
  payload: Record<string, unknown>
): Promise<TriggerResult> {
  const executionId = generateExecutionId();

  // Validate endpoint
  const validation = await validateEndpoint(endpointCode);
  if (!validation.valid || !validation.endpoint) {
    return {
      success: false,
      executionId,
      error: validation.error || 'Endpoint validation failed',
    };
  }

  const endpoint = validation.endpoint;

  // Check if webhook URL is configured
  if (!endpoint.webhook_url) {
    return {
      success: false,
      executionId,
      error: 'Webhook URL not configured for this endpoint',
    };
  }

  // Create execution log
  const { data: log, error: logError } = await createExecutionLog(
    endpoint.id,
    executionId,
    'manual',
    payload
  );

  if (logError || !log) {
    return {
      success: false,
      executionId,
      error: logError || 'Failed to create execution log',
    };
  }

  // Build webhook payload
  const webhookPayload: WebhookPayload = {
    event_type: endpointCode,
    execution_id: executionId,
    timestamp: new Date().toISOString(),
    data: {
      table_name: endpoint.trigger_table || 'manual',
      operation: 'INSERT',
      new_data: payload,
      old_data: null,
    },
  };

  // Send webhook request
  const response = await sendWebhookRequest(
    endpoint.webhook_url,
    endpoint.webhook_secret,
    webhookPayload
  );

  // Handle response and update log
  await handleWebhookResponse(log.id, response, log.triggered_at);

  // Update endpoint stats
  const supabase = await createClient();
  await supabase
    .from('webhook_endpoints')
    .update({
      last_triggered_at: new Date().toISOString(),
      trigger_count: endpoint.trigger_count + 1,
    })
    .eq('id', endpoint.id);

  return {
    success: response.status >= 200 && response.status < 300,
    executionId,
    error: response.error,
  };
}

/**
 * Triggers a webhook from an event queue item.
 */
export async function triggerWebhookFromEvent(
  eventType: string,
  eventSource: string,
  payload: Record<string, unknown>
): Promise<TriggerResult> {
  const executionId = generateExecutionId();

  // Validate endpoint
  const validation = await validateEndpoint(eventType);
  if (!validation.valid || !validation.endpoint) {
    return {
      success: false,
      executionId,
      error: validation.error || 'Endpoint validation failed',
    };
  }

  const endpoint = validation.endpoint;

  // Check if webhook URL is configured
  if (!endpoint.webhook_url) {
    return {
      success: false,
      executionId,
      error: 'Webhook URL not configured for this endpoint',
    };
  }

  // Create execution log
  const { data: log, error: logError } = await createExecutionLog(
    endpoint.id,
    executionId,
    'database_event',
    payload
  );

  if (logError || !log) {
    return {
      success: false,
      executionId,
      error: logError || 'Failed to create execution log',
    };
  }

  // The payload from event_queue already has the structure we need
  const webhookPayload: WebhookPayload = {
    event_type: eventType,
    execution_id: executionId,
    timestamp: new Date().toISOString(),
    data: {
      table_name: eventSource,
      operation: (payload.event_type as 'INSERT' | 'UPDATE' | 'DELETE') || 'INSERT',
      new_data: (payload.data as Record<string, unknown>) || payload,
      old_data: (payload.old_data as Record<string, unknown>) || null,
    },
  };

  // Send webhook request
  const response = await sendWebhookRequest(
    endpoint.webhook_url,
    endpoint.webhook_secret,
    webhookPayload
  );

  // Handle response and update log
  await handleWebhookResponse(log.id, response, log.triggered_at);

  return {
    success: response.status >= 200 && response.status < 300,
    executionId,
    error: response.error,
  };
}
