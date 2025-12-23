# Requirements Document

## Introduction

This document defines the requirements for the Agency - Shipping Line & Agent Management module in Gama ERP. The system will manage relationships with shipping lines, port agents, and service providers for freight forwarding operations. Heavy-haul logistics often requires coordination with shipping lines for sea freight, port agents for clearance, and local agents at destination. Managing these relationships centrally improves coordination and cost control.

## Glossary

- **Shipping_Line**: A company that operates vessels for transporting cargo by sea (e.g., MSC, Maersk, COSCO)
- **Port_Agent**: A local representative at a port who handles customs clearance, stevedoring, warehousing, and other port services
- **Service_Provider**: A general service provider offering trucking, warehousing, surveying, insurance, or other logistics services
- **Port**: A location where ships load/unload cargo, identified by UN/LOCODE (e.g., IDTPP for Tanjung Perak)
- **Shipping_Rate**: The cost for transporting cargo between two ports via a specific shipping line
- **Container_Type**: Standard container sizes (20GP, 40GP, 40HC, 20OT, 40OT, 20FR, 40FR, BREAKBULK)
- **Surcharge**: Additional fees on top of ocean freight (BAF, CAF, PSS, ENS)
- **Preferred_Status**: A flag indicating a trusted/preferred partner for business
- **Service_Rating**: A 1-5 scale rating for partner performance
- **Credit_Limit**: Maximum credit extended to a shipping line
- **PPJK_License**: Indonesian customs broker license (Pengusaha Pengurusan Jasa Kepabeanan)

## Requirements

### Requirement 1: Shipping Line Management

**User Story:** As an admin user, I want to manage shipping line records, so that I can maintain a database of shipping partners for freight operations.

#### Acceptance Criteria

1. WHEN an admin creates a new shipping line, THE System SHALL generate a unique line_code and store the shipping line record with all provided details
2. WHEN an admin views the shipping lines list, THE System SHALL display all active shipping lines with their name, local agent, services offered, rating, and credit information
3. WHEN an admin updates a shipping line record, THE System SHALL persist the changes and update the updated_at timestamp
4. WHEN an admin marks a shipping line as preferred, THE System SHALL set the is_preferred flag to true and visually distinguish it in the list
5. WHEN an admin deactivates a shipping line, THE System SHALL set is_active to false and exclude it from active queries
6. THE System SHALL store shipping line contacts as a JSONB array containing name, role, phone, email, and notes for each contact
7. THE System SHALL store services_offered as a JSONB array with valid values: 'fcl', 'lcl', 'breakbulk', 'project_cargo', 'reefer'
8. THE System SHALL store routes_served as a JSONB array containing origin_port, destination_port, frequency, and transit_days

### Requirement 2: Port Agent Management

**User Story:** As an admin user, I want to manage port agent records, so that I can track local representatives at various ports for customs and handling services.

#### Acceptance Criteria

1. WHEN an admin creates a new port agent, THE System SHALL generate a unique agent_code and store the port agent record with port location details
2. WHEN an admin views port agents, THE System SHALL display agents grouped by country with their port, services, rating, and preferred status
3. WHEN an admin updates a port agent record, THE System SHALL persist the changes and update the updated_at timestamp
4. WHEN an admin marks a port agent as preferred, THE System SHALL set the is_preferred flag to true and visually distinguish it
5. THE System SHALL store port agent services as a JSONB array with valid values: 'customs_clearance', 'stevedoring', 'warehousing', 'trucking', 'documentation', 'port_charges', 'container_handling'
6. THE System SHALL store license information including customs_license, ppjk_license, and other_licenses
7. THE System SHALL store bank details including bank_name, bank_account, and bank_swift for payment purposes

### Requirement 3: Service Provider Management

**User Story:** As an admin user, I want to manage general service providers, so that I can track trucking, warehousing, surveyor, and other logistics partners.

#### Acceptance Criteria

1. WHEN an admin creates a new service provider, THE System SHALL generate a unique provider_code and store the record with provider_type
2. WHEN an admin views service providers, THE System SHALL allow filtering by provider_type: 'trucking', 'warehousing', 'surveyor', 'insurance', 'fumigation', 'lashing', 'crane_rental', 'escort'
3. WHEN an admin updates a service provider, THE System SHALL persist the changes and update the updated_at timestamp
4. THE System SHALL store services_detail as a JSONB array containing service, unit, rate, currency, and notes
5. THE System SHALL store coverage_areas as a JSONB array containing city, province, and notes
6. THE System SHALL store business documents including npwp, siup, and additional documents in JSONB format

### Requirement 4: Port Reference Data

**User Story:** As a system user, I want access to a standardized port reference database, so that I can consistently reference ports across the system.

#### Acceptance Criteria

