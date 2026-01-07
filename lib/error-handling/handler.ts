/**
 * Error Handler Core
 * Implements error hash generation, error code generation, and main error handler
 * 
 * Requirements:
 * - 1.2: Generate error hash to identify similar errors
 * - 1.6: Assign unique error code for support reference
 * - 2.5: Return generic message with reference code for unexpected errors
 * - 2.6: Do not expose stack traces to end users
 */

import { createHash } from 'crypto';
import type { ErrorResponse, RequestContext } from '@/types/error-handling';
import { isAppError, isOperationalError } from './errors';

/**
 * Generate a deterministic hash for grouping similar errors
 * Uses SHA-256 hash of error type, message, and module
 * Truncated to 64 characters
 * 
 * Requirement 1.2: Generate error hash to identify similar errors
 */
export function generateErrorHash(
  errorType: string,
  errorMessage: string,
  module?: string
): string {
  const input = `${errorType}:${errorMessage}:${module || ''}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return hash.substring(0, 64);
}

/**
 * Generate a unique error code for support reference
 * Format: ERR-YYYYMMDD-XXXX where XXXX is a random alphanumeric suffix
 * 
 * Requirement 1.6: Assign unique error code for support reference
 */
export function generateErrorCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate random 4-character alphanumeric suffix
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `ERR-${dateStr}-${suffix}`;
}

/**
 * Generate a short reference code for user-facing error messages
 * This is a truncated version of the error code for easier communication
 */
export function generateShortReference(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let reference = '';
  for (let i = 0; i < 8; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}

/**
 * Main error handler
 * Distinguishes operational vs non-operational errors
 * Returns appropriate ErrorResponse format
 * 
 * Requirements:
 * - 2.5: Return generic message with reference code for unexpected errors
 * - 2.6: Do not expose stack traces to end users
 */
export function handleError(error: unknown, context?: RequestContext): ErrorResponse {
  // Generate reference code for all errors
  const reference = generateShortReference();
  
  // Handle operational errors (expected errors)
  if (isOperationalError(error) && isAppError(error)) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        reference,
      },
    };
    
    // Add field for validation errors
    if ('field' in error && error.field) {
      response.error.field = error.field as string;
    }
    
    return response;
  }
  
  // Handle non-operational errors (unexpected errors)
  // Do not expose internal details to users
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
      reference,
    },
  };
}

/**
 * Extract error details for tracking
 * Safely extracts information from any error type
 */
export function extractErrorDetails(error: unknown): {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string;
} {
  if (error instanceof Error) {
    return {
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: isAppError(error) ? error.code : undefined,
    };
  }
  
  if (typeof error === 'string') {
    return {
      errorType: 'StringError',
      errorMessage: error,
    };
  }
  
  return {
    errorType: 'UnknownError',
    errorMessage: String(error),
  };
}

/**
 * Build tracking params from error and context
 */
export function buildTrackingParams(
  error: unknown,
  context?: RequestContext
): {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  errorHash: string;
  module?: string;
  functionName?: string;
  userId?: string;
  sessionId?: string;
  requestPath?: string;
  requestMethod?: string;
  requestBody?: Record<string, unknown>;
  requestParams?: Record<string, unknown>;
} {
  const details = extractErrorDetails(error);
  const errorHash = generateErrorHash(
    details.errorType,
    details.errorMessage,
    context?.module
  );
  
  return {
    errorType: details.errorType,
    errorMessage: details.errorMessage,
    errorStack: details.errorStack,
    errorHash,
    module: context?.module,
    functionName: context?.function_name,
    userId: context?.user_id,
    sessionId: context?.session_id,
    requestPath: context?.path,
    requestMethod: context?.method,
    requestBody: context?.body,
    requestParams: context?.params,
  };
}
