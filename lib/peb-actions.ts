'use server';

// =====================================================
// v0.52: CUSTOMS - EXPORT DOCUMENTATION (PEB) Server Actions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import {
  PEBDocument,
  PEBDocumentWithRelations,
  PEBItem,
  PEBStatusHistory,
  PEBStatus,
  PEBFormData,
  PEBItemFormData,
  PEBFilters,
  PEBStatistics,
  ExportType,
  PEBStatusUpdateData,
} from '@/types/peb';
import { CustomsOffice } from '@/types/pib';
import {
  validatePEBDocument,
  validatePEBItem,
  canTransitionStatus,
  calculateItemTotalPrice,
} from '@/lib/peb-utils';

// =====================================================
// PEB Document Actions
// =====================================================

/**
 * Creates a new PEB document
 * Property 6: Initial status is always 'draft'
 */
export async function createPEBDocument(
  input: PEBFormData
): Promise<{ data: PEBDocument | null; error: string | null }> {
  const validation = validatePEBDocument(input);
  if (!validation.valid) {
    return { data: null, error: validation.errors[0].message };
  }

  const supabase = await createClient();

  // Get current user and profile
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single();

  // Generate internal reference number
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('peb_documents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);
  const internalRef = `PEB-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('peb_documents')
    .insert({
      internal_ref: internalRef,
      job_order_id: input.job_order_id || null,
      customer_id: input.customer_id || null,
      exporter_name: input.exporter_name,
      exporter_npwp: input.exporter_npwp || null,
      exporter_address: input.exporter_address || null,
      consignee_name: input.consignee_name || null,
      consignee_country: input.consignee_country || null,
      consignee_address: input.consignee_address || null,
      export_type_id: input.export_type_id,
      customs_office_id: input.customs_office_id,
      transport_mode: input.transport_mode,
      vessel_name: input.vessel_name || null,
      voyage_number: input.voyage_number || null,
      bill_of_lading: input.bill_of_lading || null,
      awb_number: input.awb_number || null,
      port_of_loading: input.port_of_loading || null,
      port_of_discharge: input.port_of_discharge || null,
      final_destination: input.final_destination || null,
      etd_date: input.etd_date || null,
      total_packages: input.total_packages || null,
      package_type: input.package_type || null,
      gross_weight_kg: input.gross_weight_kg || null,
      currency: input.currency,
      fob_value: input.fob_value,
      notes: input.notes || null,
      created_by: profile?.id || null,
      status: 'draft', // Property 6: Initial status is always 'draft'
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as PEBDocument, error: null };
}

/**
 * Updates an existing PEB document
 */
export async function updatePEBDocument(
  id: string,
  input: Partial<PEBFormData>
): Promise<{ data: PEBDocument | null; error: string | null }> {
  const supabase = await createClient();

  // Check if PEB can be modified (only in draft status)
  const { data: existing } = await supabase
    .from('peb_documents')
    .select('status')
    .eq('id', id)
    .single();

  if (existing?.status !== 'draft') {
    return { data: null, error: 'Only draft PEB documents can be modified' };
  }

  const updateData: Record<string, unknown> = {};
  
  if (input.job_order_id !== undefined) updateData.job_order_id = input.job_order_id;
  if (input.customer_id !== undefined) updateData.customer_id = input.customer_id;
  if (input.exporter_name !== undefined) updateData.exporter_name = input.exporter_name;
  if (input.exporter_npwp !== undefined) updateData.exporter_npwp = input.exporter_npwp;
  if (input.exporter_address !== undefined) updateData.exporter_address = input.exporter_address;
  if (input.consignee_name !== undefined) updateData.consignee_name = input.consignee_name;
  if (input.consignee_country !== undefined) updateData.consignee_country = input.consignee_country;
  if (input.consignee_address !== undefined) updateData.consignee_address = input.consignee_address;
  if (input.export_type_id !== undefined) updateData.export_type_id = input.export_type_id;
  if (input.customs_office_id !== undefined) updateData.customs_office_id = input.customs_office_id;
  if (input.transport_mode !== undefined) updateData.transport_mode = input.transport_mode;
  if (input.vessel_name !== undefined) updateData.vessel_name = input.vessel_name;
  if (input.voyage_number !== undefined) updateData.voyage_number = input.voyage_number;
  if (input.bill_of_lading !== undefined) updateData.bill_of_lading = input.bill_of_lading;
  if (input.awb_number !== undefined) updateData.awb_number = input.awb_number;
  if (input.port_of_loading !== undefined) updateData.port_of_loading = input.port_of_loading;
  if (input.port_of_discharge !== undefined) updateData.port_of_discharge = input.port_of_discharge;
  if (input.final_destination !== undefined) updateData.final_destination = input.final_destination;
  if (input.etd_date !== undefined) updateData.etd_date = input.etd_date;
  if (input.total_packages !== undefined) updateData.total_packages = input.total_packages;
  if (input.package_type !== undefined) updateData.package_type = input.package_type;
  if (input.gross_weight_kg !== undefined) updateData.gross_weight_kg = input.gross_weight_kg;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.fob_value !== undefined) updateData.fob_value = input.fob_value;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('peb_documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as PEBDocument, error: null };
}

/**
 * Deletes a PEB document (only if in draft status)
 */
export async function deletePEBDocument(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Check if PEB can be deleted (only in draft status)
  const { data: existing } = await supabase
    .from('peb_documents')
    .select('status')
    .eq('id', id)
    .single();

  if (existing?.status !== 'draft') {
    return { success: false, error: 'Only draft PEB documents can be deleted' };
  }

  const { error } = await supabase
    .from('peb_documents')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Gets a single PEB document by ID with relations
 */
export async function getPEBDocument(
  id: string
): Promise<{ data: PEBDocumentWithRelations | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('peb_documents')
    .select(`
      *,
      export_types(*),
      customs_offices(*),
      customers(id, name),
      job_orders(id, jo_number)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Get item count
  const { count } = await supabase
    .from('peb_items')
    .select('*', { count: 'exact', head: true })
    .eq('peb_id', id);

  return {
    data: {
      ...data,
      export_type: data.export_types,
      customs_office: data.customs_offices,
      customer: data.customers,
      job_order: data.job_orders,
      item_count: count || 0,
    } as unknown as PEBDocumentWithRelations,
    error: null,
  };
}

/**
 * Gets all PEB documents with optional filtering
 */
export async function getPEBDocuments(
  filters?: PEBFilters
): Promise<{ data: PEBDocumentWithRelations[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('peb_documents')
    .select(`
      *,
      export_types(type_code, type_name),
      customs_offices(office_code, office_name),
      customers(id, name),
      job_orders(id, jo_number)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.customs_office_id) {
    query = query.eq('customs_office_id', filters.customs_office_id);
  }
  if (filters?.date_from) {
    query = query.gte('etd_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('etd_date', filters.date_to);
  }
  if (filters?.search) {
    query = query.or(`internal_ref.ilike.%${filters.search}%,peb_number.ilike.%${filters.search}%,exporter_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data || []).map((doc) => ({
      ...doc,
      export_type: doc.export_types,
      customs_office: doc.customs_offices,
      customer: doc.customers,
      job_order: doc.job_orders,
    })) as unknown as PEBDocumentWithRelations[],
    error: null,
  };
}


// =====================================================
// PEB Item Actions
// =====================================================

/**
 * Adds a new item to a PEB document
 * Property 3: Sequential item numbers
 */
export async function addPEBItem(
  pebId: string,
  input: PEBItemFormData
): Promise<{ data: PEBItem | null; error: string | null }> {
  const validation = validatePEBItem(input);
  if (!validation.valid) {
    return { data: null, error: validation.errors[0].message };
  }

  const supabase = await createClient();

  // Check if PEB is in draft status
  const { data: peb } = await supabase
    .from('peb_documents')
    .select('status, currency')
    .eq('id', pebId)
    .single();

  if (peb?.status !== 'draft') {
    return { data: null, error: 'Items can only be added to draft PEB documents' };
  }

  // Get the next item number (Property 3: Sequential item numbers)
  const { data: existingItems } = await supabase
    .from('peb_items')
    .select('item_number')
    .eq('peb_id', pebId)
    .order('item_number', { ascending: false })
    .limit(1);

  const nextItemNumber = existingItems && existingItems.length > 0
    ? existingItems[0].item_number + 1
    : 1;

  // Calculate total price (Property 5)
  const totalPrice = calculateItemTotalPrice(input.quantity, input.unit_price);

  const { data, error } = await supabase
    .from('peb_items')
    .insert({
      peb_id: pebId,
      item_number: nextItemNumber,
      hs_code: input.hs_code,
      hs_description: input.hs_description || null,
      goods_description: input.goods_description,
      brand: input.brand || null,
      specifications: input.specifications || null,
      quantity: input.quantity,
      unit: input.unit,
      net_weight_kg: input.net_weight_kg || null,
      gross_weight_kg: input.gross_weight_kg || null,
      unit_price: input.unit_price,
      total_price: totalPrice,
      currency: input.currency || peb?.currency || 'USD',
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as PEBItem, error: null };
}

/**
 * Updates an existing PEB item
 */
export async function updatePEBItem(
  id: string,
  input: Partial<PEBItemFormData>
): Promise<{ data: PEBItem | null; error: string | null }> {
  const supabase = await createClient();

  // Get the item and check if PEB is in draft status
  const { data: item } = await supabase
    .from('peb_items')
    .select('peb_id, quantity, unit_price')
    .eq('id', id)
    .single();

  if (!item) {
    return { data: null, error: 'Item not found' };
  }

  const { data: peb } = await supabase
    .from('peb_documents')
    .select('status')
    .eq('id', item.peb_id)
    .single();

  if (peb?.status !== 'draft') {
    return { data: null, error: 'Items can only be modified in draft PEB documents' };
  }

  const updateData: Record<string, unknown> = {};
  
  if (input.hs_code !== undefined) updateData.hs_code = input.hs_code;
  if (input.hs_description !== undefined) updateData.hs_description = input.hs_description;
  if (input.goods_description !== undefined) updateData.goods_description = input.goods_description;
  if (input.brand !== undefined) updateData.brand = input.brand;
  if (input.specifications !== undefined) updateData.specifications = input.specifications;
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.net_weight_kg !== undefined) updateData.net_weight_kg = input.net_weight_kg;
  if (input.gross_weight_kg !== undefined) updateData.gross_weight_kg = input.gross_weight_kg;
  if (input.unit_price !== undefined) updateData.unit_price = input.unit_price;
  if (input.currency !== undefined) updateData.currency = input.currency;

  // Recalculate total price if quantity or unit_price changed
  if (input.quantity !== undefined || input.unit_price !== undefined) {
    const quantity = input.quantity ?? item.quantity ?? 0;
    const unitPrice = input.unit_price ?? item.unit_price ?? 0;
    updateData.total_price = calculateItemTotalPrice(quantity, unitPrice);
  }

  const { data, error } = await supabase
    .from('peb_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as PEBItem, error: null };
}

/**
 * Deletes a PEB item
 */
export async function deletePEBItem(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Get the item and check if PEB is in draft status
  const { data: item } = await supabase
    .from('peb_items')
    .select('peb_id')
    .eq('id', id)
    .single();

  if (!item) {
    return { success: false, error: 'Item not found' };
  }

  const { data: peb } = await supabase
    .from('peb_documents')
    .select('status')
    .eq('id', item.peb_id)
    .single();

  if (peb?.status !== 'draft') {
    return { success: false, error: 'Items can only be deleted from draft PEB documents' };
  }

  const { error } = await supabase
    .from('peb_items')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Gets all items for a PEB document
 */
export async function getPEBItems(
  pebId: string
): Promise<{ data: PEBItem[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('peb_items')
    .select('*')
    .eq('peb_id', pebId)
    .order('item_number');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as PEBItem[], error: null };
}

// =====================================================
// Status Management Actions
// =====================================================

/**
 * Updates PEB status with validation and history logging
 * Property 7: Status history completeness
 */
export async function updatePEBStatus(
  id: string,
  newStatus: PEBStatus,
  data?: PEBStatusUpdateData
): Promise<{ data: PEBDocument | null; error: string | null }> {
  const supabase = await createClient();

  // Get current PEB
  const { data: peb } = await supabase
    .from('peb_documents')
    .select('status')
    .eq('id', id)
    .single();

  if (!peb) {
    return { data: null, error: 'PEB document not found' };
  }

  // Validate status transition
  if (!canTransitionStatus(peb.status as PEBStatus, newStatus)) {
    return { data: null, error: `Cannot transition from ${peb.status} to ${newStatus}` };
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  // Add status-specific data
  if (newStatus === 'submitted') {
    updateData.submitted_at = new Date().toISOString();
    if (data?.aju_number) updateData.aju_number = data.aju_number;
  }
  if (newStatus === 'approved') {
    updateData.approved_at = new Date().toISOString();
    if (data?.npe_number) updateData.npe_number = data.npe_number;
    if (data?.npe_date) updateData.npe_date = data.npe_date;
  }
  if (newStatus === 'loaded') {
    updateData.loaded_at = new Date().toISOString();
  }
  if (data?.peb_number) {
    updateData.peb_number = data.peb_number;
  }

  const { data: updated, error } = await supabase
    .from('peb_documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log status change (Property 7: Status history completeness)
  await logPEBStatusChange(id, peb.status as PEBStatus, newStatus, data?.notes);

  return { data: updated as unknown as PEBDocument, error: null };
}

/**
 * Logs a PEB status change to history
 */
async function logPEBStatusChange(
  pebId: string,
  previousStatus: PEBStatus | null,
  newStatus: PEBStatus,
  notes?: string
): Promise<void> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from('peb_status_history')
    .insert({
      peb_id: pebId,
      previous_status: previousStatus,
      new_status: newStatus,
      notes: notes || null,
      changed_by: user?.id || null,
    });
}

/**
 * Gets status history for a PEB document
 */
export async function getPEBStatusHistory(
  pebId: string
): Promise<{ data: PEBStatusHistory[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('peb_status_history')
    .select('*')
    .eq('peb_id', pebId)
    .order('changed_at', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as PEBStatusHistory[], error: null };
}

// =====================================================
// Reference Data Actions
// =====================================================

/**
 * Gets all export types
 */
export async function getExportTypes(): Promise<{
  data: ExportType[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('export_types')
    .select('*')
    .eq('is_active', true)
    .order('type_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as ExportType[], error: null };
}

/**
 * Gets all customs offices (shared with PIB)
 */
export async function getCustomsOffices(): Promise<{
  data: CustomsOffice[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customs_offices')
    .select('*')
    .eq('is_active', true)
    .order('office_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as CustomsOffice[], error: null };
}

/**
 * Gets PEB statistics for dashboard summary cards
 * Property 8: Statistics Calculation Correctness
 */
export async function getPEBStatistics(): Promise<{
  data: PEBStatistics | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get counts for different statuses
  const { data: allPebs, error } = await supabase
    .from('peb_documents')
    .select('status, atd_date');

  if (error) {
    return { data: null, error: error.message };
  }

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats: PEBStatistics = {
    active_pebs: allPebs?.filter((p) => 
      ['draft', 'submitted', 'approved', 'loaded'].includes(p.status || '')
    ).length || 0,
    pending_approval: allPebs?.filter((p) => 
      p.status === 'submitted'
    ).length || 0,
    loaded: allPebs?.filter((p) => 
      p.status === 'loaded'
    ).length || 0,
    departed_mtd: allPebs?.filter((p) => 
      (p.status === 'departed' || p.status === 'completed') &&
      p.atd_date && new Date(p.atd_date) >= firstOfMonth
    ).length || 0,
  };

  return { data: stats, error: null };
}

/**
 * Gets PEB documents linked to a specific job order
 */
export async function getPEBsByJobOrder(
  jobOrderId: string
): Promise<{ data: PEBDocument[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('peb_documents')
    .select('*')
    .eq('job_order_id', jobOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as PEBDocument[], error: null };
}

/**
 * Links a PEB document to a job order
 */
export async function linkPEBToJobOrder(
  pebId: string,
  jobOrderId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('peb_documents')
    .update({ job_order_id: jobOrderId })
    .eq('id', pebId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
