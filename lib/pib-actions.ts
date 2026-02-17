'use server';

// =====================================================
// v0.51: CUSTOMS - IMPORT DOCUMENTATION (PIB) Server Actions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  PIBDocument,
  PIBDocumentWithRelations,
  PIBItem,
  PIBStatusHistory,
  PIBStatus,
  PIBFormData,
  PIBItemFormData,
  PIBFilters,
  PIBStatistics,
  CustomsOffice,
  ImportType,
  StatusUpdateData,
} from '@/types/pib';
import {
  validatePIBDocument,
  validatePIBItem,
  canTransitionStatus,
  calculateItemTotalPrice,
  calculateItemDuties,
  aggregatePIBDuties,
  calculateCIFValue,
  convertToIDR,
} from '@/lib/pib-utils';

// =====================================================
// PIB Document Actions
// =====================================================

/**
 * Creates a new PIB document
 * Property 7: Initial status is always 'draft'
 */
export async function createPIBDocument(
  input: PIBFormData
): Promise<{ data: PIBDocument | null; error: string | null }> {
  const validation = validatePIBDocument(input);
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

  // Calculate CIF value
  const cifValue = calculateCIFValue(
    input.fob_value,
    input.freight_value || 0,
    input.insurance_value || 0
  );

  // Calculate CIF in IDR if exchange rate provided
  const cifValueIDR = input.exchange_rate
    ? convertToIDR(cifValue, input.exchange_rate)
    : null;

  const { data, error } = await supabase
    .from('pib_documents')
    .insert({
      job_order_id: input.job_order_id || null,
      customer_id: input.customer_id || null,
      importer_name: input.importer_name,
      importer_npwp: input.importer_npwp || null,
      importer_address: input.importer_address || null,
      supplier_name: input.supplier_name || null,
      supplier_country: input.supplier_country || null,
      import_type_id: input.import_type_id,
      customs_office_id: input.customs_office_id,
      transport_mode: input.transport_mode,
      vessel_name: input.vessel_name || null,
      voyage_number: input.voyage_number || null,
      bill_of_lading: input.bill_of_lading || null,
      awb_number: input.awb_number || null,
      port_of_loading: input.port_of_loading || null,
      port_of_discharge: input.port_of_discharge || null,
      eta_date: input.eta_date || null,
      total_packages: input.total_packages || null,
      package_type: input.package_type || null,
      gross_weight_kg: input.gross_weight_kg || null,
      currency: input.currency,
      fob_value: input.fob_value,
      freight_value: input.freight_value || 0,
      insurance_value: input.insurance_value || 0,
      exchange_rate: input.exchange_rate || null,
      cif_value_idr: cifValueIDR,
      notes: input.notes || null,
      created_by: profile?.id || null,
      status: 'draft', // Property 7: Initial status is always 'draft'
    } as never)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/customs/import');
  return { data: data as unknown as PIBDocument, error: null };
}

/**
 * Updates an existing PIB document
 */
