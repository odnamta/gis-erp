# Implementation Plan: Agency Bill of Lading & Documentation

## Overview

This implementation plan covers the Bill of Lading and shipping documentation management system for the Agency module. The plan follows an incremental approach, building database schema first, then utilities, server actions, and finally UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create bills_of_lading table with all columns, indexes, and RLS policies
    - Include bl_number, booking_id, bl_type, shipper/consignee fields, container JSON, status fields
    - Create indexes on booking_id and status
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_
  - [x] 1.2 Create shipping_instructions table with auto-numbering trigger
    - Include si_number sequence and trigger for SI-YYYY-NNNNN format
    - Include LC fields, documents_required JSON array
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  - [x] 1.3 Create arrival_notices table with auto-numbering
    - Include notice_number sequence, free_time fields, estimated_charges JSON
    - Create index on eta for pending arrivals query
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 1.4 Create cargo_manifests table with auto-numbering
    - Include manifest_number sequence, bl_ids JSON array, totals fields
    - _Requirements: 4.1, 4.2_
  - [x] 1.5 Create pending_arrivals view for optimized queries
    - Join arrival_notices with bills_of_lading and customers
    - Filter by status IN ('pending', 'notified'), order by eta
    - _Requirements: 3.7_

- [ ] 2. TypeScript Types and Interfaces
  - [ ] 2.1 Add B/L documentation types to types/agency.ts
    - Add BLStatus, BLType, SIStatus, ArrivalNoticeStatus, ManifestStatus, ManifestType
    - Add BLContainer, EstimatedCharge interfaces
    - Add BillOfLading, ShippingInstruction, ArrivalNotice, CargoManifest interfaces
    - Add form data types and row types for database mapping
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 3. Utility Functions
  - [x] 3.1 Create lib/bl-documentation-utils.ts with number generation functions
    - Implement generateSINumber(), generateNoticeNumber(), generateManifestNumber()
    - _Requirements: 2.1, 3.1, 4.1_
  - [x] 3.2 Write property test for number generation format (Property 1)
    - **Property 1: Document Number Generation Format and Uniqueness**
    - **Validates: Requirements 1.1, 2.1, 3.1, 4.1**
  - [x] 3.3 Implement container number validation function
    - validateContainerNumber() for ISO 6346 format (4 letters + 7 digits)
    - _Requirements: 6.4_
  - [x] 3.4 Write property test for container number validation (Property 6)
    - **Property 6: Container Number Format Validation**
    - **Validates: Requirements 6.4**
  - [x] 3.5 Implement B/L totals calculation function
    - calculateBLTotals() to sum packages and weight from containers
    - _Requirements: 1.6_
  - [x] 3.6 Write property test for B/L totals calculation (Property 3)
    - **Property 3: B/L Container Totals Calculation**
    - **Validates: Requirements 1.6**
  - [x] 3.7 Implement manifest totals calculation function
    - calculateManifestTotals() to sum values from linked B/Ls
    - _Requirements: 4.3_
  - [x] 3.8 Write property test for manifest totals calculation (Property 4)
    - **Property 4: Manifest Totals Calculation from Linked B/Ls**
    - **Validates: Requirements 4.3**
  - [x] 3.9 Implement free time expiry calculation function
    - calculateFreeTimeExpiry() to add free time days to ETA
    - _Requirements: 3.2_
  - [x] 3.10 Write property test for free time expiry calculation (Property 5)
    - **Property 5: Free Time Expiry Calculation**
    - **Validates: Requirements 3.2**
  - [x] 3.11 Implement validation functions for B/L and Arrival Notice
    - validateBLData() for required fields
    - validateArrivalNoticeData() for required bl_id
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 3.12 Write property tests for validation functions (Properties 7, 8)
    - **Property 7: B/L Required Field Validation**
    - **Property 8: Arrival Notice Required Field Validation**
    - **Validates: Requirements 6.1, 6.2, 6.3, 1.3**
  - [x] 3.13 Implement data mapping functions
    - mapBLRowToModel(), mapSIRowToModel(), mapArrivalNoticeRowToModel(), mapManifestRowToModel()
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 4. Checkpoint - Utilities Complete
  - Ensure all utility tests pass, ask the user if questions arise.

