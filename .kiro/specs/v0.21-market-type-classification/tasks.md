# Implementation Plan: Market Type Classification

## Overview

This implementation plan breaks down the market type classification feature into discrete coding tasks. The approach is incremental: database schema first, then types, then utility functions, then UI components, and finally integration. Property-based tests are included as optional sub-tasks to validate correctness properties.

## Tasks

- [x] 1. Database schema setup
  - [x] 1.1 Apply migration to add market classification columns to proforma_job_orders
    - Add market_type, complexity_score, complexity_factors, pricing_approach, pricing_notes columns
    - Add cargo specification columns (cargo_weight_kg, cargo_length_m, cargo_width_m, cargo_height_m, cargo_value, duration_days)
    - Add route characteristic columns (is_new_route, terrain_type, requires_special_permit, is_hazardous)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Apply migration to create complexity_criteria table with default data
    - Create table with id, criteria_code, criteria_name, description, weight, auto_detect_rules, is_active, display_order
    - Insert 10 default complexity criteria (heavy_cargo, over_length, over_width, over_height, long_duration, new_route, challenging_terrain, special_permits, high_value, hazardous)
    - _Requirements: 2.1, 2.2_

- [x] 2. TypeScript types and utility functions
  - [x] 2.1 Create market classification types
    - Create `types/market-classification.ts` with MarketType, PricingApproach, TerrainType, ComplexityCriteria, ComplexityFactor, MarketClassification, CargoSpecifications, RouteCharacteristics, AutoDetectRules interfaces
    - Export types from `types/index.ts`
    - _Requirements: 5.4, 5.5, 5.6_

  - [x] 2.2 Implement market classification utility functions
    - Create `lib/market-classification-utils.ts`
    - Implement `classifyMarketType(score)` - returns 'simple' or 'complex' based on threshold
    - Implement `evaluateCriterion(criterion, pjoData)` - evaluates single criterion against PJO data
    - Implement `calculateMarketClassification(pjoData, criteria)` - calculates full classification
    - Implement `getTriggeredDisplayValue(criterion, pjoData)` - formats triggered value for display
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 2.3 Write property tests for market classification utilities
    - **Property 1: Complexity Score Threshold Classification**
    - **Property 2: Criteria Evaluation and Score Calculation**
    - **Property 3: Operator Evaluation Correctness**
    - **Property 4: Triggered Factors Completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

- [x] 3. Server actions for classification
  - [x] 3.1 Create classification server actions
    - Create `app/(main)/proforma-jo/classification-actions.ts`
    - Implement `getComplexityCriteria()` - fetches active criteria from database
    - Implement `updatePJOClassification(pjoId, classification, pricingApproach, pricingNotes)` - saves classification to PJO
    - _Requirements: 2.4, 9.1_

  - [x] 3.2 Write property test for classification data persistence
    - **Property 9: Classification Data Round-Trip**
    - **Validates: Requirements 9.1, 9.2**

- [x] 4. Checkpoint - Core logic complete
  - All tests pass (21 tests)

- [x] 5. UI Components - Input sections
  - [x] 5.1 Create CargoSpecificationsSection component
    - Create `components/pjo/cargo-specifications-section.tsx`
    - Render inputs for cargo_weight_kg, cargo_length_m, cargo_width_m, cargo_height_m, cargo_value, duration_days
    - Add validation for non-negative numbers
    - Call onChange when any field changes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Create RouteCharacteristicsSection component
    - Create `components/pjo/route-characteristics-section.tsx`
    - Render checkboxes for is_new_route, requires_special_permit, is_hazardous
    - Render terrain_type selector (conditionally shown or always available)
    - Call onChange when any field changes
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.3 Write property test for numeric input validation
    - **Property 6: Numeric Input Validation** (already in test file)
    - **Validates: Requirements 3.3**

