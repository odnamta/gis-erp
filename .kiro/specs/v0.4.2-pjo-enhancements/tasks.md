# Implementation Plan: PJO Enhancements v0.4.2

## Phase 1: Security - RLS Policies (P0)

- [x] 1. Apply RLS policies to new tables
  - [x] 1.1 Enable RLS and create policies for pjo_revenue_items
    - _Requirements: 6.1_
  - [x] 1.2 Enable RLS and create policies for pjo_cost_items
    - _Requirements: 6.2_
  - [x] 1.3 Enable RLS and create policies for job_orders
    - _Requirements: 6.3_

## Phase 2: Validation Improvements (P0)

- [x] 2. Positive margin validation
  - [x] 2.1 Add validatePositiveMargin utility function in lib/pjo-utils.ts
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.2 Update pjo-detail-view.tsx to validate margin before submission
    - _Requirements: 1.1, 1.2_
  - [x] 2.3 Write property test for margin validation
    - **Property 1: Positive Margin Enforcement**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Date validation (ETA >= ETD)
  - [x] 3.1 Update pjo-form.tsx schema with ETA/ETD validation
    - _Requirements: 4.1, 4.2_
  - [x] 3.2 Add re-validation trigger when ETD changes
    - _Requirements: 4.3_
  - [x] 3.3 Write property test for date validation
    - **Property 2: Date Order Validation**
    - **Validates: Requirements 4.1, 4.2**

- [x] 4. Checkpoint - Verify validations work
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Budget Warning & Overrun Flagging (P1)

- [x] 5. Budget warning at 90%
  - [x] 5.1 Add getBudgetWarningLevel utility function in lib/pjo-utils.ts
    - _Requirements: 2.1_
  - [x] 5.2 Update cost-confirmation-section.tsx to show warning indicator
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 5.3 Write property test for warning level calculation
    - **Property 3: Budget Warning Threshold**
    - **Validates: Requirements 2.1, 2.2**

- [x] 6. Cost overrun flagging
  - [x] 6.1 Add has_cost_overruns column to proforma_job_orders table
    - _Requirements: 3.1_
  - [x] 6.2 Create updatePJOOverrunStatus server action
    - _Requirements: 3.1, 3.2_
  - [x] 6.3 Call updatePJOOverrunStatus after confirmActualCost
    - _Requirements: 3.1_
  - [x] 6.4 Update PJO list to show overrun badge
    - _Requirements: 3.1, 3.2_
  - [x] 6.5 Add "Has Overruns" filter to PJO list
    - _Requirements: 3.3_
  - [x] 6.6 Write property test for overrun flag consistency
    - **Property 4: Overrun Flag Consistency**
    - **Validates: Requirements 3.1, 3.2**

- [x] 7. Checkpoint - Verify budget features work
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Google Maps Integration (P2)

- [x] 8. Setup Google Maps
  - [x] 8.1 Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local.example
    - _Requirements: 5.1_
  - [x] 8.2 Add Google Maps script loading to layout or PJO pages
    - _Requirements: 5.1, 5.2_

- [x] 9. PlacesAutocomplete component
  - [x] 9.1 Create components/ui/places-autocomplete.tsx
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 9.2 Implement autocomplete with Google Places API
    - _Requirements: 5.1, 5.2_
  - [x] 9.3 Add fallback for manual entry when API unavailable
    - _Requirements: 5.5_

- [x] 10. Database and form updates for location data
  - [x] 10.1 Add pol_place_id, pol_lat, pol_lng, pod_place_id, pod_lat, pod_lng columns
    - _Requirements: 5.4, 5.5_
  - [x] 10.2 Update PJOWithRelations type with location fields
    - _Requirements: 5.4, 5.5_
  - [x] 10.3 Replace POL/POD inputs with PlacesAutocomplete in pjo-form.tsx
    - _Requirements: 5.1, 5.2, 5.3, 5.7_
  - [x] 10.4 Update createPJO and updatePJO actions to save place_id and coordinates
    - _Requirements: 5.4, 5.5_

- [x] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- RLS policies use simple authenticated user check for now
- Future enhancement: role-based access control per table
- Google Maps API key needs to be obtained from Google Cloud Console
- Consider caching Places API results to reduce API calls
