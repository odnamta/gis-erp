/**
 * Property-Based Tests for Engineering Drawing Management
 * Feature: engineering-drawing-management
 * 
 * These tests validate universal correctness properties using fast-check
 * with minimum 100 iterations per property.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateDrawingNumber,
  generateTransmittalNumber,
  getNextRevision,
  isValidDrawingFileType,
  getFileExtension,
  validateDrawingInput,
  validateRevisionInput,
  validateTransmittalInput,
  isValidStatusTransition,
  filterDrawings,
  sortDrawingsByNumber,
} from '@/lib/drawing-utils';
import {
  DrawingFormInput,
  RevisionFormInput,
  TransmittalFormInput,
  DrawingStatus,
  TransmittalPurpose,
  DrawingWithDetails,
  VALID_STATUS_TRANSITIONS,
} from '@/types/drawing';

const NUM_RUNS = 100;

describe('Feature: engineering-drawing-management', () => {
  /**
   * Property 1: Drawing Number Format and Uniqueness
   * For any drawing created with a category prefix, the generated drawing number
   * SHALL follow the format {PREFIX}-{YEAR}-{NNNN} and be unique across all drawings.
   */
  describe('Property 1: Drawing Number Format and Uniqueness', () => {
    it('should generate drawing numbers in correct format {PREFIX}-{YEAR}-{NNNN}', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /^[A-Z]+$/.test(s)),
          fc.integer({ min: 1, max: 9999 }),
          (prefix, sequence) => {
            const result = generateDrawingNumber(prefix, sequence);
            const year = new Date().getFullYear();
            const pattern = new RegExp(`^${prefix}-${year}-\\d{4}$`);
            expect(result).toMatch(pattern);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should generate unique drawing numbers for different sequences', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 3 }).filter(s => /^[A-Z]+$/.test(s)),
          fc.integer({ min: 1, max: 9998 }),
          (prefix, seq1) => {
            const seq2 = seq1 + 1;
            const num1 = generateDrawingNumber(prefix, seq1);
            const num2 = generateDrawingNumber(prefix, seq2);
            expect(num1).not.toBe(num2);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });
  });

  /**
   * Property 2: File Type Validation
   * For any file upload attempt, the system SHALL accept only files with extensions
   * .dwg, .pdf, or .dxf (case-insensitive), and reject all other file types.
   */
  describe('Property 2: File Type Validation', () => {
    it('should accept valid file extensions (dwg, pdf, dxf)', () => {
      const validExtensions = ['dwg', 'pdf', 'dxf', 'DWG', 'PDF', 'DXF', 'Dwg', 'Pdf', 'Dxf'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.constantFrom(...validExtensions),
          (filename, ext) => {
            const fullFilename = `${filename}.${ext}`;
            expect(isValidDrawingFileType(fullFilename)).toBe(true);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should reject invalid file extensions', () => {
      const invalidExtensions = ['doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'txt', 'zip'];
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.constantFrom(...invalidExtensions),
          (filename, ext) => {
            const fullFilename = `${filename}.${ext}`;
            expect(isValidDrawingFileType(fullFilename)).toBe(false);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should reject files without extensions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes('.')),
          (filename) => {
            expect(isValidDrawingFileType(filename)).toBe(false);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });
  });

  /**
   * Property 3: Drawing Input Validation
   * For any drawing creation attempt, the system SHALL reject inputs where
   * title is empty/whitespace or category_id is missing.
   */
  describe('Property 3: Drawing Input Validation', () => {
    it('should reject empty or whitespace-only titles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n', '  \t  '),
          fc.uuid(),
          (title, categoryId) => {
            const input: DrawingFormInput = {
              title,
              category_id: categoryId,
            };
            const result = validateDrawingInput(input);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Drawing title is required');
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should reject missing category_id', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom('', '   '),
          (title, categoryId) => {
            const input: DrawingFormInput = {
              title,
              category_id: categoryId,
            };
            const result = validateDrawingInput(input);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Please select a drawing category');
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should accept valid inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.uuid(),
          (title, categoryId) => {
            const input: DrawingFormInput = {
              title,
              category_id: categoryId,
            };
            const result = validateDrawingInput(input);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });
  });

  /**
   * Property 4: Revision Number Sequence
   * For any current revision letter, the next revision SHALL be the subsequent
   * letter in the alphabet (A→B, B→C, ..., Z→AA).
   */
  describe('Property 4: Revision Number Sequence', () => {
    it('should increment single letters correctly (A-Y)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 24 }), // A-Y (0-24)
          (charIndex) => {
            const current = String.fromCharCode(65 + charIndex);
            const expected = String.fromCharCode(66 + charIndex);
            expect(getNextRevision(current)).toBe(expected);
          }
        ),
        { numRuns: 25 } // Test all A-Y
      );
    });

    it('should handle Z → AA transition', () => {
      expect(getNextRevision('Z')).toBe('AA');
    });

    it('should handle empty/null input', () => {
      expect(getNextRevision('')).toBe('A');
    });

    it('should increment multi-letter revisions correctly', () => {
      expect(getNextRevision('AA')).toBe('AB');
      expect(getNextRevision('AZ')).toBe('BA');
      expect(getNextRevision('BA')).toBe('BB');
    });
  });

  /**
   * Property 7: Revision Requires Change Description
   * For any revision creation attempt, the system SHALL reject inputs where
   * change_description is empty or whitespace-only.
   */
  describe('Property 7: Revision Requires Change Description', () => {
    it('should reject empty or whitespace-only change descriptions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n', '  \t  '),
          (changeDescription) => {
            const input: RevisionFormInput = {
              change_description: changeDescription,
            };
            const result = validateRevisionInput(input);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Change description is required for new revisions');
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should accept valid change descriptions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          (changeDescription) => {
            const input: RevisionFormInput = {
              change_description: changeDescription,
            };
            const result = validateRevisionInput(input);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });
  });

  /**
   * Property 8: Valid Status Transitions
   * For any status transition attempt, the system SHALL only allow transitions
   * that follow the defined workflow.
   */
  describe('Property 8: Valid Status Transitions', () => {
    const allStatuses: DrawingStatus[] = [
      'draft', 'for_review', 'for_approval', 'approved', 'issued', 'superseded'
    ];

    it('should allow valid transitions as defined in workflow', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allStatuses),
          (currentStatus) => {
            const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus];
            allowedNext.forEach(nextStatus => {
              expect(isValidStatusTransition(currentStatus, nextStatus)).toBe(true);
            });
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should reject invalid transitions', () => {
      // Test specific invalid transitions
      expect(isValidStatusTransition('draft', 'approved')).toBe(false);
      expect(isValidStatusTransition('draft', 'issued')).toBe(false);
      expect(isValidStatusTransition('for_review', 'issued')).toBe(false);
      expect(isValidStatusTransition('approved', 'draft')).toBe(false);
      expect(isValidStatusTransition('issued', 'draft')).toBe(false);
      expect(isValidStatusTransition('superseded', 'draft')).toBe(false);
    });
  });

  /**
   * Property 11: Transmittal Number Format
   * For any transmittal created, the generated transmittal number SHALL follow
   * the format TR-{YEAR}-{NNNN} and be unique.
   */
  describe('Property 11: Transmittal Number Format', () => {
    it('should generate transmittal numbers in correct format TR-{YEAR}-{NNNN}', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9999 }),
          (sequence) => {
            const result = generateTransmittalNumber(sequence);
            const year = new Date().getFullYear();
            const pattern = new RegExp(`^TR-${year}-\\d{4}$`);
            expect(result).toMatch(pattern);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });
  });

  /**
   * Property 12: Transmittal Input Validation
   * For any transmittal creation attempt, the system SHALL reject inputs where
   * recipient_company is empty or purpose is not one of the valid enum values.
   */
  describe('Property 12: Transmittal Input Validation', () => {
    const validPurposes: TransmittalPurpose[] = [
      'for_approval', 'for_construction', 'for_information', 'for_review', 'as_built'
    ];

    it('should reject empty recipient company', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   '),
          fc.constantFrom(...validPurposes),
          (company, purpose) => {
            const input: TransmittalFormInput = {
              recipient_company: company,
              purpose,
              drawings: [{ drawing_id: '123', drawing_number: 'GA-2025-0001', title: 'Test', revision: 'A', copies: 1 }],
            };
            const result = validateTransmittalInput(input);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Recipient company is required');
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });

    it('should accept valid transmittal inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validPurposes),
          (company, purpose) => {
            const input: TransmittalFormInput = {
              recipient_company: company,
              purpose,
              drawings: [{ drawing_id: '123', drawing_number: 'GA-2025-0001', title: 'Test', revision: 'A', copies: 1 }],
            };
            const result = validateTransmittalInput(input);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: NUM_RUNS }
      );
    });
  });

  /**
   * Property 13: Filter Results Match Criteria
   * For any filter applied to the drawing list, all returned drawings SHALL
   * match the specified filter criteria.
   */
  describe('Property 13: Filter Results Match Criteria', () => {
    const createMockDrawing = (overrides: Partial<DrawingWithDetails>): DrawingWithDetails => ({
      id: 'test-id',
      drawing_number: 'GA-2025-0001',
      category_id: 'cat-1',
      project_id: null,
      job_order_id: null,
      assessment_id: null,
      route_survey_id: null,
      jmp_id: null,
      title: 'Test Drawing',
      description: null,
      scale: null,
      paper_size: 'A1',
      current_revision: 'A',
      revision_count: 1,
      file_url: null,
      file_type: null,
      file_size_kb: null,
      thumbnail_url: null,
      status: 'draft',
      drafted_by: null,
      drafted_at: null,
      checked_by: null,
      checked_at: null,
      approved_by: null,
      approved_at: null,
      issued_by: null,
      issued_at: null,
      distribution_list: [],
      notes: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    });

    it('should filter by category_id correctly', () => {
      const drawings: DrawingWithDetails[] = [
        createMockDrawing({ id: '1', category_id: 'cat-1' }),
        createMockDrawing({ id: '2', category_id: 'cat-2' }),
        createMockDrawing({ id: '3', category_id: 'cat-1' }),
      ];

      const result = filterDrawings(drawings, { category_id: 'cat-1' });
      expect(result).toHaveLength(2);
      result.forEach(d => expect(d.category_id).toBe('cat-1'));
    });

    it('should filter by status correctly', () => {
      const drawings: DrawingWithDetails[] = [
        createMockDrawing({ id: '1', status: 'draft' }),
        createMockDrawing({ id: '2', status: 'approved' }),
        createMockDrawing({ id: '3', status: 'draft' }),
      ];

      const result = filterDrawings(drawings, { status: 'draft' });
      expect(result).toHaveLength(2);
      result.forEach(d => expect(d.status).toBe('draft'));
    });

    it('should filter by search term correctly', () => {
      const drawings: DrawingWithDetails[] = [
        createMockDrawing({ id: '1', drawing_number: 'GA-2025-0001', title: 'Lifting Plan' }),
        createMockDrawing({ id: '2', drawing_number: 'LP-2025-0001', title: 'General Arrangement' }),
        createMockDrawing({ id: '3', drawing_number: 'GA-2025-0002', title: 'Site Plan' }),
      ];

      const result = filterDrawings(drawings, { search: 'GA-2025' });
      expect(result).toHaveLength(2);
      result.forEach(d => expect(d.drawing_number).toContain('GA-2025'));
    });
  });

  /**
   * Property 14: Drawings Sorted by Number
   * For any list of drawings returned by the sort function, the drawings SHALL
   * be ordered by drawing_number in ascending alphanumeric order.
   */
  describe('Property 14: Drawings Sorted by Number', () => {
    const createMockDrawing = (drawingNumber: string): DrawingWithDetails => ({
      id: 'test-id',
      drawing_number: drawingNumber,
      category_id: 'cat-1',
      project_id: null,
      job_order_id: null,
      assessment_id: null,
      route_survey_id: null,
      jmp_id: null,
      title: 'Test Drawing',
      description: null,
      scale: null,
      paper_size: 'A1',
      current_revision: 'A',
      revision_count: 1,
      file_url: null,
      file_type: null,
      file_size_kb: null,
      thumbnail_url: null,
      status: 'draft',
      drafted_by: null,
      drafted_at: null,
      checked_by: null,
      checked_at: null,
      approved_by: null,
      approved_at: null,
      issued_by: null,
      issued_at: null,
      distribution_list: [],
      notes: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it('should sort drawings by number in ascending order', () => {
      const drawings: DrawingWithDetails[] = [
        createMockDrawing('GA-2025-0003'),
        createMockDrawing('GA-2025-0001'),
        createMockDrawing('GA-2025-0002'),
        createMockDrawing('LP-2025-0001'),
      ];

      const sorted = sortDrawingsByNumber(drawings);
      
      for (let i = 1; i < sorted.length; i++) {
        const comparison = sorted[i - 1].drawing_number.localeCompare(
          sorted[i].drawing_number,
          undefined,
          { numeric: true, sensitivity: 'base' }
        );
        expect(comparison).toBeLessThanOrEqual(0);
      }
    });

    it('should not mutate the original array', () => {
      const drawings: DrawingWithDetails[] = [
        createMockDrawing('GA-2025-0003'),
        createMockDrawing('GA-2025-0001'),
      ];
      const originalFirst = drawings[0].drawing_number;

      sortDrawingsByNumber(drawings);
      
      expect(drawings[0].drawing_number).toBe(originalFirst);
    });
  });
});
