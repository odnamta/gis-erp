'use server';

// =====================================================
// v0.55: CUSTOMS - DOCUMENT TEMPLATES Server Actions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  CustomsDocumentTemplate,
  GeneratedCustomsDocument,
  GeneratedDocumentWithRelations,
  TemplateFormData,
  GenerateDocumentFormData,
  GeneratedDocumentStatus,
  TemplateFilters,
  GeneratedDocumentFilters,
  PlaceholderDefinition,
} from '@/types/customs-templates';
import {
  validateTemplateFormData,
  validatePlaceholders,
  resolvePlaceholders,
  fillTemplate,
  isValidDocumentStatus,
} from '@/lib/template-utils';
import { DOCUMENT_STATUS_TRANSITIONS } from '@/types/customs-templates';
import type { PIBDocument } from '@/types/pib';
import type { PEBDocument } from '@/types/peb';

// =====================================================
// Template Actions
// =====================================================

/**
 * Creates a new document template
 */
export async function createTemplate(
  data: TemplateFormData
): Promise<{ success: boolean; template?: CustomsDocumentTemplate; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Validate form data
    const validation = validateTemplateFormData(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0]?.message || 'Validation failed' };
    }
    
    // Validate placeholders match HTML
    const placeholderValidation = validatePlaceholders(data.template_html, data.placeholders);
    if (!placeholderValidation.valid) {
      return { 
        success: false, 
        error: `Undefined placeholders: ${placeholderValidation.missing.join(', ')}` 
      };
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get user profile (FK references user_profiles.id, not auth UUID)
    const { data: tplProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user?.id || '')
      .single();

    // Check for duplicate template_code
    const { data: existing } = await supabase
      .from('customs_document_templates')
      .select('id')
      .eq('template_code', data.template_code)
      .single();
    
    if (existing) {
      return { success: false, error: 'Template code already exists' };
    }
    
    // Insert template
    const { data: template, error } = await supabase
      .from('customs_document_templates')
      .insert({
        template_code: data.template_code,
        template_name: data.template_name,
        description: data.description || null,
        document_type: data.document_type,
        template_html: data.template_html,
        placeholders: data.placeholders as unknown as never,
        paper_size: data.paper_size,
        orientation: data.orientation,
        include_company_header: data.include_company_header,
        created_by: tplProfile?.id || null,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/templates');
    return { success: true, template: template as unknown as CustomsDocumentTemplate };
  } catch (error) {
    console.error('Error in createTemplate:', error);
    return { success: false, error: 'Failed to create template' };
  }
}

/**
 * Updates an existing template
 */
export async function updateTemplate(
  id: string,
  data: Partial<TemplateFormData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Check template exists
    const { data: existing } = await supabase
      .from('customs_document_templates')
      .select('id, template_code')
      .eq('id', id)
      .single();
    
    if (!existing) {
      return { success: false, error: 'Template not found' };
    }
    
    // If updating template_code, check for duplicates
    if (data.template_code && data.template_code !== existing.template_code) {
      const { data: duplicate } = await supabase
        .from('customs_document_templates')
        .select('id')
        .eq('template_code', data.template_code)
        .neq('id', id)
        .single();
      
      if (duplicate) {
        return { success: false, error: 'Template code already exists' };
      }
    }
    
    // Validate placeholders if both HTML and placeholders are provided
    if (data.template_html && data.placeholders) {
      const placeholderValidation = validatePlaceholders(data.template_html, data.placeholders);
      if (!placeholderValidation.valid) {
        return { 
          success: false, 
          error: `Undefined placeholders: ${placeholderValidation.missing.join(', ')}` 
        };
      }
    }
    
    // Update template
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.template_code) updateData.template_code = data.template_code;
    if (data.template_name) updateData.template_name = data.template_name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.document_type) updateData.document_type = data.document_type;
    if (data.template_html) updateData.template_html = data.template_html;
    if (data.placeholders) updateData.placeholders = data.placeholders;
    if (data.paper_size) updateData.paper_size = data.paper_size;
    if (data.orientation) updateData.orientation = data.orientation;
    if (data.include_company_header !== undefined) updateData.include_company_header = data.include_company_header;
    
    const { error } = await supabase
      .from('customs_document_templates')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating template:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/templates');
    revalidatePath(`/customs/templates/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateTemplate:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

/**
 * Deactivates a template (soft delete)
 */
export async function deactivateTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('customs_document_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Error deactivating template:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/templates');
    return { success: true };
  } catch (error) {
    console.error('Error in deactivateTemplate:', error);
    return { success: false, error: 'Failed to deactivate template' };
  }
}

/**
 * Activates a template
 */
export async function activateTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('customs_document_templates')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Error activating template:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/templates');
    return { success: true };
  } catch (error) {
    console.error('Error in activateTemplate:', error);
    return { success: false, error: 'Failed to activate template' };
  }
}

/**
 * Gets all templates with optional filters
 */
export async function getTemplates(
  filters?: TemplateFilters
): Promise<{ templates: CustomsDocumentTemplate[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('customs_document_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }
    
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    
    if (filters?.search) {
      query = query.or(`template_name.ilike.%${filters.search}%,template_code.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching templates:', error);
      return { templates: [], error: error.message };
    }
    
    return { templates: (data || []) as unknown as CustomsDocumentTemplate[] };
  } catch (error) {
    console.error('Error in getTemplates:', error);
    return { templates: [], error: 'Failed to fetch templates' };
  }
}

