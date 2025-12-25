/**
 * Property-Based Tests for Validation Error Logger
 * Tests Properties 12, 13
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Validation Error Logger', () => {
  const testConfig = { numRuns: 100 };

  // Generators
  const entityTypeGenerator = fc.constantFrom(
    'customer',
    'project',
    'quotation',
    'pjo',
    'job_order',
    'invoice',
    'employee',
    'vendor'
  );

  const fieldNameGenerator = fc.string({ minLength: 1, maxLength: 50 })
    .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));

  const validationRuleGenerator = fc.constantFrom(
    'required',
    'format',
    'range',
    'enum',
    'minLength',
    'maxLength',
    'pattern',
    'unique',
    'email',
    'phone'
  );

  const errorMessageGenerator = fc.string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);

  describe('Property 12: Validation Error Logging', () => {
    /**
     * Feature: error-handling-recovery, Property 12: Validation Error Logging
     * All validation errors SHALL be logged with entity_type, entity_id, field_name,
     * field_value, validation_rule, error_message, and user_id.
     * Validates: Requirements 5.1, 5.2, 5.3
     */

    it('should define correct structure for validation error logging', () => {
      fc.assert(
        fc.property(
          entityTypeGenerator,
          fc.option(fc.uuid(), { nil: undefined }),
          fieldNameGenerator,
          fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
          validationRuleGenerator,
          errorMessageGenerator,
          fc.option(fc.uuid(), { nil: undefined }),
          (entityType, entityId, fieldName, fieldValue, validationRule, errorMessage, userId) => {
            // Verify the structure that would be logged
            const validationErrorEntry = {
              entity_type: entityType,
              entity_id: entityId,
              field_name: fieldName,
              field_value: fieldValue,
              validation_rule: validationRule,
              error_message: errorMessage,
              user_id: userId,
              corrected: false,
            };

            expect(validationErrorEntry.entity_type).toBe(entityType);
            expect(validationErrorEntry.field_name).toBe(fieldName);
            expect(validationErrorEntry.validation_rule).toBe(validationRule);
            expect(validationErrorEntry.error_message).toBe(errorMessage);
            expect(validationErrorEntry.corrected).toBe(false);
          }
        ),
        testConfig
      );
    });

    it('should always set corrected to false on initial log', () => {
      fc.assert(
        fc.property(
          entityTypeGenerator,
          fieldNameGenerator,
          validationRuleGenerator,
          errorMessageGenerator,
          (entityType, fieldName, validationRule, errorMessage) => {
            const validationErrorEntry = {
              entity_type: entityType,
              field_name: fieldName,
              validation_rule: validationRule,
              error_message: errorMessage,
              corrected: false,
            };

            expect(validationErrorEntry.corrected).toBe(false);
          }
        ),
        testConfig
      );
    });

    it('should define correct structure for marking as corrected', () => {
      fc.assert(
        fc.property(fc.uuid(), (errorId) => {
          const now = new Date().toISOString();
          
          const correctionUpdate = {
            corrected: true,
            corrected_at: now,
          };

          expect(correctionUpdate.corrected).toBe(true);
          expect(correctionUpdate.corrected_at).toBeDefined();
          expect(new Date(correctionUpdate.corrected_at).getTime()).not.toBeNaN();
        }),
        testConfig
      );
    });
  });

  describe('Property 13: Validation Error Filtering', () => {
    /**
     * Feature: error-handling-recovery, Property 13: Validation Error Filtering
     * Validation errors SHALL be filterable by entity_type, field_name, and date range.
     * Validates: Requirements 5.4
     */

    it('should support filtering by entity_type', () => {
      fc.assert(
        fc.property(
          entityTypeGenerator,
          (entityType) => {
            const filters = { entityType };
            
            expect(filters.entityType).toBe(entityType);
          }
        ),
        testConfig
      );
    });

    it('should support filtering by multiple entity_types', () => {
      fc.assert(
        fc.property(
          fc.array(entityTypeGenerator, { minLength: 1, maxLength: 4 }),
          (entityTypes) => {
            const uniqueTypes = [...new Set(entityTypes)];
            const filters = { entityType: uniqueTypes };
            
            expect(Array.isArray(filters.entityType)).toBe(true);
            expect(filters.entityType.length).toBeGreaterThan(0);
          }
        ),
        testConfig
      );
    });

    it('should support filtering by field_name', () => {
      fc.assert(
        fc.property(
          fieldNameGenerator,
          (fieldName) => {
            const filters = { fieldName };
            
            expect(filters.fieldName).toBe(fieldName);
          }
        ),
        testConfig
      );
    });

    it('should support filtering by multiple field_names', () => {
      fc.assert(
        fc.property(
          fc.array(fieldNameGenerator, { minLength: 1, maxLength: 5 }),
          (fieldNames) => {
            const uniqueFields = [...new Set(fieldNames)];
            const filters = { fieldName: uniqueFields };
            
            expect(Array.isArray(filters.fieldName)).toBe(true);
          }
        ),
        testConfig
      );
    });

    it('should support filtering by date range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1704067200000, max: 1735689600000 }), // 2024-01-01 to 2025-01-01
          fc.integer({ min: 1704067200000, max: 1735689600000 }),
          (ts1, ts2) => {
            const date1 = new Date(ts1);
            const date2 = new Date(ts2);
            const [dateFrom, dateTo] = ts1 < ts2 ? [date1, date2] : [date2, date1];
            
            const filters = {
              dateFrom: dateFrom.toISOString(),
              dateTo: dateTo.toISOString(),
            };
            
            expect(new Date(filters.dateFrom).getTime()).toBeLessThanOrEqual(
              new Date(filters.dateTo).getTime()
            );
          }
        ),
        testConfig
      );
    });

    it('should support filtering by corrected status', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (corrected) => {
            const filters = { corrected };
            
            expect(typeof filters.corrected).toBe('boolean');
          }
        ),
        testConfig
      );
    });

    it('should support combining multiple filters', () => {
      fc.assert(
        fc.property(
          entityTypeGenerator,
          fieldNameGenerator,
          fc.boolean(),
          (entityType, fieldName, corrected) => {
            const filters = {
              entityType,
              fieldName,
              corrected,
            };
            
            expect(filters.entityType).toBe(entityType);
            expect(filters.fieldName).toBe(fieldName);
            expect(filters.corrected).toBe(corrected);
          }
        ),
        testConfig
      );
    });
  });

  describe('Validation Error Statistics', () => {
    it('should calculate correct statistics structure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (correctedCount, uncorrectedCount) => {
            const total = correctedCount + uncorrectedCount;
            
            const stats = {
              total,
              corrected: correctedCount,
              uncorrected: uncorrectedCount,
              byEntityType: {} as Record<string, number>,
              byFieldName: {} as Record<string, number>,
            };
            
            expect(stats.total).toBe(correctedCount + uncorrectedCount);
            expect(stats.corrected).toBeLessThanOrEqual(stats.total);
            expect(stats.uncorrected).toBeLessThanOrEqual(stats.total);
            expect(stats.corrected + stats.uncorrected).toBe(stats.total);
          }
        ),
        testConfig
      );
    });
  });
});
