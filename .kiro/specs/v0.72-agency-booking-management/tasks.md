# Implementation Plan: Agency Booking Management

## Overview

This implementation plan covers the v0.72 Agency Booking Management module. The implementation builds on the existing v0.71 Agency infrastructure (shipping lines, ports, rates) and follows the established patterns in the codebase. Tasks are organized to enable incremental development with early validation of core functionality.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create freight_bookings table with all fields, foreign keys, and auto-number sequence
    - Include trigger for booking number generation (BKG-YYYY-NNNNN format)
    - Add indexes for common query patterns
    - _Requirements: 10.1, 10.5, 10.7_
  - [x] 1.2 Create booking_containers table linked to freight_bookings
    - _Requirements: 10.2_
  - [x] 1.3 Create booking_amendments table linked to freight_bookings
    - _Requirements: 10.3_
  - [x] 1.4 Create booking_status_history table with trigger for automatic logging
    - Include trigger function for status change logging
    - _Requirements: 10.4, 10.6_
  - [x] 1.5 Create active_bookings view for common queries
    - Join with shipping_lines, ports, customers, job_orders
    - _Requirements: 10.7_
  - [x] 1.6 Enable RLS policies on all new tables
    - _Requirements: 10.8_

- [x] 2. Type Definitions and Utilities
  - [x] 2.1 Extend types/agency.ts with booking-related types
    - Add FreightBooking, BookingContainer, BookingAmendment, BookingStatusHistory interfaces
    - Add BookingStatus, CommodityType, AmendmentType, ContainerStatus enums
    - Add form data types and database row types
    - _Requirements: 1.1, 2.6, 4.1, 5.3_
  - [x] 2.2 Create lib/booking-utils.ts with core utility functions
    - Implement validateBookingForSubmission, validateContainerData
    - Implement isValidStatusTransition, getNextValidStatuses
    - Implement calculateTotalWeight, calculateTotalContainers
    - Implement getCutoffWarningLevel, getDaysUntilCutoff
    - Implement formatBookingNumber, formatContainerSummary
    - _Requirements: 1.5, 1.7, 2.3, 4.6, 7.3, 7.4_
  - [x] 2.3 Write property test for status transition validation
    - **Property 2: Status Transition Validation**
    - **Validates: Requirements 4.6**
  - [x] 2.4 Write property test for container total calculations
    - **Property 3: Container Total Calculations**
    - **Validates: Requirements 2.3, 2.4**
  - [x] 2.5 Write property test for cutoff warning levels
    - **Property 5: Cutoff Warning Levels**
    - **Validates: Requirements 7.3, 7.4**

- [x] 3. Checkpoint - Core utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Actions - Booking CRUD
  - [x] 4.1 Create app/actions/booking-actions.ts with booking CRUD operations
    - Implement createBooking, updateBooking, getBooking, getBookings, deleteBooking
    - Include booking number auto-generation
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  - [x] 4.2 Implement booking submission and status management actions
    - Implement submitBookingRequest, confirmBooking, cancelBooking, markAsShipped, completeBooking
    - Include status history logging
    - _Requirements: 1.7, 4.2, 4.3, 4.4, 4.5_
  - [x] 4.3 Write property test for booking submission validation
    - **Property 6: Booking Submission Validation**
    - **Validates: Requirements 1.5, 1.7, 2.5, 6.5, 8.1, 8.4**

- [x] 5. Server Actions - Container Management
  - [x] 5.1 Implement container management actions
    - Implement addContainer, updateContainer, removeContainer, getBookingContainers
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 6. Server Actions - Amendments
  - [x] 6.1 Implement amendment management actions
    - Implement requestAmendment, approveAmendment, rejectAmendment, getBookingAmendments
    - Include sequential amendment numbering
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_
  - [x] 6.2 Write property test for amendment change tracking
    - **Property 7: Amendment Change Tracking**
    - **Validates: Requirements 5.4, 5.5, 5.6, 5.7**

- [x] 7. Server Actions - Rate Integration
  - [x] 7.1 Implement rate lookup and freight calculation actions
    - Implement lookupRates, calculateFreight
    - Integrate with existing shipping_rates table
    - _Requirements: 3.1, 3.2, 3.3, 3.6_
  - [x] 7.2 Write property test for freight calculation accuracy
    - **Property 4: Freight Calculation Accuracy**
    - **Validates: Requirements 3.3, 3.4**

- [x] 8. Checkpoint - Server actions complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. UI Components - Core
  - [x] 9.1 Create components/agency/booking-status-badge.tsx
    - Display status with appropriate colors
    - _Requirements: 4.1_
  - [x] 9.2 Create components/agency/booking-card.tsx
    - Display booking summary in list view
    - Show booking number, customer, route, status, ETD
    - _Requirements: 9.1_
  - [x] 9.3 Create components/agency/booking-summary-cards.tsx
    - Display statistics (total bookings, by status, etc.)
    - _Requirements: 9.1_

- [x] 10. UI Components - Container Manager
  - [x] 10.1 Create components/agency/container-manager.tsx
    - Add/remove containers
    - Edit container details (type, number, seal, weight)
    - Display totals
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [x] 11. UI Components - Rate Lookup
  - [x] 11.1 Create components/agency/rate-lookup.tsx
    - Search rates by route and container type
    - Display best rate with alternatives
    - Calculate and display freight totals
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 12. UI Components - Booking Form
  - [x] 12.1 Create components/agency/booking-form.tsx
    - Tabbed form: Booking Details, Cargo, Parties, Documents
    - Integrate shipping line and port selectors
    - Integrate container manager
    - Integrate rate lookup
    - Handle dangerous goods conditional fields
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2, 8.3_

- [x] 13. UI Components - Amendment and History
  - [x] 13.1 Create components/agency/amendment-dialog.tsx
    - Amendment type selection
    - Description and notes
    - Show old vs new values
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 13.2 Create components/agency/booking-status-history.tsx
    - Display status change timeline
    - Show timestamps and users
    - _Requirements: 4.2_

- [x] 14. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Pages - Booking List
  - [x] 15.1 Create app/(main)/agency/bookings/page.tsx and bookings-client.tsx
    - Display booking list with cards
    - Implement search by booking number
    - Implement filters (status, shipping line, date range)
    - Default to active bookings
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [x] 15.2 Write property test for booking filter accuracy
    - **Property 8: Booking Filter Accuracy**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**

- [x] 16. Pages - New Booking
  - [x] 16.1 Create app/(main)/agency/bookings/new/page.tsx and new-booking-client.tsx
    - Booking form with save draft and submit actions
    - Job order/quotation linking
    - _Requirements: 1.1, 1.4, 1.6, 1.7_

- [x] 17. Pages - Booking Detail
  - [x] 17.1 Create app/(main)/agency/bookings/[id]/page.tsx and booking-detail.tsx
    - Display full booking information
    - Show containers, amendments, status history
    - Action buttons for status transitions
    - Amendment request button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1_

- [x] 18. Pages - Edit Booking
  - [x] 18.1 Create app/(main)/agency/bookings/[id]/edit/page.tsx and edit-booking-client.tsx
    - Pre-populated booking form
    - Respect status-based edit restrictions
    - _Requirements: 4.4_

- [x] 19. Navigation Integration
  - [x] 19.1 Update lib/navigation.ts to add Bookings menu item under Agency
    - Add route for /agency/bookings
    - _Requirements: 9.1_

- [x] 20. Final Checkpoint
  - All tests pass (35 property tests)
  - Build successful
  - All acceptance criteria met

## Notes

- All tasks are required including property-based tests for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Database schema follows existing patterns from v0.71
