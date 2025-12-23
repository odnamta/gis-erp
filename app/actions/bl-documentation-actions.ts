'use server';

// =====================================================
// v0.73: AGENCY - BILL OF LADING & DOCUMENTATION SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  BillOfLading,
  BillOfLadingRow,
  BLFormData,
  BLStatus,
  BLFilters,
  ShippingInstruction,
  ShippingInstructionRow,
  SIFormData,
  SIStatus,
  SIFilters,
  ArrivalNotice,
  ArrivalNoticeRow,
  ArrivalNoticeFormData,
  ArrivalNoticeStatus,
  CargoManifest,
  CargoManifestRow,
  ManifestFormData,
  ManifestStatus,
  ManifestFilters,
} from '@/types/agency';
import {
  mapBLRowToModel,
  mapSIRowToModel,
  mapArrivalNoticeRowToModel,
  mapManifestRowToModel,
  validateBLData,
  validateArrivalNoticeData,
  calculateBLTotals,
  calculateFreeTimeExpiry,
  calculateManifestTotals,
} from '@/lib/bl-documentation-utils';

// =====================================================
// ACTION RESULT TYPE
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type assertion helper for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// =====================================================
// BILL OF LADING CRUD OPERATIONS
// =====================================================

/**
 * Create a new Bill of Lading
 * Sets initial status to 'draft' per Requirement 7.1
 * @param data - B/L form data
 * @returns ActionResult with created B/L or error
 */
export async function createBillOfLading(data: BLFormData): Promise<ActionResult<BillOfLading>> {
  try {
    // Validate required fields per Requirements 6.1, 6.2
    const validation = validateBLData(data);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      return { success: false, error: errorMessages };
    }

    const supabase = await createClient();

    // Calculate totals from containers if provided
    const totals = calculateBLTotals(data.containers || []);

    const insertData = {
      booking_id: data.bookingId,
      job_order_id: data.jobOrderId || null,
      bl_type: data.blType || 'original',
      original_count: data.originalCount || 3,
      shipping_line_id: data.shippingLineId || null,
      carrier_bl_number: data.carrierBlNumber || null,
      vessel_name: data.vesselName,
      voyage_number: data.voyageNumber || null,
      flag: data.flag || null,
      port_of_loading: data.portOfLoading,
      port_of_discharge: data.portOfDischarge,
      place_of_receipt: data.placeOfReceipt || null,
      place_of_delivery: data.placeOfDelivery || null,
      shipped_on_board_date: data.shippedOnBoardDate || null,
      bl_date: data.blDate || null,
      shipper_name: data.shipperName,
      shipper_address: data.shipperAddress || null,
      consignee_name: data.consigneeName || null,
      consignee_address: data.consigneeAddress || null,
      consignee_to_order: data.consigneeToOrder || false,
      notify_party_name: data.notifyPartyName || null,
      notify_party_address: data.notifyPartyAddress || null,
      cargo_description: data.cargoDescription,
      marks_and_numbers: data.marksAndNumbers || null,
      number_of_packages: data.numberOfPackages || totals.totalPackages || null,
      package_type: data.packageType || null,
      gross_weight_kg: data.grossWeightKg || totals.totalWeightKg || null,
      measurement_cbm: data.measurementCbm || null,
      containers: data.containers || [],
      freight_terms: data.freightTerms || 'prepaid',
      freight_amount: data.freightAmount || null,
      freight_currency: data.freightCurrency || 'USD',
      remarks: data.remarks || null,
      // Initial status is 'draft' per Requirement 7.1
      status: 'draft',
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .insert(insertData)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bl');
    return { success: true, data: mapBLRowToModel(result as BillOfLadingRow) };
  } catch (error) {
    console.error('Error creating Bill of Lading:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create Bill of Lading' };
  }
}

/**
 * Update an existing Bill of Lading
 * @param id - B/L ID
 * @param data - Partial B/L form data to update
 * @returns ActionResult with updated B/L or error
 */
export async function updateBillOfLading(id: string, data: Partial<BLFormData>): Promise<ActionResult<BillOfLading>> {
  try {
    const supabase = await createClient();

    // Check if B/L exists and can be modified
    const { data: existing } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Bill of Lading not found' };
    }

    // Prevent modification of issued/released/surrendered B/Ls per Requirement 6.6
    const protectedStatuses: BLStatus[] = ['issued', 'released', 'surrendered'];
    if (protectedStatuses.includes(existing.status as BLStatus)) {
      return { success: false, error: 'Cannot modify an issued, released, or surrendered Bill of Lading' };
    }

    // Calculate totals from containers if provided
    const totals = data.containers ? calculateBLTotals(data.containers) : null;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (data.bookingId !== undefined) updateData.booking_id = data.bookingId;
    if (data.jobOrderId !== undefined) updateData.job_order_id = data.jobOrderId || null;
    if (data.blType !== undefined) updateData.bl_type = data.blType;
    if (data.originalCount !== undefined) updateData.original_count = data.originalCount;
    if (data.shippingLineId !== undefined) updateData.shipping_line_id = data.shippingLineId || null;
    if (data.carrierBlNumber !== undefined) updateData.carrier_bl_number = data.carrierBlNumber || null;
    if (data.vesselName !== undefined) updateData.vessel_name = data.vesselName;
    if (data.voyageNumber !== undefined) updateData.voyage_number = data.voyageNumber || null;
    if (data.flag !== undefined) updateData.flag = data.flag || null;
    if (data.portOfLoading !== undefined) updateData.port_of_loading = data.portOfLoading;
    if (data.portOfDischarge !== undefined) updateData.port_of_discharge = data.portOfDischarge;
    if (data.placeOfReceipt !== undefined) updateData.place_of_receipt = data.placeOfReceipt || null;
    if (data.placeOfDelivery !== undefined) updateData.place_of_delivery = data.placeOfDelivery || null;
    if (data.shippedOnBoardDate !== undefined) updateData.shipped_on_board_date = data.shippedOnBoardDate || null;
    if (data.blDate !== undefined) updateData.bl_date = data.blDate || null;
    if (data.shipperName !== undefined) updateData.shipper_name = data.shipperName;
    if (data.shipperAddress !== undefined) updateData.shipper_address = data.shipperAddress || null;
    if (data.consigneeName !== undefined) updateData.consignee_name = data.consigneeName || null;
    if (data.consigneeAddress !== undefined) updateData.consignee_address = data.consigneeAddress || null;
    if (data.consigneeToOrder !== undefined) updateData.consignee_to_order = data.consigneeToOrder;
    if (data.notifyPartyName !== undefined) updateData.notify_party_name = data.notifyPartyName || null;
    if (data.notifyPartyAddress !== undefined) updateData.notify_party_address = data.notifyPartyAddress || null;
    if (data.cargoDescription !== undefined) updateData.cargo_description = data.cargoDescription;
    if (data.marksAndNumbers !== undefined) updateData.marks_and_numbers = data.marksAndNumbers || null;
    if (data.numberOfPackages !== undefined) updateData.number_of_packages = data.numberOfPackages || null;
    if (data.packageType !== undefined) updateData.package_type = data.packageType || null;
    if (data.grossWeightKg !== undefined) updateData.gross_weight_kg = data.grossWeightKg || null;
    if (data.measurementCbm !== undefined) updateData.measurement_cbm = data.measurementCbm || null;
    if (data.containers !== undefined) {
      updateData.containers = data.containers;
      // Update totals from containers
      if (totals) {
        updateData.number_of_packages = data.numberOfPackages || totals.totalPackages || null;
        updateData.gross_weight_kg = data.grossWeightKg || totals.totalWeightKg || null;
      }
    }
    if (data.freightTerms !== undefined) updateData.freight_terms = data.freightTerms;
    if (data.freightAmount !== undefined) updateData.freight_amount = data.freightAmount || null;
    if (data.freightCurrency !== undefined) updateData.freight_currency = data.freightCurrency || 'USD';
    if (data.remarks !== undefined) updateData.remarks = data.remarks || null;

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bl');
    revalidatePath(`/agency/bl/${id}`);
    return { success: true, data: mapBLRowToModel(result as BillOfLadingRow) };
  } catch (error) {
    console.error('Error updating Bill of Lading:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update Bill of Lading' };
  }
}