1. THE System SHALL maintain a ports table with UN/LOCODE as the unique port_code
2. THE System SHALL pre-populate common Indonesian ports: Tanjung Perak (IDTPP), Tanjung Priok (IDTPK), Balikpapan (IDBPN), Makassar (IDMAK), Belawan (IDBEL), Palembang (IDPLM), Pontianak (IDPNK), Banjarmasin (IDBNJ), Semarang (IDSRG)
3. THE System SHALL pre-populate major international ports: Singapore (SGSIN), Shanghai (CNSHA), Busan (KRPUS), Tokyo (JPTYO), Jebel Ali (AEJEA), Rotterdam (NLRTM)
4. THE System SHALL store port_type with valid values: 'seaport', 'airport', 'inland', 'multimodal'
5. THE System SHALL store port facilities including has_container_terminal, has_breakbulk_facility, has_ro_ro, max_draft_m, max_vessel_loa_m
6. WHEN a port has a primary agent assigned, THE System SHALL reference the port_agents table via primary_agent_id

### Requirement 5: Shipping Rate Management

**User Story:** As an admin user, I want to manage shipping rates between ports, so that I can track and compare freight costs for quotations.

#### Acceptance Criteria

1. WHEN an admin creates a shipping rate, THE System SHALL require shipping_line_id, origin_port_id, destination_port_id, container_type, ocean_freight, valid_from, and valid_to
2. WHEN an admin views shipping rates, THE System SHALL only display rates where current date is between valid_from and valid_to
3. THE System SHALL store container_type with valid values: '20GP', '40GP', '40HC', '20OT', '40OT', '20FR', '40FR', 'BREAKBULK'
4. THE System SHALL store surcharges including baf (bunker adjustment), caf (currency adjustment), pss (peak season), ens (equipment)
5. THE System SHALL calculate and store total_rate as the sum of ocean_freight and all surcharges
6. THE System SHALL store terms with valid values: 'CY-CY', 'CY-Door', 'Door-CY', 'Door-Door'
7. WHEN a rate expires (current date > valid_to), THE System SHALL exclude it from active rate queries

### Requirement 6: Rate Search and Comparison

**User Story:** As a sales user, I want to search and compare shipping rates by route, so that I can quickly find the best options for quotations.

#### Acceptance Criteria

1. WHEN a user searches for rates by origin and destination port, THE System SHALL return all active rates matching the route
2. WHEN a user filters by container type, THE System SHALL return only rates for that container type
3. WHEN a user filters by shipping line, THE System SHALL return only rates from that shipping line
4. THE System SHALL order search results by total_rate ascending (lowest first)
5. WHEN displaying rate search results, THE System SHALL show shipping line name, transit days, total rate, and validity period
6. THE System SHALL provide a "find best rate" function that returns the lowest rate and up to 3 alternatives

### Requirement 7: Agent Search by Port

**User Story:** As an operations user, I want to find agents at a specific port, so that I can coordinate local services for shipments.

#### Acceptance Criteria

1. WHEN a user searches for agents by port code, THE System SHALL return all active agents at that port
2. THE System SHALL order results by is_preferred (preferred first) then by service_rating (highest first)
3. WHEN displaying agent search results, THE System SHALL show agent name, services offered, rating, and contact information
4. THE System SHALL allow filtering agents by services offered

### Requirement 8: Partner Rating System

**User Story:** As an admin user, I want to rate and track partner performance, so that I can make informed decisions about preferred partners.

#### Acceptance Criteria

1. WHEN an admin updates a partner rating, THE System SHALL calculate the new average rating based on all ratings received
2. THE System SHALL store service_rating as a decimal value between 1.0 and 5.0
3. WHEN a rating is submitted with feedback, THE System SHALL log the feedback with the rating, timestamp, and user who submitted it
4. THE System SHALL display ratings with star icons (⭐) in the UI for visual clarity

### Requirement 9: Freight Cost Calculation

**User Story:** As a sales user, I want to calculate total freight costs including surcharges, so that I can provide accurate quotations.

#### Acceptance Criteria

1. WHEN calculating freight cost, THE System SHALL multiply ocean_freight by quantity
2. WHEN calculating freight cost, THE System SHALL multiply each surcharge (baf, caf, pss, ens) by quantity and sum them
3. THE System SHALL return the calculation result with ocean_freight, surcharges, total, and currency fields
4. THE System SHALL support quantity parameter for multi-container shipments

### Requirement 10: Dashboard Statistics

**User Story:** As an admin user, I want to see summary statistics for agency management, so that I can monitor partner relationships at a glance.

#### Acceptance Criteria

1. WHEN viewing the shipping lines list, THE System SHALL display total count of active shipping lines
2. WHEN viewing the shipping lines list, THE System SHALL display count of preferred shipping lines
3. WHEN viewing the shipping lines list, THE System SHALL display average service rating across all shipping lines
4. WHEN viewing the shipping lines list, THE System SHALL display total available credit limit
5. THE System SHALL provide filter options for "All" and "Preferred Only" on list views
