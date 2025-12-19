# Requirements Document

## Introduction

This document defines the requirements for the Vendor Management module (v0.20) in Gama ERP. This module creates a foundation for vendor/supplier management, supporting manual input for non-tech-savvy vendors, linking vendors to BKK for payment tracking, tracking vendor equipment/assets, and establishing a foundation for a future Procurement module.

## Glossary

- **Vendor**: A supplier or service provider that PT. Gama Intisamudera engages for logistics services (trucking, shipping, port services, handling, forwarding, documentation)
- **Vendor_Code**: A unique auto-generated identifier for each vendor in format VND-XXX
- **Vendor_Equipment**: Physical assets owned by a vendor (trailers, trucks, cranes, forklifts) that can be assigned to jobs
- **Vendor_Rating**: A performance evaluation (1-5 scale) given to a vendor after job completion
- **BKK**: Bukti Kas Keluar - Cash disbursement voucher used for vendor payments
- **PJO_Cost_Item**: A cost line item in a Proforma Job Order that can be linked to a vendor
- **Preferred_Vendor**: A vendor marked as prioritized for selection based on performance and reliability
- **Verified_Vendor**: A vendor whose documents have been validated by an administrator

## Requirements

### Requirement 1: Vendor Registration

**User Story:** As an admin, I want to register new vendors in the system, so that I can track and manage our supplier relationships.

#### Acceptance Criteria

1. WHEN an admin creates a new vendor, THE System SHALL auto-generate a unique vendor code in format VND-XXX
2. WHEN a vendor is created, THE System SHALL require vendor_name and vendor_type as mandatory fields
3. THE System SHALL support vendor types: trucking, shipping, port, handling, forwarding, documentation, other
4. WHEN a vendor is saved, THE System SHALL store contact information including address, city, province, postal_code, phone, email, and website
5. WHEN a vendor is saved, THE System SHALL store primary contact details including contact_person, contact_phone, contact_email, and contact_position
6. WHEN a vendor is saved, THE System SHALL store legal information including legal_name, tax_id (NPWP), and business_license (SIUP/NIB)
7. WHEN a vendor is saved, THE System SHALL store bank details including bank_name, bank_branch, bank_account, and bank_account_name

### Requirement 2: Vendor List and Search

**User Story:** As a user, I want to view and search vendors, so that I can quickly find the vendor I need.

#### Acceptance Criteria

1. WHEN a user navigates to the vendors page, THE System SHALL display a paginated list of vendors with vendor_code, vendor_name, vendor_type, contact_person, total_jobs, average_rating, and status
2. WHEN a user searches for a vendor, THE System SHALL filter results by vendor_name or vendor_code
3. WHEN a user filters by vendor type, THE System SHALL show only vendors of the selected type
4. WHEN a user filters by status, THE System SHALL show only active or inactive vendors as selected
5. WHEN a user filters by preferred only, THE System SHALL show only vendors marked as preferred
6. THE System SHALL display summary cards showing total vendors, active vendors, preferred vendors, and pending verification count

### Requirement 3: Vendor Detail View

**User Story:** As a user, I want to view complete vendor information, so that I can access all relevant details about a vendor.

#### Acceptance Criteria

1. WHEN a user views a vendor detail page, THE System SHALL display contact information, bank details, and legal information
2. WHEN a user views a vendor detail page, THE System SHALL display performance metrics including total_jobs, total_value, on_time_rate, and average_rating
3. WHEN a user views a vendor detail page, THE System SHALL display a list of vendor equipment with type, plate_number, capacity, daily_rate, document status, and availability
4. WHEN a user views a vendor detail page, THE System SHALL display recent jobs associated with the vendor
5. WHEN a user views a vendor detail page, THE System SHALL display uploaded vendor documents with expiry dates

### Requirement 4: Vendor Equipment Management

**User Story:** As an admin or ops user, I want to manage vendor equipment, so that I can track available assets for job assignments.

#### Acceptance Criteria

1. WHEN a user adds equipment to a vendor, THE System SHALL require equipment_type as mandatory
2. THE System SHALL support equipment types: trailer_40ft, trailer_20ft, lowbed, fuso, wingbox, crane, forklift, excavator, other
3. WHEN equipment is saved, THE System SHALL store plate_number, brand, model, year_made, capacity_kg, capacity_m3, dimensions, and daily_rate
4. WHEN equipment is saved, THE System SHALL store document expiry dates for STNK, KIR, and insurance
5. THE System SHALL allow marking equipment as available or unavailable
6. THE System SHALL display document expiry warnings when STNK, KIR, or insurance is expired or expiring soon

