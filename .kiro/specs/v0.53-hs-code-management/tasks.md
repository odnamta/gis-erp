# Implementation Plan: HS Code Management

## Overview

This implementation plan covers the HS Code Management module for Gama ERP. The module provides a searchable HS code database with duty rates, preferential rates by FTA, and restriction tracking. Implementation follows a bottom-up approach: database schema → types → utilities → server actions → UI components → integration.

## Tasks

- [x] 1. Set up database schema and seed data
  - [x] 1.1 Create database migration for hs_chapters, hs_headings, hs_codes tables
    - Create tables with all columns as specified in design
    - Add full-text search indexes for descriptions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 1.2 Create database migration for hs_preferential_rates and hs_code_search_history tables
    - Create tables with foreign key constraints
    - Add unique constraint on (hs_code_id, fta_code)
    - _Requirements: 3.1, 3.3, 3.4, 6.1, 6.2_
  - [x] 1.3 Insert sample HS code data for heavy equipment
    - Insert chapters 84, 85, 87
    - Insert relevant headings
    - Insert sample HS codes with rates
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create TypeScript types and utility functions
  - [x] 2.1 Create types/hs-codes.ts with all type definitions
    - Define FTACode, HSChapter, HSHeading, HSCode types
    - Define HSCodeSearchResult, HSCodeRates, DutyCalculation types
    - Define input types for create/update operations
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1_
  - [x] 2.2 Implement core utility functions in lib/hs-utils.ts
    - Implement searchHSCodes with prefix and description search
    - Implement getHSCodeRates
    - Implement calculateRelevance
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 2.5_
  - [x] 2.3 Write property tests for search functions
    - **Property 7: Numeric Search Returns Code Prefix Matches**
    - **Property 8: Text Search Matches Descriptions**
    - **Property 9: Search Results Ordered by Relevance**
    - **Property 10: Search Result Limit Enforcement**
    - **Property 11: Active-Only Search Results**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5, 5.6, 1.6**
  - [x] 2.4 Implement duty calculation functions
    - Implement calculateDuties with MFN and preferential rate support
    - Implement calculateDutiesFromRates helper
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [x] 2.5 Write property tests for duty calculation
    - **Property 15: Duty Calculation Formula Correctness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
  - [x] 2.6 Implement preferential rate functions
    - Implement getPreferentialRate with date validation
    - _Requirements: 3.5, 3.6_
  - [x] 2.7 Write property tests for preferential rates
    - **Property 4: Preferential Rate Date Validity**
    - **Property 5: FTA Code Validation**
    - **Validates: Requirements 3.2, 3.5**
  - [x] 2.8 Implement hierarchical browsing functions
    - Implement getHSChapters
    - Implement getHSHeadings
    - Implement getHSCodesForHeading
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 2.9 Write property tests for hierarchical browsing
    - **Property 14: Hierarchical Browsing Correctness**
    - **Validates: Requirements 7.2, 7.3**

- [x] 3. Implement server actions and search history
  - [x] 3.1 Create lib/hs-actions.ts with server actions
    - Implement logHSCodeSearch
    - Implement createHSCode, updateHSCode, deactivateHSCode
    - Implement upsertPreferentialRate
    - _Requirements: 6.1, 6.2, 1.5, 1.6, 3.1_
  - [x] 3.2 Implement frequency calculation for suggestions
    - Implement getFrequentHSCodes with last 100 searches
    - _Requirements: 6.3, 6.4, 6.5_
  - [x] 3.3 Write property tests for search history
    - **Property 12: Search History Logging Correctness**
    - **Property 13: Frequency Calculation Correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [x] 4. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create UI components for HS code search
  - [x] 5.1 Create HSCodeSearch component
    - Implement search input with debounce
    - Display search results with relevance ranking
    - Show chapter name and restriction badges
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 4.5_
  - [x] 5.2 Create FrequentCodesList component
    - Display user's frequently used codes
    - Allow quick selection
    - _Requirements: 6.3_
  - [x] 5.3 Create RestrictionBadge component
    - Display warning badge for restricted codes
    - Show restriction type on hover
    - _Requirements: 4.5_
  - [x] 5.4 Create HSCodeDropdown component for PIB/PEB integration
    - Combine search input with frequent codes
    - Auto-populate rates on selection
    - Show restriction warning
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. Create UI components for HS code browser
  - [x] 6.1 Create ChapterList component
    - Display all chapters with codes and names
    - Support chapter selection
    - _Requirements: 7.1_
  - [x] 6.2 Create HeadingList component
    - Display headings for selected chapter
    - Support heading selection
    - _Requirements: 7.2_
  - [x] 6.3 Create HSCodeList component
    - Display HS codes for selected heading
    - Show rates and restriction flags
    - _Requirements: 7.3, 7.4_
  - [x] 6.4 Create HSCodeBrowser page component
    - Combine chapter, heading, and code lists
    - Implement hierarchical navigation
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Create rate calculator component
  - [x] 7.1 Create DutyBreakdown component
    - Display itemized duty breakdown
    - Show all duty components
    - _Requirements: 8.7_
  - [x] 7.2 Create RateCalculator component
    - Input for HS code and CIF value
    - FTA selection for preferential rates
    - Display calculated duties
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 8. Create HS codes management pages
  - [x] 8.1 Create HS codes browser page at /customs/hs-codes
    - Integrate HSCodeBrowser component
    - Add search functionality
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 8.2 Create rate calculator page at /customs/hs-codes/calculator
    - Integrate RateCalculator component
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 9. Integrate with PIB/PEB forms
  - [x] 9.1 Update PIB item form to use HSCodeDropdown
    - Replace text input with searchable dropdown
    - Auto-populate duty rates on selection
    - _Requirements: 9.1, 9.3, 9.4_
  - [x] 9.2 Update PEB item form to use HSCodeDropdown
    - Replace text input with searchable dropdown
    - Show export restriction warnings
    - _Requirements: 9.2, 9.4_

- [x] 10. Update navigation and permissions
  - [x] 10.1 Add HS codes section to customs navigation
    - Add menu items for browser and calculator
    - _Requirements: 7.1, 8.1_
  - [x] 10.2 Add RLS policies for HS code tables
    - Allow read access for authenticated users
    - Restrict write access to admin roles
    - _Requirements: 1.6_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
