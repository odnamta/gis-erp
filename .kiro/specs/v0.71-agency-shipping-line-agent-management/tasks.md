# Implementation Plan: Agency - Shipping Line & Agent Management

## Overview

This implementation plan covers the Agency Management module for Gama ERP, enabling management of shipping lines, port agents, service providers, ports, and shipping rates. The implementation follows an incremental approach, starting with database setup, then core utilities, followed by UI components.

## Tasks

- [x] 1. Database Setup
  - [x] 1.1 Create database migration for agency tables
    - Create shipping_lines table with all columns and indexes
    - Create port_agents table with all columns and indexes
    - Create agency_service_providers table with all columns and indexes
    - Create ports table with pre-populated data
    - Create shipping_rates table with all columns and indexes
    - Create agent_feedback table for rating history
    - Create active_shipping_rates view
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3, 5.1_

  - [x] 1.2 Set up RLS policies for agency tables
    - Enable RLS on all agency tables
    - Create policies for authenticated users
    - _Requirements: Security requirement_

- [x] 2. TypeScript Types and Core Utilities
  - [x] 2.1 Create agency types file
    - Define all interfaces and types from design document
    - Export types for use across components
    - _Requirements: All_

  - [x] 2.2 Implement agency-utils.ts core functions
    - Implement generateShippingLineCode function
    - Implement generateAgentCode function
    - Implement generateProviderCode function
    - Implement validation functions for all entity types
    - Implement calculateShippingLineStats function
    - Implement calculatePortAgentStats function
    - _Requirements: 1.1, 2.1, 3.1, 10.1, 10.2, 10.3, 10.4_

  - [x] 2.3 Write property tests for agency-utils
    - **Property 1: Unique Code Generation**
    - **Property 3: Enum Value Validation**
    - **Property 11: Statistics Calculation Accuracy**
    - **Validates: Requirements 1.1, 2.1, 3.1, 1.7, 2.5, 4.4, 5.3, 5.6, 10.1-10.4**

  - [x] 2.4 Implement rate-calculation-utils.ts
    - Implement calculateTotalRate function
    - Implement calculateTotalFreightCost function
    - Implement isRateValid function
    - _Requirements: 5.5, 9.1, 9.2, 9.3, 9.4_

  - [x] 2.5 Write property tests for rate-calculation-utils
    - **Property 4: Total Rate Calculation**
    - **Property 5: Freight Cost Calculation with Quantity**
    - **Validates: Requirements 5.5, 9.1, 9.2, 9.3, 9.4**

  - [x] 2.6 Implement agent-search-utils.ts
    - Implement searchShippingRates function
    - Implement findBestRate function
    - Implement getPortAgents function
    - Implement filterAgentsByServices function
    - Implement sortRatesByTotal function
    - Implement sortAgentsByPreferredAndRating function
    - Implement groupAgentsByCountry function
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 7.1, 7.2, 7.4, 2.2_

  - [x] 2.7 Write property tests for agent-search-utils
    - **Property 2: Active Record Filtering**
    - **Property 6: Rate Search Ordering**
    - **Property 7: Agent Search Ordering**
    - **Property 8: Best Rate Selection**
    - **Property 12: Filter Accuracy**
    - **Property 13: Port Agent Grouping by Country**
    - **Property 14: Route Search Matching**
    - **Validates: Requirements 1.5, 5.2, 5.7, 6.1-6.6, 7.1, 7.2, 7.4, 2.2, 3.2**

  - [x] 2.8 Implement rating-utils.ts
    - Implement calculateAverageRating function
    - Implement validateRating function
    - _Requirements: 8.1, 8.2_

  - [x] 2.9 Write property tests for rating-utils
    - **Property 9: Rating Average Calculation**
    - **Property 10: Rating Range Validation**
    - **Validates: Requirements 8.1, 8.2**

- [x] 3. Checkpoint - Core utilities complete
  - Ensure all property tests pass
  - Ensure all unit tests pass
  - Ask the user if questions arise

- [x] 4. Server Actions
  - [x] 4.1 Create shipping line server actions
    - Implement createShippingLine action
    - Implement updateShippingLine action
    - Implement deleteShippingLine action
    - Implement toggleShippingLinePreferred action
    - Implement getShippingLines action
    - Implement getShippingLineById action
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Create port agent server actions
    - Implement createPortAgent action
    - Implement updatePortAgent action
    - Implement deletePortAgent action
    - Implement submitAgentRating action
    - Implement getPortAgents action
    - Implement getPortAgentById action
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.3_

  - [x] 4.3 Create service provider server actions
    - Implement createServiceProvider action
    - Implement updateServiceProvider action
    - Implement deleteServiceProvider action
    - Implement getServiceProviders action
    - Implement getServiceProviderById action
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.4 Create shipping rate server actions
    - Implement createShippingRate action
    - Implement updateShippingRate action
    - Implement deleteShippingRate action
    - Implement searchShippingRates action
    - Implement findBestRate action
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.6_

  - [x] 4.5 Create port server actions
    - Implement getPorts action
    - Implement getPortByCode action
    - _Requirements: 4.1, 4.6_

