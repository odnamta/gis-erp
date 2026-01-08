'use server';

// =====================================================
// v0.66: EVENT QUEUE PROCESSING ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { EventQueueItem, QueueStats, QueueStatus } from '@/types/automation';
import { calculateNextRetryTime, isValidQueueStatus } from '@/lib/automation-utils';
import { Json } from '@/types/database';

const DEFAULT_MAX_RETRIES = 3;

/**
 * Queues a new event for processing.
 */
export async function queueEvent(
  eventType: string,
  eventSource: string,
  payload: Record<string, unknown>,
  scheduledFor?: Date
): Promise<{ data: EventQueueItem | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_queue')
      .insert({
        event_type: eventType,
        event_source: eventSource,
        payload: payload as unknown as Json,
        status: 'pending',
        retry_count: 0,
        max_retries: DEFAULT_MAX_RETRIES,
        scheduled_for: scheduledFor?.toISOString() || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as EventQueueItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets pending events ready for processing.
 * Selects events with status='pending' and scheduled_for <= now.
 */
export async function getPendingEvents(
  limit: number = 10
): Promise<{ data: EventQueueItem[]; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as EventQueueItem[], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates an event's status to 'processing'.
 */
export async function markEventProcessing(
  eventId: string
): Promise<{ data: EventQueueItem | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_queue')
      .update({ status: 'processing' })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as EventQueueItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Marks an event as completed.
 */
export async function markEventCompleted(
  eventId: string
): Promise<{ data: EventQueueItem | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as EventQueueItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Marks an event as failed with retry logic.
 * If retry_count < max_retries, schedules for retry with exponential backoff.
 * Otherwise, marks as permanently failed.
 */
export async function markEventFailed(
  eventId: string,
  errorMessage: string,
  currentRetryCount: number,
  maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<{ data: EventQueueItem | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const newRetryCount = currentRetryCount + 1;

    let updateData: Record<string, unknown>;

    if (newRetryCount >= maxRetries) {
      // Max retries reached - mark as failed
      updateData = {
        status: 'failed',
        error_message: errorMessage,
        retry_count: newRetryCount,
      };
    } else {
      // Schedule retry with exponential backoff
      updateData = {
        status: 'retry',
        error_message: errorMessage,
        retry_count: newRetryCount,
        scheduled_for: calculateNextRetryTime(newRetryCount),
      };
    }

    const { data, error } = await supabase
      .from('event_queue')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as EventQueueItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Resets retry events back to pending status.
 * Called by a scheduler to re-process events scheduled for retry.
 */
export async function resetRetryEvents(): Promise<{ count: number; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_queue')
      .update({ status: 'pending' })
      .eq('status', 'retry')
      .lte('scheduled_for', new Date().toISOString())
      .select();

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length || 0, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets queue statistics.
 */
export async function getQueueStats(): Promise<{ data: QueueStats | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const statuses: QueueStatus[] = ['pending', 'processing', 'completed', 'failed', 'retry'];
    const stats: QueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retry: 0,
    };

    for (const status of statuses) {
      const { count, error } = await supabase
        .from('event_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      if (error) {
        return { data: null, error: error.message };
      }

      stats[status] = count || 0;
    }

    return { data: stats, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Retries specific failed events by resetting them to pending.
 */
export async function retryFailedEvents(
  eventIds: string[]
): Promise<{ count: number; error: string | null }> {
  try {
    if (eventIds.length === 0) {
      return { count: 0, error: null };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_queue')
      .update({
        status: 'pending',
        retry_count: 0,
        error_message: null,
        scheduled_for: new Date().toISOString(),
      })
      .in('id', eventIds)
      .eq('status', 'failed')
      .select();

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length || 0, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets an event by ID.
 */
export async function getEventById(
  eventId: string
): Promise<{ data: EventQueueItem | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('event_queue')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    return { data: data as EventQueueItem, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Deletes old completed events (cleanup).
 */
export async function cleanupCompletedEvents(
  olderThanDays: number = 30
): Promise<{ count: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { data, error } = await supabase
      .from('event_queue')
      .delete()
      .eq('status', 'completed')
      .lt('processed_at', cutoffDate.toISOString())
      .select();

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length || 0, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
