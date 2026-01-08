// lib/notification-template-utils.ts
// Template management utilities for n8n Notification Workflows (v0.67)

import { createClient } from '@/lib/supabase/client';
import type {
  NotificationTemplate,
  NotificationTemplateInsert,
  NotificationTemplateUpdate,
  EventType,
  PlaceholderDefinition,
  NotificationChannel,
  RenderTemplateInput,
  RenderedNotification,
} from '@/types/notification-workflows';
import type { Json } from '@/types/database';

// ============================================================================
// Template CRUD Operations
// ============================================================================

/**
 * Get a template by its unique code
 */
export async function getTemplateByCode(
  templateCode: string
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('template_code', templateCode)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationTemplate | null, error: null };
}

/**
 * Get a template by ID
 */
export async function getTemplateById(
  id: string
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationTemplate | null, error: null };
}

/**
 * Get all active templates
 */
export async function getActiveTemplates(): Promise<{
  data: NotificationTemplate[];
  error: string | null;
}> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('is_active', true)
    .order('template_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as unknown as NotificationTemplate[]) || [], error: null };
}

/**
 * Get all templates (including inactive)
 */
export async function getAllTemplates(): Promise<{
  data: NotificationTemplate[];
  error: string | null;
}> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .order('template_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as unknown as NotificationTemplate[]) || [], error: null };
}

/**
 * Get templates by event type
 */
