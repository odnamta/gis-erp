/**
 * Error Tracking Types
 * 
 * Type definitions for the error tracking system.
 * Re-exports from error-handling.ts for backwards compatibility.
 */

// Re-export all error tracking types from the consolidated file
export type {
  ErrorStatus,
  ErrorTracking,
  ErrorTrackingWithUser,
  TrackErrorInput,
  UpdateErrorStatusInput,
  ErrorFilters,
  ErrorPaginationOptions,
  PaginatedErrorsResponse,
  TopRecurringError,
  ErrorSummary,
  ErrorsByModule,
  ErrorTrend,
  RequestContext,
  ErrorResponse,
  SuccessResponse,
  ActionResult,
} from './error-handling';

// Additional types specific to error tracking

/**
 * Error hash generation input
 */
export interface ErrorHashInput {
  error_type: string;
  error_message: string;
  module?: string | null;
}

/**
 * Generated error code result
 */
export interface GeneratedErrorCode {
  code: string;
  timestamp: string;
}

/**
 * Error code format: ERR-YYYYMMDD-XXXX
 */
export const ERROR_CODE_PREFIX = 'ERR';
export const ERROR_CODE_RANDOM_LENGTH = 4;