/**
 * Get a single Bill of Lading by ID
 * @param id - B/L ID
 * @returns BillOfLading or null
 */
export async function getBillOfLading(id: string): Promise<BillOfLading | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? mapBLRowToModel(data as BillOfLadingRow) : null;
  } catch (error) {
    console.error('Error getting Bill of Lading:', error);
    return null;
  }
}

/**
 * Get all Bills of Lading with optional filters
 * @param filters - Optional filters for search, status, booking, etc.
 * @returns Array of BillOfLading
 */
export async function getBillsOfLading(filters?: BLFilters): Promise<BillOfLading[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('bills_of_lading')
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }

    if (filters?.shippingLineId) {
      query = query.eq('shipping_line_id', filters.shippingLineId);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.search) {
      query = query.or(`bl_number.ilike.%${filters.search}%,shipper_name.ilike.%${filters.search}%,consignee_name.ilike.%${filters.search}%,cargo_description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: BillOfLadingRow) => mapBLRowToModel(row));
  } catch (error) {
    console.error('Error getting Bills of Lading:', error);
    return [];
  }
}


// =====================================================
// B/L STATUS TRANSITION FUNCTIONS
// =====================================================

/**
 * Valid status transitions for Bill of Lading
 */
const BL_STATUS_TRANSITIONS: Record<BLStatus, BLStatus[]> = {
  draft: ['submitted', 'amended'],
  submitted: ['issued', 'draft', 'amended'],
  issued: ['released', 'surrendered', 'amended'],
  released: ['amended'],
  surrendered: ['amended'],
  amended: ['submitted', 'issued'],
};

/**
 * Check if a status transition is valid
 * @param currentStatus - Current B/L status
 * @param newStatus - Target status
 * @returns true if transition is valid
 */
function isValidBLStatusTransition(currentStatus: BLStatus, newStatus: BLStatus): boolean {
  const allowedTransitions = BL_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) || false;
}

/**
 * Update B/L status with timestamp recording
 * Records issued_at when transitioning to 'issued'
 * Records released_at when transitioning to 'released' or 'surrendered'
 * Per Requirements 1.7, 7.2, 7.3, 7.4
 * @param id - B/L ID
 * @param newStatus - Target status
 * @returns ActionResult with updated B/L or error
 */
export async function updateBLStatus(id: string, newStatus: BLStatus): Promise<ActionResult<BillOfLading>> {
  try {
    const supabase = await createClient();

    // Get current B/L
    const { data: existing } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Bill of Lading not found' };
    }

    const currentStatus = existing.status as BLStatus;

    // Validate status transition
    if (!isValidBLStatusTransition(currentStatus, newStatus)) {
      return { success: false, error: `Cannot change status from '${currentStatus}' to '${newStatus}'` };
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Record timestamps based on status transition per Requirement 1.7
    if (newStatus === 'issued') {
      updateData.issued_at = new Date().toISOString();
    } else if (newStatus === 'released' || newStatus === 'surrendered') {
      updateData.released_at = new Date().toISOString();
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bl');
    revalidatePath(`/agency/bl/${id}`);
    return { success: true, data: mapBLRowToModel(result as BillOfLadingRow) };
  } catch (error) {
    console.error('Error updating B/L status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update B/L status' };
  }
}

/**
 * Submit B/L to carrier (transition to 'submitted' status)
 * Per Requirement 7.2
 * @param id - B/L ID
 * @returns ActionResult with updated B/L or error
 */
export async function submitBillOfLading(id: string): Promise<ActionResult<BillOfLading>> {
  return updateBLStatus(id, 'submitted');
}

/**
 * Issue B/L (transition to 'issued' status)
 * Records issued_at timestamp per Requirement 7.3
 * @param id - B/L ID
 * @returns ActionResult with updated B/L or error
 */
export async function issueBillOfLading(id: string): Promise<ActionResult<BillOfLading>> {
  return updateBLStatus(id, 'issued');
}

/**
 * Release B/L via telex release (transition to 'released' status)
 * Records released_at timestamp per Requirement 7.4
 * @param id - B/L ID
 * @returns ActionResult with updated B/L or error
 */
export async function releaseBillOfLading(id: string): Promise<ActionResult<BillOfLading>> {
  return updateBLStatus(id, 'released');
}

/**
 * Surrender B/L (transition to 'surrendered' status)
 * Records released_at timestamp per Requirement 7.4
 * @param id - B/L ID
 * @returns ActionResult with updated B/L or error
 */
export async function surrenderBillOfLading(id: string): Promise<ActionResult<BillOfLading>> {
  return updateBLStatus(id, 'surrendered');
}

// =====================================================
// B/L DELETION
// =====================================================

/**
 * Delete a Bill of Lading
 * Rejects deletion for issued/released/surrendered B/Ls per Requirement 6.6
 * @param id - B/L ID
 * @returns ActionResult with success or error
 */
export async function deleteBillOfLading(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if B/L exists and its status
    const { data: existing } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .select('status, bl_number')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Bill of Lading not found' };
    }

    // Prevent deletion of issued/released/surrendered B/Ls per Requirement 6.6
    const protectedStatuses: BLStatus[] = ['issued', 'released', 'surrendered'];
    if (protectedStatuses.includes(existing.status as BLStatus)) {
      return { 
        success: false, 
        error: 'Cannot delete an issued Bill of Lading. Use amendment workflow instead' 
      };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/bl');
    return { success: true };
  } catch (error) {
    console.error('Error deleting Bill of Lading:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete Bill of Lading' };
  }
}

// canDeleteBillOfLading moved to lib/bl-documentation-utils.ts


// =====================================================
// SHIPPING INSTRUCTION CRUD OPERATIONS
// =====================================================

/**
 * Create a new Shipping Instruction
 * Sets initial status to 'draft' per Requirement 7.5
 * Auto-generates SI number in format SI-YYYY-NNNNN per Requirement 2.1
 * @param data - SI form data
 * @returns ActionResult with created SI or error
 */
export async function createShippingInstruction(data: SIFormData): Promise<ActionResult<ShippingInstruction>> {
  try {
    // Validate required fields
    if (!data.bookingId?.trim()) {
      return { success: false, error: 'A freight booking must be selected' };
    }

    if (!data.shipperName?.trim()) {
      return { success: false, error: 'Shipper name is required' };
    }

    if (!data.shipperAddress?.trim()) {
      return { success: false, error: 'Shipper address is required' };
    }

    if (!data.cargoDescription?.trim()) {
      return { success: false, error: 'Cargo description is required' };
    }

    const supabase = await createClient();

    const insertData = {
      booking_id: data.bookingId,
      shipper_name: data.shipperName,
      shipper_address: data.shipperAddress,
      shipper_contact: data.shipperContact || null,
      consignee_name: data.consigneeName || null,
      consignee_address: data.consigneeAddress || null,
      consignee_to_order: data.consigneeToOrder || false,
      to_order_text: data.toOrderText || null,
      notify_party_name: data.notifyPartyName || null,
      notify_party_address: data.notifyPartyAddress || null,
      second_notify_name: data.secondNotifyName || null,
      second_notify_address: data.secondNotifyAddress || null,
      cargo_description: data.cargoDescription,
      marks_and_numbers: data.marksAndNumbers || null,
      hs_code: data.hsCode || null,
      number_of_packages: data.numberOfPackages || null,
      package_type: data.packageType || null,
      gross_weight_kg: data.grossWeightKg || null,
      net_weight_kg: data.netWeightKg || null,
      measurement_cbm: data.measurementCbm || null,
      bl_type_requested: data.blTypeRequested || null,
      originals_required: data.originalsRequired || 3,
      copies_required: data.copiesRequired || 3,
      freight_terms: data.freightTerms || 'prepaid',
      special_instructions: data.specialInstructions || null,
      lc_number: data.lcNumber || null,
      lc_issuing_bank: data.lcIssuingBank || null,
      lc_terms: data.lcTerms || null,
      documents_required: data.documentsRequired || [],
      // Initial status is 'draft' per Requirement 7.5
      status: 'draft',
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .insert(insertData)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/si');
    return { success: true, data: mapSIRowToModel(result as ShippingInstructionRow) };
  } catch (error) {
    console.error('Error creating Shipping Instruction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create Shipping Instruction' };
  }
}

/**
 * Update an existing Shipping Instruction
 * @param id - SI ID
 * @param data - Partial SI form data to update
 * @returns ActionResult with updated SI or error
 */
export async function updateShippingInstruction(id: string, data: Partial<SIFormData>): Promise<ActionResult<ShippingInstruction>> {
  try {
    const supabase = await createClient();

    // Check if SI exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipping Instruction not found' };
    }

    // Prevent modification of confirmed SIs (they should use amendment workflow)
    if (existing.status === 'confirmed') {
      return { success: false, error: 'Cannot modify a confirmed Shipping Instruction. Use amendment workflow instead.' };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (data.bookingId !== undefined) updateData.booking_id = data.bookingId;
    if (data.shipperName !== undefined) updateData.shipper_name = data.shipperName;
    if (data.shipperAddress !== undefined) updateData.shipper_address = data.shipperAddress;
    if (data.shipperContact !== undefined) updateData.shipper_contact = data.shipperContact || null;
    if (data.consigneeName !== undefined) updateData.consignee_name = data.consigneeName || null;
    if (data.consigneeAddress !== undefined) updateData.consignee_address = data.consigneeAddress || null;
    if (data.consigneeToOrder !== undefined) updateData.consignee_to_order = data.consigneeToOrder;
    if (data.toOrderText !== undefined) updateData.to_order_text = data.toOrderText || null;
    if (data.notifyPartyName !== undefined) updateData.notify_party_name = data.notifyPartyName || null;
    if (data.notifyPartyAddress !== undefined) updateData.notify_party_address = data.notifyPartyAddress || null;
    if (data.secondNotifyName !== undefined) updateData.second_notify_name = data.secondNotifyName || null;
    if (data.secondNotifyAddress !== undefined) updateData.second_notify_address = data.secondNotifyAddress || null;
    if (data.cargoDescription !== undefined) updateData.cargo_description = data.cargoDescription;
    if (data.marksAndNumbers !== undefined) updateData.marks_and_numbers = data.marksAndNumbers || null;
    if (data.hsCode !== undefined) updateData.hs_code = data.hsCode || null;
    if (data.numberOfPackages !== undefined) updateData.number_of_packages = data.numberOfPackages || null;
    if (data.packageType !== undefined) updateData.package_type = data.packageType || null;
    if (data.grossWeightKg !== undefined) updateData.gross_weight_kg = data.grossWeightKg || null;
    if (data.netWeightKg !== undefined) updateData.net_weight_kg = data.netWeightKg || null;
    if (data.measurementCbm !== undefined) updateData.measurement_cbm = data.measurementCbm || null;
    if (data.blTypeRequested !== undefined) updateData.bl_type_requested = data.blTypeRequested || null;
    if (data.originalsRequired !== undefined) updateData.originals_required = data.originalsRequired;
    if (data.copiesRequired !== undefined) updateData.copies_required = data.copiesRequired;
    if (data.freightTerms !== undefined) updateData.freight_terms = data.freightTerms;
    if (data.specialInstructions !== undefined) updateData.special_instructions = data.specialInstructions || null;
    if (data.lcNumber !== undefined) updateData.lc_number = data.lcNumber || null;
    if (data.lcIssuingBank !== undefined) updateData.lc_issuing_bank = data.lcIssuingBank || null;
    if (data.lcTerms !== undefined) updateData.lc_terms = data.lcTerms || null;
    if (data.documentsRequired !== undefined) updateData.documents_required = data.documentsRequired || [];

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/si');
    revalidatePath(`/agency/si/${id}`);
    return { success: true, data: mapSIRowToModel(result as ShippingInstructionRow) };
  } catch (error) {
    console.error('Error updating Shipping Instruction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update Shipping Instruction' };
  }
}

/**
 * Get a single Shipping Instruction by ID
 * @param id - SI ID
 * @returns ShippingInstruction or null
 */
export async function getShippingInstruction(id: string): Promise<ShippingInstruction | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? mapSIRowToModel(data as ShippingInstructionRow) : null;
  } catch (error) {
    console.error('Error getting Shipping Instruction:', error);
    return null;
  }
}

/**
 * Get all Shipping Instructions with optional filters
 * @param filters - Optional filters for search, status, booking, etc.
 * @returns Array of ShippingInstruction
 */
export async function getShippingInstructions(filters?: SIFilters): Promise<ShippingInstruction[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.search) {
      query = query.or(`si_number.ilike.%${filters.search}%,shipper_name.ilike.%${filters.search}%,consignee_name.ilike.%${filters.search}%,cargo_description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: ShippingInstructionRow) => mapSIRowToModel(row));
  } catch (error) {
    console.error('Error getting Shipping Instructions:', error);
    return [];
  }
}

