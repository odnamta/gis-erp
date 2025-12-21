# Requirements Document

## Introduction

This document defines the requirements for the Equipment Asset Registry module in Gama ERP. The module provides a comprehensive registry for company-owned equipment and assets including trucks, trailers, cranes, and support equipment. This forms the foundation for maintenance tracking, utilization analysis, and cost allocation.

PT. Gama needs to track its own equipment fleet separately from vendor equipment, manage maintenance schedules, and understand true equipment costs per job.

## Glossary

- **Asset**: A company-owned piece of equipment or property with monetary value (trucks, trailers, cranes, forklifts, etc.)
- **Asset_Registry**: The system component that manages the lifecycle and tracking of all company assets
- **Asset_Code**: A unique auto-generated identifier for each asset in format `{CATEGORY}-{NNNN}` (e.g., TRUCK-0001)
- **Asset_Category**: Classification of assets (Truck, Trailer, Crane, Forklift, Support, Vehicle, Office, IT)
- **Asset_Location**: Physical location where an asset is stationed (HQ, Jakarta Branch, Balikpapan Yard, Field)
- **Asset_Status**: Current operational state of an asset (active, maintenance, repair, idle, disposed, sold)
- **Depreciation**: The reduction in asset value over time due to wear and usage
- **Book_Value**: Current value of an asset after accounting for accumulated depreciation
- **KIR**: Indonesian vehicle inspection certificate (Kendaraan Bermotor)
- **STNK**: Indonesian vehicle registration certificate (Surat Tanda Nomor Kendaraan)
- **Status_History**: A log of all status changes for an asset over time
- **Expiring_Document**: A document associated with an asset that has an expiration date requiring renewal

## Requirements

### Requirement 1: Asset Category Management

**User Story:** As an administrator, I want to have predefined asset categories, so that I can classify equipment consistently across the organization.

#### Acceptance Criteria

1. THE Asset_Registry SHALL provide default categories: Trucks & Prime Movers, Trailers & Lowbeds, Cranes & Lifting Equipment, Forklifts, Support Equipment, Vehicles & Cars, Office Equipment, IT Equipment
2. WHEN displaying categories, THE Asset_Registry SHALL show them in a defined display order
3. THE Asset_Registry SHALL store default depreciation settings per category (useful life years, depreciation method)

### Requirement 2: Asset Location Management

**User Story:** As an administrator, I want to track where assets are located, so that I can manage equipment distribution across branches.

#### Acceptance Criteria

1. THE Asset_Registry SHALL provide default locations: Head Office (Surabaya), Jakarta Branch, Balikpapan Yard, Field/On Job
2. WHEN an asset location changes, THE Asset_Registry SHALL record the previous and new location in the status history

### Requirement 3: Asset Creation

**User Story:** As an administrator, I want to register new assets in the system, so that I can track all company equipment.

#### Acceptance Criteria

1. WHEN a new asset is created, THE Asset_Registry SHALL auto-generate an asset code using the category prefix and sequential number (e.g., TRUCK-0001)
2. WHEN a new asset is created, THE Asset_Registry SHALL require category and asset name as mandatory fields
3. WHEN a new asset is created, THE Asset_Registry SHALL set the initial book value equal to the purchase price
4. WHEN a new asset is created, THE Asset_Registry SHALL set the initial status to 'active'
5. WHEN a new asset is created, THE Asset_Registry SHALL log the initial status in the status history
6. THE Asset_Registry SHALL allow storing vehicle-specific details: registration number, VIN, engine number, chassis number
7. THE Asset_Registry SHALL allow storing specifications: brand, model, year manufactured, color
8. THE Asset_Registry SHALL allow storing capacity details: capacity in tons, capacity in CBM, axle configuration
9. THE Asset_Registry SHALL allow storing dimensions: length, width, height, weight
10. THE Asset_Registry SHALL allow storing financial details: purchase date, purchase price, vendor, invoice number

### Requirement 4: Asset Listing and Filtering

**User Story:** As a user, I want to view and filter the list of assets, so that I can quickly find specific equipment.

#### Acceptance Criteria

1. WHEN viewing the asset list, THE Asset_Registry SHALL display summary cards showing: total assets, active count, maintenance count, total book value, expiring documents count
2. WHEN viewing the asset list, THE Asset_Registry SHALL allow filtering by category
3. WHEN viewing the asset list, THE Asset_Registry SHALL allow filtering by status
4. WHEN viewing the asset list, THE Asset_Registry SHALL allow filtering by location
5. WHEN viewing the asset list, THE Asset_Registry SHALL allow searching by asset code, asset name, or registration number
6. WHEN displaying assets, THE Asset_Registry SHALL show: asset code, asset name, category, registration number, status, and location
7. WHEN an asset is assigned to a job, THE Asset_Registry SHALL display the job order reference in the list
8. THE Asset_Registry SHALL exclude disposed and sold assets from the default list view

### Requirement 5: Asset Detail View

**User Story:** As a user, I want to view complete details of an asset, so that I can understand its specifications, status, and history.

#### Acceptance Criteria