/**
 * Gets active templates for document generation
 */
export async function getActiveTemplates(): Promise<{ templates: CustomsDocumentTemplate[]; error?: string }> {
  return getTemplates({ is_active: true });
}

/**
 * Gets a template by ID
 */
export async function getTemplateById(
  id: string
): Promise<{ template: CustomsDocumentTemplate | null; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('customs_document_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { template: null, error: 'Template not found' };
      }
      console.error('Error fetching template:', error);
      return { template: null, error: error.message };
    }
    
    return { template: data as unknown as CustomsDocumentTemplate };
  } catch (error) {
    console.error('Error in getTemplateById:', error);
    return { template: null, error: 'Failed to fetch template' };
  }
}

// =====================================================
// Document Generation Actions
// =====================================================

/**
 * Generates a document from template
 */
export async function generateDocument(
  data: GenerateDocumentFormData
): Promise<{ success: boolean; document?: GeneratedCustomsDocument; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('customs_document_templates')
      .select('*')
      .eq('id', data.template_id)
      .single();
    
    if (templateError || !template) {
      return { success: false, error: 'Template not found' };
    }
    
    if (!template.is_active) {
      return { success: false, error: 'Template is not active' };
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get user profile (FK references user_profiles.id, not auth UUID)
    const { data: genProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user?.id || '')
      .single();

    // Merge auto-resolved data with manual overrides
    const documentData = { ...data.document_data };
    
    // Insert document (document_number will be auto-generated by trigger)
    const { data: document, error } = await supabase
      .from('generated_customs_documents')
      .insert({
        template_id: data.template_id,
        pib_id: data.pib_id || null,
        peb_id: data.peb_id || null,
        job_order_id: data.job_order_id || null,
        document_data: documentData as unknown as never,
        status: 'draft',
        created_by: genProfile?.id || null,
      } as never)
      .select()
      .single();
    
    if (error) {
      console.error('Error generating document:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/documents');
    return { success: true, document: document as unknown as GeneratedCustomsDocument };
  } catch (error) {
    console.error('Error in generateDocument:', error);
    return { success: false, error: 'Failed to generate document' };
  }
}

/**
 * Updates document status
 */
export async function updateDocumentStatus(
  id: string,
  status: GeneratedDocumentStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Validate status
    if (!isValidDocumentStatus(status)) {
      return { success: false, error: 'Invalid status' };
    }
    
    // Get current document
    const { data: document, error: fetchError } = await supabase
      .from('generated_customs_documents')
      .select('status')
      .eq('id', id)
      .single();
    
    if (fetchError || !document) {
      return { success: false, error: 'Document not found' };
    }
    
    // Check if transition is allowed
    const currentStatus = document.status as GeneratedDocumentStatus;
    const allowedTransitions = DOCUMENT_STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions.includes(status)) {
      return { 
        success: false, 
        error: `Cannot transition from ${currentStatus} to ${status}` 
      };
    }
    
    // Update status
    const { error } = await supabase
      .from('generated_customs_documents')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating document status:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/documents');
    revalidatePath(`/customs/documents/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateDocumentStatus:', error);
    return { success: false, error: 'Failed to update document status' };
  }
}

/**
 * Updates document data (only for draft documents)
 */
export async function updateDocumentData(
  id: string,
  documentData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current document
    const { data: document, error: fetchError } = await supabase
      .from('generated_customs_documents')
      .select('status')
      .eq('id', id)
      .single();
    
    if (fetchError || !document) {
      return { success: false, error: 'Document not found' };
    }
    
    // Check if document is editable (only draft)
    if (document.status !== 'draft') {
      return { success: false, error: 'Cannot modify finalized document' };
    }
    
    // Update document data
    const { error } = await supabase
      .from('generated_customs_documents')
      .update({ document_data: documentData as unknown as never })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating document data:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/documents');
    revalidatePath(`/customs/documents/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateDocumentData:', error);
    return { success: false, error: 'Failed to update document data' };
  }
}

/**
 * Gets generated documents with optional filters
 */
