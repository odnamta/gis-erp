/**
 * Company Settings Utils Tests
 * Property-based tests using fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateVatRate,
  validatePaymentTerms,
  validateDocumentFormat,
  validateLogoFile,
  generateDocumentNumber,
  previewDocumentNumber,
  getSettingValue,
  rowsToSettings,
  validateRequiredFields,
} from '@/lib/company-settings-utils';
import { DEFAULT_SETTINGS } from '@/types/company-settings';

describe('Company Settings Utils', () => {
  /**
   * **Feature: company-settings, Property 4: VAT rate validation**
   * *For any* numeric value, the VAT rate validation should return true
   * if and only if the value is between 0 and 100 inclusive.
   * **Validates: Requirements 2.2**
   */
  describe('validateVatRate', () => {
    it('should accept values between 0 and 100 inclusive', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rate) => {
            expect(validateVatRate(rate)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject values below 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: -1 }),
          (rate) => {
            expect(validateVatRate(rate)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject values above 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 101, max: 1000 }),
          (rate) => {
            expect(validateVatRate(rate)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject NaN', () => {
      expect(validateVatRate(NaN)).toBe(false);
    });

    it('should accept boundary values 0 and 100', () => {
      expect(validateVatRate(0)).toBe(true);
      expect(validateVatRate(100)).toBe(true);
    });
  });


  /**
   * **Feature: company-settings, Property 5: Payment terms validation**
   * *For any* numeric value, the payment terms validation should return true
   * if and only if the value is a positive integer.
   * **Validates: Requirements 2.3**
   */
  describe('validatePaymentTerms', () => {
    it('should accept positive integers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          (days) => {
            expect(validatePaymentTerms(days)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject zero', () => {
      expect(validatePaymentTerms(0)).toBe(false);
    });

    it('should reject negative integers', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: -1 }),
          (days) => {
            expect(validatePaymentTerms(days)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-integer values', () => {
      // Test specific non-integer values
      const nonIntegers = [0.5, 1.5, 2.7, 10.1, 30.5, 99.9];
      nonIntegers.forEach(days => {
        expect(validatePaymentTerms(days)).toBe(false);
      });
    });

    it('should reject NaN', () => {
      expect(validatePaymentTerms(NaN)).toBe(false);
    });
  });

  /**
   * **Feature: company-settings, Property 6: Document number format validation**
   * *For any* format string, the format validation should return valid
   * if and only if the string contains all required placeholders: NNNN, MM, and YYYY.
   * **Validates: Requirements 3.3**
   */
  describe('validateDocumentFormat', () => {
    it('should accept formats containing all required placeholders', () => {
      const validFormats = [
        'NNNN/CARGO/MM/YYYY',
        'NNNN/GG/MM/YYYY',
        'NNNN/GIS-A/MM/YYYY',
        'INV-NNNN-MM-YYYY',
        'YYYY/MM/NNNN',
        'MM-YYYY-NNNN-TEST',
      ];

      validFormats.forEach(format => {
        const result = validateDocumentFormat(format);
        expect(result.valid).toBe(true);
        expect(result.missingPlaceholders).toHaveLength(0);
      });
    });

    it('should reject formats missing NNNN', () => {
      const result = validateDocumentFormat('INV/MM/YYYY');
      expect(result.valid).toBe(false);
      expect(result.missingPlaceholders).toContain('NNNN');
    });

    it('should reject formats missing MM', () => {
      const result = validateDocumentFormat('NNNN/CARGO/YYYY');
      expect(result.valid).toBe(false);
      expect(result.missingPlaceholders).toContain('MM');
    });

    it('should reject formats missing YYYY', () => {
      const result = validateDocumentFormat('NNNN/CARGO/MM');
      expect(result.valid).toBe(false);
      expect(result.missingPlaceholders).toContain('YYYY');
    });

    it('should report all missing placeholders', () => {
      const result = validateDocumentFormat('INVOICE-001');
      expect(result.valid).toBe(false);
      expect(result.missingPlaceholders).toContain('NNNN');
      expect(result.missingPlaceholders).toContain('MM');
      expect(result.missingPlaceholders).toContain('YYYY');
    });

    it('should validate any string with all placeholders', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (prefix) => {
            const format = `${prefix}NNNN/MM/YYYY`;
            const result = validateDocumentFormat(format);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: company-settings, Property 7: Document number generation**
   * *For any* valid format string and sequence number, the generated document number
   * should contain the sequence number zero-padded to 4 digits, the current month
   * as Roman numeral, and the current year as 4 digits.
   * **Validates: Requirements 3.2, 3.4, 3.5, 3.6**
   */
  describe('generateDocumentNumber', () => {
    it('should generate correct document numbers for any sequence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9999 }),
          (sequence) => {
            const format = 'NNNN/CARGO/MM/YYYY';
            const date = new Date(2025, 11, 17); // December 2025
            const result = generateDocumentNumber(format, sequence, date);
            
            const paddedSeq = sequence.toString().padStart(4, '0');
            expect(result).toContain(paddedSeq);
            expect(result).toContain('XII'); // December in Roman
            expect(result).toContain('2025');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all months correctly', () => {
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      
      for (let month = 0; month < 12; month++) {
        const date = new Date(2025, month, 15);
        const result = generateDocumentNumber('NNNN/MM/YYYY', 1, date);
        expect(result).toContain(romanMonths[month]);
      }
    });

    it('should preserve format structure', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('NNNN/CARGO/MM/YYYY', 'NNNN/GG/MM/YYYY', 'INV-NNNN-MM-YYYY'),
          fc.integer({ min: 1, max: 9999 }),
          (format, sequence) => {
            const result = generateDocumentNumber(format, sequence, new Date(2025, 0, 1));
            
            // Result should have same structure (slashes/dashes preserved)
            const formatDelimiters = format.replace(/[A-Z0-9]/g, '');
            const resultDelimiters = result.replace(/[A-Z0-9]/g, '');
            expect(resultDelimiters).toBe(formatDelimiters);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should zero-pad sequence numbers', () => {
      expect(generateDocumentNumber('NNNN/MM/YYYY', 1, new Date(2025, 0, 1))).toContain('0001');
      expect(generateDocumentNumber('NNNN/MM/YYYY', 42, new Date(2025, 0, 1))).toContain('0042');
      expect(generateDocumentNumber('NNNN/MM/YYYY', 999, new Date(2025, 0, 1))).toContain('0999');
      expect(generateDocumentNumber('NNNN/MM/YYYY', 9999, new Date(2025, 0, 1))).toContain('9999');
    });
  });

  describe('previewDocumentNumber', () => {
    it('should generate preview with sequence 1 by default', () => {
      const result = previewDocumentNumber('NNNN/CARGO/MM/YYYY');
      expect(result).toContain('0001');
    });

    it('should use provided sequence number', () => {
      const result = previewDocumentNumber('NNNN/CARGO/MM/YYYY', 42);
      expect(result).toContain('0042');
    });
  });


  /**
   * **Feature: company-settings, Property 8: Logo file type validation**
   * *For any* file, the logo validation should accept the file if and only if
   * its MIME type is image/png, image/jpeg, or image/svg+xml.
   * **Validates: Requirements 4.2**
   * 
   * **Feature: company-settings, Property 9: Logo file size validation**
   * *For any* file, the logo validation should accept the file if and only if
   * its size is less than or equal to 2MB (2,097,152 bytes).
   * **Validates: Requirements 4.3**
   */
  describe('validateLogoFile', () => {
    // Helper to create mock File
    const createMockFile = (type: string, size: number): File => {
      const blob = new Blob(['x'.repeat(size)], { type });
      return new File([blob], 'test-logo.png', { type });
    };

    it('should accept valid image types under 2MB', () => {
      const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
      
      validTypes.forEach(type => {
        const file = createMockFile(type, 1024 * 1024); // 1MB
        const result = validateLogoFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = ['image/gif', 'image/webp', 'application/pdf', 'text/plain'];
      
      invalidTypes.forEach(type => {
        const file = createMockFile(type, 1024);
        const result = validateLogoFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject files larger than 2MB', () => {
      const file = createMockFile('image/png', 2 * 1024 * 1024 + 1); // Just over 2MB
      const result = validateLogoFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2MB');
    });

    it('should accept files exactly 2MB', () => {
      const file = createMockFile('image/png', 2 * 1024 * 1024); // Exactly 2MB
      const result = validateLogoFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate file size for any valid type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/png', 'image/jpeg', 'image/svg+xml'),
          fc.integer({ min: 1, max: 2 * 1024 * 1024 }),
          (type, size) => {
            const file = createMockFile(type, size);
            const result = validateLogoFile(file);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getSettingValue', () => {
    it('should return default value for missing keys', () => {
      const settings: Record<string, string | null> = {};
      expect(getSettingValue(settings, 'missing', 'default')).toBe('default');
    });

    it('should return default value for null values', () => {
      const settings: Record<string, string | null> = { key: null };
      expect(getSettingValue(settings, 'key', 'default')).toBe('default');
    });

    it('should coerce string to number', () => {
      const settings: Record<string, string | null> = { rate: '11' };
      expect(getSettingValue(settings, 'rate', 0)).toBe(11);
    });

    it('should coerce string to boolean', () => {
      const settings: Record<string, string | null> = { enabled: 'true' };
      expect(getSettingValue(settings, 'enabled', false)).toBe(true);
    });

    it('should return string value as-is', () => {
      const settings: Record<string, string | null> = { name: 'Test Company' };
      expect(getSettingValue(settings, 'name', '')).toBe('Test Company');
    });
  });

  describe('rowsToSettings', () => {
    it('should transform rows to settings object', () => {
      const rows = [
        { key: 'company_name', value: 'Test Corp' },
        { key: 'vat_rate', value: '15' },
        { key: 'default_payment_terms', value: '45' },
      ];
      
      const settings = rowsToSettings(rows);
      
      expect(settings.company_name).toBe('Test Corp');
      expect(settings.vat_rate).toBe(15);
      expect(settings.default_payment_terms).toBe(45);
    });

    it('should use defaults for missing keys', () => {
      const rows: Array<{ key: string; value: string | null }> = [];
      const settings = rowsToSettings(rows);
      
      expect(settings.company_name).toBe(DEFAULT_SETTINGS.company_name);
      expect(settings.vat_rate).toBe(DEFAULT_SETTINGS.vat_rate);
    });
  });

  describe('validateRequiredFields', () => {
    it('should reject empty company name', () => {
      const result = validateRequiredFields({ company_name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.company_name).toBeDefined();
    });

    it('should reject whitespace-only company name', () => {
      const result = validateRequiredFields({ company_name: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors.company_name).toBeDefined();
    });

    it('should accept valid company name', () => {
      const result = validateRequiredFields({ company_name: 'Test Company' });
      expect(result.valid).toBe(true);
      expect(result.errors.company_name).toBeUndefined();
    });

    it('should validate VAT rate', () => {
      const invalidResult = validateRequiredFields({ vat_rate: 150 });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.vat_rate).toBeDefined();

      const validResult = validateRequiredFields({ vat_rate: 11 });
      expect(validResult.valid).toBe(true);
    });

    it('should validate payment terms', () => {
      const invalidResult = validateRequiredFields({ default_payment_terms: -5 });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.default_payment_terms).toBeDefined();

      const validResult = validateRequiredFields({ default_payment_terms: 30 });
      expect(validResult.valid).toBe(true);
    });

    it('should validate document formats', () => {
      const invalidResult = validateRequiredFields({ pjo_format: 'INVALID' });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.pjo_format).toBeDefined();

      const validResult = validateRequiredFields({ pjo_format: 'NNNN/CARGO/MM/YYYY' });
      expect(validResult.valid).toBe(true);
    });
  });
});
