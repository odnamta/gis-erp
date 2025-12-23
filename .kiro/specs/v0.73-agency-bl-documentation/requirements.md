# Requirements Document

## Introduction

This feature implements a comprehensive Bill of Lading (B/L) and shipping documentation management system for the Agency module. It enables users to create, manage, and track Bills of Lading, Shipping Instructions, Arrival Notices, and Cargo Manifests - essential documents in international freight forwarding operations.

## Glossary

- **Bill_of_Lading**: A legal document issued by a carrier to a shipper that details the type, quantity, and destination of goods being carried; serves as a receipt, contract of carriage, and document of title
- **Shipping_Instruction**: A document submitted by the shipper to the carrier containing all necessary information to prepare the Bill of Lading
- **Arrival_Notice**: A notification sent to the consignee informing them of cargo arrival and any applicable charges
- **Cargo_Manifest**: A comprehensive list of all cargo carried on a vessel for a specific voyage
- **Shipper**: The party who sends/exports the goods
- **Consignee**: The party who receives/imports the goods
- **Notify_Party**: A party to be notified upon cargo arrival (often the actual receiver when consignee is "to order")
- **B/L_Type**: Classification of B/L - original (negotiable), seaway bill (non-negotiable), telex release, or surrender
- **Freight_Terms**: Payment terms for freight - prepaid (paid at origin) or collect (paid at destination)
- **Free_Time**: The period during which cargo can remain at terminal without incurring storage charges
- **Letter_of_Credit**: A bank guarantee for payment, often requiring specific B/L documentation

## Requirements

### Requirement 1: Bill of Lading Management

**User Story:** As an agency user, I want to create and manage Bills of Lading linked to freight bookings, so that I can issue proper shipping documentation for cargo movements.

#### Acceptance Criteria

1. WHEN a user creates a Bill of Lading, THE System SHALL generate a unique B/L number and link it to an existing freight booking
2. WHEN a user specifies B/L type as 'original', THE System SHALL track the number of original copies (default 3)
3. WHEN a user enters shipper information, THE System SHALL store shipper name and address as required fields
4. WHEN a user marks consignee as "to order", THE System SHALL set consignee_to_order flag to true and allow optional consignee details
5. WHEN a user adds container details, THE System SHALL store container number, seal number, type, packages, and weight as a JSON array
6. WHEN a user saves a B/L, THE System SHALL calculate and display total packages, gross weight, and measurement from container details
7. WHEN a B/L status changes, THE System SHALL record the timestamp for issued_at and released_at as applicable
8. WHEN a user views a B/L, THE System SHALL display all shipping details in a print-ready format matching standard B/L layout

### Requirement 2: Shipping Instructions Management

**User Story:** As an agency user, I want to create and submit Shipping Instructions to carriers, so that Bills of Lading can be prepared accurately.

#### Acceptance Criteria

1. WHEN a user creates a Shipping Instruction, THE System SHALL auto-generate a unique SI number in format SI-YYYY-NNNNN
2. WHEN a user submits a Shipping Instruction, THE System SHALL update status to 'submitted' and record submitted_at timestamp
3. WHEN a user specifies Letter of Credit requirements, THE System SHALL store LC number, issuing bank, and terms
4. WHEN a user requests specific B/L type, THE System SHALL record bl_type_requested and number of originals/copies required
5. WHEN a user specifies documents required, THE System SHALL store the list as a JSON array (commercial invoice, packing list, certificate of origin, etc.)
6. WHEN a Shipping Instruction is confirmed, THE System SHALL allow linking to a Bill of Lading record
7. WHEN a user amends a Shipping Instruction, THE System SHALL update status to 'amended' and preserve amendment history

### Requirement 3: Arrival Notice Management

**User Story:** As an agency user, I want to create and send Arrival Notices to consignees, so that they can prepare for cargo collection and customs clearance.

#### Acceptance Criteria

1. WHEN a user creates an Arrival Notice, THE System SHALL auto-generate a unique notice number and link it to a Bill of Lading
2. WHEN a user enters ETA (Estimated Time of Arrival), THE System SHALL calculate free time expiry date based on configured free time days
3. WHEN a user records estimated charges, THE System SHALL store charge type, amount, and currency as a JSON array
4. WHEN a user marks consignee as notified, THE System SHALL record notified_at timestamp and notified_by information
5. WHEN cargo is cleared, THE System SHALL update status to 'cleared' and record cleared_at timestamp
6. WHEN cargo is delivered, THE System SHALL update status to 'delivered' and record delivered_at timestamp
7. WHEN viewing pending arrivals, THE System SHALL display all arrival notices with status 'pending' or 'notified' ordered by ETA

### Requirement 4: Cargo Manifest Management

**User Story:** As an agency user, I want to create Cargo Manifests for customs submission, so that I can comply with port authority requirements.

#### Acceptance Criteria

1. WHEN a user creates a Cargo Manifest, THE System SHALL auto-generate a unique manifest number and specify type (inward/outward)
2. WHEN a user links Bills of Lading to a manifest, THE System SHALL store B/L IDs as a JSON array
3. WHEN a user saves a manifest, THE System SHALL calculate totals for B/Ls, containers, packages, weight, and CBM from linked B/Ls
4. WHEN a user submits a manifest, THE System SHALL update status to 'submitted' and record submitted_to and submitted_at
5. WHEN a manifest is approved, THE System SHALL update status to 'approved' and allow document URL attachment

### Requirement 5: Document Generation and Printing

**User Story:** As an agency user, I want to generate print-ready documents, so that I can provide professional documentation to clients and authorities.

#### Acceptance Criteria

1. WHEN a user requests B/L print, THE System SHALL generate a document in standard Bill of Lading format with all required fields
2. WHEN a user requests SI print, THE System SHALL generate a Shipping Instruction document with shipper/consignee details and cargo information
3. WHEN a user requests Arrival Notice print, THE System SHALL generate a notice document with vessel details, charges, and delivery instructions
4. WHEN generating documents, THE System SHALL include company letterhead information and document reference numbers

### Requirement 6: Data Validation and Integrity

**User Story:** As a system administrator, I want data validation rules enforced, so that documentation accuracy is maintained.

#### Acceptance Criteria

1. WHEN a user creates a B/L without a booking reference, THE System SHALL reject the creation and display an error
2. WHEN a user creates a B/L, THE System SHALL require vessel name, port of loading, port of discharge, shipper name, and cargo description
3. WHEN a user creates an Arrival Notice without a B/L reference, THE System SHALL reject the creation and display an error
4. WHEN a user enters container details, THE System SHALL validate container number format (4 letters + 7 digits)
5. WHEN a user enters weight values, THE System SHALL ensure gross weight is a positive decimal number
6. IF a B/L is already issued, THEN THE System SHALL prevent deletion and require amendment workflow instead

### Requirement 7: Status Workflow Management

**User Story:** As an agency user, I want clear status workflows for all documents, so that I can track document progress accurately.

#### Acceptance Criteria

1. WHEN a B/L is created, THE System SHALL set initial status to 'draft'
2. WHEN a B/L is submitted to carrier, THE System SHALL allow transition to 'submitted' status
3. WHEN a B/L is issued by carrier, THE System SHALL allow transition to 'issued' status and record issued_at
4. WHEN a B/L is released (telex release or surrender), THE System SHALL allow transition to 'released' or 'surrendered' status
5. WHEN a Shipping Instruction is created, THE System SHALL set initial status to 'draft'
6. WHEN an Arrival Notice is created, THE System SHALL set initial status to 'pending'
7. WHEN a Cargo Manifest is created, THE System SHALL set initial status to 'draft'
