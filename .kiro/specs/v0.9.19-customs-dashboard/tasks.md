# Implementation Plan: Customs Dashboard

## Overview

This implementation plan covers the Customs Dashboard feature (v0.9.19) for GAMA ERP. The dashboard provides customs personnel with a centralized view of import/export document status, duty tracking, deadline warnings, and HS code usage statistics. Implementation follows existing patterns from the HSE Dashboard.

## Tasks

- [x] 1. Create Customs Data Service
  - [x] 1.1 Create lib/dashboard/customs-data.ts with interfaces and main data fetcher
    - Define CustomsDashboardMetrics interface
    - Define RecentDocument, DueSoonDocument, FrequentHSCode, DocumentsByStatus interfaces
    - Implement getCustomsDashboardMetrics function with cache integration
    - Use Promise.all for parallel database queries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 1.2 Write property tests for status filtering
    - **Property 1: Status filtering correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  
  - [x] 1.3 Write property tests for date range filtering
    - **Property 2: Date range filtering correctness**
    - **Validates: Requirements 1.6, 3.1, 4.1, 4.2**

- [x] 2. Implement Aggregation and Grouping Logic
  - [x] 2.1 Add sum aggregation for duties and fees to customs-data.ts
    - Calculate duties paid this month (SUM where payment_status = 'paid')
    - Calculate unpaid fees amount (SUM where payment_status = 'unpaid')
    - _Requirements: 3.1, 3.3_
  
  - [x] 2.2 Add status grouping logic to customs-data.ts
    - Map PIB/PEB statuses to unified categories (draft, submitted, processing, cleared, rejected)
    - Return DocumentsByStatus object with counts
    - _Requirements: 2.1_
  
  - [x] 2.3 Write property tests for sum aggregation
    - **Property 3: Sum aggregation correctness**
    - **Validates: Requirements 3.1, 3.3**
  
  - [x] 2.4 Write property tests for status grouping
    - **Property 4: Status grouping correctness**
    - **Validates: Requirements 2.1**

- [x] 3. Implement Recent Items and HS Code Queries
  - [x] 3.1 Add recent documents query to customs-data.ts
    - Fetch 10 most recent documents (combined PIB + PEB) ordered by created_at descending
    - Transform to RecentDocument interface
    - _Requirements: 5.1, 5.2_
  
  - [x] 3.2 Add due soon documents query to customs-data.ts
    - Fetch 5 documents with ETA/ETD within 7 days ordered by date ascending
    - Transform to DueSoonDocument interface
    - _Requirements: 4.5_
  
  - [x] 3.3 Add frequent HS codes query to customs-data.ts
    - Fetch top 5 HS codes by usage count from combined PIB/PEB items
    - Transform to FrequentHSCode interface
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 3.4 Write property tests for ordering and limiting
    - **Property 5: Ordering and limiting correctness**
    - **Validates: Requirements 4.5, 5.2, 6.1, 6.3**
  
  - [x] 3.5 Write property tests for data transformation
    - **Property 6: Data transformation completeness**
    - **Validates: Requirements 5.1, 6.2**

- [x] 4. Checkpoint - Verify Data Service
  - Ensure all data service functions work correctly
  - Run property tests to verify correctness
  - Ask the user if questions arise

- [x] 5. Create Customs Dashboard Page
  - [x] 5.1 Create app/(main)/dashboard/customs/page.tsx with full implementation
    - Add role-based access control (customs, owner, director, finance_manager)
    - Fetch metrics using getCustomsDashboardMetrics
    - Implement Document Overview section with PIB/PEB counts
    - Implement Documents This Month counter
    - Use formatDate and formatCurrency from lib/utils/format.ts
    - _Requirements: 1.5, 1.6, 5.4, 9.1, 9.2, 9.3, 9.4_
  
  - [x] 5.2 Write property tests for role-based access control
    - **Property 10: Role-based access control**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 6. Implement Document Pipeline Section
  - [x] 6.1 Add Document Pipeline visualization to dashboard page
    - Display status breakdown (draft, submitted, processing, cleared, rejected)
    - Use color-coded indicators for each status
    - _Requirements: 2.2, 2.3, 2.4_

- [x] 7. Implement Duty Tracking Section
  - [x] 7.1 Add Duty Tracking cards to dashboard page
    - Display duties paid this month formatted as currency
    - Display unpaid fees count with WARNING indicator if > 0
    - Display unpaid amount formatted as currency
    - _Requirements: 3.4, 3.5, 3.6_
  
  - [x] 7.2 Write property tests for warning threshold logic
    - **Property 7: Warning threshold logic**
    - **Validates: Requirements 3.5**

- [x] 8. Implement Deadline Warnings Section
  - [x] 8.1 Add Deadline Warnings cards to dashboard page
    - Display due soon count with WARNING indicator
    - Display overdue count with RED alert indicator
    - _Requirements: 4.3, 4.4_
  
  - [x] 8.2 Add Due Soon Documents list component
    - Display document_ref, type, eta/etd, days until due
    - Highlight documents due within 3 days
    - _Requirements: 4.5_

- [x] 9. Implement Quick Actions Section
  - [x] 9.1 Add Quick Actions component to dashboard page
    - Add "New PIB" link to /customs/import/new
    - Add "New PEB" link to /customs/export/new
    - Add "View All PIB" link to /customs/import
    - Add "View All PEB" link to /customs/export
    - Add "Pending Fees" link to /customs/fees/pending
    - Style with consistent card layout
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 10. Implement Recent Activity and HS Codes Lists
  - [x] 10.1 Add Recent Documents list component
    - Display document_ref, type (PIB/PEB), status, date, importer/exporter
    - Add DocumentTypeBadge component (PIB=blue, PEB=green)
    - Add StatusBadge component with color coding
    - Add click navigation to document detail page
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x] 10.2 Add Frequent HS Codes list component
    - Display hs_code, description, usage_count
    - Order by usage count descending
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Checkpoint - Verify Dashboard UI
  - Ensure all sections render correctly
  - Verify navigation links work
  - Test with different roles
  - Test mobile responsiveness
  - Ask the user if questions arise

- [x] 12. Implement Cache Key Generation
  - [x] 12.1 Verify cache key generation in customs-data.ts
    - Use generateCacheKey from dashboard-cache.ts
    - Format: 'customs-dashboard-metrics:{role}:{date}'
    - _Requirements: 8.4_
  
  - [x] 12.2 Write property tests for cache key format
    - **Property 8: Cache key format**
    - **Validates: Requirements 8.4**
  
  - [x] 12.3 Write property tests for cache round-trip
    - **Property 9: Cache round-trip**
    - **Validates: Requirements 8.2, 8.3**

- [x] 13. Write Unit Tests
  - [x] 13.1 Write unit tests for customs-data.ts
    - Test empty data scenarios
    - Test null value handling
    - Test date boundary cases
    - Test role access scenarios
    - Test threshold edge cases (count=0,1,many)
    - _Requirements: All_

- [x] 14. Final Checkpoint - Complete Testing
  - Run all tests (npm run test)
  - Run build (npm run build)
  - Verify no TypeScript errors
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow existing patterns from lib/dashboard/hse-data.ts
- Use centralized formatters from lib/utils/format.ts
- Dashboard should be mobile-friendly for remote access
