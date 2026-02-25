'use server';

// =====================================================
// BOOKING CONTAINER MANAGEMENT SERVER ACTIONS
// Split from booking-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { revalidatePath } from 'next/cache';
import {
  BookingContainer,
  ContainerFormData,
  ContainerType,
} from '@/types/agency';

// =====================================================
// TYPE CONVERTERS (private — not exported from 'use server')
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToContainer(row: any): BookingContainer {
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

// =====================================================
// CONTAINER MANAGEMENT
// =====================================================

export async function addContainer(bookingId: string, data: ContainerFormData): Promise<{ success: boolean; data?: BookingContainer; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/agency/bookings/${bookingId}`);
    return { success: true, data: rowToContainer(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add container' };
  }
}

export async function updateContainer(id: string, data: ContainerFormData): Promise<{ success: boolean; data?: BookingContainer; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

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
      .update(updateData as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true, data: rowToContainer(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update container' };
  }
}

export async function removeContainer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('booking_containers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/bookings');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove container' };
  }
}

export async function getBookingContainers(bookingId: string): Promise<BookingContainer[]> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('booking_containers')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(rowToContainer);
  } catch (error) {
    return [];
  }
}
