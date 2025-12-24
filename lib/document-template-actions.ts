'use server'

/**
 * Document Template Server Actions
 * CRUD operations for document templates in the n8n Document Generation module (v0.68)
 * Requirements: 1.1, 1.4, 1.5, 1.6
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  DocumentTemplate,
  DocumentType,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  MarginSettings,
} from '@/types/document-generation'
import {
  validateTemplateForCreate,
  validateTemplate,
  applyTemplateDefaults,
  extractAvailableVariables,
} from '@/lib/document-template-utils'

// Result types for actions
interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Type for Supabase client with any table access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any

/**
 * Creates a new document template
 * Requirement 1.1: Store templates with unique template_code identifiers
 * 
 * @param input - Template creation data
 * @returns Result with created template or error
 */
export async function createTemplate(
  input: CreateTemplateInput
): Promise<ActionResult<DocumentTemplate>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    // Apply defaults and validate
    const templateData = applyTemplateDefaults(input)
    const validation = validateTemplateForCreate(templateData)
    
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') }
    }

    // Check for duplicate template_code
    const { data: existing } = await supabase
      .from('document_templates')
      .select('id')
      .eq('template_code', templateData.template_code)
      .single()

    if (existing) {
      return { success: false, error: 'Template code already exists' }
    }

    // Extract variables from template if not provided
    const availableVariables = templateData.available_variables?.length 
      ? templateData.available_variables 
      : extractAvailableVariables(templateData.html_template)

    // Insert template
    const { data: template, error } = await supabase
      .from('document_templates')
      .insert({
        template_code: templateData.template_code,
        template_name: templateData.template_name,
        document_type: templateData.document_type,
        html_template: templateData.html_template,
        css_styles: templateData.css_styles ?? null,
        page_size: templateData.page_size ?? 'A4',
        orientation: templateData.orientation ?? 'portrait',
        margins: templateData.margins ?? { top: 20, right: 20, bottom: 20, left: 20 },
        header_html: templateData.header_html ?? null,
        footer_html: templateData.footer_html ?? null,
        include_letterhead: templateData.include_letterhead ?? true,
        available_variables: availableVariables,
        is_active: templateData.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/document-templates')
    return { 
      success: true, 
      data: mapDbTemplateToTemplate(template) 
    }
  } catch (error) {
    console.error('Error in createTemplate:', error)
    return { success: false, error: 'Failed to create template' }
  }
}

/**
 * Updates an existing document template
 * Requirement 1.4: Return all template properties when retrieved
 * 
 * @param id - Template ID
 * @param input - Template update data
 * @returns Result with success status or error
 */
export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput
): Promise<ActionResult<DocumentTemplate>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    // Check template exists
    const { data: existing } = await supabase
      .from('document_templates')
      .select('id, template_code')
      .eq('id', id)
      .single()

    if (!existing) {
      return { success: false, error: 'Template not found' }
    }

    // Validate update data
    const validation = validateTemplate(input)
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') }
    }

    // If updating template_code, check for duplicates
    if (input.template_code && input.template_code !== existing.template_code) {
      const { data: duplicate } = await supabase
        .from('document_templates')
        .select('id')
        .eq('template_code', input.template_code)
        .neq('id', id)
        .single()

      if (duplicate) {
        return { success: false, error: 'Template code already exists' }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    
    if (input.template_code !== undefined) updateData.template_code = input.template_code
    if (input.template_name !== undefined) updateData.template_name = input.template_name
    if (input.document_type !== undefined) updateData.document_type = input.document_type
    if (input.html_template !== undefined) {
      updateData.html_template = input.html_template
      // Re-extract variables when template changes
      if (!input.available_variables) {
        updateData.available_variables = extractAvailableVariables(input.html_template)
      }
    }
    if (input.css_styles !== undefined) updateData.css_styles = input.css_styles
    if (input.page_size !== undefined) updateData.page_size = input.page_size
    if (input.orientation !== undefined) updateData.orientation = input.orientation
    if (input.margins !== undefined) updateData.margins = input.margins
    if (input.header_html !== undefined) updateData.header_html = input.header_html
    if (input.footer_html !== undefined) updateData.footer_html = input.footer_html
    if (input.include_letterhead !== undefined) updateData.include_letterhead = input.include_letterhead
    if (input.available_variables !== undefined) updateData.available_variables = input.available_variables
    if (input.is_active !== undefined) updateData.is_active = input.is_active

    // Update template
    const { data: template, error } = await supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/document-templates')
    revalidatePath(`/settings/document-templates/${id}`)
    return { 
      success: true, 
      data: mapDbTemplateToTemplate(template) 
    }
  } catch (error) {
    console.error('Error in updateTemplate:', error)
    return { success: false, error: 'Failed to update template' }
  }
}

/**
 * Gets a template by ID
 * Requirement 1.4: Return all template properties
 * 
 * @param id - Template ID
 * @returns Result with template or error
 */
