# Requirements Document

## Introduction

The Quotation Module introduces a pre-award workflow stage between Project and PJO (Proforma Job Order). This module captures the RFQ (Request for Quotation) process where market classification and engineering assessment occur BEFORE winning a project, ensuring accurate pricing and proper technical evaluation during the bidding phase.

The current system incorrectly places classification and engineering at the PJO stage (post-award). This module corrects the business flow:
- Customer → Project → **Quotation (RFQ)** → PJO (Award) → JO (Execute) → Invoice

## Glossary

- **Quotation**: A formal price proposal created in response to a client's RFQ, containing scope, pricing, and technical assessment
- **RFQ**: Request for Quotation - client's inquiry for pricing on a logistics project
- **Pursuit_Cost**: Pre-award expenses incurred while pursuing a quotation (travel, surveys, facilitator fees)
- **Market_Type**: Classification of project complexity - 'simple' or 'complex'
- **Complexity_Score**: Numeric score (0-100) calculated from cargo and route characteristics
- **Engineering_Assessment**: Technical review required for complex projects before quotation submission
- **Quotation_Status**: Workflow state - draft, engineering_review, ready, submitted, won, lost, cancelled
- **PJO**: Proforma Job Order - created after winning a quotation

## Requirements

### Requirement 1: Quotation CRUD Operations

**User Story:** As a sales/admin user, I want to create and manage quotations, so that I can respond to client RFQs with accurate pricing.

#### Acceptance Criteria

1. WHEN a user creates a quotation, THE System SHALL auto-generate a unique quotation number in format QUO-YYYY-NNNN
2. WHEN a quotation is created, THE System SHALL require customer_id, title, origin, and destination fields
3. WHEN a quotation is saved, THE System SHALL store RFQ details including rfq_number, rfq_date, rfq_received_date, and rfq_deadline
4. WHEN a quotation is updated, THE System SHALL recalculate totals and update the updated_at timestamp
5. WHEN a quotation is deleted, THE System SHALL perform a soft delete by setting is_active to false
6. THE System SHALL allow linking a quotation to an existing project

### Requirement 2: Cargo and Route Specifications

**User Story:** As a user, I want to enter cargo and route details, so that the system can accurately classify the project complexity.

#### Acceptance Criteria

1. WHEN entering cargo specifications, THE System SHALL capture weight_kg, length_m, width_m, height_m, and cargo_value
2. WHEN entering route characteristics, THE System SHALL capture is_new_route, terrain_type, requires_special_permit, and is_hazardous flags
3. WHEN cargo dimensions are entered, THE System SHALL validate that values are positive numbers
4. THE System SHALL support estimated_shipments field for multi-trip projects
5. WHEN terrain_type is selected, THE System SHALL accept values: normal, mountain, unpaved, narrow

### Requirement 3: Market Classification at Quotation Level

**User Story:** As a user, I want the system to automatically classify quotations, so that complex projects are identified early for proper pricing and engineering review.

#### Acceptance Criteria

1. WHEN cargo and route details are saved, THE System SHALL automatically calculate complexity_score using the existing classification algorithm
2. WHEN complexity_score >= 20, THE System SHALL set market_type to 'complex'
3. WHEN complexity_score < 20, THE System SHALL set market_type to 'simple'
4. WHEN classification is calculated, THE System SHALL store triggered complexity_factors as JSON array
5. WHEN a quotation has quotation_id set on a PJO, THE PJO SHALL inherit market_type and complexity_score as read-only values
6. THE System SHALL display complexity score and triggered factors in the quotation form

### Requirement 4: Engineering Review Integration

**User Story:** As a manager, I want complex quotations to require engineering review before submission, so that technical risks are assessed and costs are accurate.

#### Acceptance Criteria

1. WHEN a quotation is classified as 'complex' (score >= 20), THE System SHALL set requires_engineering to true
2. WHEN requires_engineering is true, THE System SHALL set engineering_status to 'pending' and quotation status to 'engineering_review'
3. WHEN engineering review is initialized, THE System SHALL create assessment records linked to quotation_id (not pjo_id)
4. WHEN all engineering assessments are completed, THE System SHALL allow transitioning quotation status to 'ready'
5. IF engineering_status is not 'completed' or 'waived', THEN THE System SHALL block quotation submission
6. WHEN a manager waives engineering review, THE System SHALL record the waiver reason and allow submission

### Requirement 5: Quotation Revenue Items

**User Story:** As a user, I want to add itemized revenue line items to quotations, so that I can build detailed pricing for clients.

#### Acceptance Criteria

1. WHEN a revenue item is added, THE System SHALL require category, description, quantity, unit, and unit_price
2. WHEN a revenue item is saved, THE System SHALL calculate subtotal as quantity × unit_price
3. WHEN revenue items change, THE System SHALL recalculate quotation total_revenue
4. THE System SHALL support categories: transportation, handling, documentation, escort, permit, other
5. WHEN displaying revenue items, THE System SHALL order by display_order field

### Requirement 6: Quotation Cost Items

**User Story:** As a user, I want to estimate costs for quotations, so that I can calculate accurate profit margins.

#### Acceptance Criteria

1. WHEN a cost item is added, THE System SHALL require category, description, and estimated_amount
2. WHEN cost items change, THE System SHALL recalculate quotation total_cost
3. THE System SHALL support optional vendor_id or vendor_name for cost items
4. THE System SHALL support categories: trucking, shipping, port, handling, crew, fuel, toll, permit, escort, insurance, documentation, other
5. WHEN displaying cost items, THE System SHALL order by display_order field

