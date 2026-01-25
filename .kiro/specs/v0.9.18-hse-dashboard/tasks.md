# Implementation Plan: HSE Dashboard

## Overview

This implementation plan covers the HSE Dashboard feature (v0.9.18) for GAMA ERP. The dashboard provides HSE personnel with a centralized view of safety metrics, incidents, permits, training compliance, and PPE status. Implementation follows existing patterns from the Engineering Dashboard.

## Tasks

- [x] 1. Create HSE Data Service
  - [x] 1.1 Create lib/dashboard/hse-data.ts with interfaces and main data fetcher
    - Define HseDashboardMetrics interface
    - Define RecentIncident, RecentPermit, ExpiringTraining, PpeReplacementDue interfaces
    - Implement getHseDashboardMetrics function with cache integration
    - Use Promise.all for parallel database queries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 7.1, 7.2, 7.3, 7.4_
  
  - [x] 1.2 Write property tests for days since last incident calculation
    - **Property 1: Days since last incident calculation**
    - **Validates: Requirements 1.1**
  
  - [x] 1.3 Write property tests for status filtering
    - **Property 2: Status filtering correctness**
    - **Validates: Requirements 1.3, 2.1, 2.3**
  
  - [x] 1.4 Write property tests for date range filtering
    - **Property 3: Date range filtering correctness**
    - **Validates: Requirements 1.2, 2.2, 3.1, 3.2**

- [x] 2. Implement Severity and Compliance Calculations
  - [x] 2.1 Add severity grouping to hse-data.ts
    - Group incidents by severity (critical, major, minor)
    - Return IncidentBySeverity object with counts
    - _Requirements: 1.4_
  
  - [x] 2.2 Add compliance rate calculation to hse-data.ts
    - Query training_compliance view
    - Calculate as (compliant / total) * 100
    - Handle division by zero (return 100 if total is 0)
    - Round to nearest integer
    - _Requirements: 3.3_
  
  - [x] 2.3 Write property tests for severity grouping
    - **Property 4: Severity grouping correctness**
    - **Validates: Requirements 1.4**
  
  - [x] 2.4 Write property tests for compliance rate calculation
    - **Property 6: Compliance percentage calculation**
    - **Validates: Requirements 3.3**

- [x] 3. Implement Recent Items Queries
  - [x] 3.1 Add recent incidents query to hse-data.ts
    - Fetch 5 most recent incidents ordered by incident_date descending
    - Transform to RecentIncident interface
    - _Requirements: 5.1_
  
  - [x] 3.2 Add recent permits query to hse-data.ts
    - Fetch 5 most recent permits ordered by created_at descending
    - Transform to RecentPermit interface
    - _Requirements: 2.4_
  
  - [x] 3.3 Add expiring training query to hse-data.ts
    - Fetch 5 employees with soonest expiring training from expiring_training view
    - Order by days_until_expiry ascending
    - Transform to ExpiringTraining interface
    - _Requirements: 3.4_
  
  - [x] 3.4 Add PPE replacement due query to hse-data.ts
    - Fetch 5 most overdue PPE items from ppe_replacement_due view
    - Order by days_overdue descending
    - Transform to PpeReplacementDue interface
    - _Requirements: 4.3_
  
  - [x] 3.5 Write property tests for recent items ordering
    - **Property 5: Recent items ordering and limiting**
    - **Validates: Requirements 2.4, 3.4, 4.3**

- [x] 4. Checkpoint - Verify Data Service
  - Ensure all data service functions work correctly
  - Run property tests to verify correctness
  - Ask the user if questions arise

- [x] 5. Create HSE Dashboard Page
  - [x] 5.1 Create app/(main)/dashboard/hse/page.tsx with full implementation
    - Add role-based access control (hse, owner, director, operations_manager)
    - Fetch metrics using getHseDashboardMetrics
    - Implement Safety Overview section with Days Since Last Incident counter
    - Implement incident metrics cards (YTD, open, by severity)
    - Use formatDate from lib/utils/format.ts
    - _Requirements: 1.5, 1.6, 5.4, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 5.2 Write property tests for unauthorized role redirect
    - **Property 12: Unauthorized role redirect**
    - **Validates: Requirements 8.3**

