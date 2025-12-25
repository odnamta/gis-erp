// v0.77: ERROR HANDLING ERRORS PROPERTY TESTS
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  isAppError,
  isOperationalError,
  getErrorCode,
  getStatusCode,
} from '@/lib/error-handling/errors';

// Arbitraries
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const validationRuleArb = fc.constantFrom('required', 'minLength', 'maxLength', 'pattern', 'email', 'format', 'range', 'enum');
const entityTypeArb = fc.constantFrom('Customer', 'Project', 'Invoice', 'JobOrder', 'PJO', 'Quotation', 'Vendor');
const permissionArb = fc.constantFrom('read:customers', 'write:customers', 'delete:customers', 'read:projects', 'write:invoices');
const stateArb = fc.constantFrom('draft', 'pending', 'approved', 'rejected', 'active', 'completed', 'cancelled');

describe('Error Handling Errors Property Tests', () => {
  describe('Property 5: Operational Error Messages', () => {
    /**
     * Feature: error-handling-recovery, Property 5: Operational Error Messages
     * All custom error classes SHALL be operational and include appropriate context.
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4
     */

    describe('ValidationError (Requirement 2.1)', () => {
      it('should always be operational with code VALIDATION_ERROR and status 400', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            const error = new ValidationError(message);
            return error.code === 'VALIDATION_ERROR' &&
              error.statusCode === 400 &&
              error.isOperational === true &&
              error.name === 'ValidationError' &&
              error.message === message;
          }),
          { numRuns: 100 }
        );
      });

      it('should store field name when provided', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, nonEmptyStringArb, (message, field) => {
            const error = new ValidationError(message, field);
            return error.field === field &&
              error.context?.field === field;
          }),
          { numRuns: 100 }
        );
      });

      it('should store validation rule when provided', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, nonEmptyStringArb, validationRuleArb, (message, field, rule) => {
            const error = new ValidationError(message, field, rule);
            return error.field === field &&
              error.rule === rule &&
              error.context?.rule === rule;
          }),
          { numRuns: 100 }
        );
      });

      it('should create required field error via static method', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (field) => {
            const error = ValidationError.required(field);
            return error.field === field &&
              error.rule === 'required' &&
              error.message.includes(field) &&
              error.message.includes('required');
          }),
          { numRuns: 100 }
        );
      });

      it('should create invalid format error via static method', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, nonEmptyStringArb, (field, format) => {
            const error = ValidationError.invalidFormat(field, format);
            return error.field === field &&
              error.rule === 'format' &&
              error.message.includes(field) &&
              error.context?.expectedFormat === format;
          }),
          { numRuns: 100 }
        );
      });

      it('should create out of range error via static method', () => {
        fc.assert(
          fc.property(
            nonEmptyStringArb,
            fc.integer({ min: 0, max: 100 }),
            fc.integer({ min: 101, max: 1000 }),
            (field, min, max) => {
              const error = ValidationError.outOfRange(field, min, max);
              return error.field === field &&
                error.rule === 'range' &&
                error.context?.min === min &&
                error.context?.max === max;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('NotFoundError (Requirement 2.2)', () => {
      it('should always be operational with code NOT_FOUND and status 404', () => {
        fc.assert(
          fc.property(entityTypeArb, (entity) => {
            const error = new NotFoundError(entity);
            return error.code === 'NOT_FOUND' &&
              error.statusCode === 404 &&
              error.isOperational === true &&
              error.name === 'NotFoundError' &&
              error.entity === entity;
          }),
          { numRuns: 100 }
        );
      });

      it('should include entity type and ID in message when ID provided', () => {
        fc.assert(
          fc.property(entityTypeArb, fc.uuid(), (entity, id) => {
            const error = new NotFoundError(entity, id);
            return error.entity === entity &&
              error.entityId === id &&
              error.message.includes(entity) &&
              error.message.includes(id) &&
              error.context?.entity === entity &&
              error.context?.id === id;
          }),
          { numRuns: 100 }
        );
      });

      it('should work without ID', () => {
        fc.assert(
          fc.property(entityTypeArb, (entity) => {
            const error = new NotFoundError(entity);
            return error.entity === entity &&
              error.entityId === undefined &&
              error.message.includes(entity) &&
              error.message.includes('not found');
          }),
          { numRuns: 100 }
        );
      });
    });

    describe('AuthorizationError (Requirement 2.3)', () => {
      it('should always be operational with code UNAUTHORIZED and status 403', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            const error = new AuthorizationError(message);
            return error.code === 'UNAUTHORIZED' &&
              error.statusCode === 403 &&
              error.isOperational === true &&
              error.name === 'AuthorizationError';
          }),
          { numRuns: 100 }
        );
      });

      it('should include required permission when provided', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, permissionArb, (message, permission) => {
            const error = new AuthorizationError(message, permission);
            return error.requiredPermission === permission &&
              error.message.includes(permission) &&
              error.context?.requiredPermission === permission;
          }),
          { numRuns: 100 }
        );
      });

      it('should generate permission message when only permission provided', () => {
        fc.assert(
          fc.property(permissionArb, (permission) => {
            const error = new AuthorizationError(undefined, permission);
            return error.requiredPermission === permission &&
              error.message.includes('Permission required') &&
              error.message.includes(permission);
          }),
          { numRuns: 100 }
        );
      });

      it('should create role requirement error via static method', () => {
        fc.assert(
          fc.property(fc.constantFrom('admin', 'manager', 'ops', 'sales', 'finance'), (role) => {
            const error = AuthorizationError.requiresRole(role);
            return error.requiredPermission === `role:${role}` &&
              error.message.includes(role) &&
              error.message.includes('role');
          }),
          { numRuns: 100 }
        );
      });

      it('should create permission requirement error via static method', () => {
        fc.assert(
          fc.property(permissionArb, (permission) => {
            const error = AuthorizationError.requiresPermission(permission);
            return error.requiredPermission === permission &&
              error.message.includes(permission);
          }),
          { numRuns: 100 }
        );
      });
    });

    describe('ConflictError (Requirement 2.4)', () => {
      it('should always be operational with code CONFLICT and status 409', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            const error = new ConflictError(message);
            return error.code === 'CONFLICT' &&
              error.statusCode === 409 &&
              error.isOperational === true &&
              error.name === 'ConflictError';
          }),
          { numRuns: 100 }
        );
      });

      it('should include conflicting state when provided', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, stateArb, (message, state) => {
            const error = new ConflictError(message, state);
            return error.conflictingState === state &&
              error.message.includes(state) &&
              error.context?.conflictingState === state;
          }),
          { numRuns: 100 }
        );
      });

      it('should create already exists error via static method', () => {
        fc.assert(
          fc.property(entityTypeArb, nonEmptyStringArb, (entity, identifier) => {
            const error = ConflictError.alreadyExists(entity, identifier);
            return error.conflictingState === 'exists' &&
              error.message.includes(entity) &&
              error.message.includes(identifier) &&
              error.message.includes('already exists');
          }),
          { numRuns: 100 }
        );
      });

      it('should create invalid state transition error via static method', () => {
        fc.assert(
          fc.property(entityTypeArb, stateArb, stateArb, (entity, currentState, targetState) => {
            const error = ConflictError.invalidStateTransition(entity, currentState, targetState);
            return error.conflictingState === currentState &&
              error.message.includes(entity) &&
              error.message.includes(currentState) &&
              error.message.includes(targetState) &&
              error.context?.currentState === currentState &&
              error.context?.targetState === targetState;
          }),
          { numRuns: 100 }
        );
      });
    });
  });

  describe('Type Guards and Utility Functions', () => {
    describe('isAppError', () => {
      it('should return true for all custom error types', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            const validationError = new ValidationError(message);
            const notFoundError = new NotFoundError('Entity');
            const authError = new AuthorizationError(message);
            const conflictError = new ConflictError(message);

            return isAppError(validationError) &&
              isAppError(notFoundError) &&
              isAppError(authError) &&
              isAppError(conflictError);
          }),
          { numRuns: 100 }
        );
      });

      it('should return false for standard Error', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            const standardError = new Error(message);
            return !isAppError(standardError);
          }),
          { numRuns: 100 }
        );
      });

      it('should return false for non-error values', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.constant(null),
              fc.constant(undefined),
              fc.object()
            ),
            (value) => {
              return !isAppError(value);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('isOperationalError', () => {
      it('should return true for all custom operational errors', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            return isOperationalError(new ValidationError(message)) &&
              isOperationalError(new NotFoundError('Entity')) &&
              isOperationalError(new AuthorizationError(message)) &&
              isOperationalError(new ConflictError(message));
          }),
          { numRuns: 100 }
        );
      });

      it('should return false for standard Error', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            return !isOperationalError(new Error(message));
          }),
          { numRuns: 100 }
        );
      });

      it('should return false for non-error values', () => {
        fc.assert(
          fc.property(
            fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
            (value) => {
              return !isOperationalError(value);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('getErrorCode', () => {
      it('should return correct code for each error type', () => {
        expect(getErrorCode(new ValidationError('test'))).toBe('VALIDATION_ERROR');
        expect(getErrorCode(new NotFoundError('Entity'))).toBe('NOT_FOUND');
        expect(getErrorCode(new AuthorizationError('test'))).toBe('UNAUTHORIZED');
        expect(getErrorCode(new ConflictError('test'))).toBe('CONFLICT');
      });

      it('should return INTERNAL_ERROR for standard Error', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            return getErrorCode(new Error(message)) === 'INTERNAL_ERROR';
          }),
          { numRuns: 100 }
        );
      });

      it('should return INTERNAL_ERROR for non-error values', () => {
        fc.assert(
          fc.property(
            fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
            (value) => {
              return getErrorCode(value) === 'INTERNAL_ERROR';
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('getStatusCode', () => {
      it('should return correct status code for each error type', () => {
        expect(getStatusCode(new ValidationError('test'))).toBe(400);
        expect(getStatusCode(new NotFoundError('Entity'))).toBe(404);
        expect(getStatusCode(new AuthorizationError('test'))).toBe(403);
        expect(getStatusCode(new ConflictError('test'))).toBe(409);
      });

      it('should return 500 for standard Error', () => {
        fc.assert(
          fc.property(nonEmptyStringArb, (message) => {
            return getStatusCode(new Error(message)) === 500;
          }),
          { numRuns: 100 }
        );
      });

      it('should return 500 for non-error values', () => {
        fc.assert(
          fc.property(
            fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
            (value) => {
              return getStatusCode(value) === 500;
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
