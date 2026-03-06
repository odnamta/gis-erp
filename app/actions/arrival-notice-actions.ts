'use server';

// =====================================================
// ARRIVAL NOTICE SERVER ACTIONS
// Split from bl-documentation-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeSearchInput } from '@/lib/utils/sanitize';
import {
  ArrivalNotice,
  ArrivalNoticeRow,
  ArrivalNoticeFormData,
  ArrivalNoticeStatus,
} from '@/types/agency';
import {
  mapArrivalNoticeRowToModel,
  validateArrivalNoticeData,
  calculateFreeTimeExpiry,
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
    return { success: true, data: mapArrivalNoticeRowToModel(result as unknown as ArrivalNoticeRow) };
  } catch (error) {
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
    return { success: true, data: mapArrivalNoticeRowToModel(result as unknown as ArrivalNoticeRow) };
  } catch (error) {
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
    return data ? mapArrivalNoticeRowToModel(data as unknown as ArrivalNoticeRow) : null;
  } catch {
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
      const search = sanitizeSearchInput(filters.search);
      query = query.or(`notice_number.ilike.%${search}%,vessel_name.ilike.%${search}%,port_of_discharge.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: ArrivalNoticeRow) => mapArrivalNoticeRowToModel(row));
  } catch {
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
    return { success: true, data: mapArrivalNoticeRowToModel(result as unknown as ArrivalNoticeRow) };
  } catch (error) {
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
    return { success: true, data: mapArrivalNoticeRowToModel(result as unknown as ArrivalNoticeRow) };
  } catch (error) {
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
    return { success: true, data: mapArrivalNoticeRowToModel(result as unknown as ArrivalNoticeRow) };
  } catch (error) {
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
  } catch {
    return [];
  }
}

// filterPendingArrivals moved to lib/bl-documentation-utils.ts
