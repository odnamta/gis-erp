'use server';

// =====================================================
// BOOKING AMENDMENT MANAGEMENT SERVER ACTIONS
// Split from booking-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { revalidatePath } from 'next/cache';
import {
  BookingAmendment,
  AmendmentFormData,
} from '@/types/agency';
import {
  getNextAmendmentNumber,
} from '@/lib/booking-utils';

// =====================================================
// TYPE CONVERTERS (private — not exported from 'use server')
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAmendment(row: any): BookingAmendment {
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

// =====================================================
// AMENDMENT MANAGEMENT
// =====================================================

export async function requestAmendment(bookingId: string, data: AmendmentFormData): Promise<{ success: boolean; data?: BookingAmendment; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Get existing amendments to determine next number
    const { data: existingAmendments } = await supabase
      .from('booking_amendments')
      .select('amendment_number')
      .eq('booking_id', bookingId);

    const amendments = (existingAmendments || []).map(a => ({
      amendmentNumber: a.amendment_number,
    })) as unknown as BookingAmendment[];

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertData as any)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/agency/bookings/${bookingId}`);
    return { success: true, data: rowToAmendment(result) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to request amendment' };
  }
}

export async function approveAmendment(id: string): Promise<{ success: boolean; data?: BookingAmendment; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

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
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve amendment' };
  }
}

export async function rejectAmendment(id: string, reason?: string): Promise<{ success: boolean; data?: BookingAmendment; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

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
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reject amendment' };
  }
}

export async function getBookingAmendments(bookingId: string): Promise<BookingAmendment[]> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('booking_amendments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('amendment_number', { ascending: true });

    if (error) throw error;
    return (data || []).map(rowToAmendment);
  } catch (error) {
    return [];
  }
}