/**
 * Delete a Shipping Instruction
 * Only allows deletion of draft or submitted SIs
 * @param id - SI ID
 * @returns ActionResult with success or error
 */
export async function deleteShippingInstruction(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if SI exists and its status
    const { data: existing } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select('status, si_number')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipping Instruction not found' };
    }

    // Prevent deletion of confirmed SIs
    if (existing.status === 'confirmed') {
      return { 
        success: false, 
        error: 'Cannot delete a confirmed Shipping Instruction' 
      };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/si');
    return { success: true };
  } catch (error) {
    console.error('Error deleting Shipping Instruction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete Shipping Instruction' };
  }
}


// =====================================================
// SI STATUS TRANSITION FUNCTIONS
// =====================================================

/**
 * Valid status transitions for Shipping Instructions
 */
const SI_STATUS_TRANSITIONS: Record<SIStatus, SIStatus[]> = {
  draft: ['submitted', 'amended'],
  submitted: ['confirmed', 'draft', 'amended'],
  confirmed: ['amended'],
  amended: ['submitted', 'confirmed'],
};

/**
 * Check if a status transition is valid for SI
 * @param currentStatus - Current SI status
 * @param newStatus - Target status
 * @returns true if transition is valid
 */
function isValidSIStatusTransition(currentStatus: SIStatus, newStatus: SIStatus): boolean {
  const allowedTransitions = SI_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) || false;
}

