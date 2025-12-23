'use server';

// =====================================================
// v0.72: AGENCY - BOOKING MANAGEMENT SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  FreightBooking,
  FreightBookingRow,
  BookingFormData,
  BookingContainer,
  BookingContainerRow,
  ContainerFormData,
  BookingAmendment,
  BookingAmendmentRow,
  AmendmentFormData,
  BookingStatusHistory,
  BookingStatusHistoryRow,
  BookingStatus,
  BookingFilters,
  ShippingRate,
  FreightCalculation,
  RateLookupParams,
  ContainerType,
} from '@/types/agency';
import {
  isValidStatusTransition,
  validateBookingForSubmission,
  getNextAmendmentNumber,
  calculateFreightBreakdown,
} from '@/lib/booking-utils';

// =====================================================
// TYPE CONVERTERS
// =====================================================

function rowToBooking(row: FreightBookingRow & {
  shipping_lines?: { line_name: string; line_code: string };
  origin_port?: { port_name: string; port_code: string };
  destination_port?: { port_name: string; port_code: string };
  customers?: { id: string; name: string };
  job_orders?: { id: string; jo_number: string };
}): FreightBooking {
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

function rowToContainer(row: BookingContainerRow): BookingContainer {
  return {
    id: row.id,
    bookingId: row.booking_id,
    containerNumber: row.container_number,
    containerType: row.container_type as ContainerType,
    sealNumber: row.seal_number,
    packagesCount: row.packages_count,
    packageType: row.package_type,
    grossWeightKg: row.gross_weight_kg,
    cargoDescription: row.cargo_description,
    cargoDimensions: row.cargo_dimensions,
    status: row.status as BookingContainer['status'],
    currentLocation: row.current_location,
    createdAt: row.created_at,
  };
}

function rowToAmendment(row: BookingAmendmentRow): BookingAmendment {
  return {
    id: row.id,
    bookingId: row.booking_id,
    amendmentNumber: row.amendment_number,
    amendmentType: row.amendment_type as BookingAmendment['amendmentType'],
    description: row.description,
    oldValues: row.old_values,
    newValues: row.new_values,
    status: row.status as BookingAmendment['status'],
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    notes: row.notes,
  };
}

function rowToStatusHistory(row: BookingStatusHistoryRow): BookingStatusHistory {
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
      .insert(insertData)
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
    console.error('Error creating booking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create booking' };
  }
}

export async function updateBooking(id: string, data: BookingFormData): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
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
    console.error('Error updating booking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update booking' };
  }
}

export async function getBooking(id: string): Promise<FreightBooking | null> {
  try {
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
    console.error('Error getting booking:', error);
    return null;
  }
}

export async function getBookings(filters?: BookingFilters): Promise<FreightBooking[]> {
  try {
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
    console.error('Error getting bookings:', error);
    return [];
  }
}

export async function deleteBooking(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('freight_bookings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true };
  } catch (error) {
    console.error('Error deleting booking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete booking' };
  }
}


// =====================================================
// STATUS MANAGEMENT
// =====================================================

export async function submitBookingRequest(id: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
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
    if (containerizedTypes.includes(booking.commodity_type) && (!containers || containers.length === 0)) {
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
    console.error('Error submitting booking request:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit booking request' };
  }
}

export async function confirmBooking(id: string, carrierBookingNumber?: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
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
    console.error('Error confirming booking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to confirm booking' };
  }
}

export async function cancelBooking(id: string, reason?: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
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
    console.error('Error cancelling booking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel booking' };
  }
}

export async function markAsShipped(id: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
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
    console.error('Error marking booking as shipped:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark booking as shipped' };
  }
}

export async function completeBooking(id: string): Promise<{ success: boolean; data?: FreightBooking; error?: string }> {
  try {
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
    console.error('Error completing booking:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to complete booking' };
  }
}

// =====================================================
// CONTAINER MANAGEMENT
// =====================================================

