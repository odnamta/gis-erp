'use server';

// =====================================================
// BILL OF LADING SERVER ACTIONS
// Split from bl-documentation-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeSearchInput } from '@/lib/utils/sanitize';
import {
  BillOfLading,
  BillOfLadingRow,
  BLFormData,
  BLStatus,
  BLFilters,
} from '@/types/agency';
import {
  mapBLRowToModel,
  validateBLData,
  calculateBLTotals,
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
    return { success: true, data: mapBLRowToModel(result as unknown as BillOfLadingRow) };
  } catch (error) {
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
    return { success: true, data: mapBLRowToModel(result as unknown as BillOfLadingRow) };
  } catch (error) {
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
    return data ? mapBLRowToModel(data as unknown as BillOfLadingRow) : null;
  } catch {
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
      const search = sanitizeSearchInput(filters.search);
      query = query.or(`bl_number.ilike.%${search}%,shipper_name.ilike.%${search}%,consignee_name.ilike.%${search}%,cargo_description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: BillOfLadingRow) => mapBLRowToModel(row));
  } catch {
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
    return { success: true, data: mapBLRowToModel(result as unknown as BillOfLadingRow) };
  } catch (error) {
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
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete Bill of Lading' };
  }
}

// canDeleteBillOfLading moved to lib/bl-documentation-utils.ts


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
  } catch {
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