/**
 * Submit Shipping Instruction to carrier
 * Sets status to 'submitted' and records submitted_at timestamp
 * Per Requirements 2.2, 7.5
 * @param id - SI ID
 * @returns ActionResult with updated SI or error
 */
export async function submitShippingInstruction(id: string): Promise<ActionResult<ShippingInstruction>> {
  try {
    const supabase = await createClient();

    // Get current SI
    const { data: existing } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipping Instruction not found' };
    }

    const currentStatus = existing.status as SIStatus;

    // Validate status transition
    if (!isValidSIStatusTransition(currentStatus, 'submitted')) {
      return { success: false, error: `Cannot submit SI from '${currentStatus}' status` };
    }

    const updateData = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/si');
    revalidatePath(`/agency/si/${id}`);
    return { success: true, data: mapSIRowToModel(result as ShippingInstructionRow) };
  } catch (error) {
    console.error('Error submitting Shipping Instruction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit Shipping Instruction' };
  }
}

/**
 * Confirm Shipping Instruction and link to Bill of Lading
 * Sets status to 'confirmed', records confirmed_at timestamp, and links to B/L
 * Per Requirements 2.6, 2.7
 * @param id - SI ID
 * @param blId - Bill of Lading ID to link
 * @returns ActionResult with updated SI or error
 */
export async function confirmShippingInstruction(id: string, blId: string): Promise<ActionResult<ShippingInstruction>> {
  try {
    const supabase = await createClient();

    // Get current SI
    const { data: existing } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipping Instruction not found' };
    }

    const currentStatus = existing.status as SIStatus;

    // Validate status transition
    if (!isValidSIStatusTransition(currentStatus, 'confirmed')) {
      return { success: false, error: `Cannot confirm SI from '${currentStatus}' status` };
    }

    // Verify B/L exists
    const { data: bl } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .select('id, bl_number')
      .eq('id', blId)
      .single();

    if (!bl) {
      return { success: false, error: 'Bill of Lading not found' };
    }

    const updateData = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      bl_id: blId,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/si');
    revalidatePath(`/agency/si/${id}`);
    return { success: true, data: mapSIRowToModel(result as ShippingInstructionRow) };
  } catch (error) {
    console.error('Error confirming Shipping Instruction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to confirm Shipping Instruction' };
  }
}

/**
 * Amend a Shipping Instruction
 * Sets status to 'amended' per Requirement 2.7
 * @param id - SI ID
 * @returns ActionResult with updated SI or error
 */
export async function amendShippingInstruction(id: string): Promise<ActionResult<ShippingInstruction>> {
  try {
    const supabase = await createClient();

    // Get current SI
    const { data: existing } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipping Instruction not found' };
    }

    const currentStatus = existing.status as SIStatus;

    // Validate status transition
    if (!isValidSIStatusTransition(currentStatus, 'amended')) {
      return { success: false, error: `Cannot amend SI from '${currentStatus}' status` };
    }

    const updateData = {
      status: 'amended',
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/si');
    revalidatePath(`/agency/si/${id}`);
    return { success: true, data: mapSIRowToModel(result as ShippingInstructionRow) };
  } catch (error) {
    console.error('Error amending Shipping Instruction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to amend Shipping Instruction' };
  }
}

/**
 * Update SI status with timestamp recording
 * Generic function for status transitions
 * @param id - SI ID
 * @param newStatus - Target status
 * @returns ActionResult with updated SI or error
 */