export async function addContainer(bookingId: string, data: ContainerFormData): Promise<{ success: boolean; data?: BookingContainer; error?: string }> {
  try {
    const supabase = await createClient();
    
    const insertData = {
      booking_id: bookingId,
      container_number: data.containerNumber || null,
      container_type: data.containerType,
      seal_number: data.sealNumber || null,
      packages_count: data.packagesCount || null,
      package_type: data.packageType || null,
      gross_weight_kg: data.grossWeightKg || null,
      cargo_description: data.cargoDescription || null,
      cargo_dimensions: data.cargoDimensions || null,
      status: 'empty',
    };

    const { data: result, error } = await supabase
      .from('booking_containers')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/agency/bookings/${bookingId}`);
    return { success: true, data: rowToContainer(result) };
  } catch (error) {
    console.error('Error adding container:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add container' };
  }
}

export async function updateContainer(id: string, data: ContainerFormData): Promise<{ success: boolean; data?: BookingContainer; error?: string }> {
  try {
    const supabase = await createClient();
    
    const updateData = {
      container_number: data.containerNumber || null,
      container_type: data.containerType,
      seal_number: data.sealNumber || null,
      packages_count: data.packagesCount || null,
      package_type: data.packageType || null,
      gross_weight_kg: data.grossWeightKg || null,
      cargo_description: data.cargoDescription || null,
      cargo_dimensions: data.cargoDimensions || null,
    };

    const { data: result, error } = await supabase
      .from('booking_containers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true, data: rowToContainer(result) };
  } catch (error) {
    console.error('Error updating container:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update container' };
  }
}

export async function removeContainer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('booking_containers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true };
  } catch (error) {
    console.error('Error removing container:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove container' };
  }
}

export async function getBookingContainers(bookingId: string): Promise<BookingContainer[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('booking_containers')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(rowToContainer);
  } catch (error) {
    console.error('Error getting booking containers:', error);
    return [];
  }
}

// =====================================================
// AMENDMENT MANAGEMENT
// =====================================================

export async function requestAmendment(bookingId: string, data: AmendmentFormData): Promise<{ success: boolean; data?: BookingAmendment; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get existing amendments to determine next number
    const { data: existingAmendments } = await supabase
      .from('booking_amendments')
      .select('amendment_number')
      .eq('booking_id', bookingId);

    const amendments = (existingAmendments || []).map(a => ({
      ...a,
      amendmentNumber: a.amendment_number,
    })) as BookingAmendment[];
    
    const nextNumber = getNextAmendmentNumber(amendments);

    const insertData = {
      booking_id: bookingId,
      amendment_number: nextNumber,
      amendment_type: data.amendmentType,
      description: data.description,
      old_values: data.oldValues,
      new_values: data.newValues,
      notes: data.notes || null,
      status: 'requested',
    };

    const { data: result, error } = await supabase
      .from('booking_amendments')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/agency/bookings/${bookingId}`);
    return { success: true, data: rowToAmendment(result) };
  } catch (error) {
    console.error('Error requesting amendment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to request amendment' };
  }
}

export async function approveAmendment(id: string): Promise<{ success: boolean; data?: BookingAmendment; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get the amendment
    const { data: amendment } = await supabase
      .from('booking_amendments')
      .select('*')
      .eq('id', id)
      .single();

    if (!amendment) {
      return { success: false, error: 'Amendment not found' };
    }

    if (amendment.status !== 'requested') {
      return { success: false, error: 'Amendment is not in requested status' };
    }

    // Update amendment status
    const { data: result, error: amendmentError } = await supabase
      .from('booking_amendments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (amendmentError) throw amendmentError;

    // Apply changes to booking
    const newValues = amendment.new_values as Record<string, unknown>;
    if (Object.keys(newValues).length > 0) {
      // Convert camelCase to snake_case for database
      const updateData: Record<string, unknown> = {
        status: 'amended',
        updated_at: new Date().toISOString(),
      };

      for (const [key, value] of Object.entries(newValues)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updateData[snakeKey] = value;
      }

      await supabase
        .from('freight_bookings')
        .update(updateData)
        .eq('id', amendment.booking_id);
    }

    revalidatePath(`/agency/bookings/${amendment.booking_id}`);
    return { success: true, data: rowToAmendment(result) };
  } catch (error) {
    console.error('Error approving amendment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve amendment' };
  }
}

