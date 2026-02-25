'use server';

// =====================================================
// VESSEL + SCHEDULE CRUD SERVER ACTIONS
// Split from vessel-tracking-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  Vessel,
  VesselRow,
  VesselFormData,
  VesselFilters,
  VesselSchedule,
  VesselScheduleRow,
  ScheduleFormData,
  ScheduleFilters,
  UpcomingArrival,
  UpcomingArrivalRow,
  ArrivalFilters,
} from '@/types/agency';
import {
  rowToVessel,
  rowToSchedule,
  rowToUpcomingArrival,
  validateIMO,
  validateMMSI,
  calculateDelayHours,
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
// VESSEL CRUD OPERATIONS
// =====================================================

/**
 * Create a new Vessel
 * Validates IMO and MMSI uniqueness per Requirements 1.4, 1.5
 * @param data - Vessel form data
 * @returns ActionResult with created Vessel or error
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */
export async function createVessel(data: VesselFormData): Promise<ActionResult<Vessel>> {
  try {
    // Validate required fields
    if (!data.vesselName?.trim()) {
      return { success: false, error: 'Vessel name is required' };
    }

    // Validate IMO format if provided
    if (data.imoNumber) {
      const imoValidation = validateIMO(data.imoNumber);
      if (!imoValidation.isValid) {
        return { success: false, error: imoValidation.errors[0]?.message || 'Invalid IMO number' };
      }
    }

    // Validate MMSI format if provided
    if (data.mmsi) {
      const mmsiValidation = validateMMSI(data.mmsi);
      if (!mmsiValidation.isValid) {
        return { success: false, error: mmsiValidation.errors[0]?.message || 'Invalid MMSI' };
      }
    }

    const supabase = await createClient();

    // Check IMO uniqueness if provided (Requirement 1.4)
    if (data.imoNumber) {
      const { data: existingIMO } = await (supabase as SupabaseAny)
        .from('vessels')
        .select('id')
        .eq('imo_number', data.imoNumber)
        .maybeSingle();

      if (existingIMO) {
        return { success: false, error: 'A vessel with this IMO number already exists' };
      }
    }

    // Check MMSI uniqueness if provided (Requirement 1.5)
    if (data.mmsi) {
      const { data: existingMMSI } = await (supabase as SupabaseAny)
        .from('vessels')
        .select('id')
        .eq('mmsi', data.mmsi)
        .maybeSingle();

      if (existingMMSI) {
        return { success: false, error: 'A vessel with this MMSI already exists' };
      }
    }

    const insertData = {
      imo_number: data.imoNumber || null,
      mmsi: data.mmsi || null,
      vessel_name: data.vesselName,
      vessel_type: data.vesselType || null,
      flag: data.flag || null,
      call_sign: data.callSign || null,
      length_m: data.lengthM || null,
      beam_m: data.beamM || null,
      draft_m: data.draftM || null,
      gross_tonnage: data.grossTonnage || null,
      deadweight_tons: data.deadweightTons || null,
      teu_capacity: data.teuCapacity || null,
      owner: data.owner || null,
      operator: data.operator || null,
      shipping_line_id: data.shippingLineId || null,
      current_status: data.currentStatus || null,
      last_port: data.lastPort || null,
      next_port: data.nextPort || null,
      is_active: true,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('vessels')
      .insert(insertData)
      .select(`
        *,
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/vessels');
    return { success: true, data: rowToVessel(result as VesselRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create vessel' };
  }
}

/**
 * Update an existing Vessel
 * Validates IMO and MMSI uniqueness per Requirements 1.4, 1.5
 * @param id - Vessel ID
 * @param data - Partial vessel form data to update
 * @returns ActionResult with updated Vessel or error
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */
export async function updateVessel(id: string, data: Partial<VesselFormData>): Promise<ActionResult<Vessel>> {
  try {
    const supabase = await createClient();

    // Check if vessel exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('vessels')
      .select('id, imo_number, mmsi')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Vessel not found' };
    }

    // Validate IMO format if provided
    if (data.imoNumber !== undefined && data.imoNumber) {
      const imoValidation = validateIMO(data.imoNumber);
      if (!imoValidation.isValid) {
        return { success: false, error: imoValidation.errors[0]?.message || 'Invalid IMO number' };
      }

      // Check IMO uniqueness if changed (Requirement 1.4)
      if (data.imoNumber !== existing.imo_number) {
        const { data: existingIMO } = await (supabase as SupabaseAny)
          .from('vessels')
          .select('id')
          .eq('imo_number', data.imoNumber)
          .neq('id', id)
          .maybeSingle();

        if (existingIMO) {
          return { success: false, error: 'A vessel with this IMO number already exists' };
        }
      }
    }

    // Validate MMSI format if provided
    if (data.mmsi !== undefined && data.mmsi) {
      const mmsiValidation = validateMMSI(data.mmsi);
      if (!mmsiValidation.isValid) {
        return { success: false, error: mmsiValidation.errors[0]?.message || 'Invalid MMSI' };
      }

      // Check MMSI uniqueness if changed (Requirement 1.5)
      if (data.mmsi !== existing.mmsi) {
        const { data: existingMMSI } = await (supabase as SupabaseAny)
          .from('vessels')
          .select('id')
          .eq('mmsi', data.mmsi)
          .neq('id', id)
          .maybeSingle();

        if (existingMMSI) {
          return { success: false, error: 'A vessel with this MMSI already exists' };
        }
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (data.imoNumber !== undefined) updateData.imo_number = data.imoNumber || null;
    if (data.mmsi !== undefined) updateData.mmsi = data.mmsi || null;
    if (data.vesselName !== undefined) updateData.vessel_name = data.vesselName;
    if (data.vesselType !== undefined) updateData.vessel_type = data.vesselType || null;
    if (data.flag !== undefined) updateData.flag = data.flag || null;
    if (data.callSign !== undefined) updateData.call_sign = data.callSign || null;
    if (data.lengthM !== undefined) updateData.length_m = data.lengthM || null;
    if (data.beamM !== undefined) updateData.beam_m = data.beamM || null;
    if (data.draftM !== undefined) updateData.draft_m = data.draftM || null;
    if (data.grossTonnage !== undefined) updateData.gross_tonnage = data.grossTonnage || null;
    if (data.deadweightTons !== undefined) updateData.deadweight_tons = data.deadweightTons || null;
    if (data.teuCapacity !== undefined) updateData.teu_capacity = data.teuCapacity || null;
    if (data.owner !== undefined) updateData.owner = data.owner || null;
    if (data.operator !== undefined) updateData.operator = data.operator || null;
    if (data.shippingLineId !== undefined) updateData.shipping_line_id = data.shippingLineId || null;
    if (data.currentStatus !== undefined) updateData.current_status = data.currentStatus || null;
    if (data.lastPort !== undefined) updateData.last_port = data.lastPort || null;
    if (data.nextPort !== undefined) updateData.next_port = data.nextPort || null;

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('vessels')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/vessels');
    revalidatePath(`/agency/vessels/${id}`);
    return { success: true, data: rowToVessel(result as VesselRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update vessel' };
  }
}

/**
 * Delete (soft delete) a Vessel
 * Sets is_active to false to preserve historical data per Requirement 1.7
 * @param id - Vessel ID
 * @returns ActionResult with success or error
 *
 * **Validates: Requirements 1.7**
 */
export async function deleteVessel(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if vessel exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('vessels')
      .select('id, vessel_name')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Vessel not found' };
    }

    // Soft delete by setting is_active to false (Requirement 1.7)
    const { error } = await (supabase as SupabaseAny)
      .from('vessels')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/vessels');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete vessel' };
  }
}

/**
 * Get a single Vessel by ID
 * @param id - Vessel ID
 * @returns Vessel or null
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.6**
 */
export async function getVessel(id: string): Promise<Vessel | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('vessels')
      .select(`
        *,
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? rowToVessel(data as VesselRow) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Get all Vessels with optional filters
 * By default, only returns active vessels unless includeInactive is true
 * @param filters - Optional filters for search, type, status, etc.
 * @returns Array of Vessel
 *
 * **Validates: Requirements 1.1-1.7**
 */
export async function getVessels(filters?: VesselFilters): Promise<Vessel[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('vessels')
      .select(`
        *,
        shipping_lines:shipping_line_id(id, line_name, line_code)
      `)
      .order('vessel_name', { ascending: true });

    // By default, only show active vessels (Requirement 1.7)
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    } else {
      query = query.eq('is_active', true);
    }

    // Apply filters
    if (filters?.vesselType) {
      query = query.eq('vessel_type', filters.vesselType);
    }

    if (filters?.status) {
      query = query.eq('current_status', filters.status);
    }

    if (filters?.shippingLineId) {
      query = query.eq('shipping_line_id', filters.shippingLineId);
    }

    if (filters?.search) {
      query = query.or(`vessel_name.ilike.%${filters.search}%,imo_number.ilike.%${filters.search}%,mmsi.ilike.%${filters.search}%,call_sign.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: VesselRow) => rowToVessel(row));
  } catch (error) {
    return [];
  }
}


// =====================================================
// SCHEDULE CRUD OPERATIONS
// =====================================================

/**
 * Create a new Vessel Schedule
 * Validates uniqueness of vessel+voyage+port combination per Requirement 2.5
 * Auto-calculates delay hours when actual times are provided per Requirement 2.6
 * @param data - Schedule form data
 * @returns ActionResult with created VesselSchedule or error
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
 */
export async function createSchedule(data: ScheduleFormData): Promise<ActionResult<VesselSchedule>> {
  try {
    // Validate required fields
    if (!data.vesselId?.trim()) {
      return { success: false, error: 'Vessel is required' };
    }
    if (!data.voyageNumber?.trim()) {
      return { success: false, error: 'Voyage number is required' };
    }
    if (!data.portName?.trim()) {
      return { success: false, error: 'Port name is required' };
    }

    const supabase = await createClient();

    // Check vessel exists
    const { data: vessel } = await (supabase as SupabaseAny)
      .from('vessels')
      .select('id')
      .eq('id', data.vesselId)
      .single();

    if (!vessel) {
      return { success: false, error: 'Vessel not found' };
    }

    // Check uniqueness of vessel+voyage+port combination (Requirement 2.5)
    const uniqueQuery = (supabase as SupabaseAny)
      .from('vessel_schedules')
      .select('id')
      .eq('vessel_id', data.vesselId)
      .eq('voyage_number', data.voyageNumber);

    // If portId is provided, use it for uniqueness check; otherwise use port_name
    if (data.portId) {
      uniqueQuery.eq('port_id', data.portId);
    } else {
      uniqueQuery.eq('port_name', data.portName);
    }

    const { data: existingSchedule } = await uniqueQuery.maybeSingle();

    if (existingSchedule) {
      return { success: false, error: 'A schedule for this vessel/voyage/port already exists' };
    }

    // Calculate delay hours if both scheduled and actual arrival are provided (Requirement 2.6)
    let delayHours = 0;
    if (data.scheduledArrival && data.actualArrival) {
      delayHours = calculateDelayHours(data.scheduledArrival, data.actualArrival);
    }

    const insertData = {
      vessel_id: data.vesselId,
      voyage_number: data.voyageNumber,
      service_name: data.serviceName || null,
      service_code: data.serviceCode || null,
      schedule_type: data.scheduleType || 'scheduled',
      port_id: data.portId || null,
      port_name: data.portName,
      terminal: data.terminal || null,
      berth: data.berth || null,
      scheduled_arrival: data.scheduledArrival || null,
      scheduled_departure: data.scheduledDeparture || null,
      actual_arrival: data.actualArrival || null,
      actual_departure: data.actualDeparture || null,
      cargo_cutoff: data.cargoCutoff || null,
      doc_cutoff: data.docCutoff || null,
      vgm_cutoff: data.vgmCutoff || null,
      status: data.status || 'scheduled',
      delay_hours: delayHours,
      delay_reason: data.delayReason || null,
      notes: data.notes || null,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('vessel_schedules')
      .insert(insertData)
      .select(`
        *,
        vessels:vessel_id(id, vessel_name, imo_number, vessel_type),
        ports:port_id(id, port_code, port_name)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/schedules');
    revalidatePath('/agency/vessels');
    return { success: true, data: rowToSchedule(result as VesselScheduleRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create schedule' };
  }
}

/**
 * Update an existing Vessel Schedule
 * Auto-calculates delay hours when actual times are updated per Requirement 2.6
 * Records status transition timestamp per Requirement 2.8
 * @param id - Schedule ID
 * @param data - Partial schedule form data to update
 * @returns ActionResult with updated VesselSchedule or error
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
 */
export async function updateSchedule(id: string, data: Partial<ScheduleFormData>): Promise<ActionResult<VesselSchedule>> {
  try {
    const supabase = await createClient();

    // Check if schedule exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('vessel_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Schedule not found' };
    }

    // Check uniqueness if vessel, voyage, or port is being changed (Requirement 2.5)
    const vesselId = data.vesselId ?? existing.vessel_id;
    const voyageNumber = data.voyageNumber ?? existing.voyage_number;
    const portId = data.portId !== undefined ? data.portId : existing.port_id;
    const portName = data.portName ?? existing.port_name;

    if (data.vesselId || data.voyageNumber || data.portId !== undefined || data.portName) {
      const uniqueQuery = (supabase as SupabaseAny)
        .from('vessel_schedules')
        .select('id')
        .eq('vessel_id', vesselId)
        .eq('voyage_number', voyageNumber)
        .neq('id', id);

      if (portId) {
        uniqueQuery.eq('port_id', portId);
      } else {
        uniqueQuery.eq('port_name', portName);
      }

      const { data: existingSchedule } = await uniqueQuery.maybeSingle();

      if (existingSchedule) {
        return { success: false, error: 'A schedule for this vessel/voyage/port already exists' };
      }
    }

    // Calculate delay hours if actual arrival is being updated (Requirement 2.6)
    const scheduledArrival = data.scheduledArrival ?? existing.scheduled_arrival;
    const actualArrival = data.actualArrival ?? existing.actual_arrival;

    let delayHours = existing.delay_hours;
    if (data.actualArrival !== undefined || data.scheduledArrival !== undefined) {
      if (scheduledArrival && actualArrival) {
        delayHours = calculateDelayHours(scheduledArrival, actualArrival);
      } else {
        delayHours = 0;
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      delay_hours: delayHours,
    };

    // Only update fields that are provided
    if (data.vesselId !== undefined) updateData.vessel_id = data.vesselId;
    if (data.voyageNumber !== undefined) updateData.voyage_number = data.voyageNumber;
    if (data.serviceName !== undefined) updateData.service_name = data.serviceName || null;
    if (data.serviceCode !== undefined) updateData.service_code = data.serviceCode || null;
    if (data.scheduleType !== undefined) updateData.schedule_type = data.scheduleType;
    if (data.portId !== undefined) updateData.port_id = data.portId || null;
    if (data.portName !== undefined) updateData.port_name = data.portName;
    if (data.terminal !== undefined) updateData.terminal = data.terminal || null;
    if (data.berth !== undefined) updateData.berth = data.berth || null;
    if (data.scheduledArrival !== undefined) updateData.scheduled_arrival = data.scheduledArrival || null;
    if (data.scheduledDeparture !== undefined) updateData.scheduled_departure = data.scheduledDeparture || null;
    if (data.actualArrival !== undefined) updateData.actual_arrival = data.actualArrival || null;
    if (data.actualDeparture !== undefined) updateData.actual_departure = data.actualDeparture || null;
    if (data.cargoCutoff !== undefined) updateData.cargo_cutoff = data.cargoCutoff || null;
    if (data.docCutoff !== undefined) updateData.doc_cutoff = data.docCutoff || null;
    if (data.vgmCutoff !== undefined) updateData.vgm_cutoff = data.vgmCutoff || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.delayReason !== undefined) updateData.delay_reason = data.delayReason || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('vessel_schedules')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        vessels:vessel_id(id, vessel_name, imo_number, vessel_type),
        ports:port_id(id, port_code, port_name)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/schedules');
    revalidatePath(`/agency/schedules/${id}`);
    revalidatePath('/agency/vessels');
    return { success: true, data: rowToSchedule(result as VesselScheduleRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update schedule' };
  }
}

/**
 * Delete a Vessel Schedule
 * @param id - Schedule ID
 * @returns ActionResult with success or error
 */
export async function deleteSchedule(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if schedule exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('vessel_schedules')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Schedule not found' };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('vessel_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/schedules');
    revalidatePath('/agency/vessels');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete schedule' };
  }
}

/**
 * Get a single Vessel Schedule by ID
 * @param id - Schedule ID
 * @returns VesselSchedule or null
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */
export async function getSchedule(id: string): Promise<VesselSchedule | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('vessel_schedules')
      .select(`
        *,
        vessels:vessel_id(id, vessel_name, imo_number, vessel_type),
        ports:port_id(id, port_code, port_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? rowToSchedule(data as VesselScheduleRow) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Get all Vessel Schedules with optional filters
 * @param filters - Optional filters for vessel, voyage, port, status, delay, date range
 * @returns Array of VesselSchedule
 *
 * **Validates: Requirements 2.1-2.8**
 */
export async function getSchedules(filters?: ScheduleFilters): Promise<VesselSchedule[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('vessel_schedules')
      .select(`
        *,
        vessels:vessel_id(id, vessel_name, imo_number, vessel_type),
        ports:port_id(id, port_code, port_name)
      `)
      .order('scheduled_arrival', { ascending: true, nullsFirst: false });

    // Apply filters
    if (filters?.vesselId) {
      query = query.eq('vessel_id', filters.vesselId);
    }

    if (filters?.voyageNumber) {
      query = query.eq('voyage_number', filters.voyageNumber);
    }

    if (filters?.portId) {
      query = query.eq('port_id', filters.portId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.hasDelay !== undefined) {
      if (filters.hasDelay) {
        query = query.gt('delay_hours', 0);
      } else {
        query = query.lte('delay_hours', 0);
      }
    }

    if (filters?.dateFrom) {
      query = query.gte('scheduled_arrival', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('scheduled_arrival', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: VesselScheduleRow) => rowToSchedule(row));
  } catch (error) {
    return [];
  }
}

/**
 * Get upcoming vessel arrivals from the view
 * Supports date range filtering per Requirement 7.5
 * Returns arrivals sorted by scheduled arrival time per Requirement 7.6
 * @param filters - Optional filters for date range, port, vessel type
 * @returns Array of UpcomingArrival
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
 */
export async function getUpcomingArrivals(filters?: ArrivalFilters): Promise<UpcomingArrival[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('upcoming_vessel_arrivals')
      .select('*')
      .order('scheduled_arrival', { ascending: true });

    // Apply date range filters (Requirement 7.5)
    if (filters?.dateFrom) {
      query = query.gte('scheduled_arrival', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('scheduled_arrival', filters.dateTo);
    }

    if (filters?.portId) {
      // Note: The view may not have port_id, so we filter by port_name if needed
      // This depends on the view definition
    }

    if (filters?.vesselType) {
      query = query.eq('vessel_type', filters.vesselType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: UpcomingArrivalRow) => rowToUpcomingArrival(row));
  } catch (error) {
    return [];
  }
}