export async function updateSIStatus(id: string, newStatus: SIStatus): Promise<ActionResult<ShippingInstruction>> {
  try {
    const supabase = await createClient();

    // Get current SI
    const { data: existing } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipping Instruction not found' };
    }

    const currentStatus = existing.status as SIStatus;

    // Validate status transition
    if (!isValidSIStatusTransition(currentStatus, newStatus)) {
      return { success: false, error: `Cannot change status from '${currentStatus}' to '${newStatus}'` };
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Record timestamps based on status transition
    if (newStatus === 'submitted') {
      updateData.submitted_at = new Date().toISOString();
    } else if (newStatus === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
        bills_of_lading:bl_id(id, bl_number, status)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/si');
    revalidatePath(`/agency/si/${id}`);
    return { success: true, data: mapSIRowToModel(result as ShippingInstructionRow) };
  } catch (error) {
    console.error('Error updating SI status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update SI status' };
  }
}


// =====================================================
// ARRIVAL NOTICE CRUD OPERATIONS
// =====================================================

/**
 * Create a new Arrival Notice
 * Sets initial status to 'pending' per Requirement 7.6
 * Calculates free_time_expires based on ETA and free time days per Requirement 3.2
 * @param data - Arrival Notice form data
 * @returns ActionResult with created Arrival Notice or error
 */
export async function createArrivalNotice(data: ArrivalNoticeFormData): Promise<ActionResult<ArrivalNotice>> {
  try {
    // Validate required fields per Requirement 6.3
    const validation = validateArrivalNoticeData(data);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      return { success: false, error: errorMessages };
    }

    const supabase = await createClient();

    // Calculate free time expiry if ETA and free time days are provided
    const freeTimeDays = data.freeTimeDays || 7; // Default 7 days free time
    const freeTimeExpires = data.eta ? calculateFreeTimeExpiry(data.eta, freeTimeDays) : null;

    const insertData = {
      bl_id: data.blId,
      booking_id: data.bookingId || null,
      vessel_name: data.vesselName,
      voyage_number: data.voyageNumber || null,
      eta: data.eta,
      ata: data.ata || null,
      port_of_discharge: data.portOfDischarge,
      terminal: data.terminal || null,
      berth: data.berth || null,
      container_numbers: data.containerNumbers || [],
      cargo_description: data.cargoDescription || null,
      free_time_days: freeTimeDays,
      free_time_expires: freeTimeExpires,
      estimated_charges: data.estimatedCharges || [],
      delivery_instructions: data.deliveryInstructions || null,
      delivery_address: data.deliveryAddress || null,
      consignee_notified: false,
      // Initial status is 'pending' per Requirement 7.6
      status: 'pending',
      notes: data.notes || null,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .insert(insertData)
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/arrivals');
    return { success: true, data: mapArrivalNoticeRowToModel(result as ArrivalNoticeRow) };
  } catch (error) {
    console.error('Error creating Arrival Notice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create Arrival Notice' };
  }
}

/**
 * Update an existing Arrival Notice
 * @param id - Arrival Notice ID
 * @param data - Partial Arrival Notice form data to update
 * @returns ActionResult with updated Arrival Notice or error
 */
export async function updateArrivalNotice(id: string, data: Partial<ArrivalNoticeFormData>): Promise<ActionResult<ArrivalNotice>> {
  try {
    const supabase = await createClient();

    // Check if Arrival Notice exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .select('status, eta, free_time_days')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Arrival Notice not found' };
    }

    // Prevent modification of delivered notices
    if (existing.status === 'delivered') {
      return { success: false, error: 'Cannot modify a delivered Arrival Notice' };
    }

    const updateData: Record<string, unknown> = {};

    // Only update fields that are provided
    if (data.blId !== undefined) updateData.bl_id = data.blId;
    if (data.bookingId !== undefined) updateData.booking_id = data.bookingId || null;
    if (data.vesselName !== undefined) updateData.vessel_name = data.vesselName;
    if (data.voyageNumber !== undefined) updateData.voyage_number = data.voyageNumber || null;
    if (data.eta !== undefined) updateData.eta = data.eta;
    if (data.ata !== undefined) updateData.ata = data.ata || null;
    if (data.portOfDischarge !== undefined) updateData.port_of_discharge = data.portOfDischarge;
    if (data.terminal !== undefined) updateData.terminal = data.terminal || null;
    if (data.berth !== undefined) updateData.berth = data.berth || null;
    if (data.containerNumbers !== undefined) updateData.container_numbers = data.containerNumbers || [];
    if (data.cargoDescription !== undefined) updateData.cargo_description = data.cargoDescription || null;
    if (data.freeTimeDays !== undefined) updateData.free_time_days = data.freeTimeDays;
    if (data.estimatedCharges !== undefined) updateData.estimated_charges = data.estimatedCharges || [];
    if (data.deliveryInstructions !== undefined) updateData.delivery_instructions = data.deliveryInstructions || null;
    if (data.deliveryAddress !== undefined) updateData.delivery_address = data.deliveryAddress || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    // Recalculate free time expiry if ETA or free time days changed
    const newEta = data.eta !== undefined ? data.eta : existing.eta;
    const newFreeTimeDays = data.freeTimeDays !== undefined ? data.freeTimeDays : existing.free_time_days;
    if (data.eta !== undefined || data.freeTimeDays !== undefined) {
      updateData.free_time_expires = calculateFreeTimeExpiry(newEta, newFreeTimeDays);
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/arrivals');
    revalidatePath(`/agency/arrivals/${id}`);
    return { success: true, data: mapArrivalNoticeRowToModel(result as ArrivalNoticeRow) };
  } catch (error) {
    console.error('Error updating Arrival Notice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update Arrival Notice' };
  }
}

/**
 * Get a single Arrival Notice by ID
 * @param id - Arrival Notice ID
 * @returns ArrivalNotice or null
 */
export async function getArrivalNotice(id: string): Promise<ArrivalNotice | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? mapArrivalNoticeRowToModel(data as ArrivalNoticeRow) : null;
  } catch (error) {
    console.error('Error getting Arrival Notice:', error);
    return null;
  }
}

/**
 * Get all Arrival Notices with optional filters
 * @param filters - Optional filters for search, status, etc.
 * @returns Array of ArrivalNotice
 */