export async function updatePIBDocument(
  id: string,
  input: Partial<PIBFormData>
): Promise<{ data: PIBDocument | null; error: string | null }> {
  const supabase = await createClient();

  // Check if PIB can be modified (only in draft status)
  const { data: existing } = await supabase
    .from('pib_documents')
    .select('status')
    .eq('id', id)
    .single();

  if (existing?.status !== 'draft') {
    return { data: null, error: 'Only draft PIB documents can be modified' };
  }

  const updateData: Record<string, unknown> = {};
  
  if (input.job_order_id !== undefined) updateData.job_order_id = input.job_order_id;
  if (input.customer_id !== undefined) updateData.customer_id = input.customer_id;
  if (input.importer_name !== undefined) updateData.importer_name = input.importer_name;
  if (input.importer_npwp !== undefined) updateData.importer_npwp = input.importer_npwp;
  if (input.importer_address !== undefined) updateData.importer_address = input.importer_address;
  if (input.supplier_name !== undefined) updateData.supplier_name = input.supplier_name;
  if (input.supplier_country !== undefined) updateData.supplier_country = input.supplier_country;
  if (input.import_type_id !== undefined) updateData.import_type_id = input.import_type_id;
  if (input.customs_office_id !== undefined) updateData.customs_office_id = input.customs_office_id;
  if (input.transport_mode !== undefined) updateData.transport_mode = input.transport_mode;
  if (input.vessel_name !== undefined) updateData.vessel_name = input.vessel_name;
  if (input.voyage_number !== undefined) updateData.voyage_number = input.voyage_number;
  if (input.bill_of_lading !== undefined) updateData.bill_of_lading = input.bill_of_lading;
  if (input.awb_number !== undefined) updateData.awb_number = input.awb_number;
  if (input.port_of_loading !== undefined) updateData.port_of_loading = input.port_of_loading;
  if (input.port_of_discharge !== undefined) updateData.port_of_discharge = input.port_of_discharge;
  if (input.eta_date !== undefined) updateData.eta_date = input.eta_date;
  if (input.total_packages !== undefined) updateData.total_packages = input.total_packages;
  if (input.package_type !== undefined) updateData.package_type = input.package_type;
  if (input.gross_weight_kg !== undefined) updateData.gross_weight_kg = input.gross_weight_kg;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.fob_value !== undefined) updateData.fob_value = input.fob_value;
  if (input.freight_value !== undefined) updateData.freight_value = input.freight_value;
  if (input.insurance_value !== undefined) updateData.insurance_value = input.insurance_value;
  if (input.exchange_rate !== undefined) updateData.exchange_rate = input.exchange_rate;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // Recalculate CIF if value components changed
  if (input.fob_value !== undefined || input.freight_value !== undefined || input.insurance_value !== undefined) {
    const { data: current } = await supabase
      .from('pib_documents')
      .select('fob_value, freight_value, insurance_value, exchange_rate')
      .eq('id', id)
      .single();

    if (current) {
      const fob = input.fob_value ?? current.fob_value ?? 0;
      const freight = input.freight_value ?? current.freight_value ?? 0;
      const insurance = input.insurance_value ?? current.insurance_value ?? 0;
      const exchangeRate = input.exchange_rate ?? current.exchange_rate;

      const cifValue = calculateCIFValue(fob, freight, insurance);
      if (exchangeRate) {
        updateData.cif_value_idr = convertToIDR(cifValue, exchangeRate);
      }
    }
  }

  const { data, error } = await supabase
    .from('pib_documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/customs/import');
  revalidatePath(`/customs/import/${id}`);
  return { data: data as unknown as PIBDocument, error: null };
}

/**
 * Deletes a PIB document (only if in draft status)
 */
export async function deletePIBDocument(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Check if PIB can be deleted (only in draft status)
  const { data: existing } = await supabase
    .from('pib_documents')
    .select('status')
    .eq('id', id)
    .single();

  if (existing?.status !== 'draft') {
    return { success: false, error: 'Only draft PIB documents can be deleted' };
  }

  const { error } = await supabase
    .from('pib_documents')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}


/**
 * Gets a single PIB document by ID with relations
 */
