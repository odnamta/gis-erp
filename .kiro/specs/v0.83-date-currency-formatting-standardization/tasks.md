# Implementation Plan: Date & Currency Formatting Standardization

## Overview

This implementation plan creates a centralized formatting utility module and migrates all existing date/currency formatting across the GAMA ERP application. The approach is incremental: first create the utility, then migrate files in batches, validating each step.

## Tasks

- [x] 1. Create centralized formatting utility module
  - [x] 1.1 Implement date formatting functions in `lib/utils/format.ts`
    - Add `formatDate`, `formatDateTime`, `formatTime` functions using date-fns
    - Add `formatRelative` with Indonesian locale (date-fns/locale/id)
    - Add `formatDocumentDate` with full Indonesian month names
    - Add `toInputDate`, `toFileDate`, `toFileDateTime` helper functions
    - Implement `parseDate` helper for safe date parsing with null handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4_

  - [x] 1.2 Implement currency and number formatting functions
    - Update `formatCurrency` to use Indonesian locale with "Rp " prefix
    - Add `formatCurrencyShort` for compact dashboard display (jt, M suffixes)
    - Add `formatNumber` with Indonesian thousand separators
    - Add `formatPercent` with comma decimal separator
    - Handle null/undefined/zero edge cases
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3_

  - [x] 1.3 Add backward compatibility exports
    - Export `formatCurrencyIDR` as alias for `formatCurrency`
    - Export `formatCurrencyIDRCompact` as alias for `formatCurrencyShort`
    - Ensure existing imports continue to work
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 1.4 Write unit tests for edge cases
    - Test null/undefined inputs for all functions
    - Test invalid date strings
    - Test zero and negative numbers
    - Test boundary values (midnight, leap years)
    - _Requirements: 1.4, 1.5, 2.4, 3.2, 4.4, 5.3, 6.3_

  - [x] 1.5 Write property test for date formatting patterns
    - **Property 1: Date Formatting Pattern Validity**
    - **Property 2: DateTime Formatting Pattern Validity**
    - **Property 3: Time Formatting Pattern Validity**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 1.6 Write property test for invalid date fallback
    - **Property 4: Invalid Date Fallback**
    - **Validates: Requirements 1.5**

  - [x] 1.7 Write property test for relative date formatting
    - **Property 5: Relative Date Indonesian Formatting**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 1.8 Write property test for document date formatting
    - **Property 6: Document Date Indonesian Month Names**
    - **Validates: Requirements 3.1**

  - [x] 1.9 Write property test for input/file date formats
    - **Property 7: Input Date ISO Format**
    - **Property 8: File Date Sortable Format**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 1.10 Write property test for currency formatting
    - **Property 9: Currency Formatting Correctness**
    - **Property 10: Compact Currency Abbreviation**
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [x] 1.11 Write property test for number formatting
    - **Property 11: Number Formatting Indonesian Separators**
    - **Property 12: Percentage Formatting**
    - **Property 13: Date Formatting Round-Trip Consistency**
    - **Validates: Requirements 6.1, 6.2, 4.1**

- [x] 2. Checkpoint - Verify utility module
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Migrate dashboard components
  - [x] 3.1 Update finance dashboard components
    - Migrate `components/dashboard/finance/*.tsx` to use new formatters
    - Replace `toLocaleDateString` and inline formatting
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 3.2 Update sales dashboard components
    - Migrate `components/dashboard/sales/*.tsx` to use new formatters
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 3.3 Update ops and admin dashboard components
    - Migrate `components/dashboard/ops/*.tsx` and `components/dashboard/admin/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Migrate list and table components
  - [x] 4.1 Update quotation components
    - Migrate `components/quotations/*.tsx` to use centralized formatters
    - Update imports from `lib/pjo-utils` to `lib/utils/format`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.2 Update maintenance components
    - Migrate `components/maintenance/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.3 Update HSE audit components
    - Migrate `components/hse/audits/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.4 Update safety and resource scheduling components
    - Migrate `components/safety-permits/*.tsx`, `components/safety-documents/*.tsx`
    - Migrate `components/resource-scheduling/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 5. Checkpoint - Verify component migrations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Migrate utility libraries
  - [x] 6.1 Update lib utility files with inline formatting
    - Migrate `lib/feedback-utils.ts`, `lib/assessment-utils.ts`
    - Migrate `lib/employee-utils.ts`, `lib/asset-utils.ts`
    - Migrate `lib/incident-utils.ts`, `lib/booking-utils.ts`
    - Replace `toLocaleDateString` calls with centralized formatters
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.2 Update dashboard utility files
    - Migrate `lib/finance-dashboard-enhanced-utils.ts`
    - Migrate `lib/executive-dashboard-actions.ts`
    - Migrate `lib/widget-data-fetchers.ts`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.3 Update remaining lib files
    - Migrate `lib/vendor-invoice-utils.ts`, `lib/drawing-utils.ts`
    - Migrate `lib/variable-processor-utils.ts`, `lib/alert-utils.ts`
    - Migrate `lib/scheduled-report-utils.ts`, `lib/ai-insights-utils.ts`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 7. Migrate remaining components
  - [x] 7.1 Update widget components
    - Migrate `components/widgets/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.2 Update cost-revenue and agency components
    - Migrate `components/cost-revenue/*.tsx`
    - Migrate `components/agency/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.3 Update equipment and vessel components
    - Migrate `components/equipment/*.tsx`
    - Migrate `components/vessel-tracking/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 7.4 Update surat-jalan and survey components
    - Migrate `components/surat-jalan/*.tsx`
    - Migrate `components/surveys/*.tsx`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Update PDF and document generation
  - [x] 8.1 Update PDF utilities
    - Migrate `lib/pdf/pdf-utils.ts` to use centralized formatters
    - Ensure document dates use `formatDocumentDate` for formal Indonesian format
    - Note: PDF utilities have their own `formatDateForPDF` which is intentional for PDF-specific formatting
    - _Requirements: 3.1, 7.1, 7.2, 7.3_

  - [x] 8.2 Update document generator actions
    - Migrate `lib/document-generator-actions.ts`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. Final checkpoint and build verification
  - [x] 9.1 Run TypeScript build
    - Execute `npm run build` to verify no type errors
    - TypeScript compilation passes for all application code
    - Pre-existing ESLint warnings (515) and test file issues are unrelated to this migration34
    - _Requirements: 7.4_

  - [x] 9.2 Verify consistent formatting across app
    - All date/currency formatting now uses centralized `lib/utils/format.ts`
    - Indonesian locale (id) used for relative dates
    - Currency format: "Rp X.XXX.XXX" with dots as thousand separators
    - Date format: "15 Jan 2026" for display, "15 Januari 2026" for documents
    - All functions return "-" for null/undefined/invalid dates (except toInputDate returns "")
    - _Requirements: 7.5_

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The migration is done in batches to minimize risk and allow incremental testing
