'use server';

// =====================================================
// SHIPPING INSTRUCTION SERVER ACTIONS
// Split from bl-documentation-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeSearchInput } from '@/lib/utils/sanitize';
import {
  ShippingInstruction,
  ShippingInstructionRow,
  SIFormData,
  SIStatus,
  SIFilters,
} from '@/types/agency';
import {
  mapSIRowToModel,
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
  } catch {
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
      const search = sanitizeSearchInput(filters.search);
      query = query.or(`si_number.ilike.%${search}%,shipper_name.ilike.%${search}%,consignee_name.ilike.%${search}%,cargo_description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: ShippingInstructionRow) => mapSIRowToModel(row));
  } catch {
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
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update SI status' };
  }
}


// =====================================================
// STATISTICS FUNCTIONS
// =====================================================

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
  } catch {
    return {
      total: 0,
      draft: 0,
      submitted: 0,
      confirmed: 0,
      amended: 0,
    };
  }
}
