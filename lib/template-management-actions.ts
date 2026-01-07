'use server';

// =====================================================
// v0.66: AUTOMATION TEMPLATE MANAGEMENT ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import {
  AutomationTemplate,
  CreateAutomationTemplateInput,
  TemplateFilters,
  TemplateCategory,
} from '@/types/automation';
import { isValidTemplateCategory } from '@/lib/automation-utils';

/**
 * Lists all automation templates with optional filtering.
 */
export async function listAutomationTemplates(
  filters?: TemplateFilters
): Promise<{ data: AutomationTemplate[]; error: string | null }> {
  try {
    const supabase = await createClient();

    let query = supabase.from('automation_templates').select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as AutomationTemplate[], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets an automation template by its code.
 */
export async function getAutomationTemplate(
  templateCode: string
): Promise<{ data: AutomationTemplate | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('template_code', templateCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }; // Not found
      }
      return { data: null, error: error.message };
    }

    return { data: data as AutomationTemplate, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets an automation template by its ID.
 */
export async function getAutomationTemplateById(
  id: string
): Promise<{ data: AutomationTemplate | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }; // Not found
      }
      return { data: null, error: error.message };
    }

    return { data: data as AutomationTemplate, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Creates a new automation template.
 */
export async function createAutomationTemplate(
  input: CreateAutomationTemplateInput
): Promise<{ data: AutomationTemplate | null; error: string | null }> {
  try {
    // Validate category
    if (!isValidTemplateCategory(input.category)) {
      return {
        data: null,
        error: 'Invalid category. Must be one of: notification, document, integration, data_sync, reporting',
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('automation_templates')
      .insert({
        template_code: input.templateCode,
        template_name: input.templateName,
        description: input.description || null,
        category: input.category,
        workflow_json: input.workflowJson as unknown as never || null,
        required_credentials: input.requiredCredentials || [],
        config_schema: input.configSchema as unknown as never || null,
      } as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as AutomationTemplate, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates an automation template.
 */
export async function updateAutomationTemplate(
  id: string,
  updates: Partial<Omit<CreateAutomationTemplateInput, 'templateCode'>> & { isActive?: boolean }
): Promise<{ data: AutomationTemplate | null; error: string | null }> {
  try {
    // Validate category if provided
    if (updates.category && !isValidTemplateCategory(updates.category)) {
      return {
        data: null,
        error: 'Invalid category. Must be one of: notification, document, integration, data_sync, reporting',
      };
    }

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (updates.templateName !== undefined) updateData.template_name = updates.templateName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.workflowJson !== undefined) updateData.workflow_json = updates.workflowJson;
    if (updates.requiredCredentials !== undefined) updateData.required_credentials = updates.requiredCredentials;
    if (updates.configSchema !== undefined) updateData.config_schema = updates.configSchema;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('automation_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as AutomationTemplate, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Deletes an automation template.
 */
export async function deleteAutomationTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('automation_templates')
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
 * Toggles the active status of a template.
 */
export async function toggleAutomationTemplate(
  id: string,
  isActive: boolean
): Promise<{ data: AutomationTemplate | null; error: string | null }> {
  return updateAutomationTemplate(id, { isActive });
}

/**
 * Gets templates by category.
 */
export async function getTemplatesByCategory(
  category: TemplateCategory
): Promise<{ data: AutomationTemplate[]; error: string | null }> {
  return listAutomationTemplates({ category, isActive: true });
}

/**
 * Exports a template's workflow JSON.
 */
export async function exportTemplateWorkflow(
  templateCode: string
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  try {
    const { data: template, error } = await getAutomationTemplate(templateCode);

    if (error) {
      return { data: null, error };
    }

    if (!template) {
      return { data: null, error: 'Template not found' };
    }

    if (!template.workflow_json) {
      return { data: null, error: 'Template has no workflow JSON' };
    }

    return { data: template.workflow_json, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
