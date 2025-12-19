# Requirements Document

## Introduction

This feature adds market type classification to Proforma Job Orders (PJOs) in the Gama ERP system. Projects are classified as either "Simple" or "Complex" based on cargo specifications and route characteristics. Complex projects require Engineering assessment before approval. The classification is calculated automatically based on configurable complexity criteria with weighted scoring.

## Glossary

- **PJO**: Proforma Job Order - a quotation document created before actual work begins
- **Market_Type**: Classification of a project as either 'simple' or 'complex' based on complexity score
- **Complexity_Score**: Numeric value (0-100) calculated from weighted complexity criteria
- **Complexity_Criteria**: Configurable rules that determine project complexity (e.g., heavy cargo, over-dimension, hazardous materials)
- **Complexity_Factor**: A triggered criterion that contributes to the complexity score
- **Engineering_Assessment**: Review required for complex projects before approval
- **Pricing_Approach**: Strategy for pricing the project (standard, premium, negotiated, cost_plus)
- **Cargo_Specifications**: Physical attributes of cargo including weight, dimensions, and value
- **Route_Characteristics**: Attributes of the delivery route including terrain type, permit requirements, and familiarity

## Requirements

### Requirement 1: Database Schema for Market Classification

**User Story:** As a system administrator, I want the database to store market classification data, so that PJOs can be categorized and filtered by complexity.

#### Acceptance Criteria

1. THE Database SHALL have a market_type column on proforma_job_orders table with values 'simple' or 'complex' and default 'simple'
2. THE Database SHALL have a complexity_score column on proforma_job_orders table as INTEGER with default 0
3. THE Database SHALL have a complexity_factors column on proforma_job_orders table as JSONB with default empty array
4. THE Database SHALL have pricing_approach and pricing_notes columns on proforma_job_orders table
5. THE Database SHALL have cargo specification columns (cargo_weight_kg, cargo_length_m, cargo_width_m, cargo_height_m, cargo_value) on proforma_job_orders table
6. THE Database SHALL have route characteristic columns (is_new_route, terrain_type, requires_special_permit, is_hazardous, duration_days) on proforma_job_orders table

### Requirement 2: Complexity Criteria Reference Table

**User Story:** As a system administrator, I want configurable complexity criteria stored in the database, so that the classification rules can be adjusted without code changes.

#### Acceptance Criteria

1. THE Database SHALL have a complexity_criteria table with columns for id, criteria_code, criteria_name, description, weight, auto_detect_rules, is_active, and display_order
2. THE Database SHALL have default complexity criteria seeded including: heavy_cargo, over_length, over_width, over_height, long_duration, new_route, challenging_terrain, special_permits, high_value, and hazardous
3. WHEN a complexity criterion is created, THE System SHALL assign a unique criteria_code
4. THE System SHALL allow criteria to be activated or deactivated via is_active flag

### Requirement 3: Cargo Specifications Input

**User Story:** As an admin user, I want to enter cargo specifications in the PJO form, so that the system can automatically assess project complexity.

#### Acceptance Criteria

1. WHEN creating or editing a PJO, THE PJO_Form SHALL display a Cargo Specifications section with inputs for weight (kg), estimated value (Rp), and dimensions (length, width, height in meters)
2. WHEN creating or editing a PJO, THE PJO_Form SHALL display a duration input field in days
3. THE PJO_Form SHALL validate that numeric inputs are non-negative numbers
4. WHEN cargo specification fields are changed, THE System SHALL trigger complexity recalculation

### Requirement 4: Route Characteristics Input

**User Story:** As an admin user, I want to specify route characteristics, so that the system can factor route complexity into the classification.

#### Acceptance Criteria

1. WHEN creating or editing a PJO, THE PJO_Form SHALL display checkboxes for: new/unfamiliar route, challenging terrain, special permits required, and hazardous material
2. WHEN a route characteristic checkbox is toggled, THE System SHALL trigger complexity recalculation
3. THE PJO_Form SHALL display a terrain type selector when challenging terrain is indicated

### Requirement 5: Automatic Complexity Calculation

**User Story:** As an admin user, I want the system to automatically calculate complexity score, so that I don't have to manually classify each project.

#### Acceptance Criteria

1. WHEN cargo specifications or route characteristics change, THE Complexity_Calculator SHALL evaluate all active complexity criteria against the PJO data
2. WHEN a criterion's auto_detect_rules match the PJO data, THE Complexity_Calculator SHALL add the criterion's weight to the total score
3. THE Complexity_Calculator SHALL support operators: greater than (>), less than (<), equals (=), and in (array membership)
4. WHEN complexity_score is less than 20, THE System SHALL classify market_type as 'simple'
5. WHEN complexity_score is 20 or greater, THE System SHALL classify market_type as 'complex'
6. THE Complexity_Calculator SHALL store triggered factors with their criteria_code, criteria_name, weight, and triggered_value

### Requirement 6: Market Classification Display

**User Story:** As an admin user, I want to see the market classification results clearly, so that I understand why a project is classified as complex.

#### Acceptance Criteria

1. THE PJO_Form SHALL display a Market Classification section showing the complexity score as a progress bar (0-100)
2. THE PJO_Form SHALL display the market type as a badge: green for Simple, orange for Complex
3. THE PJO_Form SHALL display a list of triggered complexity factors with their names and point values
4. WHEN market_type is 'complex', THE PJO_Form SHALL display a warning that Engineering assessment is required
5. THE PJO_Form SHALL provide an Auto-Calculate button to manually trigger recalculation

### Requirement 7: Pricing Approach Selection

**User Story:** As an admin user, I want to select a pricing approach based on complexity, so that I can apply appropriate markup for complex projects.

#### Acceptance Criteria

1. THE PJO_Form SHALL display a pricing approach dropdown with options: Standard, Premium, Negotiated, Cost Plus
2. THE PJO_Form SHALL display a pricing notes textarea for additional pricing context
3. WHEN market_type changes to 'complex', THE System SHALL suggest 'Premium' as the default pricing approach
4. THE System SHALL persist pricing_approach and pricing_notes with the PJO

### Requirement 8: PJO List Market Type Filter

**User Story:** As an admin user, I want to filter PJOs by market type, so that I can quickly find complex projects requiring attention.

#### Acceptance Criteria

1. THE PJO_List SHALL display a market type filter dropdown with options: All, Simple Only, Complex Only
2. WHEN a market type filter is selected, THE PJO_List SHALL show only PJOs matching that market type
3. THE PJO_List SHALL display summary counts showing number of Simple and Complex PJOs
4. THE PJO_List SHALL display market type badge and complexity score for each PJO row

### Requirement 9: Data Persistence

**User Story:** As an admin user, I want market classification data saved with the PJO, so that the classification persists across sessions.

#### Acceptance Criteria

1. WHEN a PJO is saved, THE System SHALL persist market_type, complexity_score, complexity_factors, pricing_approach, and pricing_notes
2. WHEN a PJO is loaded, THE System SHALL display the saved classification data
3. WHEN cargo specifications or route characteristics are updated on an existing PJO, THE System SHALL recalculate and update the classification