1. WHEN viewing asset details, THE Asset_Registry SHALL display all vehicle information: brand, model, year, color, VIN, engine number, chassis number
2. WHEN viewing asset details, THE Asset_Registry SHALL display capacity and dimensions
3. WHEN viewing asset details, THE Asset_Registry SHALL display financial summary: purchase info, depreciation details, accumulated depreciation, current book value
4. WHEN viewing asset details, THE Asset_Registry SHALL display associated documents with their expiry status
5. WHEN viewing asset details, THE Asset_Registry SHALL display asset photos if available

### Requirement 6: Asset Status Management

**User Story:** As an operations manager, I want to change asset status, so that I can track equipment availability and condition.

#### Acceptance Criteria

1. THE Asset_Registry SHALL support the following statuses: active, maintenance, repair, idle, disposed, sold
2. WHEN changing asset status, THE Asset_Registry SHALL require a reason for the change
3. WHEN changing asset status, THE Asset_Registry SHALL log the change in the status history with: previous status, new status, reason, timestamp, and user who made the change
4. WHEN changing asset status, THE Asset_Registry SHALL optionally allow changing the location simultaneously
5. WHEN an asset status changes to 'disposed' or 'sold', THE Asset_Registry SHALL exclude it from active asset counts and lists

### Requirement 7: Asset Editing

**User Story:** As an administrator, I want to update asset information, so that I can keep records accurate and current.

#### Acceptance Criteria

1. WHEN editing an asset, THE Asset_Registry SHALL allow updating all non-generated fields
2. WHEN editing an asset, THE Asset_Registry SHALL NOT allow changing the auto-generated asset code
3. WHEN editing an asset, THE Asset_Registry SHALL update the updated_at timestamp

### Requirement 8: Depreciation Tracking

**User Story:** As a finance user, I want to track asset depreciation, so that I can understand true equipment costs and book values.

#### Acceptance Criteria

1. THE Asset_Registry SHALL support depreciation methods: straight line, declining balance, units of production
2. THE Asset_Registry SHALL store depreciation parameters: useful life years, salvage value, depreciation start date
3. FOR units of production method, THE Asset_Registry SHALL track total expected units and current units
4. THE Asset_Registry SHALL calculate and store accumulated depreciation and current book value

### Requirement 9: Document Management

**User Story:** As an administrator, I want to attach and track documents for assets, so that I can manage registrations, insurance, and permits.

#### Acceptance Criteria

1. THE Asset_Registry SHALL support document types: registration (STNK), insurance, KIR inspection, permit, purchase, manual, photo, other
2. WHEN uploading a document, THE Asset_Registry SHALL allow setting an expiry date
3. WHEN uploading a document, THE Asset_Registry SHALL allow setting reminder days before expiry (default 30 days)
4. THE Asset_Registry SHALL track document metadata: name, URL, issue date, expiry date, upload date, uploaded by

### Requirement 10: Expiring Document Alerts

**User Story:** As an administrator, I want to be alerted about expiring documents, so that I can renew registrations and permits on time.

#### Acceptance Criteria

1. THE Asset_Registry SHALL identify documents as: expired (past expiry date), expiring soon (within reminder days), or valid
2. WHEN viewing the asset list, THE Asset_Registry SHALL show a count of expiring documents in the summary cards
3. THE Asset_Registry SHALL provide a view of all expiring and expired documents across all assets
4. WHEN displaying expiring documents, THE Asset_Registry SHALL show: asset code, asset name, document type, expiry date, days until expiry, status

### Requirement 11: Asset Summary Reporting

**User Story:** As a manager, I want to see asset summaries by category, so that I can understand fleet composition and value.

#### Acceptance Criteria

1. THE Asset_Registry SHALL provide summary data grouped by category showing: total count, active count, maintenance count, idle count, total purchase value, total book value
2. THE Asset_Registry SHALL exclude disposed and sold assets from summary calculations

### Requirement 12: Role-Based Access Control

**User Story:** As a system administrator, I want to control who can perform asset operations, so that I can maintain data integrity and security.

#### Acceptance Criteria

1. THE Asset_Registry SHALL allow Owner, Admin, Manager, Ops, Finance, and Equipment roles to view assets
2. THE Asset_Registry SHALL allow only Owner, Admin, Manager, and Equipment roles to create assets
3. THE Asset_Registry SHALL allow only Owner, Admin, Manager, and Equipment roles to edit assets
4. THE Asset_Registry SHALL allow Owner, Admin, Manager, Ops, and Equipment roles to change asset status
5. THE Asset_Registry SHALL allow only Owner, Admin, Manager, and Finance roles to view financial details
6. THE Asset_Registry SHALL allow only Owner and Admin roles to dispose or delete assets
7. THE Asset_Registry SHALL allow Owner, Admin, Manager, Ops, and Equipment roles to upload documents

### Requirement 13: Navigation Integration

**User Story:** As a user, I want to access the Equipment module from the sidebar, so that I can easily navigate to asset management.

#### Acceptance Criteria

1. THE System SHALL display an "Equipment" section in the main navigation sidebar
2. WHEN clicking the Equipment menu item, THE System SHALL navigate to the asset list page at /equipment
