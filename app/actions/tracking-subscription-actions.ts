'use server';

// =====================================================
// TRACKING SUBSCRIPTION SERVER ACTIONS
// Split from vessel-tracking-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  TrackingSubscription,
  TrackingSubscriptionRow,
  SubscriptionFormData,
  TrackingType,
} from '@/types/agency';
import {
  rowToSubscription,
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
// SUBSCRIPTION MANAGEMENT OPERATIONS
// =====================================================

/**
 * Create a new tracking subscription
 * Validates reference exists and prevents duplicate subscriptions per Requirement 6.6
 * @param data - Subscription form data
 * @param userId - User ID creating the subscription
 * @returns ActionResult with created TrackingSubscription or error
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.6**
 */
export async function createSubscription(
  data: SubscriptionFormData,
  userId?: string
): Promise<ActionResult<TrackingSubscription>> {
  try {
    // Validate required fields
    if (!data.trackingType?.trim()) {
      return { success: false, error: 'Tracking type is required' };
    }
    if (!data.referenceId?.trim()) {
      return { success: false, error: 'Reference ID is required' };
    }

    // Validate tracking type (Requirement 6.1)
    const validTypes: TrackingType[] = ['vessel', 'container', 'booking'];
    if (!validTypes.includes(data.trackingType)) {
      return { success: false, error: 'Invalid tracking type. Must be vessel, container, or booking' };
    }

    const supabase = await createClient();

    // Get current user if not provided
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
    }

    // Validate reference exists (Requirement 6.3)
    let referenceNumber: string | undefined;

    if (data.trackingType === 'vessel') {
      const { data: vessel, error: vesselError } = await (supabase as SupabaseAny)
        .from('vessels')
        .select('id, vessel_name')
        .eq('id', data.referenceId)
        .maybeSingle();

      if (vesselError || !vessel) {
        return { success: false, error: 'Vessel not found' };
      }
      referenceNumber = vessel.vessel_name;
    } else if (data.trackingType === 'booking') {
      const { data: booking, error: bookingError } = await (supabase as SupabaseAny)
        .from('freight_bookings')
        .select('id, booking_number')
        .eq('id', data.referenceId)
        .maybeSingle();

      if (bookingError || !booking) {
        return { success: false, error: 'Booking not found' };
      }
      referenceNumber = booking.booking_number;
    } else if (data.trackingType === 'container') {
      // For container type, the referenceId could be a container ID or we use the referenceNumber
      // Check if it's a booking_containers record
      const { data: container, error: containerError } = await (supabase as SupabaseAny)
        .from('booking_containers')
        .select('id, container_number')
        .eq('id', data.referenceId)
        .maybeSingle();

      if (!containerError && container) {
        referenceNumber = container.container_number;
      } else {
        // If not found in booking_containers, use the provided referenceNumber
        referenceNumber = data.referenceNumber;
      }
    }

    // Use provided referenceNumber if available
    if (data.referenceNumber) {
      referenceNumber = data.referenceNumber;
    }

    // Check for duplicate subscription (Requirement 6.6)
    const duplicateQuery = (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .select('id')
      .eq('tracking_type', data.trackingType)
      .eq('reference_id', data.referenceId);

    if (effectiveUserId) {
      duplicateQuery.eq('user_id', effectiveUserId);
    } else if (data.email) {
      duplicateQuery.eq('email', data.email);
    }

    const { data: existingSubscription } = await duplicateQuery.maybeSingle();

    if (existingSubscription) {
      return { success: false, error: 'You are already subscribed to this shipment' };
    }

    // Insert subscription (Requirement 6.2 - notification preferences)
    const insertData = {
      tracking_type: data.trackingType,
      reference_id: data.referenceId,
      reference_number: referenceNumber || null,
      user_id: effectiveUserId || null,
      email: data.email || null,
      notify_departure: data.notifyDeparture !== undefined ? data.notifyDeparture : true,
      notify_arrival: data.notifyArrival !== undefined ? data.notifyArrival : true,
      notify_delay: data.notifyDelay !== undefined ? data.notifyDelay : true,
      notify_milestone: data.notifyMilestone !== undefined ? data.notifyMilestone : true,
      is_active: true,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/tracking');
    return { success: true, data: rowToSubscription(result as TrackingSubscriptionRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create subscription' };
  }
}

/**
 * Update an existing tracking subscription
 * Allows updating notification preferences and active status
 * @param id - Subscription ID
 * @param data - Partial subscription form data to update
 * @returns ActionResult with updated TrackingSubscription or error
 *
 * **Validates: Requirements 6.4, 6.5**
 */
export async function updateSubscription(
  id: string,
  data: Partial<SubscriptionFormData> & { isActive?: boolean }
): Promise<ActionResult<TrackingSubscription>> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'Subscription ID is required' };
    }

    const supabase = await createClient();

    // Check if subscription exists
    const { data: existing, error: existingError } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return { success: false, error: 'Subscription not found' };
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Update notification preferences (Requirement 6.4)
    if (data.notifyDeparture !== undefined) updateData.notify_departure = data.notifyDeparture;
    if (data.notifyArrival !== undefined) updateData.notify_arrival = data.notifyArrival;
    if (data.notifyDelay !== undefined) updateData.notify_delay = data.notifyDelay;
    if (data.notifyMilestone !== undefined) updateData.notify_milestone = data.notifyMilestone;

    // Update active status (Requirement 6.5)
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    // Update email if provided
    if (data.email !== undefined) updateData.email = data.email || null;

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return { success: true, data: rowToSubscription(existing as TrackingSubscriptionRow) };
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/tracking');
    return { success: true, data: rowToSubscription(result as TrackingSubscriptionRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update subscription' };
  }
}

/**
 * Delete a tracking subscription
 * @param id - Subscription ID
 * @returns ActionResult with success or error
 */
export async function deleteSubscription(id: string): Promise<ActionResult<void>> {
  try {
    if (!id?.trim()) {
      return { success: false, error: 'Subscription ID is required' };
    }

    const supabase = await createClient();

    // Check if subscription exists
    const { data: existing, error: existingError } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return { success: false, error: 'Subscription not found' };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/tracking');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete subscription' };
  }
}

/**
 * Get all subscriptions for a user
 * @param userId - User ID (optional, uses current user if not provided)
 * @returns Array of TrackingSubscription
 *
 * **Validates: Requirements 6.4**
 */
export async function getUserSubscriptions(userId?: string): Promise<TrackingSubscription[]> {
  try {
    const supabase = await createClient();

    // Get current user if not provided
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
    }

    if (!effectiveUserId) {
      return [];
    }

    const { data, error } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: TrackingSubscriptionRow) => rowToSubscription(row));
  } catch (error) {
    return [];
  }
}

/**
 * Get a single subscription by ID
 * @param id - Subscription ID
 * @returns TrackingSubscription or null
 */
export async function getSubscription(id: string): Promise<TrackingSubscription | null> {
  try {
    if (!id?.trim()) {
      return null;
    }

    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? rowToSubscription(data as TrackingSubscriptionRow) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Get subscriptions by reference (for notification purposes)
 * @param trackingType - Type of tracking (vessel, container, booking)
 * @param referenceId - Reference ID
 * @returns Array of active TrackingSubscription
 */
export async function getSubscriptionsByReference(
  trackingType: TrackingType,
  referenceId: string
): Promise<TrackingSubscription[]> {
  try {
    if (!trackingType?.trim() || !referenceId?.trim()) {
      return [];
    }

    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('tracking_subscriptions')
      .select('*')
      .eq('tracking_type', trackingType)
      .eq('reference_id', referenceId)
      .eq('is_active', true);

    if (error) throw error;
    return (data || []).map((row: TrackingSubscriptionRow) => rowToSubscription(row));
  } catch (error) {
    return [];
  }
}