export async function getArrivalNotices(filters?: {
  search?: string;
  status?: ArrivalNoticeStatus;
  blId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ArrivalNotice[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('arrival_notices')
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .order('eta', { ascending: true });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.blId) {
      query = query.eq('bl_id', filters.blId);
    }

    if (filters?.dateFrom) {
      query = query.gte('eta', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('eta', filters.dateTo);
    }

    if (filters?.search) {
      query = query.or(`notice_number.ilike.%${filters.search}%,vessel_name.ilike.%${filters.search}%,port_of_discharge.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: ArrivalNoticeRow) => mapArrivalNoticeRowToModel(row));
  } catch (error) {
    console.error('Error getting Arrival Notices:', error);
    return [];
  }
}

/**
 * Delete an Arrival Notice
 * Only allows deletion of pending notices
 * @param id - Arrival Notice ID
 * @returns ActionResult with success or error
 */
export async function deleteArrivalNotice(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if Arrival Notice exists and its status
    const { data: existing } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .select('status, notice_number')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Arrival Notice not found' };
    }

    // Prevent deletion of notified/cleared/delivered notices
    const protectedStatuses: ArrivalNoticeStatus[] = ['notified', 'cleared', 'delivered'];
    if (protectedStatuses.includes(existing.status as ArrivalNoticeStatus)) {
      return { 
        success: false, 
        error: 'Cannot delete an Arrival Notice that has been notified, cleared, or delivered' 
      };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/arrivals');
    return { success: true };
  } catch (error) {
    console.error('Error deleting Arrival Notice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete Arrival Notice' };
  }
}


// =====================================================
// ARRIVAL NOTICE STATUS TRANSITION FUNCTIONS
// =====================================================

/**
 * Valid status transitions for Arrival Notices
 */
const ARRIVAL_NOTICE_STATUS_TRANSITIONS: Record<ArrivalNoticeStatus, ArrivalNoticeStatus[]> = {
  pending: ['notified'],
  notified: ['cleared'],
  cleared: ['delivered'],
  delivered: [], // Terminal state
};

/**
 * Check if a status transition is valid for Arrival Notice
 * @param currentStatus - Current Arrival Notice status
 * @param newStatus - Target status
 * @returns true if transition is valid
 */
function isValidArrivalNoticeStatusTransition(currentStatus: ArrivalNoticeStatus, newStatus: ArrivalNoticeStatus): boolean {
  const allowedTransitions = ARRIVAL_NOTICE_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) || false;
}

/**
 * Mark consignee as notified
 * Sets consignee_notified to true, records notified_at timestamp and notified_by
 * Updates status to 'notified'
 * Per Requirements 3.4
 * @param id - Arrival Notice ID
 * @param notifiedBy - Name/ID of person who notified
 * @returns ActionResult with updated Arrival Notice or error
 */
export async function markConsigneeNotified(id: string, notifiedBy: string): Promise<ActionResult<ArrivalNotice>> {
  try {
    const supabase = await createClient();

    // Get current Arrival Notice
    const { data: existing } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Arrival Notice not found' };
    }

    const currentStatus = existing.status as ArrivalNoticeStatus;

    // Validate status transition
    if (!isValidArrivalNoticeStatusTransition(currentStatus, 'notified')) {
      return { success: false, error: `Cannot mark as notified from '${currentStatus}' status` };
    }

    const updateData = {
      status: 'notified',
      consignee_notified: true,
      notified_at: new Date().toISOString(),
      notified_by: notifiedBy,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/arrivals');
    revalidatePath(`/agency/arrivals/${id}`);
    return { success: true, data: mapArrivalNoticeRowToModel(result as ArrivalNoticeRow) };
  } catch (error) {
    console.error('Error marking consignee notified:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark consignee as notified' };
  }
}

/**
 * Mark cargo as cleared
 * Updates status to 'cleared' and records cleared_at timestamp
 * Per Requirements 3.5
 * @param id - Arrival Notice ID
 * @returns ActionResult with updated Arrival Notice or error
 */
export async function markCargoCleared(id: string): Promise<ActionResult<ArrivalNotice>> {
  try {
    const supabase = await createClient();

    // Get current Arrival Notice
    const { data: existing } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Arrival Notice not found' };
    }

    const currentStatus = existing.status as ArrivalNoticeStatus;

    // Validate status transition
    if (!isValidArrivalNoticeStatusTransition(currentStatus, 'cleared')) {
      return { success: false, error: `Cannot mark as cleared from '${currentStatus}' status` };
    }

    const updateData = {
      status: 'cleared',
      cleared_at: new Date().toISOString(),
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/arrivals');
    revalidatePath(`/agency/arrivals/${id}`);
    return { success: true, data: mapArrivalNoticeRowToModel(result as ArrivalNoticeRow) };
  } catch (error) {
    console.error('Error marking cargo cleared:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark cargo as cleared' };
  }
}

/**
 * Mark cargo as delivered
 * Updates status to 'delivered' and records delivered_at timestamp
 * Per Requirements 3.6
 * @param id - Arrival Notice ID
 * @returns ActionResult with updated Arrival Notice or error
 */
export async function markCargoDelivered(id: string): Promise<ActionResult<ArrivalNotice>> {
  try {
    const supabase = await createClient();

    // Get current Arrival Notice
    const { data: existing } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Arrival Notice not found' };
    }

    const currentStatus = existing.status as ArrivalNoticeStatus;

    // Validate status transition
    if (!isValidArrivalNoticeStatusTransition(currentStatus, 'delivered')) {
      return { success: false, error: `Cannot mark as delivered from '${currentStatus}' status` };
    }

    const updateData = {
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/arrivals');
    revalidatePath(`/agency/arrivals/${id}`);
    return { success: true, data: mapArrivalNoticeRowToModel(result as ArrivalNoticeRow) };
  } catch (error) {
    console.error('Error marking cargo delivered:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark cargo as delivered' };
  }
}

/**
 * Update Arrival Notice status with timestamp recording
 * Generic function for status transitions
 * @param id - Arrival Notice ID
 * @param newStatus - Target status
 * @param notifiedBy - Required when transitioning to 'notified'
 * @returns ActionResult with updated Arrival Notice or error
 */
export async function updateArrivalNoticeStatus(
  id: string, 
  newStatus: ArrivalNoticeStatus,
  notifiedBy?: string
): Promise<ActionResult<ArrivalNotice>> {
  // Route to specific functions based on status
  switch (newStatus) {
    case 'notified':
      if (!notifiedBy) {
        return { success: false, error: 'notifiedBy is required when marking as notified' };
      }
      return markConsigneeNotified(id, notifiedBy);
    case 'cleared':
      return markCargoCleared(id);
    case 'delivered':
      return markCargoDelivered(id);
    default:
      return { success: false, error: `Invalid status transition to '${newStatus}'` };
  }
}


// =====================================================
// PENDING ARRIVALS QUERY
// =====================================================

/**
 * Get all pending arrivals ordered by ETA
 * Returns arrival notices with status 'pending' or 'notified' ordered by ETA ascending
 * Per Requirement 3.7
 * @returns Array of ArrivalNotice ordered by ETA
 */
export async function getPendingArrivals(): Promise<ArrivalNotice[]> {
  try {
    const supabase = await createClient();

    // Query arrival notices with status 'pending' or 'notified', ordered by ETA
    const { data, error } = await (supabase as SupabaseAny)
      .from('arrival_notices')
      .select(`
        *,
        bills_of_lading:bl_id(id, bl_number, shipper_name, consignee_name, vessel_name),
        freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number)
      `)
      .in('status', ['pending', 'notified'])
      .order('eta', { ascending: true });

    if (error) throw error;
    return (data || []).map((row: ArrivalNoticeRow) => mapArrivalNoticeRowToModel(row));
  } catch (error) {
    console.error('Error getting pending arrivals:', error);
    return [];
  }
}

// filterPendingArrivals moved to lib/bl-documentation-utils.ts


// =====================================================
// CARGO MANIFEST CRUD OPERATIONS
// =====================================================

/**
 * Create a new Cargo Manifest
 * Sets initial status to 'draft' per Requirement 7.7
 * @param data - Manifest form data
 * @returns ActionResult with created Manifest or error
 */
export async function createCargoManifest(data: ManifestFormData): Promise<ActionResult<CargoManifest>> {
  try {
    // Validate required fields
    if (!data.manifestType) {
      return { success: false, error: 'Manifest type is required' };
    }

    if (!data.vesselName?.trim()) {
      return { success: false, error: 'Vessel name is required' };
    }

    const supabase = await createClient();

    // If B/L IDs are provided, fetch them to calculate totals
    let totals = {
      totalBls: 0,
      totalContainers: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      totalCbm: 0,
    };

    if (data.blIds && data.blIds.length > 0) {
      const { data: bls } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select('*')
        .in('id', data.blIds);

      if (bls && bls.length > 0) {
        const mappedBls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
        totals = calculateManifestTotals(mappedBls);
      }
    }

    const insertData = {
      manifest_type: data.manifestType,
      vessel_name: data.vesselName,
      voyage_number: data.voyageNumber || null,
      port_of_loading: data.portOfLoading || null,
      port_of_discharge: data.portOfDischarge || null,
      departure_date: data.departureDate || null,
      arrival_date: data.arrivalDate || null,
      bl_ids: data.blIds || [],
      total_bls: totals.totalBls,
      total_containers: totals.totalContainers,
      total_packages: totals.totalPackages,
      total_weight_kg: totals.totalWeightKg,
      total_cbm: totals.totalCbm,
      // Initial status is 'draft' per Requirement 7.7
      status: 'draft',
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    console.error('Error creating Cargo Manifest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create Cargo Manifest' };
  }
}

/**
 * Update an existing Cargo Manifest
 * @param id - Manifest ID
 * @param data - Partial Manifest form data to update
 * @returns ActionResult with updated Manifest or error
 */
export async function updateCargoManifest(id: string, data: Partial<ManifestFormData>): Promise<ActionResult<CargoManifest>> {
  try {
    const supabase = await createClient();

    // Check if Manifest exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    // Prevent modification of approved manifests
    if (existing.status === 'approved') {
      return { success: false, error: 'Cannot modify an approved Cargo Manifest' };
    }

    const updateData: Record<string, unknown> = {};

    // Only update fields that are provided
    if (data.manifestType !== undefined) updateData.manifest_type = data.manifestType;
    if (data.vesselName !== undefined) updateData.vessel_name = data.vesselName;
    if (data.voyageNumber !== undefined) updateData.voyage_number = data.voyageNumber || null;
    if (data.portOfLoading !== undefined) updateData.port_of_loading = data.portOfLoading || null;
    if (data.portOfDischarge !== undefined) updateData.port_of_discharge = data.portOfDischarge || null;
    if (data.departureDate !== undefined) updateData.departure_date = data.departureDate || null;
    if (data.arrivalDate !== undefined) updateData.arrival_date = data.arrivalDate || null;

    // If B/L IDs are updated, recalculate totals
    if (data.blIds !== undefined) {
      updateData.bl_ids = data.blIds || [];
      
      if (data.blIds && data.blIds.length > 0) {
        const { data: bls } = await (supabase as SupabaseAny)
          .from('bills_of_lading')
          .select('*')
          .in('id', data.blIds);

        if (bls && bls.length > 0) {
          const mappedBls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
          const totals = calculateManifestTotals(mappedBls);
          updateData.total_bls = totals.totalBls;
          updateData.total_containers = totals.totalContainers;
          updateData.total_packages = totals.totalPackages;
          updateData.total_weight_kg = totals.totalWeightKg;
          updateData.total_cbm = totals.totalCbm;
        }
      } else {
        // No B/Ls linked, reset totals
        updateData.total_bls = 0;
        updateData.total_containers = 0;
        updateData.total_packages = 0;
        updateData.total_weight_kg = 0;
        updateData.total_cbm = 0;
      }
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${id}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    console.error('Error updating Cargo Manifest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update Cargo Manifest' };
  }
}

/**
 * Get a single Cargo Manifest by ID
 * @param id - Manifest ID
 * @returns CargoManifest or null
 */
export async function getCargoManifest(id: string): Promise<CargoManifest | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? mapManifestRowToModel(data as CargoManifestRow) : null;
  } catch (error) {
    console.error('Error getting Cargo Manifest:', error);
    return null;
  }
}

/**
 * Get all Cargo Manifests with optional filters
 * @param filters - Optional filters for search, status, type, etc.
 * @returns Array of CargoManifest
 */
export async function getCargoManifests(filters?: ManifestFilters): Promise<CargoManifest[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.manifestType) {
      query = query.eq('manifest_type', filters.manifestType);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.search) {
      query = query.or(`manifest_number.ilike.%${filters.search}%,vessel_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: CargoManifestRow) => mapManifestRowToModel(row));
  } catch (error) {
    console.error('Error getting Cargo Manifests:', error);
    return [];
  }
}

