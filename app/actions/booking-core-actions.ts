'use server';

// =====================================================
// BOOKING CRUD + WORKFLOWS SERVER ACTIONS
// Split from booking-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { revalidatePath } from 'next/cache';
import {
  FreightBooking,
  BookingFormData,
  BookingStatusHistory,
  BookingStatus,
  BookingFilters,
  BookingStats,
} from '@/types/agency';
import {
  isValidStatusTransition,
  validateBookingForSubmission,
} from '@/lib/booking-utils';

// =====================================================
// TYPE CONVERTERS (private — not exported from 'use server')
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBooking(row: any): FreightBooking {
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    jobOrderId: row.job_order_id,
    quotationId: row.quotation_id,
    customerId: row.customer_id,
    shippingLineId: row.shipping_line_id,
    carrierBookingNumber: row.carrier_booking_number,
    originPortId: row.origin_port_id,
    destinationPortId: row.destination_port_id,
    vesselName: row.vessel_name,
    voyageNumber: row.voyage_number,
    etd: row.etd,
    eta: row.eta,
    cutoffDate: row.cutoff_date,
    cutoffTime: row.cutoff_time,
    siCutoff: row.si_cutoff,
    cargoDescription: row.cargo_description,
    hsCode: row.hs_code,
    commodityType: row.commodity_type as FreightBooking['commodityType'],
    containerType: row.container_type as FreightBooking['containerType'],
    containerQuantity: row.container_quantity,
    packagesCount: row.packages_count,
    grossWeightKg: row.gross_weight_kg,
    volumeCbm: row.volume_cbm,
    cargoLengthM: row.cargo_length_m,
    cargoWidthM: row.cargo_width_m,
    cargoHeightM: row.cargo_height_m,
    shipperName: row.shipper_name,
    shipperAddress: row.shipper_address,
    consigneeName: row.consignee_name,
    consigneeAddress: row.consignee_address,
    notifyParty: row.notify_party,
    notifyAddress: row.notify_address,
    incoterm: row.incoterm as FreightBooking['incoterm'],
    freightTerms: row.freight_terms as FreightBooking['freightTerms'],
    freightRate: row.freight_rate,
    freightCurrency: row.freight_currency,
    totalFreight: row.total_freight,
    status: row.status as BookingStatus,
    confirmedAt: row.confirmed_at,
    specialRequirements: row.special_requirements,
    dangerousGoods: row.dangerous_goods,
    documents: row.documents,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shippingLine: row.shipping_lines ? {
      lineName: row.shipping_lines.line_name,
      lineCode: row.shipping_lines.line_code,
    } : undefined,
    originPort: row.origin_port ? {
      portName: row.origin_port.port_name,
      portCode: row.origin_port.port_code,
    } as FreightBooking['originPort'] : undefined,
    destinationPort: row.destination_port ? {
      portName: row.destination_port.port_name,
      portCode: row.destination_port.port_code,
    } as FreightBooking['destinationPort'] : undefined,
    customer: row.customers ? {
      id: row.customers.id,
      name: row.customers.name,
    } : undefined,
    jobOrder: row.job_orders ? {
      id: row.job_orders.id,
      joNumber: row.job_orders.jo_number,
    } : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStatusHistory(row: any): BookingStatusHistory {
  return {
    id: row.id,
    bookingId: row.booking_id,
    oldStatus: row.old_status as BookingStatus | undefined,
    newStatus: row.new_status as BookingStatus,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
    notes: row.notes,
  };
}

// =====================================================
// BOOKING CRUD OPERATIONS
// =====================================================

export async function createBooking(data: BookingFormData): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    const insertData = {
      job_order_id: data.jobOrderId || null,
      quotation_id: data.quotationId || null,
      customer_id: data.customerId || null,
      shipping_line_id: data.shippingLineId,
      carrier_booking_number: data.carrierBookingNumber || null,
      origin_port_id: data.originPortId,
      destination_port_id: data.destinationPortId,
      vessel_name: data.vesselName || null,
      voyage_number: data.voyageNumber || null,
      etd: data.etd || null,
      eta: data.eta || null,
      cutoff_date: data.cutoffDate || null,
      cutoff_time: data.cutoffTime || null,
      si_cutoff: data.siCutoff || null,
      cargo_description: data.cargoDescription,
      hs_code: data.hsCode || null,
      commodity_type: data.commodityType || 'general',
      container_type: data.containerType || null,
      container_quantity: data.containerQuantity || null,
      packages_count: data.packagesCount || null,
      gross_weight_kg: data.grossWeightKg || null,
      volume_cbm: data.volumeCbm || null,
      cargo_length_m: data.cargoLengthM || null,
      cargo_width_m: data.cargoWidthM || null,
      cargo_height_m: data.cargoHeightM || null,
      shipper_name: data.shipperName || null,
      shipper_address: data.shipperAddress || null,
      consignee_name: data.consigneeName || null,
      consignee_address: data.consigneeAddress || null,
      notify_party: data.notifyParty || null,
      notify_address: data.notifyAddress || null,
      incoterm: data.incoterm || null,
      freight_terms: data.freightTerms || 'prepaid',
      freight_rate: data.freightRate || null,
      freight_currency: data.freightCurrency || 'USD',
      total_freight: data.totalFreight || null,
      special_requirements: data.specialRequirements || null,
      dangerous_goods: data.dangerousGoods || null,
      documents: data.documents || [],
      notes: data.notes || null,
      status: 'draft',
    };

    const { data: result, error } = await supabase
      .from('freight_bookings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true, data: rowToBooking(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create booking' };
  }
}