export async function getTemplate(
  id: string
): Promise<ActionResult<DocumentTemplate>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Template not found' }
      }
      console.error('Error fetching template:', error)
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      data: mapDbTemplateToTemplate(template) 
    }
  } catch (error) {
    console.error('Error in getTemplate:', error)
    return { success: false, error: 'Failed to fetch template' }
  }
}

/**
 * Gets a template by template_code
 * Requirement 1.1: Templates have unique template_code identifiers
 * 
 * @param code - Template code
 * @returns Result with template or error
 */
export async function getTemplateByCode(
  code: string
): Promise<ActionResult<DocumentTemplate>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_code', code)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Template not found' }
      }
      console.error('Error fetching template by code:', error)
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      data: mapDbTemplateToTemplate(template) 
    }
  } catch (error) {
    console.error('Error in getTemplateByCode:', error)
    return { success: false, error: 'Failed to fetch template' }
  }
}

/**
 * Lists templates with optional filters
 * Requirement 1.5: Allow templates to be activated or deactivated
 * Requirement 1.6: Filter by document_type when specified
 * 
 * @param filters - Optional filters for document_type and is_active
 * @returns Result with templates array or error
 */
export async function listTemplates(
  filters?: TemplateFilters
): Promise<ActionResult<DocumentTemplate[]>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    let query = supabase
      .from('document_templates')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type)
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error listing templates:', error)
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      data: (templates || []).map(mapDbTemplateToTemplate) 
    }
  } catch (error) {
    console.error('Error in listTemplates:', error)
    return { success: false, error: 'Failed to list templates' }
  }
}

/**
 * Lists only active templates
 * Convenience function for document generation
 * 
 * @param documentType - Optional document type filter
 * @returns Result with active templates array or error
 */
export async function listActiveTemplates(
  documentType?: DocumentType
): Promise<ActionResult<DocumentTemplate[]>> {
  return listTemplates({ 
    is_active: true, 
    document_type: documentType 
  })
}

/**
 * Deletes a template (hard delete)
 * Note: Consider using deactivateTemplate for soft delete
 * 
 * @param id - Template ID
 * @returns Result with success status or error
 */
export async function deleteTemplate(
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    // Check if template exists
    const { data: existing } = await supabase
      .from('document_templates')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return { success: false, error: 'Template not found' }
    }

    // Check if template is used by any generated documents
    const { data: usedBy } = await supabase
      .from('generated_documents')
      .select('id')
      .eq('template_id', id)
      .limit(1)
      .single()

    if (usedBy) {
      return { 
        success: false, 
        error: 'Cannot delete template that has been used to generate documents. Deactivate it instead.' 
      }
    }

    // Delete template
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/document-templates')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteTemplate:', error)
    return { success: false, error: 'Failed to delete template' }
  }
}

/**
 * Deactivates a template (soft delete)
 * Requirement 1.5: Allow templates to be deactivated
 * 
 * @param id - Template ID
 * @returns Result with success status or error
 */
export async function deactivateTemplate(
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { error } = await supabase
      .from('document_templates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deactivating template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/document-templates')
    return { success: true }
  } catch (error) {
    console.error('Error in deactivateTemplate:', error)
    return { success: false, error: 'Failed to deactivate template' }
  }
}

/**
 * Activates a template
 * Requirement 1.5: Allow templates to be activated
 * 
 * @param id - Template ID
 * @returns Result with success status or error
 */
export async function activateTemplate(
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { error } = await supabase
      .from('document_templates')
      .update({ is_active: true })
      .eq('id', id)

    if (error) {
      console.error('Error activating template:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/document-templates')
    return { success: true }
  } catch (error) {
    console.error('Error in activateTemplate:', error)
    return { success: false, error: 'Failed to activate template' }
  }
}

/**
 * Maps database template row to DocumentTemplate type
 * Handles JSON parsing for margins and available_variables
 */
function mapDbTemplateToTemplate(dbTemplate: Record<string, unknown>): DocumentTemplate {
  return {
    id: dbTemplate.id as string,
    template_code: dbTemplate.template_code as string,
    template_name: dbTemplate.template_name as string,
    document_type: dbTemplate.document_type as DocumentType,
    html_template: dbTemplate.html_template as string,
    css_styles: dbTemplate.css_styles as string | null,
    page_size: (dbTemplate.page_size as string) as 'A4' | 'Letter' | 'Legal',
    orientation: (dbTemplate.orientation as string) as 'portrait' | 'landscape',
    margins: (dbTemplate.margins as MarginSettings) ?? { top: 20, right: 20, bottom: 20, left: 20 },
    header_html: dbTemplate.header_html as string | null,
    footer_html: dbTemplate.footer_html as string | null,
    include_letterhead: dbTemplate.include_letterhead as boolean,
    available_variables: (dbTemplate.available_variables as string[]) ?? [],
    is_active: dbTemplate.is_active as boolean,
    created_at: dbTemplate.created_at as string,
  }
}
