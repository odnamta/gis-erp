/**
 * Job Failure Types
 * Types for the background job failure handling system
 */

/**
 * Job status values
 */
export type JobStatus = 'failed' | 'retrying' | 'resolved' | 'abandoned';

/**
 * Job failure record from database
 */
export interface JobFailureRecord {
  id: string;
  job_type: string;
  job_id: string | null;
  failed_at: string;
  error_message: string;
  error_stack: string | null;
  job_data: Record<string, unknown> | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  status: JobStatus;
  resolved_at: string | null;
}

/**
 * Input for recording a job failure
 */
export interface RecordJobFailureInput {
  job_type: string;
  job_id?: string | null;
  error_message: string;
  error_stack?: string | null;
  job_data?: Record<string, unknown> | null;
  max_retries?: number;
}

/**
 * Input for scheduling a retry
 */
export interface ScheduleRetryInput {
  failure_id: string;
}

/**
 * Input for marking a job as resolved
 */
export interface MarkJobResolvedInput {
  failure_id: string;
}

/**
 * Filters for querying job failures
 */
export interface JobFailureFilters {
  status?: JobStatus | JobStatus[];
  job_type?: string | string[];
  from_date?: string;
  to_date?: string;
  search?: string;
}

/**
 * Pagination options
 */
export interface JobFailurePaginationOptions {
  page?: number;
  page_size?: number;
  sort_by?: keyof JobFailureRecord;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedJobFailuresResponse {
  data: JobFailureRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Job failure statistics
 */
export interface JobFailureStatistics {
  total_failures: number;
  failed_count: number;
  retrying_count: number;
  resolved_count: number;
  abandoned_count: number;
  by_job_type: Record<string, number>;
  failures_today: number;
  failures_this_week: number;
  failures_this_month: number;
  average_retries_to_resolve: number;
}

/**
 * Jobs ready for retry
 */
export interface JobsForRetry {
  jobs: JobFailureRecord[];
  count: number;
}

/**
 * Retry delay calculation constants
 */
export const BASE_RETRY_DELAY_MS = 1000; // 1 second
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Calculate retry delay using exponential backoff
 * Formula: BASE_DELAY_MS * 2^retry_count
 */
export function calculateRetryDelay(retryCount: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}