/**
 * Delete a Cargo Manifest
 * Only allows deletion of draft manifests
 * @param id - Manifest ID
 * @returns ActionResult with success or error
 */
export async function deleteCargoManifest(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if Manifest exists and its status
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status, manifest_number')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    // Prevent deletion of submitted/approved manifests
    const protectedStatuses: ManifestStatus[] = ['submitted', 'approved'];
    if (protectedStatuses.includes(existing.status as ManifestStatus)) {
      return { 
        success: false, 
        error: 'Cannot delete a submitted or approved Cargo Manifest' 
      };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/manifests');
    return { success: true };
  } catch (error) {
    console.error('Error deleting Cargo Manifest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete Cargo Manifest' };
  }
}


// =====================================================
// CARGO MANIFEST B/L LINKING AND STATUS FUNCTIONS
// =====================================================

/**
 * Valid status transitions for Cargo Manifests
 */
const MANIFEST_STATUS_TRANSITIONS: Record<ManifestStatus, ManifestStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'draft'],
  approved: [], // Terminal state
};

/**
 * Check if a status transition is valid for Manifest
 * @param currentStatus - Current Manifest status
 * @param newStatus - Target status
 * @returns true if transition is valid
 */
function isValidManifestStatusTransition(currentStatus: ManifestStatus, newStatus: ManifestStatus): boolean {
  const allowedTransitions = MANIFEST_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) || false;
}

/**
 * Link Bills of Lading to a Cargo Manifest
 * Updates bl_ids and recalculates totals from linked B/Ls
 * Per Requirements 4.2, 4.3
 * @param manifestId - Manifest ID
 * @param blIds - Array of B/L IDs to link
 * @returns ActionResult with updated Manifest or error
 */
