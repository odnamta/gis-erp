'use server';

// =====================================================
// SHIPMENT TRACKING EVENTS SERVER ACTIONS
// Split from vessel-tracking-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  VesselPositionRecord,
  VesselPositionRow,
  PositionFormData,
  VesselPosition,
  ShipmentTracking,
  ShipmentTrackingRow,
  TrackingEventFormData,
  TrackingSearchParams,
  TrackingSearchResult,
} from '@/types/agency';
import {
  rowToPosition,
  rowToTracking,
  validateCoordinates,
  validateNavigationData,
  validateContainerNumber,
  sortTrackingEventsByTimestamp,
} from '@/lib/vessel-tracking-utils';

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
// POSITION TRACKING OPERATIONS
// =====================================================

/**
 * Record a new vessel position
 * Updates the vessel's current_position field per Requirement 3.4
 * Preserves position history per Requirement 3.5
 * @param data - Position form data
 * @returns ActionResult with created VesselPositionRecord or error
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */
export async function recordPosition(data: PositionFormData): Promise<ActionResult<VesselPositionRecord>> {
  try {
    // Validate required fields
    if (!data.vesselId?.trim()) {
      return { success: false, error: 'Vessel ID is required' };
    }
    if (!data.timestamp?.trim()) {
      return { success: false, error: 'Timestamp is required' };
    }

    // Validate coordinates (Requirements 9.3, 9.4)
    const coordValidation = validateCoordinates(data.latitude, data.longitude);
    if (!coordValidation.isValid) {
      return { success: false, error: coordValidation.errors[0]?.message || 'Invalid coordinates' };
    }

    // Validate navigation data if provided (Requirements 9.5, 9.6)
    if (data.course !== undefined && data.speedKnots !== undefined) {
      const navValidation = validateNavigationData(data.course, data.speedKnots);
      if (!navValidation.isValid) {
        return { success: false, error: navValidation.errors[0]?.message || 'Invalid navigation data' };
      }
    } else if (data.course !== undefined) {
      // Validate course alone
      if (data.course < 0 || data.course > 360) {
        return { success: false, error: 'Course must be between 0 and 360 degrees' };
      }
    } else if (data.speedKnots !== undefined) {
      // Validate speed alone
      if (data.speedKnots < 0) {
        return { success: false, error: 'Speed cannot be negative' };
      }
    }

    const supabase = await createClient();

    // Check if vessel exists
    const { data: vessel, error: vesselError } = await (supabase as SupabaseAny)
      .from('vessels')
      .select('id, vessel_name')
      .eq('id', data.vesselId)
      .single();

    if (vesselError || !vessel) {
      return { success: false, error: 'Vessel not found' };
    }

    // Insert position record (Requirement 3.5 - preserve history)
    const insertData = {
      vessel_id: data.vesselId,
      timestamp: data.timestamp,
      latitude: data.latitude,
      longitude: data.longitude,
      course: data.course ?? null,
      speed_knots: data.speedKnots ?? null,
      status: data.status ?? null,
      destination: data.destination ?? null,
      source: data.source ?? 'manual',
    };

    const { data: positionResult, error: positionError } = await (supabase as SupabaseAny)
      .from('vessel_positions')
      .insert(insertData)
      .select('*')
      .single();

    if (positionError) throw positionError;

    // Update vessel's current_position (Requirement 3.4)
    const currentPosition: VesselPosition = {
      lat: data.latitude,
      lng: data.longitude,
      course: data.course,
      speed: data.speedKnots,
      updatedAt: data.timestamp,
    };

    const { error: updateError } = await (supabase as SupabaseAny)
      .from('vessels')
      .update({
        current_position: currentPosition,
        current_status: data.status ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.vesselId);

    if (updateError) {
      // Don't fail the whole operation, position was recorded
    }

    revalidatePath('/agency/vessels');
    revalidatePath(`/agency/vessels/${data.vesselId}`);
    return { success: true, data: rowToPosition(positionResult as VesselPositionRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record position' };
  }
}

/**
 * Get position history for a vessel
 * Returns positions in chronological order (oldest first)
 * @param vesselId - Vessel ID
 * @param limit - Maximum number of records to return (default: 100)
 * @returns Array of VesselPositionRecord in chronological order
 *
 * **Validates: Requirements 3.5**
 */
export async function getPositionHistory(vesselId: string, limit: number = 100): Promise<VesselPositionRecord[]> {
  try {
    if (!vesselId?.trim()) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('vessel_positions')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row: VesselPositionRow) => rowToPosition(row));
  } catch (error) {
    return [];
  }
}


// =====================================================
// SHIPMENT TRACKING OPERATIONS
// =====================================================

/**
 * Record a new tracking event for a shipment
 * Links events to bookings, B/Ls, or containers per Requirements 4.1
 * Supports all event types per Requirement 4.2
 * @param data - Tracking event form data
 * @returns ActionResult with created ShipmentTracking or error
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.7**
 */
export async function recordTrackingEvent(data: TrackingEventFormData): Promise<ActionResult<ShipmentTracking>> {
  try {
    // Validate required fields
    if (!data.eventType?.trim()) {
      return { success: false, error: 'Event type is required' };
    }
    if (!data.eventTimestamp?.trim()) {
      return { success: false, error: 'Event timestamp is required' };
    }

    // Must have at least one reference (booking, B/L, or container)
    if (!data.bookingId && !data.blId && !data.containerNumber && !data.containerId) {
      return { success: false, error: 'At least one reference (booking, B/L, or container) is required' };
    }

    // Validate container number format if provided (Requirement 4.7)
    if (data.containerNumber) {
      const isValidContainer = validateContainerNumber(data.containerNumber);
      if (!isValidContainer) {
        return { success: false, error: 'Invalid container number format (must be 4 letters + 7 digits with valid check digit)' };
      }
    }

    const supabase = await createClient();

    // Validate booking exists if provided
    if (data.bookingId) {
      const { data: booking, error: bookingError } = await (supabase as SupabaseAny)
        .from('freight_bookings')
        .select('id')
        .eq('id', data.bookingId)
        .maybeSingle();

      if (bookingError || !booking) {
        return { success: false, error: 'Booking not found' };
      }
    }

    // Validate B/L exists if provided
    if (data.blId) {
      const { data: bl, error: blError } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select('id')
        .eq('id', data.blId)
        .maybeSingle();

      if (blError || !bl) {
        return { success: false, error: 'Bill of Lading not found' };
      }
    }

    // Validate container exists if containerId provided
    if (data.containerId) {
      const { data: container, error: containerError } = await (supabase as SupabaseAny)
        .from('booking_containers')
        .select('id')
        .eq('id', data.containerId)
        .maybeSingle();

      if (containerError || !container) {
        return { success: false, error: 'Container not found' };
      }
    }

    const insertData = {
      booking_id: data.bookingId || null,
      bl_id: data.blId || null,
      container_id: data.containerId || null,
      tracking_number: data.trackingNumber || null,
      container_number: data.containerNumber || null,
      event_type: data.eventType,
      event_timestamp: data.eventTimestamp,
      location_name: data.locationName || null,
      location_code: data.locationCode || null,
      terminal: data.terminal || null,
      vessel_name: data.vesselName || null,
      voyage_number: data.voyageNumber || null,
      description: data.description || null,
      is_actual: data.isActual !== undefined ? data.isActual : true,
      source: data.source || null,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('shipment_tracking')
      .insert(insertData)
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, cargo_description),
        bills_of_lading:bl_id(id, bl_number, cargo_description)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/tracking');
    return { success: true, data: rowToTracking(result as ShipmentTrackingRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to record tracking event' };
  }
}

/**
 * Get tracking events with optional filters
 * Returns events in chronological order per Requirement 4.6
 * @param params - Search parameters for filtering events
 * @returns Array of ShipmentTracking in chronological order
 *
 * **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6**
 */
export async function getTrackingEvents(params?: TrackingSearchParams): Promise<ShipmentTracking[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('shipment_tracking')
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, cargo_description),
        bills_of_lading:bl_id(id, bl_number, cargo_description)
      `)
      .order('event_timestamp', { ascending: true });

    // Apply filters
    if (params?.bookingId) {
      query = query.eq('booking_id', params.bookingId);
    }

    if (params?.blId) {
      query = query.eq('bl_id', params.blId);
    }

    if (params?.containerNumber) {
      query = query.eq('container_number', params.containerNumber);
    }

    if (params?.trackingNumber) {
      query = query.eq('tracking_number', params.trackingNumber);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform and ensure chronological order
    const events = (data || []).map((row: ShipmentTrackingRow) => rowToTracking(row));
    return sortTrackingEventsByTimestamp(events);
  } catch (error) {
    return [];
  }
}

/**
 * Search tracking by B/L number, booking number, or container number
 * Returns all related tracking events per Requirements 5.1, 5.2, 5.3
 * @param query - Search query (B/L number, booking number, or container number)
 * @returns TrackingSearchResult with type, reference, and events
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
 */
export async function searchTracking(query: string): Promise<TrackingSearchResult | null> {
  try {
    if (!query?.trim()) {
      return null;
    }

    const searchQuery = query.trim().toUpperCase();
    const supabase = await createClient();

    // Try to detect the type of reference
    // Container numbers: 4 letters + 7 digits (e.g., MSCU1234567)
    // B/L numbers: typically contain letters and numbers with dashes
    // Booking numbers: typically start with BK- or similar prefix

    let searchType: 'bl' | 'booking' | 'container' = 'container';
    let referenceId: string | null = null;
    let booking = null;
    let bl = null;
    let events: ShipmentTracking[] = [];

    // Check if it's a container number format (4 letters + 7 digits)
    const containerPattern = /^[A-Z]{4}\d{7}$/;
    const isContainerNumber = containerPattern.test(searchQuery);

    if (isContainerNumber) {
      // Search by container number (Requirement 5.3)
      searchType = 'container';

      const { data: trackingData, error: trackingError } = await (supabase as SupabaseAny)
        .from('shipment_tracking')
        .select(`
          *,
          freight_bookings:booking_id(id, booking_number, cargo_description, vessel_name, voyage_number),
          bills_of_lading:bl_id(id, bl_number, cargo_description, vessel_name, voyage_number)
        `)
        .eq('container_number', searchQuery)
        .order('event_timestamp', { ascending: true });

      if (!trackingError && trackingData && trackingData.length > 0) {
        events = trackingData.map((row: ShipmentTrackingRow) => rowToTracking(row));

        // Get linked booking/BL info from first event
        if (trackingData[0].freight_bookings) {
          booking = trackingData[0].freight_bookings;
        }
        if (trackingData[0].bills_of_lading) {
          bl = trackingData[0].bills_of_lading;
        }
      }
    } else {
      // Try B/L search first (Requirement 5.1)
      const { data: blData, error: blError } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select('id, bl_number, cargo_description, vessel_name, voyage_number, booking_id')
        .or(`bl_number.ilike.%${searchQuery}%,carrier_bl_number.ilike.%${searchQuery}%`)
        .maybeSingle();

      if (!blError && blData) {
        searchType = 'bl';
        referenceId = blData.id;
        bl = blData;

        // Get booking info if linked
        if (blData.booking_id) {
          const { data: bookingData } = await (supabase as SupabaseAny)
            .from('freight_bookings')
            .select('id, booking_number, cargo_description, vessel_name, voyage_number')
            .eq('id', blData.booking_id)
            .maybeSingle();

          if (bookingData) {
            booking = bookingData;
          }
        }

        // Get tracking events for this B/L
        const { data: trackingData } = await (supabase as SupabaseAny)
          .from('shipment_tracking')
          .select('*')
          .eq('bl_id', blData.id)
          .order('event_timestamp', { ascending: true });

        if (trackingData) {
          events = trackingData.map((row: ShipmentTrackingRow) => rowToTracking(row));
        }
      } else {
        // Try booking search (Requirement 5.2)
        const { data: bookingData, error: bookingError } = await (supabase as SupabaseAny)
          .from('freight_bookings')
          .select('id, booking_number, cargo_description, vessel_name, voyage_number')
          .or(`booking_number.ilike.%${searchQuery}%,carrier_booking_number.ilike.%${searchQuery}%`)
          .maybeSingle();

        if (!bookingError && bookingData) {
          searchType = 'booking';
          referenceId = bookingData.id;
          booking = bookingData;

          // Get tracking events for this booking
          const { data: trackingData } = await (supabase as SupabaseAny)
            .from('shipment_tracking')
            .select('*')
            .eq('booking_id', bookingData.id)
            .order('event_timestamp', { ascending: true });

          if (trackingData) {
            events = trackingData.map((row: ShipmentTrackingRow) => rowToTracking(row));
          }

          // Also check for linked B/L
          const { data: linkedBl } = await (supabase as SupabaseAny)
            .from('bills_of_lading')
            .select('id, bl_number, cargo_description, vessel_name, voyage_number')
            .eq('booking_id', bookingData.id)
            .maybeSingle();

          if (linkedBl) {
            bl = linkedBl;
          }
        }
      }
    }

    // If no results found
    if (events.length === 0 && !booking && !bl) {
      return null;
    }

    // Build vessel info from booking or B/L
    let vesselInfo = undefined;
    const vesselSource = bl || booking;
    if (vesselSource && vesselSource.vessel_name) {
      vesselInfo = {
        name: vesselSource.vessel_name,
        voyage: vesselSource.voyage_number || '',
        position: undefined, // Would need to look up from vessels table
      };
    }

    return {
      type: searchType,
      reference: searchQuery,
      booking: booking ? {
        id: booking.id,
        bookingNumber: booking.booking_number,
        cargoDescription: booking.cargo_description,
        vesselName: booking.vessel_name,
        voyageNumber: booking.voyage_number,
      } as unknown as import('@/types/agency').FreightBooking : undefined,
      bl: bl ? {
        id: bl.id,
        blNumber: bl.bl_number,
        cargoDescription: bl.cargo_description,
        vesselName: bl.vessel_name,
        voyageNumber: bl.voyage_number,
      } as unknown as import('@/types/agency').BillOfLading : undefined,
      events: sortTrackingEventsByTimestamp(events),
      vessel: vesselInfo,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get a single tracking event by ID
 * @param id - Tracking event ID
 * @returns ShipmentTracking or null
 */
export async function getTrackingEvent(id: string): Promise<ShipmentTracking | null> {
  try {
    if (!id?.trim()) {
      return null;
    }

    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('shipment_tracking')
      .select(`
        *,
        freight_bookings:booking_id(id, booking_number, cargo_description),
        bills_of_lading:bl_id(id, bl_number, cargo_description)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? rowToTracking(data as ShipmentTrackingRow) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Delete a tracking event
 * @param id - Tracking event ID
 * @returns ActionResult with success or error
 */
export async function deleteTrackingEvent(id: string): Promise<ActionResult<void>> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'Tracking event ID is required' };
    }

    const supabase = await createClient();

    // Check if event exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('shipment_tracking')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Tracking event not found' };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('shipment_tracking')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/tracking');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete tracking event' };
  }
}