export async function getTemplatesByEventType(
  eventType: EventType
): Promise<{ data: NotificationTemplate[]; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('event_type', eventType)
    .eq('is_active', true)
    .order('template_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as unknown as NotificationTemplate[]) || [], error: null };
}

/**
 * Create a new notification template
 */
export async function createTemplate(
  template: NotificationTemplateInsert
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  const validation = validateTemplate(template);
  if (!validation.valid) {
    return { data: null, error: validation.error! };
  }

  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_templates')
    .insert({
      ...template,
      placeholders: template.placeholders as unknown as Json,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as NotificationTemplate, error: null };
}

/**
 * Update an existing notification template
 */
export async function updateTemplate(
  id: string,
  updates: NotificationTemplateUpdate
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_templates')
    .update({
      ...updates,
      placeholders: updates.placeholders as unknown as Json,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as NotificationTemplate, error: null };
}

/**
 * Deactivate a template (soft delete)
 */
export async function deactivateTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notification_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Activate a template
 */
export async function activateTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notification_templates')
    .update({ is_active: true })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============================================================================
// Template Validation
// ============================================================================

export interface TemplateValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate a template before creation/update
 */
export function validateTemplate(
  template: NotificationTemplateInsert | NotificationTemplateUpdate
): TemplateValidationResult {
  const warnings: string[] = [];

  // Check required fields for insert
  if ('template_code' in template) {
    if (!template.template_code || template.template_code.trim() === '') {
      return { valid: false, error: 'Template code is required' };
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(template.template_code)) {
      return { valid: false, error: 'Template code must be uppercase alphanumeric with underscores, starting with a letter' };
    }
  }

  if ('template_name' in template && template.template_name !== undefined) {
    if (!template.template_name || template.template_name.trim() === '') {
      return { valid: false, error: 'Template name is required' };
    }
  }

  if ('event_type' in template && template.event_type !== undefined) {
    const validEventTypes: EventType[] = [
      'job_order.assigned',
      'job_order.status_changed',
      'invoice.sent',
      'invoice.overdue',
      'incident.created',
      'document.expiring',
      'maintenance.due',
      'approval.required',
    ];
    if (!validEventTypes.includes(template.event_type)) {
      return { valid: false, error: `Invalid event type: ${template.event_type}` };
    }
  }

  // Check that at least one channel has content
  const hasEmailContent = template.email_subject || template.email_body_html || template.email_body_text;
  const hasWhatsAppContent = template.whatsapp_body || template.whatsapp_template_id;
  const hasInAppContent = template.in_app_title || template.in_app_body;
  const hasPushContent = template.push_title || template.push_body;

  if (!hasEmailContent && !hasWhatsAppContent && !hasInAppContent && !hasPushContent) {
    warnings.push('Template has no content for any channel');
  }

  // Validate placeholders if provided
  if (template.placeholders) {
    for (const placeholder of template.placeholders) {
      if (!placeholder.key || placeholder.key.trim() === '') {
        return { valid: false, error: 'Placeholder key cannot be empty' };
      }
      if (!/^[a-z][a-z0-9_]*$/.test(placeholder.key)) {
        return { valid: false, error: `Invalid placeholder key: ${placeholder.key}. Must be lowercase alphanumeric with underscores.` };
      }
    }
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

// ============================================================================
// Placeholder Replacement Engine
// ============================================================================

/**
 * Replace placeholders in a template string with data values
 * Pattern: {{key}} or {{key|default_value}}
 */
export function replacePlaceholders(
  templateString: string,
  data: Record<string, string>,
  placeholderDefinitions?: PlaceholderDefinition[]
): string {
  if (!templateString) return '';

  // Build a map of default values from placeholder definitions
  const defaults: Record<string, string> = {};
  if (placeholderDefinitions) {
    for (const def of placeholderDefinitions) {
      if (def.default_value !== undefined) {
        defaults[def.key] = def.default_value;
      }
    }
  }

  // Replace {{key}} or {{key|default}} patterns
  return templateString.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
    const parts = content.split('|');
    const key = parts[0].trim();
    const inlineDefault = parts[1]?.trim();

    // Priority: data value > inline default > definition default > unchanged
    if (key in data) {
      return data[key];
    }
    if (inlineDefault !== undefined) {
      return inlineDefault;
    }
    if (key in defaults) {
      return defaults[key];
    }
    // Leave unchanged if no value or default
    return match;
  });
}

/**
 * Extract all placeholder keys from a template string
 */
export function extractPlaceholderKeys(templateString: string): string[] {
  if (!templateString) return [];

  const matches = templateString.matchAll(/\{\{([^}|]+)(?:\|[^}]*)?\}\}/g);
  const keys = new Set<string>();
  
  for (const match of matches) {
    keys.add(match[1].trim());
  }
  
  return Array.from(keys);
}

/**
 * Check if all placeholders in a template are accounted for (have data or defaults)
 */
export function validatePlaceholderData(
  template: NotificationTemplate,
  data: Record<string, string>
): { valid: boolean; missingKeys: string[] } {
  // Collect all template strings
  const templateStrings = [
    template.email_subject,
    template.email_body_html,
    template.email_body_text,
    template.whatsapp_body,
    template.in_app_title,
    template.in_app_body,
    template.in_app_action_url,
    template.push_title,
    template.push_body,
  ].filter(Boolean) as string[];

  // Extract all placeholder keys
  const allKeys = new Set<string>();
  for (const str of templateStrings) {
    for (const key of extractPlaceholderKeys(str)) {
      allKeys.add(key);
    }
  }

  // Build defaults map
  const defaults = new Set<string>();
  if (template.placeholders) {
    for (const def of template.placeholders) {
      if (def.default_value !== undefined) {
        defaults.add(def.key);
      }
    }
  }

  // Check which keys are missing
  const missingKeys: string[] = [];
  for (const key of allKeys) {
    if (!(key in data) && !defaults.has(key)) {
      missingKeys.push(key);
    }
  }

  return { valid: missingKeys.length === 0, missingKeys };
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render a notification template for a specific channel
 */
export function renderTemplate(input: RenderTemplateInput): RenderedNotification | null {
  const { template, data, channel } = input;

  switch (channel) {
    case 'email':
      if (!template.email_body_html && !template.email_body_text) {
        return null;
      }
      return {
        channel: 'email',
        subject: template.email_subject
          ? replacePlaceholders(template.email_subject, data, template.placeholders)
          : undefined,
        body: replacePlaceholders(
          template.email_body_html || template.email_body_text || '',
          data,
          template.placeholders
        ),
      };

    case 'whatsapp':
      if (!template.whatsapp_body) {
        return null;
      }
      return {
        channel: 'whatsapp',
        body: replacePlaceholders(template.whatsapp_body, data, template.placeholders),
        template_id: template.whatsapp_template_id || undefined,
      };

    case 'in_app':
      if (!template.in_app_body) {
        return null;
      }
      return {
        channel: 'in_app',
        title: template.in_app_title
          ? replacePlaceholders(template.in_app_title, data, template.placeholders)
          : undefined,
        body: replacePlaceholders(template.in_app_body, data, template.placeholders),
        action_url: template.in_app_action_url
          ? replacePlaceholders(template.in_app_action_url, data, template.placeholders)
          : undefined,
      };

    case 'push':
      if (!template.push_body) {
        return null;
      }
      return {
        channel: 'push',
        title: template.push_title
          ? replacePlaceholders(template.push_title, data, template.placeholders)
          : undefined,
        body: replacePlaceholders(template.push_body, data, template.placeholders),
      };

    default:
      return null;
  }
}

/**
 * Render a template for all available channels
 */
export function renderTemplateAllChannels(
  template: NotificationTemplate,
  data: Record<string, string>
): RenderedNotification[] {
  const channels: NotificationChannel[] = ['email', 'whatsapp', 'in_app', 'push'];
  const results: RenderedNotification[] = [];

  for (const channel of channels) {
    const rendered = renderTemplate({ template, data, channel });
    if (rendered) {
      results.push(rendered);
    }
  }

  return results;
}

/**
 * Check which channels a template supports (has content for)
 */
export function getTemplateSupportedChannels(template: NotificationTemplate): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  if (template.email_body_html || template.email_body_text) {
    channels.push('email');
  }
  if (template.whatsapp_body) {
    channels.push('whatsapp');
  }
  if (template.in_app_body) {
    channels.push('in_app');
  }
  if (template.push_body) {
    channels.push('push');
  }

  return channels;
}