### Requirement 5: Vendor Classification

**User Story:** As an admin or manager, I want to classify vendors, so that I can prioritize reliable vendors and track verification status.

#### Acceptance Criteria

1. WHEN an admin verifies a vendor, THE System SHALL record verified_at timestamp and verified_by user
2. WHEN a user marks a vendor as preferred, THE System SHALL display a star indicator on the vendor
3. WHEN a user deactivates a vendor, THE System SHALL set is_active to false and exclude the vendor from selection dropdowns
4. THE System SHALL display verification status (verified/unverified) on vendor list and detail pages

### Requirement 6: Vendor Rating System

**User Story:** As an ops or admin user, I want to rate vendors after job completion, so that I can track vendor performance over time.

#### Acceptance Criteria

1. WHEN a user rates a vendor, THE System SHALL capture overall_rating, punctuality_rating, quality_rating, communication_rating, and price_rating on a 1-5 scale
2. WHEN a user rates a vendor, THE System SHALL record was_on_time boolean and optional issue_description
3. WHEN a rating is submitted, THE System SHALL recalculate the vendor's average_rating and on_time_rate
4. THE System SHALL link ratings to specific job_orders or BKK records

### Requirement 7: Vendor Integration with PJO Cost Items

**User Story:** As an admin, I want to assign vendors to cost items, so that I can track which vendor will perform each service.

#### Acceptance Criteria

1. WHEN creating or editing a PJO cost item, THE System SHALL display a vendor selection dropdown filtered by cost category
2. WHEN displaying vendor options, THE System SHALL show preferred vendors first, followed by others sorted by rating
3. WHEN a vendor is selected, THE System SHALL display available equipment for that vendor
4. WHEN equipment is selected, THE System SHALL suggest the daily_rate as the estimated amount

### Requirement 8: Vendor Integration with BKK

**User Story:** As a finance user, I want vendor information pre-filled in BKK, so that I can process payments efficiently.

#### Acceptance Criteria

1. WHEN creating a BKK from a cost item with a vendor, THE System SHALL pre-fill vendor information
2. WHEN a vendor has bank details, THE System SHALL display bank account information for payment
3. THE System SHALL allow selecting between paying to vendor bank account or cash disbursement to operations
4. WHEN a BKK is settled, THE System SHALL update the vendor's total_jobs and total_value metrics

### Requirement 9: Vendor Documents

**User Story:** As an admin, I want to upload and track vendor documents, so that I can ensure compliance and track expiry dates.

#### Acceptance Criteria

1. WHEN uploading a vendor document, THE System SHALL require document_type and allow optional expiry_date
2. THE System SHALL support document types: npwp, siup, nib, stnk, kir, insurance, contract, other
3. THE System SHALL display document expiry warnings when documents are expired or expiring within 30 days
4. THE System SHALL store file_url for uploaded documents in Supabase Storage

### Requirement 10: Role-Based Access Control

**User Story:** As a system administrator, I want to control vendor management access by role, so that users can only perform authorized actions.

#### Acceptance Criteria

1. THE System SHALL allow owner, admin, manager, finance, ops, sales, and viewer roles to view vendor list and details
2. THE System SHALL allow only owner, admin, and ops roles to create vendors
3. THE System SHALL allow only owner, admin, and manager roles to edit vendors
4. THE System SHALL allow only owner and admin roles to delete vendors
5. THE System SHALL allow only owner and admin roles to verify vendors
6. THE System SHALL allow only owner, admin, and manager roles to set preferred status
7. THE System SHALL allow only owner, admin, manager, and ops roles to add equipment
8. THE System SHALL allow only owner, admin, manager, finance, and ops roles to rate vendors
9. THE System SHALL allow only owner, admin, manager, and finance roles to view bank details

### Requirement 11: Navigation Integration

**User Story:** As a user, I want to access the Vendors module from the sidebar, so that I can easily navigate to vendor management.

#### Acceptance Criteria

1. THE System SHALL display a "Vendors" menu item in the sidebar navigation
2. THE System SHALL show the Vendors menu to owner, admin, manager, finance, ops, and sales roles
3. THE System SHALL hide the Vendors menu from viewer role