export async function getGeneratedDocuments(
  filters?: GeneratedDocumentFilters
): Promise<{ documents: GeneratedDocumentWithRelations[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('generated_customs_documents')
      .select(`
        *,
        template:customs_document_templates(id, template_code, template_name, document_type),
        pib:pib_documents(id, internal_ref, importer_name),
        peb:peb_documents(id, internal_ref, exporter_name),
        job_order:job_orders(id, jo_number)
      `)
      .order('created_at', { ascending: false });
    
    // Exclude archived by default unless specifically requested
    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.neq('status', 'archived');
    }
    
    if (filters?.template_id) {
      query = query.eq('template_id', filters.template_id);
    }
    
    if (filters?.pib_id) {
      query = query.eq('pib_id', filters.pib_id);
    }
    
    if (filters?.peb_id) {
      query = query.eq('peb_id', filters.peb_id);
    }
    
    if (filters?.search) {
      query = query.ilike('document_number', `%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching documents:', error);
      return { documents: [], error: error.message };
    }
    
    return { documents: (data || []) as unknown as GeneratedDocumentWithRelations[] };
  } catch (error) {
    console.error('Error in getGeneratedDocuments:', error);
    return { documents: [], error: 'Failed to fetch documents' };
  }
}

/**
 * Gets a generated document by ID
 */
export async function getGeneratedDocumentById(
  id: string
): Promise<{ document: GeneratedDocumentWithRelations | null; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('generated_customs_documents')
      .select(`
        *,
        template:customs_document_templates(*),
        pib:pib_documents(id, internal_ref, importer_name),
        peb:peb_documents(id, internal_ref, exporter_name),
        job_order:job_orders(id, jo_number)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { document: null, error: 'Document not found' };
      }
      console.error('Error fetching document:', error);
      return { document: null, error: error.message };
    }
    
    return { document: data as unknown as GeneratedDocumentWithRelations };
  } catch (error) {
    console.error('Error in getGeneratedDocumentById:', error);
    return { document: null, error: 'Failed to fetch document' };
  }
}

/**
 * Resolves placeholders for a template from source data
 */
export async function resolveTemplateData(
  templateId: string,
  pibId?: string,
  pebId?: string
): Promise<{ data: Record<string, unknown>; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('customs_document_templates')
      .select('placeholders')
      .eq('id', templateId)
      .single();
    
    if (templateError || !template) {
      return { data: {}, error: 'Template not found' };
    }
    
    const placeholders = template.placeholders as unknown as PlaceholderDefinition[];
    
    // Get PIB data if needed
    let pibData = null;
    let pibItems: unknown[] = [];
    if (pibId) {
      const { data: pib } = await supabase
        .from('pib_documents')
        .select('*')
        .eq('id', pibId)
        .single();
      pibData = pib;
      
      const { data: items } = await supabase
        .from('pib_items')
        .select('*')
        .eq('pib_id', pibId)
        .order('item_number');
      pibItems = items || [];
    }
    
    // Get PEB data if needed
    let pebData = null;
    let pebItems: unknown[] = [];
    if (pebId) {
      const { data: peb } = await supabase
        .from('peb_documents')
        .select('*')
        .eq('id', pebId)
        .single();
      pebData = peb;
      
      const { data: items } = await supabase
        .from('peb_items')
        .select('*')
        .eq('peb_id', pebId)
        .order('item_number');
      pebItems = items || [];
    }
    
    // Resolve placeholders
    const resolved = resolvePlaceholders(
      placeholders,
      pibData as unknown as PIBDocument | null,
      pebData as unknown as PEBDocument | null,
      pibItems as never[],
      pebItems as never[]
    );
    
    return { data: resolved };
  } catch (error) {
    console.error('Error in resolveTemplateData:', error);
    return { data: {}, error: 'Failed to resolve template data' };
  }
}

/**
 * Generates filled HTML for preview
 */
export async function generatePreviewHtml(
  templateId: string,
  documentData: Record<string, unknown>
): Promise<{ html: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('customs_document_templates')
      .select('template_html')
      .eq('id', templateId)
      .single();
    
    if (templateError || !template) {
      return { html: '', error: 'Template not found' };
    }
    
    // Fill template
    const filledHtml = fillTemplate(template.template_html, documentData);
    
    return { html: filledHtml };
  } catch (error) {
    console.error('Error in generatePreviewHtml:', error);
    return { html: '', error: 'Failed to generate preview' };
  }
}

/**
 * Updates PDF URL for a document
 */
export async function updateDocumentPdfUrl(
  id: string,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('generated_customs_documents')
      .update({ pdf_url: pdfUrl })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating PDF URL:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/customs/documents');
    revalidatePath(`/customs/documents/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateDocumentPdfUrl:', error);
    return { success: false, error: 'Failed to update PDF URL' };
  }
}
