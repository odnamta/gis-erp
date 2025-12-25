'use server';

/**
 * Error Tracking Server Actions
 * Server-side actions for error tracking management
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ErrorStatus, ErrorFilters } from '@/types/error-handling';

/**
 * Get errors with optional filters
 */
export async function getErrorsAction(filters?: ErrorFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('error_tracking')
    .select('*')
    .order('last_seen_at', { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.module) {
    if (Array.isArray(filters.module)) {
      query = query.in('module', filters.module);
    } else {
      query = query.eq('module', filters.module);
    }
  }

  if (filters?.error_type) {
    if (Array.isArray(filters.error_type)) {
      query = query.in('error_type', filters.error_type);
    } else {
      query = query.eq('error_type', filters.error_type);
    }
  }

  if (filters?.from_date) {
    query = query.gte('timestamp', filters.from_date);
  }

  if (filters?.to_date) {
    query = query.lte('timestamp', filters.to_date);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
}

/**
 * Update error status
 */
export async function updateErrorStatusAction(
  errorId: string,
  status: ErrorStatus,
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const updateData: Record<string, unknown> = { status };

  if (status === 'resolved') {
    updateData.resolved_at = new Date().toISOString();
    updateData.resolved_by = user.id;
    if (notes) {
      updateData.resolution_notes = notes;
    }
  }

  const { error } = await supabase
    .from('error_tracking')
    .update(updateData)
    .eq('id', errorId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/errors');
  return { success: true, error: null };
}

/**
 * Get error summary for dashboard
 */
export async function getErrorSummaryAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('error_tracking')
    .select('status, error_hash, error_message, occurrence_count');

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  const records = data || [];
  const byStatus: Record<ErrorStatus, number> = {
    new: 0,
    investigating: 0,
    resolved: 0,
    ignored: 0,
  };

  records.forEach((r) => {
    const status = r.status as ErrorStatus;
    if (status in byStatus) {
      byStatus[status]++;
    }
  });

  const topErrors = [...records]
    .sort((a, b) => (b.occurrence_count || 0) - (a.occurrence_count || 0))
    .slice(0, 10)
    .map((r) => ({
      error_hash: r.error_hash,
      error_message: r.error_message,
      occurrence_count: r.occurrence_count || 0,
    }));

  return {
    success: true,
    error: null,
    data: {
      total: records.length,
      byStatus,
      topErrors,
    },
  };
}

/**
 * Get error by ID
 */
export async function getErrorByIdAction(errorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('error_tracking')
    .select('*')
    .eq('id', errorId)
    .single();

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
}