export async function linkBLsToManifest(manifestId: string, blIds: string[]): Promise<ActionResult<CargoManifest>> {
  try {
    const supabase = await createClient();

    // Check if Manifest exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status')
      .eq('id', manifestId)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    // Prevent modification of approved manifests
    if (existing.status === 'approved') {
      return { success: false, error: 'Cannot modify an approved Cargo Manifest' };
    }

    // Fetch B/Ls to calculate totals
    let totals = {
      totalBls: 0,
      totalContainers: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      totalCbm: 0,
    };

    if (blIds && blIds.length > 0) {
      const { data: bls, error: blError } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select('*')
        .in('id', blIds);

      if (blError) throw blError;

      if (bls && bls.length > 0) {
        const mappedBls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
        totals = calculateManifestTotals(mappedBls);
      }
    }

    const updateData = {
      bl_ids: blIds || [],
      total_bls: totals.totalBls,
      total_containers: totals.totalContainers,
      total_packages: totals.totalPackages,
      total_weight_kg: totals.totalWeightKg,
      total_cbm: totals.totalCbm,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', manifestId)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${manifestId}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    console.error('Error linking B/Ls to Manifest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to link B/Ls to Manifest' };
  }
}

/**
 * Submit a Cargo Manifest
 * Sets status to 'submitted', records submitted_to and submitted_at
 * Per Requirements 4.4
 * @param id - Manifest ID
 * @param submittedTo - Authority/entity the manifest is submitted to
 * @returns ActionResult with updated Manifest or error
 */
export async function submitManifest(id: string, submittedTo: string): Promise<ActionResult<CargoManifest>> {
  try {
    if (!submittedTo?.trim()) {
      return { success: false, error: 'Submitted to (authority/entity) is required' };
    }

    const supabase = await createClient();

    // Get current Manifest
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status, bl_ids')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    const currentStatus = existing.status as ManifestStatus;

    // Validate status transition
    if (!isValidManifestStatusTransition(currentStatus, 'submitted')) {
      return { success: false, error: `Cannot submit manifest from '${currentStatus}' status` };
    }

    // Optionally validate that manifest has at least one B/L linked
    if (!existing.bl_ids || existing.bl_ids.length === 0) {
      return { success: false, error: 'Cannot submit a manifest without linked Bills of Lading' };
    }

    const updateData = {
      status: 'submitted',
      submitted_to: submittedTo,
      submitted_at: new Date().toISOString(),
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${id}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    console.error('Error submitting Cargo Manifest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit Cargo Manifest' };
  }
}

/**
 * Approve a Cargo Manifest
 * Sets status to 'approved'
 * Per Requirements 4.5
 * @param id - Manifest ID
 * @param documentUrl - Optional URL to approved document
 * @returns ActionResult with updated Manifest or error
 */
export async function approveManifest(id: string, documentUrl?: string): Promise<ActionResult<CargoManifest>> {
  try {
    const supabase = await createClient();

    // Get current Manifest
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    const currentStatus = existing.status as ManifestStatus;

    // Validate status transition
    if (!isValidManifestStatusTransition(currentStatus, 'approved')) {
      return { success: false, error: `Cannot approve manifest from '${currentStatus}' status` };
    }

    const updateData: Record<string, unknown> = {
      status: 'approved',
    };

    // Optionally attach document URL per Requirement 4.5
    if (documentUrl) {
      updateData.document_url = documentUrl;
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${id}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    console.error('Error approving Cargo Manifest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve Cargo Manifest' };
  }
}

/**
 * Update Manifest status with timestamp recording
 * Generic function for status transitions
 * @param id - Manifest ID
 * @param newStatus - Target status
 * @param submittedTo - Required when transitioning to 'submitted'
 * @param documentUrl - Optional when transitioning to 'approved'
 * @returns ActionResult with updated Manifest or error
 */
export async function updateManifestStatus(
  id: string, 
  newStatus: ManifestStatus,
  submittedTo?: string,
  documentUrl?: string
): Promise<ActionResult<CargoManifest>> {
  // Route to specific functions based on status
  switch (newStatus) {
    case 'submitted':
      if (!submittedTo) {
        return { success: false, error: 'submittedTo is required when submitting manifest' };
      }
      return submitManifest(id, submittedTo);
    case 'approved':
      return approveManifest(id, documentUrl);
    default:
      return { success: false, error: `Invalid status transition to '${newStatus}'` };
  }
}

/**
 * Get Cargo Manifest with linked B/Ls populated
 * @param id - Manifest ID
 * @returns CargoManifest with bls array populated or null
 */
export async function getCargoManifestWithBLs(id: string): Promise<CargoManifest | null> {
  try {
    const supabase = await createClient();

    // Get manifest
    const { data: manifest, error: manifestError } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('*')
      .eq('id', id)
      .single();

    if (manifestError) throw manifestError;
    if (!manifest) return null;

    const mappedManifest = mapManifestRowToModel(manifest as CargoManifestRow);

    // Fetch linked B/Ls if any
    if (mappedManifest.blIds && mappedManifest.blIds.length > 0) {
      const { data: bls, error: blsError } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select(`
          *,
          freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
          shipping_lines:shipping_line_id(id, line_name, line_code)
        `)
        .in('id', mappedManifest.blIds);

      if (blsError) throw blsError;

      if (bls && bls.length > 0) {
        mappedManifest.bls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
      }
    }

    return mappedManifest;
  } catch (error) {
    console.error('Error getting Cargo Manifest with B/Ls:', error);
    return null;
  }
}


// =====================================================
// STATISTICS FUNCTIONS
// =====================================================

/**
 * B/L Statistics interface
 */
export interface BLStats {
  total: number;
  draft: number;
  submitted: number;
  issued: number;
  released: number;
  surrendered: number;
  amended: number;
}

/**
 * Get Bill of Lading statistics
 * @returns BLStats object with counts by status
 */
export async function getBLStats(): Promise<BLStats> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('bills_of_lading')
      .select('status');

    if (error) throw error;

    const stats: BLStats = {
      total: 0,
      draft: 0,
      submitted: 0,
      issued: 0,
      released: 0,
      surrendered: 0,
      amended: 0,
    };

    if (data) {
      stats.total = data.length;
      data.forEach((row: { status: string }) => {
        switch (row.status) {
          case 'draft':
            stats.draft++;
            break;
          case 'submitted':
            stats.submitted++;
            break;
          case 'issued':
            stats.issued++;
            break;
          case 'released':
            stats.released++;
            break;
          case 'surrendered':
            stats.surrendered++;
            break;
          case 'amended':
            stats.amended++;
            break;
        }
      });
    }

    return stats;
  } catch (error) {
    console.error('Error getting B/L stats:', error);
    return {
      total: 0,
      draft: 0,
      submitted: 0,
      issued: 0,
      released: 0,
      surrendered: 0,
      amended: 0,
    };
  }
}


/**
 * SI Statistics interface
 */
export interface SIStats {
  total: number;
  draft: number;
  submitted: number;
  confirmed: number;
  amended: number;
}

/**
 * Get Shipping Instruction statistics
 * @returns SIStats object with counts by status
 */
export async function getSIStats(): Promise<SIStats> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('shipping_instructions')
      .select('status');

    if (error) throw error;

    const stats: SIStats = {
      total: 0,
      draft: 0,
      submitted: 0,
      confirmed: 0,
      amended: 0,
    };

    if (data) {
      stats.total = data.length;
      data.forEach((row: { status: string }) => {
        switch (row.status) {
          case 'draft':
            stats.draft++;
            break;
          case 'submitted':
            stats.submitted++;
            break;
          case 'confirmed':
            stats.confirmed++;
            break;
          case 'amended':
            stats.amended++;
            break;
        }
      });
    }

    return stats;
  } catch (error) {
    console.error('Error getting SI stats:', error);
    return {
      total: 0,
      draft: 0,
      submitted: 0,
      confirmed: 0,
      amended: 0,
    };
  }
}