- [x] 6. UI Components - Classification display
  - [x] 6.1 Create MarketTypeBadge component
    - Create `components/ui/market-type-badge.tsx`
    - Render green badge for 'simple', orange badge for 'complex'
    - Optionally display complexity score
    - _Requirements: 6.2, 8.4_

  - [x] 6.2 Create MarketClassificationDisplay component
    - Create `components/pjo/market-classification-display.tsx`
    - Render complexity score progress bar (0-100)
    - Render MarketTypeBadge
    - Render list of triggered complexity factors with names and weights
    - Render engineering warning when market_type is 'complex'
    - Render Auto-Calculate button
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.3 Create PricingApproachSection component
    - Create `components/pjo/pricing-approach-section.tsx`
    - Render dropdown with options: Standard, Premium, Negotiated, Cost Plus
    - Render pricing notes textarea
    - _Requirements: 7.1, 7.2_

  - [x] 6.4 Write property tests for display components
    - **Property 11: Engineering Warning Display** (tested via component behavior)
    - **Property 12: Badge Color Consistency** (tested via component behavior)
    - **Validates: Requirements 6.2, 6.4**

- [x] 7. useMarketClassification hook
  - [x] 7.1 Create useMarketClassification hook
    - Create `hooks/use-market-classification.ts`
    - Accept cargoSpecs and routeChars as inputs
    - Fetch complexity criteria on mount
    - Debounce calculation (300ms) when inputs change
    - Return classification, isCalculating, and recalculate function
    - Default pricing_approach to 'premium' when market_type becomes 'complex'
    - _Requirements: 3.4, 4.2, 5.1, 7.3_

  - [x] 7.2 Write property test for recalculation trigger
    - **Property 5: Input Change Triggers Recalculation** (hook behavior)
    - **Property 10: Premium Pricing Default for Complex** (hook behavior)
    - **Validates: Requirements 3.4, 4.2, 7.3**

- [x] 8. Checkpoint - Components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. PJO Form integration
  - [x] 9.1 Update PJO form schema and types
    - Add cargo specification fields to pjoSchema in `app/(main)/proforma-jo/actions.ts`
    - Add route characteristic fields to pjoSchema
    - Add market classification fields to pjoSchema
    - Add pricing fields to pjoSchema
    - _Requirements: 3.1, 3.2, 4.1, 7.1, 7.2_

  - [x] 9.2 Integrate new sections into PJO form
    - Add CargoSpecificationsSection after Logistics card
    - Add RouteCharacteristicsSection after Cargo Specifications
    - Add MarketClassificationDisplay after Route Characteristics
    - Add PricingApproachSection after Market Classification
    - Wire up useMarketClassification hook
    - _Requirements: 3.1, 4.1, 6.1, 7.1_

  - [x] 9.3 Update PJO actions to handle new fields
    - Update `createPJO` in `app/(main)/proforma-jo/actions.ts` to save all new fields
    - Update `updatePJO` to save all new fields
    - Recalculate classification on save
    - _Requirements: 9.1, 9.3_

- [x] 10. PJO List filtering
  - [x] 10.1 Update PJO filters component
    - Add market type filter dropdown to `components/pjo/pjo-filters.tsx`
    - Options: All, Simple Only, Complex Only
    - _Requirements: 8.1_

  - [x] 10.2 Update PJO table to show market type
    - Add market type badge column to `components/pjo/pjo-table.tsx`
    - Display complexity score on hover or inline
    - _Requirements: 8.4_

  - [x] 10.3 Update PJO list client with market type filtering
    - Add marketTypeFilter state to `app/(main)/proforma-jo/pjo-list-client.tsx`
    - Add summary counts display (Simple: X, Complex: Y)
    - Apply filter to PJO list
    - _Requirements: 8.2, 8.3_

  - [x] 10.4 Write property tests for filtering
    - **Property 7: Market Type Filter Correctness**
    - **Property 8: Summary Counts Accuracy**
    - **Validates: Requirements 8.2, 8.3**

- [x] 11. PJO detail view integration
  - [x] 11.1 Update PJO detail view to display classification
    - Update `components/pjo/pjo-detail-view.tsx` to show market classification section
    - Display cargo specifications, route characteristics, classification, and pricing
    - _Requirements: 9.2_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify database migrations applied successfully
  - Verify PJO form shows all new sections
  - Verify PJO list filtering works correctly
  - Verify classification persists through save/load

## Notes

- All tasks including property-based tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
