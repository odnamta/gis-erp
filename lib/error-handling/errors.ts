/**
 * Custom Error Classes
 * 
 * Implements operational error types with consistent structure.
 * All custom errors implement the AppError interface.
 * 
 * Requirements:
 * - 2.1: Validation errors show field and rule
 * - 2.2: Not found errors show entity type and ID
 * - 2.3: Authorization errors show permission requirement
 * - 2.4: Conflict errors show conflicting state
 */

/**
 * AppError interface for custom errors
 */
export interface AppError extends Error {
  code: string;
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, unknown>;
}

/**
 * Validation Error - HTTP 400
 * 
 * Thrown when input validation fails.
 * Returns a message showing the field and validation rule that failed.
 * 
 * Requirement 2.1: WHEN a validation error occurs, THE Error_Tracking_System SHALL 
 * return a message showing the field and validation rule that failed
 */
export class ValidationError extends Error implements AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly isOperational = true;
  readonly field?: string;
  readonly rule?: string;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    field?: string,
    rule?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.rule = rule;
    this.context = { ...context, field, rule };
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  static required(field: string): ValidationError {
    return new ValidationError(
      `${field} is required`,
      field,
      'required'
    );
  }

  static invalidFormat(field: string, expectedFormat: string): ValidationError {
    return new ValidationError(
      `${field} has invalid format. Expected: ${expectedFormat}`,
      field,
      'format',
      { expectedFormat }
    );
  }

  static outOfRange(field: string, min?: number, max?: number): ValidationError {
    let message = `${field} is out of range`;
    if (min !== undefined && max !== undefined) {
      message = `${field} must be between ${min} and ${max}`;
    } else if (min !== undefined) {
      message = `${field} must be at least ${min}`;
    } else if (max !== undefined) {
      message = `${field} must be at most ${max}`;
    }
    return new ValidationError(message, field, 'range', { min, max });
  }

  static invalidValue(field: string, allowedValues: string[]): ValidationError {
    return new ValidationError(
      `${field} must be one of: ${allowedValues.join(', ')}`,
      field,
      'enum',
      { allowedValues }
    );
  }
}

/**
 * Not Found Error - HTTP 404
 * 
 * Thrown when a requested resource doesn't exist.
 * Returns a message showing the entity type and ID.
 * 
 * Requirement 2.2: WHEN a not found error occurs, THE Error_Tracking_System SHALL 
 * return a message showing the entity type and ID
 */
export class NotFoundError extends Error implements AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly isOperational = true;
  readonly entity: string;
  readonly entityId?: string;
  readonly context?: Record<string, unknown>;

  constructor(entity: string, id?: string, context?: Record<string, unknown>) {
    const message = id 
      ? `${entity} with ID ${id} not found` 
      : `${entity} not found`;
    super(message);
    this.name = 'NotFoundError';
    this.entity = entity;
    this.entityId = id;
    this.context = { ...context, entity, id };
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

/**
 * Authorization Error - HTTP 403
 * 
 * Thrown when a user lacks permission to perform an action.
 * Returns a message explaining the permission requirement.
 * 
 * Requirement 2.3: WHEN an authorization error occurs, THE Error_Tracking_System SHALL 
 * return a message explaining the permission requirement
 */
export class AuthorizationError extends Error implements AppError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 403;
  readonly isOperational = true;
  readonly requiredPermission?: string;
  readonly context?: Record<string, unknown>;

  constructor(
    message?: string,
    requiredPermission?: string,
    context?: Record<string, unknown>
  ) {
    let fullMessage = message || 'You do not have permission to perform this action';
    if (requiredPermission && !message) {
      fullMessage = `Permission required: ${requiredPermission}`;
    } else if (requiredPermission && message) {
      fullMessage = `${message} (requires: ${requiredPermission})`;
    }
    
    super(fullMessage);
    this.name = 'AuthorizationError';
    this.requiredPermission = requiredPermission;
    this.context = { ...context, requiredPermission };
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }

  static requiresRole(role: string): AuthorizationError {
    return new AuthorizationError(
      `This action requires the ${role} role`,
      `role:${role}`
    );
  }

  static requiresPermission(permission: string): AuthorizationError {
    return new AuthorizationError(undefined, permission);
  }
}

/**
 * Conflict Error - HTTP 409
 * 
 * Thrown when an operation conflicts with the current state.
 * Returns a message describing the conflicting state.
 * 
 * Requirement 2.4: WHEN a conflict error occurs, THE Error_Tracking_System SHALL 
 * return a message describing the conflicting state
 */
export class ConflictError extends Error implements AppError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
  readonly isOperational = true;
  readonly conflictingState?: string;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    conflictingState?: string,
    context?: Record<string, unknown>
  ) {
    let fullMessage = message;
    if (conflictingState) {
      fullMessage = `${message} (current state: ${conflictingState})`;
    }
    
    super(fullMessage);
    this.name = 'ConflictError';
    this.conflictingState = conflictingState;
    this.context = { ...context, conflictingState };
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConflictError);
    }
  }

  static alreadyExists(entity: string, identifier?: string): ConflictError {
    const message = identifier
      ? `${entity} '${identifier}' already exists`
      : `${entity} already exists`;
    return new ConflictError(message, 'exists', { entity, identifier });
  }

  static invalidStateTransition(
    entity: string,
    currentState: string,
    targetState: string
  ): ConflictError {
    return new ConflictError(
      `Cannot transition ${entity} from ${currentState} to ${targetState}`,
      currentState,
      { entity, currentState, targetState }
    );
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    'code' in error &&
    'statusCode' in error &&
    'isOperational' in error &&
    typeof (error as AppError).code === 'string' &&
    typeof (error as AppError).statusCode === 'number' &&
    typeof (error as AppError).isOperational === 'boolean'
  );
}

/**
 * Type guard to check if an error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return 'INTERNAL_ERROR';
}

/**
 * Get HTTP status code from any error
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}
