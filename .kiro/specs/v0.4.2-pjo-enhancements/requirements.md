# Requirements: PJO Enhancements v0.4.2

## Overview
Bug fixes, validation improvements, and UX enhancements for the PJO module following v0.4.1 release.

## Glossary

- **PJO**: Proforma Job Order - a quotation/estimate document
- **POL**: Point of Loading - origin location for cargo
- **POD**: Point of Destination - destination location for cargo
- **ETD**: Estimated Time of Departure
- **ETA**: Estimated Time of Arrival
- **RLS**: Row Level Security - Supabase security policies

---

## Requirements

### Requirement 1: Positive Margin Validation

**User Story:** As an admin, I want the system to prevent PJO submission when costs exceed revenue, so that we don't create unprofitable jobs.

#### Acceptance Criteria

1. WHEN a user submits a PJO for approval THEN the system SHALL validate that total estimated cost is less than total revenue
2. IF total estimated cost is greater than or equal to total revenue THEN the system SHALL display an error message and prevent submission
3. WHEN displaying the validation error THEN the system SHALL show the current margin percentage

---

### Requirement 2: Budget Warning at 90%

**User Story:** As operations, I want to see a warning when actual cost reaches 90% of the budget, so that I can take action before exceeding the budget.

#### Acceptance Criteria

1. WHEN actual cost input reaches 90% or more of estimated amount THEN the system SHALL display a warning indicator
2. WHEN displaying the warning THEN the system SHALL show the percentage of budget used
3. WHILE the warning is displayed THEN the system SHALL allow the user to continue entering the actual amount

---

### Requirement 3: Cost Overrun Flagging

**User Story:** As a manager, I want to see which PJOs have cost overruns in the list view, so that I can prioritize review.

#### Acceptance Criteria

1. WHEN displaying the PJO list THEN the system SHALL show a visual indicator for PJOs with any exceeded cost items
2. WHEN a PJO has cost overruns THEN the system SHALL display the count of exceeded items
3. WHEN filtering PJOs THEN the system SHALL support filtering by "has overruns" status

---

### Requirement 4: Date Validation (ETA after ETD)

**User Story:** As an admin, I want the system to ensure ETA is on or after ETD, so that we don't create logically invalid schedules.

#### Acceptance Criteria

1. WHEN a user enters ETA THEN the system SHALL validate that ETA is on or after ETD
2. IF ETA is before ETD THEN the system SHALL display an error message and prevent form submission
3. WHEN ETD is changed THEN the system SHALL re-validate ETA if already set

---

### Requirement 5: Google Maps Integration for POL/POD

**User Story:** As an admin, I want autocomplete suggestions for POL and POD fields, so that I can quickly enter accurate and consistent location data for future AI analysis.

#### Acceptance Criteria

1. WHEN a user types in the POL field THEN the system SHALL display autocomplete suggestions from Google Places API
2. WHEN a user types in the POD field THEN the system SHALL display autocomplete suggestions from Google Places API
3. WHEN a user selects a suggestion THEN the system SHALL populate the field with the formatted address
4. WHEN a location is selected THEN the system SHALL store the Google Place ID for data consistency
5. WHEN a location is selected THEN the system SHALL store latitude and longitude coordinates
6. WHILE Google API is unavailable THEN the system SHALL allow manual text entry as fallback
7. THE system SHALL restrict autocomplete results to Indonesia region by default

---

### Requirement 6: RLS Policies for New Tables

**User Story:** As a system administrator, I want proper security policies on all tables, so that data access is controlled.

#### Acceptance Criteria

1. THE pjo_revenue_items table SHALL have RLS policies that restrict access to authenticated users
2. THE pjo_cost_items table SHALL have RLS policies that restrict access to authenticated users
3. THE job_orders table SHALL have RLS policies that restrict access to authenticated users
4. WHEN a user queries these tables THEN the system SHALL only return records they are authorized to access

---

## Acceptance Criteria Summary

### Must Have (P0)
- [ ] Positive margin validation on PJO submission
- [ ] ETA >= ETD date validation
- [ ] RLS policies for pjo_revenue_items, pjo_cost_items, job_orders

### Should Have (P1)
- [ ] 90% budget warning indicator
- [ ] Cost overrun flag in PJO list
- [ ] Filter PJOs by overrun status

### Nice to Have (P2)
- [ ] Google Maps autocomplete for POL/POD
- [ ] Store lat/lng coordinates for locations