export async function getPIBDocument(
  id: string
): Promise<{ data: PIBDocumentWithRelations | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pib_documents')
    .select(`
      *,
      import_types(*),
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
    .from('pib_items')
    .select('*', { count: 'exact', head: true })
    .eq('pib_id', id);

  return {
    data: {
      ...data,
      import_type: data.import_types,
      customs_office: data.customs_offices,
      customer: data.customers,
      job_order: data.job_orders,
      item_count: count || 0,
    } as unknown as PIBDocumentWithRelations,
    error: null,
  };
}

/**
 * Gets all PIB documents with optional filtering
 */
export async function getPIBDocuments(
  filters?: PIBFilters
): Promise<{ data: PIBDocumentWithRelations[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('pib_documents')
    .select(`
      *,
      import_types(type_code, type_name),
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
    query = query.gte('eta_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('eta_date', filters.date_to);
  }
  if (filters?.search) {
    query = query.or(`internal_ref.ilike.%${filters.search}%,pib_number.ilike.%${filters.search}%,importer_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data || []).map((doc) => ({
      ...doc,
      import_type: doc.import_types,
      customs_office: doc.customs_offices,
      customer: doc.customers,
      job_order: doc.job_orders,
    })) as unknown as PIBDocumentWithRelations[],
    error: null,
  };
}

// =====================================================
// PIB Item Actions
// =====================================================

/**
 * Adds a new item to a PIB document
 * Property 6: Sequential item numbers
 */
export async function addPIBItem(
  pibId: string,
  input: PIBItemFormData
): Promise<{ data: PIBItem | null; error: string | null }> {
  const validation = validatePIBItem(input);
  if (!validation.valid) {
    return { data: null, error: validation.errors[0].message };
  }

  const supabase = await createClient();

  // Check if PIB is in draft status
  const { data: pib } = await supabase
    .from('pib_documents')
    .select('status, currency')
    .eq('id', pibId)
    .single();

  if (pib?.status !== 'draft') {
    return { data: null, error: 'Items can only be added to draft PIB documents' };
  }

  // Get the next item number (Property 6: Sequential item numbers)
  const { data: existingItems } = await supabase
    .from('pib_items')
    .select('item_number')
    .eq('pib_id', pibId)
    .order('item_number', { ascending: false })
    .limit(1);

  const nextItemNumber = existingItems && existingItems.length > 0
    ? existingItems[0].item_number + 1
    : 1;

  // Calculate total price and duties
  const totalPrice = calculateItemTotalPrice(input.quantity, input.unit_price);
  const duties = calculateItemDuties(
    totalPrice,
    input.bm_rate || 0,
    input.ppn_rate || 11,
    input.pph_rate || 0
  );

  const { data, error } = await supabase
    .from('pib_items')
    .insert({
      pib_id: pibId,
      item_number: nextItemNumber,
      hs_code: input.hs_code,
      hs_description: input.hs_description || null,
      goods_description: input.goods_description,
      brand: input.brand || null,
      type_model: input.type_model || null,
      specifications: input.specifications || null,
      country_of_origin: input.country_of_origin || null,
      quantity: input.quantity,
      unit: input.unit,
      net_weight_kg: input.net_weight_kg || null,
      gross_weight_kg: input.gross_weight_kg || null,
      unit_price: input.unit_price,
      total_price: totalPrice,
      currency: input.currency || pib?.currency || 'USD',
      bm_rate: input.bm_rate || 0,
      ppn_rate: input.ppn_rate || 11,
      pph_rate: input.pph_rate || 0,
      bea_masuk: duties.bea_masuk,
      ppn: duties.ppn,
      pph_import: duties.pph_import,
      requires_permit: input.requires_permit || false,
      permit_type: input.permit_type || null,
      permit_number: input.permit_number || null,
      permit_date: input.permit_date || null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Recalculate PIB totals
  await recalculatePIBTotals(pibId);

  return { data: data as PIBItem, error: null };
}

/**
 * Updates an existing PIB item
 */
export async function updatePIBItem(
  id: string,
  input: Partial<PIBItemFormData>
): Promise<{ data: PIBItem | null; error: string | null }> {
  const supabase = await createClient();

  // Get the item and check if PIB is in draft status
  const { data: item } = await supabase
    .from('pib_items')
    .select('pib_id, quantity, unit_price, bm_rate, ppn_rate, pph_rate')
    .eq('id', id)
    .single();

  if (!item) {
    return { data: null, error: 'Item not found' };
  }

  const { data: pib } = await supabase
    .from('pib_documents')
    .select('status')
    .eq('id', item.pib_id)
    .single();

  if (pib?.status !== 'draft') {
    return { data: null, error: 'Items can only be modified in draft PIB documents' };
  }

  const updateData: Record<string, unknown> = {};
  
  if (input.hs_code !== undefined) updateData.hs_code = input.hs_code;
  if (input.hs_description !== undefined) updateData.hs_description = input.hs_description;
  if (input.goods_description !== undefined) updateData.goods_description = input.goods_description;
  if (input.brand !== undefined) updateData.brand = input.brand;
  if (input.type_model !== undefined) updateData.type_model = input.type_model;
  if (input.specifications !== undefined) updateData.specifications = input.specifications;
  if (input.country_of_origin !== undefined) updateData.country_of_origin = input.country_of_origin;
  if (input.quantity !== undefined) updateData.quantity = input.quantity;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.net_weight_kg !== undefined) updateData.net_weight_kg = input.net_weight_kg;
  if (input.gross_weight_kg !== undefined) updateData.gross_weight_kg = input.gross_weight_kg;
  if (input.unit_price !== undefined) updateData.unit_price = input.unit_price;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.bm_rate !== undefined) updateData.bm_rate = input.bm_rate;
  if (input.ppn_rate !== undefined) updateData.ppn_rate = input.ppn_rate;
  if (input.pph_rate !== undefined) updateData.pph_rate = input.pph_rate;
  if (input.requires_permit !== undefined) updateData.requires_permit = input.requires_permit;
  if (input.permit_type !== undefined) updateData.permit_type = input.permit_type;
  if (input.permit_number !== undefined) updateData.permit_number = input.permit_number;
  if (input.permit_date !== undefined) updateData.permit_date = input.permit_date;

  // Recalculate total price and duties if relevant fields changed
  if (input.quantity !== undefined || input.unit_price !== undefined ||
      input.bm_rate !== undefined || input.ppn_rate !== undefined || input.pph_rate !== undefined) {
    const quantity = input.quantity ?? item.quantity;
    const unitPrice = input.unit_price ?? item.unit_price ?? 0;
    const bmRate = input.bm_rate ?? item.bm_rate ?? 0;
    const ppnRate = input.ppn_rate ?? item.ppn_rate ?? 11;
    const pphRate = input.pph_rate ?? item.pph_rate ?? 0;

    const totalPrice = calculateItemTotalPrice(quantity, unitPrice);
    const duties = calculateItemDuties(totalPrice, bmRate, ppnRate, pphRate);

    updateData.total_price = totalPrice;
    updateData.bea_masuk = duties.bea_masuk;
    updateData.ppn = duties.ppn;
    updateData.pph_import = duties.pph_import;
  }

  const { data, error } = await supabase
    .from('pib_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Recalculate PIB totals
  await recalculatePIBTotals(item.pib_id);

  return { data: data as PIBItem, error: null };
}

/**
 * Deletes a PIB item
 */
export async function deletePIBItem(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Get the item and check if PIB is in draft status
  const { data: item } = await supabase
    .from('pib_items')
    .select('pib_id')
    .eq('id', id)
    .single();

  if (!item) {
    return { success: false, error: 'Item not found' };
  }

  const { data: pib } = await supabase
    .from('pib_documents')
    .select('status')
    .eq('id', item.pib_id)
    .single();

  if (pib?.status !== 'draft') {
    return { success: false, error: 'Items can only be deleted from draft PIB documents' };
  }

  const { error } = await supabase
    .from('pib_items')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Recalculate PIB totals
  await recalculatePIBTotals(item.pib_id);

  return { success: true, error: null };
}

/**
 * Gets all items for a PIB document
 */
export async function getPIBItems(
  pibId: string
): Promise<{ data: PIBItem[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pib_items')
    .select('*')
    .eq('pib_id', pibId)
    .order('item_number');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as PIBItem[], error: null };
}

/**
 * Recalculates PIB document totals from items
 */
async function recalculatePIBTotals(pibId: string): Promise<void> {
  const supabase = await createClient();

  // Get all items
  const { data: items } = await supabase
    .from('pib_items')
    .select('bea_masuk, ppn, pph_import')
    .eq('pib_id', pibId);

  if (!items) return;

  // Aggregate duties
  const totals = aggregatePIBDuties(items as PIBItem[]);

  // Update PIB document
  await supabase
    .from('pib_documents')
    .update({
      bea_masuk: totals.bea_masuk,
      ppn: totals.ppn,
      pph_import: totals.pph_import,
    })
    .eq('id', pibId);
}


// =====================================================
// Status Management Actions
// =====================================================

/**
 * Updates PIB status with validation and history logging
 * Property 8: Status history completeness
 */
export async function updatePIBStatus(
  id: string,
  newStatus: PIBStatus,
  data?: StatusUpdateData
): Promise<{ data: PIBDocument | null; error: string | null }> {
  const supabase = await createClient();

  // Get current PIB
  const { data: pib } = await supabase
    .from('pib_documents')
    .select('status')
    .eq('id', id)
    .single();

  if (!pib) {
    return { data: null, error: 'PIB document not found' };
  }

  // Validate status transition
  if (!canTransitionStatus(pib.status as PIBStatus, newStatus)) {
    return { data: null, error: `Cannot transition from ${pib.status} to ${newStatus}` };
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  // Add status-specific data
  if (newStatus === 'submitted') {
    updateData.submitted_at = new Date().toISOString();
    if (data?.aju_number) updateData.aju_number = data.aju_number;
  }
  if (newStatus === 'duties_paid') {
    updateData.duties_paid_at = new Date().toISOString();
    if (data?.pib_number) updateData.pib_number = data.pib_number;
  }
  if (newStatus === 'released') {
    updateData.released_at = new Date().toISOString();
    if (data?.sppb_number) updateData.sppb_number = data.sppb_number;
    if (data?.sppb_date) updateData.sppb_date = data.sppb_date;
  }

  const { data: updated, error } = await supabase
    .from('pib_documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Log status change (Property 8: Status history completeness)
  await logPIBStatusChange(id, pib.status as PIBStatus, newStatus, data?.notes);

  return { data: updated as unknown as PIBDocument, error: null };
}

/**
 * Logs a PIB status change to history
 */
async function logPIBStatusChange(
  pibId: string,
  previousStatus: PIBStatus | null,
  newStatus: PIBStatus,
  notes?: string
): Promise<void> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile (for FK references to user_profiles)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single();

  await supabase
    .from('pib_status_history')
    .insert({
      pib_id: pibId,
      previous_status: previousStatus,
      new_status: newStatus,
      notes: notes || null,
      changed_by: profile?.id || null,
    });
}

/**
 * Gets status history for a PIB document
 */
export async function getPIBStatusHistory(
  pibId: string
): Promise<{ data: PIBStatusHistory[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pib_status_history')
    .select('*')
    .eq('pib_id', pibId)
    .order('changed_at', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as PIBStatusHistory[], error: null };
}

// =====================================================
// Reference Data Actions
// =====================================================

/**
 * Gets all customs offices
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
 * Gets all import types
 */
export async function getImportTypes(): Promise<{
  data: ImportType[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('import_types')
    .select('*')
    .eq('is_active', true)
    .order('type_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as ImportType[], error: null };
}

/**
 * Gets PIB statistics for dashboard summary cards
 */
export async function getPIBStatistics(): Promise<{
  data: PIBStatistics | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get counts for different statuses
  const { data: allPibs, error } = await supabase
    .from('pib_documents')
    .select('status, released_at');

  if (error) {
    return { data: null, error: error.message };
  }

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats: PIBStatistics = {
    active_pibs: allPibs?.filter((p) => 
      !['completed', 'cancelled'].includes(p.status || '')
    ).length || 0,
    pending_clearance: allPibs?.filter((p) => 
      ['submitted', 'document_check', 'physical_check'].includes(p.status || '')
    ).length || 0,
    in_transit: allPibs?.filter((p) => 
      p.status === 'duties_paid'
    ).length || 0,
    released_mtd: allPibs?.filter((p) => 
      p.status === 'released' || p.status === 'completed'
    ).filter((p) => 
      p.released_at && new Date(p.released_at) >= firstOfMonth
    ).length || 0,
  };

  return { data: stats, error: null };
}

/**
 * Gets PIB documents linked to a specific job order
 */
export async function getPIBsByJobOrder(
  jobOrderId: string
): Promise<{ data: PIBDocument[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pib_documents')
    .select('*')
    .eq('job_order_id', jobOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as PIBDocument[], error: null };
}

/**
 * Links a PIB document to a job order
 */
export async function linkPIBToJobOrder(
  pibId: string,
  jobOrderId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('pib_documents')
    .update({ job_order_id: jobOrderId })
    .eq('id', pibId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