export async function rejectAmendment(id: string, reason?: string): Promise<{ success: boolean; data?: BookingAmendment; error?: string }> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {
      status: 'rejected',
    };

    if (reason) {
      updateData.notes = reason;
    }

    const { data: result, error } = await supabase
      .from('booking_amendments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true, data: rowToAmendment(result) };
  } catch (error) {
    console.error('Error rejecting amendment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reject amendment' };
  }
}

export async function getBookingAmendments(bookingId: string): Promise<BookingAmendment[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('booking_amendments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('amendment_number', { ascending: true });

    if (error) throw error;
    return (data || []).map(rowToAmendment);
  } catch (error) {
    console.error('Error getting booking amendments:', error);
    return [];
  }
}

// =====================================================
// RATE LOOKUP AND FREIGHT CALCULATION
// =====================================================

export async function lookupRates(params: RateLookupParams): Promise<ShippingRate[]> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('shipping_rates')
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code)
      `)
      .eq('origin_port_id', params.originPortId)
      .eq('destination_port_id', params.destinationPortId)
      .eq('is_active', true)
      .gte('valid_to', new Date().toISOString().split('T')[0]);

    if (params.shippingLineId) {
      query = query.eq('shipping_line_id', params.shippingLineId);
    }

    if (params.containerTypes && params.containerTypes.length > 0) {
      query = query.in('container_type', params.containerTypes);
    }

    const { data, error } = await query.order('total_rate', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      shippingLineId: row.shipping_line_id,
      originPortId: row.origin_port_id,
      destinationPortId: row.destination_port_id,
      containerType: row.container_type,
      oceanFreight: row.ocean_freight,
      currency: row.currency,
      baf: row.baf,
      caf: row.caf,
      pss: row.pss,
      ens: row.ens,
      otherSurcharges: row.other_surcharges || [],
      totalRate: row.total_rate,
      transitDays: row.transit_days,
      frequency: row.frequency,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      terms: row.terms,
      notes: row.notes,
      isActive: row.is_active,
      createdAt: row.created_at,
      shippingLine: row.shipping_lines,
      originPort: row.origin_port,
      destinationPort: row.destination_port,
    }));
  } catch (error) {
    console.error('Error looking up rates:', error);
    return [];
  }
}

export async function calculateFreight(rates: ShippingRate[], containers: BookingContainer[]): Promise<FreightCalculation> {
  return calculateFreightBreakdown(containers, rates);
}

// =====================================================
// STATUS HISTORY
// =====================================================

export async function getStatusHistory(bookingId: string): Promise<BookingStatusHistory[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('booking_status_history')
      .select('*')
      .eq('booking_id', bookingId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToStatusHistory);
  } catch (error) {
    console.error('Error getting status history:', error);
    return [];
  }
}

// =====================================================
// BOOKING STATISTICS
// =====================================================

export async function getBookingStats(): Promise<{
  total: number;
  draft: number;
  requested: number;
  confirmed: number;
  shipped: number;
  completed: number;
  cancelled: number;
}> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('freight_bookings')
      .select('status');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      draft: 0,
      requested: 0,
      confirmed: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const booking of data || []) {
      const status = booking.status as keyof typeof stats;
      if (status in stats && status !== 'total') {
        stats[status]++;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error getting booking stats:', error);
    return {
      total: 0,
      draft: 0,
      requested: 0,
      confirmed: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    };
  }
}
