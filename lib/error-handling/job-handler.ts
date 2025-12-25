/**
 * Job Failure Handler
 * Manages failed background jobs with retry logic and exponential backoff
 * 
 * Requirements:
 * - 6.1: Record job_type, job_id, error_message, error_stack, job_data
 * - 6.2: Schedule retry when retry_count < max_retries
 * - 6.3: Use exponential backoff: BASE_DELAY_MS * 2^retry_count
 * - 6.4: Mark as abandoned when retry_count >= max_retries
 * - 6.5: Mark as resolved with resolved_at timestamp
 * - 6.6: Support statuses: failed, retrying, resolved, abandoned
 */

import { createClient } from '@/lib/supabase/client';
import type { JobStatus, JobFailureFilters } from '@/types/error-handling';
import type { JobFailureRecord } from '@/types/job-failure';

/** Base delay for exponential backoff (1 second) */
export const BASE_RETRY_DELAY_MS = 1000;

/** Default maximum retry attempts */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Calculate retry delay using exponential backoff
 * Formula: BASE_DELAY_MS * 2^retry_count
 * 
 * Requirement: 6.3
 */
export function calculateRetryDelay(retryCount: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}

/**
 * Record a job failure
 * 
 * Requirement: 6.1
 */
export async function recordJobFailure(params: {
  jobType: string;
  jobId?: string;
  errorMessage: string;
  errorStack?: string;
  jobData?: Record<string, unknown>;
  maxRetries?: number;
}): Promise<JobFailureRecord> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_failures')
    .insert({
      job_type: params.jobType,
      job_id: params.jobId,
      error_message: params.errorMessage,
      error_stack: params.errorStack,
      job_data: params.jobData,
      retry_count: 0,
      max_retries: params.maxRetries ?? DEFAULT_MAX_RETRIES,
      status: 'failed',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to record job failure: ${error.message}`);
  }

  return data;
}

/**
 * Schedule a retry for a failed job
 * If retry_count < max_retries: increment count, set status='retrying', calculate next_retry_at
 * If retry_count >= max_retries: set status='abandoned'
 * 
 * Requirements: 6.2, 6.4
 */
export async function scheduleRetry(failureId: string): Promise<void> {
  const supabase = createClient();

  // Get current failure record
  const { data: failure, error: fetchError } = await supabase
    .from('job_failures')
    .select('*')
    .eq('id', failureId)
    .single();

  if (fetchError || !failure) {
    throw new Error(`Job failure not found: ${failureId}`);
  }

  const newRetryCount = failure.retry_count + 1;

  if (newRetryCount >= failure.max_retries) {
    // Max retries reached - abandon the job
    const { error: updateError } = await supabase
      .from('job_failures')
      .update({ status: 'abandoned' })
      .eq('id', failureId);

    if (updateError) {
      throw new Error(`Failed to abandon job: ${updateError.message}`);
    }
    return;
  }

  // Calculate next retry time
  const delayMs = calculateRetryDelay(newRetryCount);
  const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

  const { error: updateError } = await supabase
    .from('job_failures')
    .update({
      retry_count: newRetryCount,
      status: 'retrying',
      next_retry_at: nextRetryAt,
    })
    .eq('id', failureId);

  if (updateError) {
    throw new Error(`Failed to schedule retry: ${updateError.message}`);
  }
}

/**
 * Mark a job as resolved
 * 
 * Requirement: 6.5
 */
export async function markJobResolved(failureId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('job_failures')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', failureId);

  if (error) {
    throw new Error(`Failed to mark job as resolved: ${error.message}`);
  }
}

/**
 * Get jobs ready for retry
 * Returns jobs where status='retrying' AND next_retry_at <= now
 * 
 * Requirement: 6.2
 */
export async function getJobsForRetry(): Promise<JobFailureRecord[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('job_failures')
    .select('*')
    .eq('status', 'retrying')
    .lte('next_retry_at', now);

  if (error) {
    throw new Error(`Failed to get jobs for retry: ${error.message}`);
  }

  return data || [];
}

/**
 * Get job failures with optional filters
 */
export async function getJobFailures(
  filters?: JobFailureFilters
): Promise<JobFailureRecord[]> {
  const supabase = createClient();

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

  if (filters?.jobType) {
    if (Array.isArray(filters.jobType)) {
      query = query.in('job_type', filters.jobType);
    } else {
      query = query.eq('job_type', filters.jobType);
    }
  }

  if (filters?.dateFrom) {
    query = query.gte('failed_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('failed_at', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get job failures: ${error.message}`);
  }

  return data || [];
}

/**
 * Get job failure by ID
 */
export async function getJobFailureById(
  failureId: string
): Promise<JobFailureRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_failures')
    .select('*')
    .eq('id', failureId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get job failure: ${error.message}`);
  }

  return data;
}

/**
 * Get job failure statistics
 */
export async function getJobFailureStatistics(): Promise<{
  total: number;
  byStatus: Record<JobStatus, number>;
  byJobType: Record<string, number>;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_failures')
    .select('status, job_type');

  if (error) {
    throw new Error(`Failed to get job failure statistics: ${error.message}`);
  }

  const records = data || [];
  const total = records.length;

  const byStatus: Record<JobStatus, number> = {
    failed: 0,
    retrying: 0,
    resolved: 0,
    abandoned: 0,
  };

  const byJobType: Record<string, number> = {};

  records.forEach((r) => {
    const status = r.status as JobStatus;
    if (status in byStatus) {
      byStatus[status]++;
    }
    byJobType[r.job_type] = (byJobType[r.job_type] || 0) + 1;
  });

  return {
    total,
    byStatus,
    byJobType,
  };
}