export async function updateBooking(id: string, data: BookingFormData): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Check if booking can be modified
    const { data: existing } = await supabase
      .from('freight_bookings')
      .select('status')
      .eq('id', id)
      .single();

    if (existing?.status === 'cancelled') {
      return { success: false, error: 'Cannot modify a cancelled booking' };
    }

    const updateData = {
      job_order_id: data.jobOrderId || null,
      quotation_id: data.quotationId || null,
      customer_id: data.customerId || null,
      shipping_line_id: data.shippingLineId,
      carrier_booking_number: data.carrierBookingNumber || null,
      origin_port_id: data.originPortId,
      destination_port_id: data.destinationPortId,
      vessel_name: data.vesselName || null,
      voyage_number: data.voyageNumber || null,
      etd: data.etd || null,
      eta: data.eta || null,
      cutoff_date: data.cutoffDate || null,
      cutoff_time: data.cutoffTime || null,
      si_cutoff: data.siCutoff || null,
      cargo_description: data.cargoDescription,
      hs_code: data.hsCode || null,
      commodity_type: data.commodityType || 'general',
      container_type: data.containerType || null,
      container_quantity: data.containerQuantity || null,
      packages_count: data.packagesCount || null,
      gross_weight_kg: data.grossWeightKg || null,
      volume_cbm: data.volumeCbm || null,
      cargo_length_m: data.cargoLengthM || null,
      cargo_width_m: data.cargoWidthM || null,
      cargo_height_m: data.cargoHeightM || null,
      shipper_name: data.shipperName || null,
      shipper_address: data.shipperAddress || null,
      consignee_name: data.consigneeName || null,
      consignee_address: data.consigneeAddress || null,
      notify_party: data.notifyParty || null,
      notify_address: data.notifyAddress || null,
      incoterm: data.incoterm || null,
      freight_terms: data.freightTerms || 'prepaid',
      freight_rate: data.freightRate || null,
      freight_currency: data.freightCurrency || 'USD',
      total_freight: data.totalFreight || null,
      special_requirements: data.specialRequirements || null,
      dangerous_goods: data.dangerousGoods || null,
      documents: data.documents || [],
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('freight_bookings')
      .update(updateData as Record<string, unknown>)
      .eq('id', id)
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    revalidatePath(`/agency/bookings/${id}`);
    return { success: true, data: rowToBooking(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update booking' };
  }
}

export async function getBooking(id: string): Promise<FreightBooking | null> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return null;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('freight_bookings')
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? rowToBooking(data) : null;
  } catch (error) {
    return null;
  }
}

