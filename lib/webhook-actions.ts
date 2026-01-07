'use server';

// =====================================================
// v0.66: WEBHOOK ENDPOINT MANAGEMENT ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import {
  WebhookEndpoint,
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
  WebhookEndpointFilters,
} from '@/types/automation';
import {
  generateWebhookSecret,
  buildWebhookUrl,
  isValidTriggerType,
  isValidTriggerEvent,
} from '@/lib/automation-utils';

/**
 * Registers a new webhook endpoint.
 * Generates unique webhook URL and secret automatically.
 */
export async function registerWebhookEndpoint(
  input: CreateWebhookEndpointInput
): Promise<{ data: WebhookEndpoint | null; error: string | null }> {
  try {
    // Validate trigger type
    if (!isValidTriggerType(input.triggerType)) {
      return { data: null, error: 'Invalid trigger type. Must be one of: database_event, scheduled, manual, external' };
    }

    // Validate trigger event if provided
    if (input.triggerEvent && !isValidTriggerEvent(input.triggerEvent)) {
      return { data: null, error: 'Invalid trigger event. Must be one of: INSERT, UPDATE, DELETE' };
    }

    // For database_event triggers, require table and event
    if (input.triggerType === 'database_event') {
      if (!input.triggerTable || !input.triggerEvent) {
        return { data: null, error: 'Database event triggers require triggerTable and triggerEvent' };
      }
    }

    // For scheduled triggers, require cron expression
    if (input.triggerType === 'scheduled' && !input.cronExpression) {
      return { data: null, error: 'Scheduled triggers require cronExpression' };
    }

    const supabase = await createClient();
    const webhookSecret = generateWebhookSecret();
    const webhookUrl = buildWebhookUrl(input.endpointCode);

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        endpoint_code: input.endpointCode,
        endpoint_name: input.endpointName,
        description: input.description || null,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        trigger_type: input.triggerType,
        trigger_table: input.triggerTable || null,
        trigger_event: input.triggerEvent || null,
        trigger_conditions: input.triggerConditions as unknown as never || null,
        cron_expression: input.cronExpression || null,
        n8n_workflow_id: input.n8nWorkflowId || null,
        n8n_workflow_name: input.n8nWorkflowName || null,
        requires_auth: input.requiresAuth ?? true,
        allowed_ips: input.allowedIps || [],
      } as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as WebhookEndpoint, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets a webhook endpoint by its code.
 */
export async function getWebhookEndpoint(
  endpointCode: string
): Promise<{ data: WebhookEndpoint | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('endpoint_code', endpointCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }; // Not found
      }
      return { data: null, error: error.message };
    }

    return { data: data as WebhookEndpoint, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets a webhook endpoint by its ID.
 */
export async function getWebhookEndpointById(
  id: string
): Promise<{ data: WebhookEndpoint | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }; // Not found
      }
      return { data: null, error: error.message };
    }

    return { data: data as WebhookEndpoint, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Lists all webhook endpoints with optional filters.
 */
export async function listWebhookEndpoints(
  filters?: WebhookEndpointFilters
): Promise<{ data: WebhookEndpoint[]; error: string | null }> {
  try {
    const supabase = await createClient();

    let query = supabase.from('webhook_endpoints').select('*');

    if (filters?.triggerType) {
      query = query.eq('trigger_type', filters.triggerType);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.triggerTable) {
      query = query.eq('trigger_table', filters.triggerTable);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as WebhookEndpoint[], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates a webhook endpoint.
 */
export async function updateWebhookEndpoint(
  id: string,
  updates: UpdateWebhookEndpointInput
): Promise<{ data: WebhookEndpoint | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};

    if (updates.endpointName !== undefined) updateData.endpoint_name = updates.endpointName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.webhookUrl !== undefined) updateData.webhook_url = updates.webhookUrl;
    if (updates.n8nWorkflowId !== undefined) updateData.n8n_workflow_id = updates.n8nWorkflowId;
    if (updates.n8nWorkflowName !== undefined) updateData.n8n_workflow_name = updates.n8nWorkflowName;
    if (updates.triggerConditions !== undefined) updateData.trigger_conditions = updates.triggerConditions;
    if (updates.cronExpression !== undefined) updateData.cron_expression = updates.cronExpression;
    if (updates.requiresAuth !== undefined) updateData.requires_auth = updates.requiresAuth;
    if (updates.allowedIps !== undefined) updateData.allowed_ips = updates.allowedIps;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as WebhookEndpoint, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Toggles the active status of a webhook endpoint.
 */
export async function toggleWebhookEndpoint(
  id: string,
  isActive: boolean
): Promise<{ data: WebhookEndpoint | null; error: string | null }> {
  return updateWebhookEndpoint(id, { isActive });
}

/**
 * Deletes a webhook endpoint.
 */
export async function deleteWebhookEndpoint(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Regenerates the webhook secret for an endpoint.
 */
export async function regenerateWebhookSecret(
  id: string
): Promise<{ data: WebhookEndpoint | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const newSecret = generateWebhookSecret();

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update({ webhook_secret: newSecret })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as WebhookEndpoint, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