- [x] 5. Checkpoint - Server actions complete ✅
  - Ensure all actions work correctly ✅
  - Test with sample data ✅
  - Ask the user if questions arise ✅

- [x] 6. UI Components - Shipping Lines
  - [x] 6.1 Create shipping lines list page
    - Create /agency/shipping-lines/page.tsx
    - Implement ShippingLinesList component with card layout
    - Add statistics cards (total, preferred, avg rating, credit)
    - Add search and filter functionality
    - Add preferred filter toggle
    - _Requirements: 1.2, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 6.2 Create shipping line form component
    - Create ShippingLineForm component
    - Implement all form sections (basic info, contacts, services, routes, commercial)
    - Add dynamic array fields for contacts and routes
    - Add multi-select for services
    - _Requirements: 1.1, 1.6, 1.7, 1.8_

  - [x] 6.3 Create shipping line detail page
    - Create /agency/shipping-lines/[id]/page.tsx
    - Display all shipping line information
    - Add edit and delete actions
    - _Requirements: 1.2_

  - [x] 6.4 Create shipping line create/edit pages
    - Create /agency/shipping-lines/new/page.tsx
    - Create /agency/shipping-lines/[id]/edit/page.tsx
    - Wire up form with server actions
    - _Requirements: 1.1, 1.3_

- [x] 7. UI Components - Port Agents
  - [x] 7.1 Create port agents list page
    - Create /agency/port-agents/page.tsx
    - Implement PortAgentsList component with country grouping
    - Add card grid layout per country
    - Add filters for port, services, country
    - _Requirements: 2.2_

  - [x] 7.2 Create port agent form component
    - Create PortAgentForm component
    - Implement all form sections (basic, port, contacts, services, licenses, bank)
    - Add port selection dropdown
    - Add multi-select for services
    - _Requirements: 2.1, 2.5, 2.6, 2.7_

  - [x] 7.3 Create port agent detail page
    - Create /agency/port-agents/[id]/page.tsx
    - Display all port agent information
    - Add rating submission form
    - Add edit and delete actions
    - _Requirements: 2.2, 8.1, 8.3, 8.4_

  - [x] 7.4 Create port agent create/edit pages
    - Create /agency/port-agents/new/page.tsx
    - Create /agency/port-agents/[id]/edit/page.tsx
    - Wire up form with server actions
    - _Requirements: 2.1, 2.3_

- [x] 8. UI Components - Service Providers
  - [x] 8.1 Create service providers list page
    - Create /agency/service-providers/page.tsx
    - Implement ServiceProvidersList component
    - Add filter by provider type
    - Add card-based layout
    - _Requirements: 3.2_

  - [x] 8.2 Create service provider form component
    - Create ServiceProviderForm component
    - Implement all form sections
    - Add dynamic arrays for services and coverage areas
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [x] 8.3 Create service provider detail and edit pages
    - Create /agency/service-providers/[id]/page.tsx
    - Create /agency/service-providers/new/page.tsx
    - Create /agency/service-providers/[id]/edit/page.tsx
    - _Requirements: 3.1, 3.3_

- [x] 9. UI Components - Shipping Rates
  - [x] 9.1 Create shipping rates search page
    - Create /agency/shipping-rates/page.tsx
    - Implement ShippingRatesSearch component
    - Add origin/destination port selection
    - Add container type filter
    - Add shipping line filter
    - Display results table with rate comparison
    - Highlight best rate
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 9.2 Create shipping rate form component
    - Create ShippingRateForm component
    - Add port selection dropdowns
    - Add surcharge fields
    - Add validity date range picker
    - Auto-calculate total rate
    - _Requirements: 5.1, 5.4, 5.5, 5.6_

  - [x] 9.3 Create shipping rate management pages
    - Create /agency/shipping-rates/manage/page.tsx for rate list
    - Create /agency/shipping-rates/new/page.tsx
    - Create /agency/shipping-rates/[id]/edit/page.tsx
    - _Requirements: 5.1_

- [x] 10. Navigation and Layout
  - [x] 10.1 Add agency section to navigation
    - Add Agency menu item to sidebar
    - Add sub-items: Shipping Lines, Port Agents, Service Providers, Shipping Rates
    - _Requirements: All_

  - [x] 10.2 Create agency layout
    - Create /agency/layout.tsx
    - Add breadcrumb navigation
    - _Requirements: All_

- [x] 11. Final Checkpoint
  - Ensure all tests pass
  - Verify all CRUD operations work
  - Test rate search and comparison
  - Test agent search by port
  - Ask the user if questions arise

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
