# Requirements Document

## Introduction

This document defines the requirements for the Agency Booking Management module (v0.72) of the Gama ERP system. The module enables management of freight bookings with shipping lines, including booking requests, confirmations, container tracking, amendments, and status history. This builds upon the v0.71 Agency - Shipping Line & Agent Management foundation.

## Glossary

- **Freight_Booking**: A request to reserve cargo space on a vessel with a shipping line
- **Booking_System**: The module responsible for creating, tracking, and managing freight bookings
- **Container_Manager**: The component that handles container allocation and tracking within bookings
- **Amendment_Handler**: The component that processes booking changes and maintains version history
- **Status_Tracker**: The component that logs and manages booking status transitions
- **Rate_Calculator**: The component that calculates freight costs based on shipping rates
- **Shipping_Line**: A carrier company that operates vessels (from v0.71)
- **Port**: A location for loading/unloading cargo (from v0.71)
- **Job_Order**: An active work order that may be linked to a booking
- **Quotation**: A pre-award quotation that may be linked to a booking
- **ETD**: Estimated Time of Departure
- **ETA**: Estimated Time of Arrival
- **SI_Cutoff**: Shipping Instruction cutoff date
- **Incoterm**: International Commercial Terms (FOB, CIF, CFR, EXW, DDP, etc.)
- **Freight_Terms**: Payment terms for freight (prepaid or collect)

## Requirements

### Requirement 1: Freight Booking Creation

**User Story:** As an admin user, I want to create freight bookings linked to job orders or quotations, so that I can reserve cargo space with shipping lines.

#### Acceptance Criteria

1. WHEN a user creates a new booking, THE Booking_System SHALL generate a unique booking number in format BKG-YYYY-NNNNN
2. WHEN a user selects a shipping line, THE Booking_System SHALL display only active shipping lines from the database
3. WHEN a user selects origin and destination ports, THE Booking_System SHALL validate that both ports exist and are active
4. WHEN a user links a booking to a job order, THE Booking_System SHALL populate customer information from the job order
5. WHEN a user enters cargo details, THE Booking_System SHALL require cargo description and commodity type
6. WHEN a user saves a booking as draft, THE Booking_System SHALL persist all entered data without validation of required fields
7. WHEN a user submits a booking request, THE Booking_System SHALL validate all required fields before changing status to 'requested'

### Requirement 2: Container Management

**User Story:** As an admin user, I want to manage containers within a booking, so that I can track individual container details and cargo allocation.

#### Acceptance Criteria

1. WHEN a user adds a container to a booking, THE Container_Manager SHALL require container type selection
2. WHEN a user specifies container details, THE Container_Manager SHALL accept container number, seal number, weight, and cargo description
3. WHEN multiple containers are added, THE Container_Manager SHALL calculate and display total container count and total weight
4. WHEN a container is removed from a booking, THE Container_Manager SHALL update the totals accordingly
5. WHEN a booking is submitted, THE Container_Manager SHALL validate that at least one container exists for containerized cargo
6. THE Container_Manager SHALL support container types: 20GP, 40GP, 40HC, 20OT, 40OT, 20FR, 40FR

### Requirement 3: Freight Rate Integration

**User Story:** As an admin user, I want to look up and apply shipping rates to bookings, so that I can calculate accurate freight costs.

#### Acceptance Criteria

1. WHEN a user requests rate lookup, THE Rate_Calculator SHALL search for rates matching origin port, destination port, and container type
2. WHEN rates are found, THE Rate_Calculator SHALL display the best available rate with transit time
3. WHEN a user applies a rate, THE Rate_Calculator SHALL calculate total freight based on container quantities and rate per container
4. WHEN multiple container types exist, THE Rate_Calculator SHALL calculate subtotals per container type and grand total
5. IF no matching rate is found, THEN THE Rate_Calculator SHALL display a message indicating no rates available
6. WHEN a rate is applied, THE Booking_System SHALL store the freight rate, currency, and total freight amount

### Requirement 4: Booking Status Management

**User Story:** As an admin user, I want to track booking status through its lifecycle, so that I can monitor progress and take appropriate actions.

#### Acceptance Criteria

1. THE Status_Tracker SHALL support statuses: draft, requested, confirmed, amended, cancelled, shipped, completed
2. WHEN a booking status changes, THE Status_Tracker SHALL log the transition with timestamp and user
3. WHEN a booking is confirmed, THE Status_Tracker SHALL record the confirmation timestamp
4. WHEN a booking is cancelled, THE Status_Tracker SHALL prevent further modifications except notes
5. WHEN a booking is shipped, THE Status_Tracker SHALL update container statuses to 'shipped'
6. THE Status_Tracker SHALL enforce valid status transitions (draft→requested→confirmed→shipped→completed)

