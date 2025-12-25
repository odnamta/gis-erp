/**
 * Error Handling Types
 * 
 * Consolidated type definitions for the Error Handling & Recovery module.
 * Includes error tracking, status management, and summary types.
 */

// =============================================================================
// ERROR STATUS TYPES
// =============================================================================

/**
 * Error status values for tracking resolution state
 */
export type ErrorStatus = 'new' | 'investigating' | 'resolved' | 'ignored';

// =============================================================================
// ERROR TRACKING TYPES
// =============================================================================

/**
 * Error tracking record from database
 */
export interface ErrorTracking {
  id: string;
  error_code: string;
  error_hash: string | null;
  timestamp: string;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  module: string | null;
  function_name: string | null;
  user_id: string | null;
  session_id: string | null;
  request_method: string | null;
  request_path: string | null;
  request_body: Record<string, unknown> | null;
  request_params: Record<string, unknown> | null;
  environment: string;
  version: string | null;
  status: ErrorStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

/**
 * Error tracking record with user details
 */
export interface ErrorTrackingWithUser extends ErrorTracking {
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  resolver?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

/**
 * Input for tracking a new error
 */
export interface TrackErrorInput {
  error_type: string;
  error_message: string;
  error_stack?: string | null;
  error_hash: string;
  module?: string | null;
  function_name?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  request_method?: string | null;
  request_path?: string | null;
  request_body?: Record<string, unknown> | null;
  request_params?: Record<string, unknown> | null;
  environment?: string;
  version?: string | null;
}

/**
 * Input for updating error status
 */
export interface UpdateErrorStatusInput {
  error_id: string;
  status: ErrorStatus;
  resolved_by?: string | null;
  resolution_notes?: string | null;
}

/**
 * Filters for querying errors
 */
export interface ErrorFilters {
  status?: ErrorStatus | ErrorStatus[];
  module?: string | string[];
  error_type?: string | string[];
  user_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  min_occurrences?: number;
}

/**
 * Pagination options for error queries
 */
export interface ErrorPaginationOptions {
  page?: number;
  page_size?: number;
  sort_by?: keyof ErrorTracking;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated error response
 */
export interface PaginatedErrorsResponse {
  data: ErrorTrackingWithUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// =============================================================================
// ERROR SUMMARY TYPES
// =============================================================================

/**
 * Top recurring error entry
 */
export interface TopRecurringError {
  error_hash: string;
  error_type: string;
  error_message: string;
  module: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  status: ErrorStatus;
}

/**
 * Error summary for dashboard
 */
export interface ErrorSummary {
  total: number;
  by_status: Record<ErrorStatus, number>;
  top_errors: TopRecurringError[];
  errors_today: number;
  errors_this_week: number;
  errors_this_month: number;
  resolution_rate: number;
}

/**
 * Error statistics by module
 */
export interface ErrorsByModule {
  module: string;
  count: number;
  new_count: number;
  resolved_count: number;
}

/**
 * Error trend data point
 */
export interface ErrorTrend {
  date: string;
  count: number;
  resolved_count: number;
}

// =============================================================================
// REQUEST CONTEXT TYPES
// =============================================================================

/**
 * Request context for error tracking
 */
export interface RequestContext {
  module?: string;
  function_name?: string;
  user_id?: string;
  session_id?: string;
  path?: string;
  method?: string;
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

// =============================================================================
// ERROR RESPONSE TYPES
// =============================================================================

/**
 * Error response returned to clients
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    reference?: string;
  };
}

/**
 * Success response returned to clients
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Action result type (either success or error)
 */
export type ActionResult<T> = SuccessResponse<T> | ErrorResponse;

// =============================================================================
// RE-EXPORTS FROM RELATED TYPES
// =============================================================================

// Re-export job failure types for convenience
export type { JobStatus, JobFailureRecord } from './job-failure';

// Re-export validation error types for convenience
export type { ValidationErrorRecord } from './validation-error';

// Re-export deleted record types for convenience
export type { DeletedRecord } from './deleted-record';

// Re-export custom error classes and utilities from lib
export {
  type AppError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  isAppError,
  isOperationalError,
  getErrorCode,
  getStatusCode,
} from '../lib/error-handling/errors';
