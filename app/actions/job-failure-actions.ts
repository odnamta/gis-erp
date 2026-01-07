'use server';

/**
 * Job Failure Server Actions
 * Server-side actions for job failure management
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { JobStatus, JobFailureFilters } from '@/types/job-failure';

const BASE_RETRY_DELAY_MS = 1000;

/**
 * Get job failures with optional filters
 */
export async function getJobFailuresAction(filters?: JobFailureFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('job_failures')
    .select('*')
    .order('failed_at', { ascending: false });

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.job_type) {
    if (Array.isArray(filters.job_type)) {
      query = query.in('job_type', filters.job_type);
    } else {
      query = query.eq('job_type', filters.job_type);
    }
  }

  if (filters?.from_date) {
    query = query.gte('failed_at', filters.from_date);
  }

  if (filters?.to_date) {
    query = query.lte('failed_at', filters.to_date);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
}

/**
 * Retry a failed job
 */
export async function retryJobAction(failureId: string) {
  const supabase = await createClient();

  // Get the job failure record
  const { data: failure, error: fetchError } = await supabase
    .from('job_failures')
    .select('*')
    .eq('id', failureId)
    .single();

  if (fetchError || !failure) {
    return { success: false, error: 'Job failure not found' };
  }

  if ((failure.retry_count ?? 0) >= (failure.max_retries ?? 0)) {
    // Mark as abandoned
    const { error: updateError } = await supabase
      .from('job_failures')
      .update({ status: 'abandoned' })
      .eq('id', failureId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/admin/jobs');
    return { success: false, error: 'Max retries exceeded, job abandoned' };
  }

  // Calculate next retry time
  const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, failure.retry_count ?? 0);
  const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

  const { error: updateError } = await supabase
    .from('job_failures')
    .update({
      retry_count: (failure.retry_count ?? 0) + 1,
      status: 'retrying',
      next_retry_at: nextRetryAt,
    })
    .eq('id', failureId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/admin/jobs');
  return { success: true, error: null, data: { next_retry_at: nextRetryAt } };
}

/**
 * Mark a job as resolved
 */
export async function markJobResolvedAction(failureId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('job_failures')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', failureId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/jobs');
  return { success: true, error: null };
}

/**
 * Get job failure statistics
 */
export async function getJobFailureStatsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('job_failures')
    .select('status, job_type');

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  const records = data || [];
  const byStatus: Record<JobStatus, number> = {
    failed: 0,
    retrying: 0,
    resolved: 0,
    abandoned: 0,
  };

  records.forEach((r) => {
    const status = r.status as JobStatus;
    if (status in byStatus) {
      byStatus[status]++;
    }
  });

  const byJobType = records.reduce(
    (acc, r) => {
      acc[r.job_type] = (acc[r.job_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    success: true,
    error: null,
    data: {
      total: records.length,
      byStatus,
      byJobType,
    },
  };
}

/**
 * Get jobs ready for retry
 */
export async function getJobsForRetryAction() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('job_failures')
    .select('*')
    .eq('status', 'retrying')
    .lte('next_retry_at', now);

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
}