- [x] 5. Server Actions - Bill of Lading
  - [x] 5.1 Create app/actions/bl-documentation-actions.ts with B/L CRUD operations
    - Implement createBillOfLading(), updateBillOfLading(), getBillOfLading(), getBillsOfLading()
    - Set initial status to 'draft' on creation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1_
  - [x] 5.2 Write property test for initial B/L status (Property 2 - B/L part)
    - **Property 2: Initial Status Assignment (B/L)**
    - **Validates: Requirements 7.1**
  - [x] 5.3 Implement B/L status transition functions
    - updateBLStatus() with timestamp recording for issued_at, released_at
    - _Requirements: 1.7, 7.2, 7.3, 7.4_
  - [x] 5.4 Write property test for B/L status timestamps (Property 9 - B/L part)
    - **Property 9: Status Transitions Record Timestamps (B/L)**
    - **Validates: Requirements 1.7, 7.3, 7.4**
  - [x] 5.5 Implement B/L deletion with issued check
    - deleteBillOfLading() that rejects deletion for issued/released/surrendered B/Ls
    - _Requirements: 6.6_
  - [x] 5.6 Write property test for issued B/L deletion prevention (Property 10)
    - **Property 10: Issued B/L Deletion Prevention**
    - **Validates: Requirements 6.6**

- [x] 6. Server Actions - Shipping Instructions
  - [x] 6.1 Add SI CRUD operations to bl-documentation-actions.ts
    - Implement createShippingInstruction(), updateShippingInstruction(), getShippingInstruction()
    - Set initial status to 'draft' on creation
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 7.5_
  - [x] 6.2 Implement SI submission and confirmation functions
    - submitShippingInstruction() to set status and submitted_at
    - confirmShippingInstruction() to link to B/L and set confirmed_at
    - _Requirements: 2.2, 2.6, 2.7_

- [x] 7. Server Actions - Arrival Notices
  - [x] 7.1 Add Arrival Notice CRUD operations to bl-documentation-actions.ts
    - Implement createArrivalNotice(), updateArrivalNotice(), getArrivalNotice()
    - Set initial status to 'pending' on creation
    - Calculate free_time_expires on creation
    - _Requirements: 3.1, 3.2, 3.3, 7.6_
  - [x] 7.2 Implement notification and status update functions
    - markConsigneeNotified() to set notified_at and notified_by
    - markCargoCleared() to set status and cleared_at
    - markCargoDelivered() to set status and delivered_at
    - _Requirements: 3.4, 3.5, 3.6_
  - [x] 7.3 Implement getPendingArrivals() function
    - Query pending_arrivals view or filter by status, order by eta
    - _Requirements: 3.7_
  - [x] 7.4 Write property test for pending arrivals filter (Property 11)
    - **Property 11: Pending Arrivals Filter and Ordering**
    - **Validates: Requirements 3.7**

- [x] 8. Server Actions - Cargo Manifests
  - [x] 8.1 Add Cargo Manifest CRUD operations to bl-documentation-actions.ts
    - Implement createCargoManifest(), updateCargoManifest(), getCargoManifest()
    - Set initial status to 'draft' on creation
    - _Requirements: 4.1, 4.2, 7.7_
  - [x] 8.2 Implement manifest B/L linking and submission functions
    - linkBLsToManifest() to update bl_ids and recalculate totals
    - submitManifest() to set status, submitted_to, submitted_at
    - approveManifest() to set status to 'approved'
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 9. Checkpoint - Server Actions Complete
  - Ensure all server action tests pass, ask the user if questions arise.

- [x] 10. UI Components - Shared
  - [x] 10.1 Create components/agency/bl-status-badge.tsx
    - Display status with appropriate colors for all document types
    - _Requirements: 7.1, 7.5, 7.6, 7.7_
  - [x] 10.2 Create components/agency/container-details-editor.tsx
    - Editable list of containers with validation
    - Display totals calculated from containers
    - _Requirements: 1.5, 1.6, 6.4_