### Requirement 7: Pursuit Costs Tracking

**User Story:** As a finance user, I want to track pre-award expenses, so that true project profitability includes pursuit costs.

#### Acceptance Criteria

1. WHEN a pursuit cost is added, THE System SHALL require category, description, amount, and cost_date
2. THE System SHALL support pursuit cost categories: travel, accommodation, survey, canvassing, entertainment, facilitator_fee, documentation, other
3. WHEN pursuit costs change, THE System SHALL recalculate quotation total_pursuit_cost
4. WHEN estimated_shipments > 1, THE System SHALL calculate pursuit_cost_per_shipment as total_pursuit_cost / estimated_shipments
5. THE System SHALL track incurred_by user and support department allocation (marketing_portion, engineering_portion)
6. WHEN a quotation is lost, THE pursuit costs SHALL be recorded as marketing expense

### Requirement 8: Quotation Status Workflow

**User Story:** As a user, I want quotations to follow a defined workflow, so that the process from RFQ to award is tracked.

#### Acceptance Criteria

1. WHEN a simple quotation is created, THE System SHALL set status to 'draft'
2. WHEN a complex quotation is created, THE System SHALL set status to 'engineering_review'
3. WHEN engineering review is completed for a complex quotation, THE System SHALL allow transition to 'ready'
4. WHEN a quotation is submitted to client, THE System SHALL set status to 'submitted' and record submitted_at and submitted_to
5. WHEN a quotation is won, THE System SHALL set status to 'won' and require outcome_date
6. WHEN a quotation is lost, THE System SHALL set status to 'lost' and require outcome_date and outcome_reason
7. THE System SHALL support 'cancelled' status for abandoned quotations

### Requirement 9: Convert Quotation to PJO

**User Story:** As an admin user, I want to create PJOs from won quotations, so that awarded projects flow into the execution phase with inherited data.

#### Acceptance Criteria

1. WHEN a quotation status is 'won', THE System SHALL enable the "Create PJO" action
2. WHEN converting to PJO, THE System SHALL offer option to create single PJO or split by estimated_shipments
3. WHEN creating PJO from quotation, THE System SHALL copy customer_id, project_id, commodity, origin, destination, and cargo specs
4. WHEN creating PJO from quotation, THE System SHALL inherit market_type and complexity_score as read-only
5. WHEN creating PJO from quotation, THE System SHALL set PJO engineering_status to 'not_required' (already done at quotation)
6. WHEN splitting by shipment, THE System SHALL divide revenue and cost items proportionally
7. WHEN creating PJO, THE System SHALL allocate pursuit_cost_per_shipment to each PJO
8. WHEN PJO is created from quotation, THE System SHALL set quotation_id reference on the PJO

### Requirement 10: Financial Summary

**User Story:** As a manager, I want to see financial summary on quotations, so that I can evaluate profitability before submission.

#### Acceptance Criteria

1. THE System SHALL display total_revenue, total_cost, total_pursuit_cost, and gross_profit on quotation detail
2. THE System SHALL calculate profit_margin as (gross_profit / total_revenue) × 100
3. THE System SHALL display pursuit_cost_per_shipment for multi-shipment quotations
4. WHEN quotation is lost, THE System SHALL indicate that pursuit costs become marketing expense

### Requirement 11: Quotation List and Filtering

**User Story:** As a user, I want to view and filter quotations, so that I can manage the sales pipeline effectively.

#### Acceptance Criteria

1. THE System SHALL display quotation list with columns: quotation_number, customer, title, market_type, total_revenue, status
2. THE System SHALL support filtering by status, market_type, customer, and date range
3. THE System SHALL display summary cards showing count by status and pipeline value
4. THE System SHALL calculate and display win rate (won / (won + lost) × 100)
5. THE System SHALL show engineering review indicator for quotations in engineering_review status

### Requirement 12: Legacy PJO Support

**User Story:** As a system administrator, I want existing PJOs to continue working, so that historical data is preserved.

#### Acceptance Criteria

1. WHEN a PJO has quotation_id = NULL, THE System SHALL treat it as a legacy PJO with self-contained classification
2. WHEN a PJO has quotation_id set, THE System SHALL display classification fields as read-only with "Inherited from Quotation" indicator
3. THE System SHALL allow creating PJOs without quotation for backward compatibility (optional legacy flow)
4. WHEN editing a PJO with quotation_id, THE System SHALL prevent modification of inherited classification fields

### Requirement 13: Role-Based Access Control

**User Story:** As a system administrator, I want quotation access controlled by role, so that sensitive pricing data is protected.

#### Acceptance Criteria

1. THE System SHALL allow owner, admin, manager, finance, and sales roles to view quotations
2. THE System SHALL allow owner, admin, manager, and sales roles to create and edit quotations
3. THE System SHALL restrict quotation deletion to owner and admin roles
4. THE System SHALL restrict "Submit to Client" and "Mark Won/Lost" actions to owner, admin, and manager roles
5. THE System SHALL hide quotations from ops role (they only see JOs)
6. THE System SHALL restrict profit margin visibility to owner, admin, manager, and finance roles

### Requirement 14: Notifications

**User Story:** As a user, I want to receive notifications for quotation events, so that I stay informed of workflow changes.

#### Acceptance Criteria

1. WHEN engineering review is assigned on a quotation, THE System SHALL notify the assigned user
2. WHEN engineering review is completed, THE System SHALL notify the quotation creator
3. WHEN a quotation is marked as won, THE System SHALL notify admin and finance roles
4. WHEN a quotation deadline is approaching (3 days), THE System SHALL notify the quotation creator