export async function getBookings(filters?: BookingFilters): Promise<FreightBooking[]> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return [];
    }

    const supabase = await createClient();

    let query = supabase
      .from('freight_bookings')
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else if (!filters?.includeInactive) {
      query = query.not('status', 'in', '("cancelled","completed")');
    }

    if (filters?.shippingLineId) {
      query = query.eq('shipping_line_id', filters.shippingLineId);
    }

    if (filters?.originPortId) {
      query = query.eq('origin_port_id', filters.originPortId);
    }

    if (filters?.destinationPortId) {
      query = query.eq('destination_port_id', filters.destinationPortId);
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters?.dateFrom) {
      query = query.gte('etd', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('etd', filters.dateTo);
    }

    if (filters?.search) {
      query = query.or(`booking_number.ilike.%${filters.search}%,cargo_description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(rowToBooking);
  } catch (error) {
    return [];
  }
}

export async function deleteBooking(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('freight_bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete booking' };
  }
}


// =====================================================
// STATUS MANAGEMENT
// =====================================================

export async function submitBookingRequest(id: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Get current booking with containers
    const { data: booking } = await supabase
      .from('freight_bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status as BookingStatus, 'requested')) {
      return { success: false, error: `Cannot change status from ${booking.status} to requested` };
    }

    // Validate booking for submission
    const validation = validateBookingForSubmission(rowToBooking(booking));
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      return { success: false, error: `Validation failed: ${errorMessages}` };
    }

    // Get containers for containerized cargo validation
    const { data: containers } = await supabase
      .from('booking_containers')
      .select('*')
      .eq('booking_id', id);

    const containerizedTypes = ['general', 'reefer'];
    if (containerizedTypes.includes(booking.commodity_type || '') && (!containers || containers.length === 0)) {
      return { success: false, error: 'At least one container is required for containerized cargo' };
    }

    // Update status
    const { data: result, error } = await supabase
      .from('freight_bookings')
      .update({ status: 'requested', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    revalidatePath(`/agency/bookings/${id}`);
    return { success: true, data: rowToBooking(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit booking request' };
  }
}

export async function confirmBooking(id: string, carrierBookingNumber?: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    const { data: booking } = await supabase
      .from('freight_bookings')
      .select('status')
      .eq('id', id)
      .single();

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (!isValidStatusTransition(booking.status as BookingStatus, 'confirmed')) {
      return { success: false, error: `Cannot change status from ${booking.status} to confirmed` };
    }

    const updateData: Record<string, unknown> = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (carrierBookingNumber) {
      updateData.carrier_booking_number = carrierBookingNumber;
    }

    const { data: result, error } = await supabase
      .from('freight_bookings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    revalidatePath(`/agency/bookings/${id}`);
    return { success: true, data: rowToBooking(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to confirm booking' };
  }
}

export async function cancelBooking(id: string, reason?: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    const { data: booking } = await supabase
      .from('freight_bookings')
      .select('status')
      .eq('id', id)
      .single();

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (!isValidStatusTransition(booking.status as BookingStatus, 'cancelled')) {
      return { success: false, error: `Cannot cancel booking with status ${booking.status}` };
    }

    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.notes = reason;
    }

    const { data: result, error } = await supabase
      .from('freight_bookings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    revalidatePath(`/agency/bookings/${id}`);
    return { success: true, data: rowToBooking(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel booking' };
  }
}

export async function markAsShipped(id: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    const { data: booking } = await supabase
      .from('freight_bookings')
      .select('status')
      .eq('id', id)
      .single();

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (!isValidStatusTransition(booking.status as BookingStatus, 'shipped')) {
      return { success: false, error: `Cannot change status from ${booking.status} to shipped` };
    }

    // Update booking status
    const { data: result, error } = await supabase
      .from('freight_bookings')
      .update({ status: 'shipped', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .single();

    if (error) throw error;

    // Update all containers to shipped status
    await supabase
      .from('booking_containers')
      .update({ status: 'shipped' })
      .eq('booking_id', id);

    revalidatePath('/agency/bookings');
    revalidatePath(`/agency/bookings/${id}`);
    return { success: true, data: rowToBooking(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark booking as shipped' };
  }
}

export async function completeBooking(id: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    const { data: booking } = await supabase
      .from('freight_bookings')
      .select('status')
      .eq('id', id)
      .single();

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (!isValidStatusTransition(booking.status as BookingStatus, 'completed')) {
      return { success: false, error: `Cannot change status from ${booking.status} to completed` };
    }

    const { data: result, error } = await supabase
      .from('freight_bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code),
        customers:customer_id(id, name),
        job_orders:job_order_id(id, jo_number)
      `)
      .single();

    if (error) throw error;

    // Update all containers to delivered status
    await supabase
      .from('booking_containers')
      .update({ status: 'delivered' })
      .eq('booking_id', id);

    revalidatePath('/agency/bookings');
    revalidatePath(`/agency/bookings/${id}`);
    return { success: true, data: rowToBooking(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to complete booking' };
  }
}

// =====================================================
// STATUS HISTORY
// =====================================================

export async function getStatusHistory(bookingId: string): Promise<BookingStatusHistory[]> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('booking_status_history')
      .select('*')
      .eq('booking_id', bookingId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToStatusHistory);
  } catch (error) {
    return [];
  }
}

// =====================================================
// BOOKING STATISTICS
// =====================================================

export async function getBookingStats(): Promise<BookingStats> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return {
        totalBookings: 0,
        draftCount: 0,
        requestedCount: 0,
        confirmedCount: 0,
        shippedCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('freight_bookings')
      .select('status');

    if (error) throw error;

    const counts = {
      draft: 0,
      requested: 0,
      confirmed: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const booking of data || []) {
      const status = booking.status as keyof typeof counts;
      if (status in counts) {
        counts[status]++;
      }
    }

    return {
      totalBookings: data?.length || 0,
      draftCount: counts.draft,
      requestedCount: counts.requested,
      confirmedCount: counts.confirmed,
      shippedCount: counts.shipped,
      completedCount: counts.completed,
      cancelledCount: counts.cancelled,
    };
  } catch (error) {
    return {
      totalBookings: 0,
      draftCount: 0,
      requestedCount: 0,
      confirmedCount: 0,
      shippedCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    };
  }
}