- [x] 11. UI Components - Bill of Lading
  - [x] 11.1 Create components/agency/bl-form.tsx
    - Form for creating/editing B/L with all fields
    - Booking selector, shipper/consignee sections, container editor
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_
  - [x] 11.2 Create components/agency/bl-card.tsx
    - Summary card for B/L list display
    - Show B/L number, booking, vessel, status
    - _Requirements: 1.8_
  - [x] 11.3 Create components/agency/bl-print-view.tsx
    - Print-ready B/L layout matching standard format
    - _Requirements: 1.8, 5.1_

- [x] 12. UI Components - Shipping Instructions
  - [x] 12.1 Create components/agency/si-form.tsx
    - Form for creating/editing SI with all fields
    - LC requirements section, documents required checklist
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  - [x] 12.2 Create components/agency/si-card.tsx
    - Summary card for SI list display
    - _Requirements: 2.1_

- [x] 13. UI Components - Arrival Notices
  - [x] 13.1 Create components/agency/arrival-notice-form.tsx
    - Form for creating/editing arrival notices
    - Charges editor, delivery instructions
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 13.2 Create components/agency/arrival-notice-card.tsx
    - Summary card with ETA, free time status
    - _Requirements: 3.7_

- [x] 14. UI Components - Cargo Manifests
  - [x] 14.1 Create components/agency/manifest-form.tsx
    - Form for creating/editing manifests
    - B/L selector for linking
    - _Requirements: 4.1, 4.2_
  - [x] 14.2 Create components/agency/manifest-card.tsx
    - Summary card with totals
    - _Requirements: 4.1_

- [x] 15. Pages - Bill of Lading
  - [x] 15.1 Create app/(main)/agency/bl/page.tsx - B/L list page
    - List all B/Ls with filters and search
    - _Requirements: 1.1_
  - [x] 15.2 Create app/(main)/agency/bl/new/page.tsx - New B/L page
    - Create new B/L from booking
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 15.3 Create app/(main)/agency/bl/[id]/page.tsx - B/L detail page
    - View B/L details with print option
    - Status actions (submit, issue, release)
    - _Requirements: 1.8, 7.2, 7.3, 7.4_
  - [x] 15.4 Create app/(main)/agency/bl/[id]/edit/page.tsx - Edit B/L page
    - Edit B/L (if not issued)
    - _Requirements: 6.6_

- [x] 16. Pages - Shipping Instructions
  - [x] 16.1 Create app/(main)/agency/si/page.tsx - SI list page
    - List all SIs with filters
    - _Requirements: 2.1_
  - [x] 16.2 Create app/(main)/agency/si/new/page.tsx - New SI page
    - Create new SI from booking
    - _Requirements: 2.1_
  - [x] 16.3 Create app/(main)/agency/si/[id]/page.tsx - SI detail page
    - View SI details, submit to carrier, confirm with B/L link
    - _Requirements: 2.2, 2.6, 2.7_

- [x] 17. Pages - Arrival Notices
  - [x] 17.1 Create app/(main)/agency/arrivals/page.tsx - Arrivals list page
    - List pending arrivals ordered by ETA
    - _Requirements: 3.7_
  - [x] 17.2 Create app/(main)/agency/arrivals/new/page.tsx - New arrival notice page
    - Create from B/L
    - _Requirements: 3.1_
  - [x] 17.3 Create app/(main)/agency/arrivals/[id]/page.tsx - Arrival detail page
    - View details, mark notified/cleared/delivered
    - _Requirements: 3.4, 3.5, 3.6_

- [x] 18. Pages - Cargo Manifests
  - [x] 18.1 Create app/(main)/agency/manifests/page.tsx - Manifests list page
    - List all manifests with filters
    - _Requirements: 4.1_
  - [x] 18.2 Create app/(main)/agency/manifests/new/page.tsx - New manifest page
    - Create manifest, link B/Ls
    - _Requirements: 4.1, 4.2_
  - [x] 18.3 Create app/(main)/agency/manifests/[id]/page.tsx - Manifest detail page
    - View details, submit, approve
    - _Requirements: 4.4, 4.5_

- [x] 19. Navigation Update
  - [x] 19.1 Update lib/navigation.ts with B/L documentation routes
    - Add Bills of Lading, Shipping Instructions, Arrivals, Manifests to Agency section
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 20. Final Checkpoint
  - Ensure all tests pass and build succeeds, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (11 properties total)
- Unit tests validate specific examples and edge cases