- [x] 6. Implement Permit Status Section
  - [x] 6.1 Add Permit Status cards to dashboard page
    - Display active permits count
    - Display expiring permits count with WARNING indicator
    - Display expired permits count with RED alert indicator
    - _Requirements: 2.5, 2.6_

- [x] 7. Implement Training Compliance Section
  - [x] 7.1 Add Training Compliance cards to dashboard page
    - Display expiring training count
    - Display overdue training count with RED alert indicator
    - Display compliance percentage with color coding
    - _Requirements: 3.5, 3.6_
  
  - [x] 7.2 Write property tests for threshold alert logic
    - **Property 7: Threshold alert logic**
    - **Validates: Requirements 1.6, 3.6, 4.5**

- [x] 8. Implement PPE Status Section
  - [x] 8.1 Add PPE Status cards to dashboard page
    - Display PPE replacement due count
    - Display PPE overdue count with RED alert indicator
    - Display employees with incomplete PPE count
    - _Requirements: 4.4, 4.5_

- [x] 9. Implement Quick Actions Section
  - [x] 9.1 Add Quick Actions component to dashboard page
    - Add "Report Incident" link to /hse/incidents/new
    - Add "View All Incidents" link to /hse/incidents
    - Add "View Training Records" link to /hse/training
    - Add "View PPE Status" link to /hse/ppe
    - Style with consistent card layout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Implement Recent Activity Lists
  - [x] 10.1 Add Recent Incidents list component
    - Display incident_number, title, severity, status, incident_date
    - Add SeverityBadge component with color coding
    - Add click navigation to incident detail page
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 10.2 Write property tests for severity color mapping
    - **Property 8: Severity color mapping**
    - **Validates: Requirements 5.2**
  
  - [x] 10.3 Add Expiring Training list component
    - Display employee_code, full_name, course_name, valid_to, days_until_expiry
    - Highlight items expiring within 7 days
    - _Requirements: 3.4_
  
  - [x] 10.4 Add PPE Replacement Due list component
    - Display employee_code, full_name, ppe_name, expected_replacement_date, days_overdue
    - Highlight items overdue more than 30 days
    - _Requirements: 4.3_
  
  - [x] 10.5 Write property tests for data transformation
    - **Property 9: Data transformation completeness**
    - **Validates: Requirements 5.1**

- [x] 11. Checkpoint - Verify Dashboard UI
  - Ensure all sections render correctly
  - Verify navigation links work
  - Test with different roles
  - Test mobile responsiveness
  - Ask the user if questions arise

- [x] 12. Implement Cache Key Generation
  - [x] 12.1 Verify cache key generation in hse-data.ts
    - Use generateCacheKey from dashboard-cache.ts
    - Format: 'hse-dashboard-metrics:{role}:{date}'
    - _Requirements: 7.4_
  
  - [x] 12.2 Write property tests for cache key format
    - **Property 10: Cache key generation format**
    - **Validates: Requirements 7.4**
  
  - [x] 12.3 Write property tests for cache round-trip
    - **Property 11: Cache round-trip**
    - **Validates: Requirements 7.2, 7.3**

- [x] 13. Write Unit Tests
  - [x] 13.1 Write unit tests for hse-data.ts
    - Test empty data scenarios
    - Test null value handling
    - Test date boundary cases
    - Test role access scenarios
    - Test threshold edge cases (days=6,7,8; rate=69,70,90)
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
- Follow existing patterns from lib/dashboard/engineering-data.ts
- Use centralized formatters from lib/utils/format.ts
- Dashboard should be mobile-friendly for site visits
