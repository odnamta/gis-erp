'use server';

// app/actions/notification-template-actions.ts
// Server actions for notification template management (v0.67)

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  NotificationTemplate,
  NotificationTemplateInsert,
  NotificationTemplateUpdate,
  EventType,
} from '@/types/notification-workflows';
import { validateTemplate } from '@/lib/notification-template-utils';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type helper for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============================================================================
// Template CRUD Actions
// ============================================================================

/**
 * Get all notification templates
 */
export async function getNotificationTemplates(): Promise<{
  data: NotificationTemplate[];
  error: string | null;
}> {
  const supabase = await createClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .order('template_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NotificationTemplate[]) || [], error: null };
}

/**
 * Get active notification templates
 */
export async function getActiveNotificationTemplates(): Promise<{
  data: NotificationTemplate[];
  error: string | null;
}> {
  const supabase = await createClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('is_active', true)
    .order('template_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NotificationTemplate[]) || [], error: null };
}

/**
 * Get a notification template by ID
 */
export async function getNotificationTemplate(
  id: string
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
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
 * Get a notification template by code
 */
export async function getNotificationTemplateByCode(
  templateCode: string
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
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
 * Get templates by event type
 */
export async function getTemplatesByEventType(
  eventType: EventType
): Promise<{ data: NotificationTemplate[]; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('event_type', eventType)
    .eq('is_active', true)
    .order('template_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NotificationTemplate[]) || [], error: null };
}

/**
 * Create a new notification template
 */
export async function createNotificationTemplate(
  template: NotificationTemplateInsert
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  // Validate template
  const validation = validateTemplate(template);
  if (!validation.valid) {
    return { data: null, error: validation.error! };
  }

  const supabase = await createClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from('notification_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/admin/notification-templates');
  return { data: data as NotificationTemplate, error: null };
}

/**
 * Update a notification template
 */
export async function updateNotificationTemplate(
  id: string,
  updates: NotificationTemplateUpdate
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  // Validate updates if they contain validatable fields
  if (updates.event_type || updates.placeholders) {
    const validation = validateTemplate(updates);
    if (!validation.valid) {
      return { data: null, error: validation.error! };
    }
  }

  const supabase = await createClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from('notification_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/admin/notification-templates');
  revalidatePath(`/admin/notification-templates/${id}`);
  return { data: data as NotificationTemplate, error: null };
}

/**
 * Activate a notification template
 */
export async function activateNotificationTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
  const { error } = await supabase
    .from('notification_templates')
    .update({ is_active: true })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/notification-templates');
  return { success: true, error: null };
}

/**
 * Deactivate a notification template
 */
export async function deactivateNotificationTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
  const { error } = await supabase
    .from('notification_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/notification-templates');
  return { success: true, error: null };
}

/**
 * Delete a notification template (hard delete - use with caution)
 */
export async function deleteNotificationTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
  // Check if template is used in any logs
  const { count } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', id);

  if (count && count > 0) {
    return { 
      success: false, 
      error: 'Cannot delete template that has been used. Deactivate it instead.' 
    };
  }

  const { error } = await supabase
    .from('notification_templates')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/notification-templates');
  return { success: true, error: null };
}

/**
 * Duplicate a notification template
 */
export async function duplicateNotificationTemplate(
  id: string,
  newCode: string,
  newName: string
): Promise<{ data: NotificationTemplate | null; error: string | null }> {
  // Get original template
  const { data: original, error: fetchError } = await getNotificationTemplate(id);
  
  if (fetchError || !original) {
    return { data: null, error: fetchError || 'Template not found' };
  }

  // Create new template with modified code and name
  const newTemplate: NotificationTemplateInsert = {
    template_code: newCode,
    template_name: newName,
    event_type: original.event_type,
    email_subject: original.email_subject,
    email_body_html: original.email_body_html,
    email_body_text: original.email_body_text,
    whatsapp_template_id: original.whatsapp_template_id,
    whatsapp_body: original.whatsapp_body,
    in_app_title: original.in_app_title,
    in_app_body: original.in_app_body,
    in_app_action_url: original.in_app_action_url,
    push_title: original.push_title,
    push_body: original.push_body,
    placeholders: original.placeholders,
    is_active: false, // Start as inactive
  };

  return createNotificationTemplate(newTemplate);
}

// ============================================================================
// Template Preview Action
// ============================================================================

/**
 * Preview a template with sample data
 */
export async function previewNotificationTemplate(
  templateId: string,
  sampleData: Record<string, string>
): Promise<{
  data: {
    email?: { subject: string; body: string };
    whatsapp?: { body: string };
    in_app?: { title: string; body: string; action_url?: string };
    push?: { title: string; body: string };
  } | null;
  error: string | null;
}> {
  const { data: template, error } = await getNotificationTemplate(templateId);
  
  if (error || !template) {
    return { data: null, error: error || 'Template not found' };
  }

  const { replacePlaceholders } = await import('@/lib/notification-template-utils');

  const preview: {
    email?: { subject: string; body: string };
    whatsapp?: { body: string };
    in_app?: { title: string; body: string; action_url?: string };
    push?: { title: string; body: string };
  } = {};

  // Email preview
  if (template.email_body_html || template.email_body_text) {
    preview.email = {
      subject: template.email_subject 
        ? replacePlaceholders(template.email_subject, sampleData, template.placeholders)
        : '',
      body: replacePlaceholders(
        template.email_body_html || template.email_body_text || '',
        sampleData,
        template.placeholders
      ),
    };
  }

  // WhatsApp preview
  if (template.whatsapp_body) {
    preview.whatsapp = {
      body: replacePlaceholders(template.whatsapp_body, sampleData, template.placeholders),
    };
  }

  // In-app preview
  if (template.in_app_body) {
    preview.in_app = {
      title: template.in_app_title
        ? replacePlaceholders(template.in_app_title, sampleData, template.placeholders)
        : '',
      body: replacePlaceholders(template.in_app_body, sampleData, template.placeholders),
      action_url: template.in_app_action_url
        ? replacePlaceholders(template.in_app_action_url, sampleData, template.placeholders)
        : undefined,
    };
  }

  // Push preview
  if (template.push_body) {
    preview.push = {
      title: template.push_title
        ? replacePlaceholders(template.push_title, sampleData, template.placeholders)
        : '',
      body: replacePlaceholders(template.push_body, sampleData, template.placeholders),
    };
  }

  return { data: preview, error: null };
}