### Requirement 5: Booking Amendments

**User Story:** As an admin user, I want to request and track amendments to confirmed bookings, so that I can handle changes to schedules, quantities, or other details.

#### Acceptance Criteria

1. WHEN a user requests an amendment, THE Amendment_Handler SHALL create an amendment record with sequential number
2. WHEN creating an amendment, THE Amendment_Handler SHALL require amendment type and description
3. THE Amendment_Handler SHALL support amendment types: schedule_change, quantity_change, vessel_change, rate_change, consignee_change, other
4. WHEN an amendment is created, THE Amendment_Handler SHALL capture old values and new values as JSON
5. WHEN an amendment is approved, THE Amendment_Handler SHALL apply the changes to the booking and update status to 'amended'
6. WHEN an amendment is rejected, THE Amendment_Handler SHALL retain the original booking values
7. THE Amendment_Handler SHALL maintain a complete history of all amendments for audit purposes

### Requirement 6: Shipper and Consignee Management

**User Story:** As an admin user, I want to specify shipper, consignee, and notify party details, so that shipping documents can be prepared accurately.

#### Acceptance Criteria

1. WHEN a user enters shipper details, THE Booking_System SHALL accept name and address
2. WHEN a user enters consignee details, THE Booking_System SHALL accept name and address
3. WHEN a user enters notify party details, THE Booking_System SHALL accept name and address
4. WHEN a booking is linked to a job order, THE Booking_System SHALL suggest customer as default consignee
5. WHEN a booking is submitted, THE Booking_System SHALL require shipper and consignee information

### Requirement 7: Schedule and Cutoff Management

**User Story:** As an admin user, I want to track vessel schedules and cutoff dates, so that I can ensure timely cargo delivery and documentation.

#### Acceptance Criteria

1. WHEN a user enters schedule details, THE Booking_System SHALL accept vessel name, voyage number, ETD, and ETA
2. WHEN a user enters cutoff details, THE Booking_System SHALL accept cutoff date, cutoff time, and SI cutoff date
3. WHEN cutoff date is approaching (within 3 days), THE Booking_System SHALL display a warning indicator
4. WHEN cutoff date has passed, THE Booking_System SHALL display an alert indicator
5. WHEN ETD is before cutoff date, THE Booking_System SHALL display a validation error

### Requirement 8: Dangerous Goods Handling

**User Story:** As an admin user, I want to specify dangerous goods information when applicable, so that proper handling and documentation requirements are met.

#### Acceptance Criteria

1. WHEN commodity type is 'dangerous', THE Booking_System SHALL require dangerous goods details
2. WHEN entering dangerous goods, THE Booking_System SHALL accept UN number, class, packing group, and proper shipping name
3. WHEN dangerous goods are specified, THE Booking_System SHALL store the information as structured JSON
4. IF commodity type is not 'dangerous', THEN THE Booking_System SHALL not require dangerous goods details

### Requirement 9: Booking List and Search

**User Story:** As an admin user, I want to view and search bookings, so that I can quickly find and manage booking records.

#### Acceptance Criteria

1. WHEN a user views the booking list, THE Booking_System SHALL display bookings with key information (number, customer, route, status, ETD)
2. WHEN a user searches by booking number, THE Booking_System SHALL filter results to matching bookings
3. WHEN a user filters by status, THE Booking_System SHALL display only bookings with the selected status
4. WHEN a user filters by shipping line, THE Booking_System SHALL display only bookings with the selected shipping line
5. WHEN a user filters by date range, THE Booking_System SHALL display bookings with ETD within the range
6. THE Booking_System SHALL display active bookings (not cancelled or completed) by default

### Requirement 10: Database Schema

**User Story:** As a system administrator, I want proper database tables with referential integrity, so that booking data is stored reliably and consistently.

#### Acceptance Criteria

1. THE Database SHALL have a freight_bookings table with all required fields and foreign key relationships
2. THE Database SHALL have a booking_containers table linked to freight_bookings
3. THE Database SHALL have a booking_amendments table linked to freight_bookings
4. THE Database SHALL have a booking_status_history table linked to freight_bookings
5. THE Database SHALL have auto-number generation for booking numbers using a sequence
6. THE Database SHALL have a trigger to log status changes automatically
7. THE Database SHALL have appropriate indexes for common query patterns
8. THE Database SHALL have RLS policies enabled for security
