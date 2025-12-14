# Requirements Document

## Introduction

This feature implements complete Customer Management CRUD (Create, Read, Update, Delete) functionality for Gama ERP. It enables users to manage customer records including listing, searching, adding, editing, and viewing detailed customer information with their associated projects.

## Glossary

- **Customer**: A client company that contracts logistics services from PT. Gama Intisamudera
- **CRUD**: Create, Read, Update, Delete - the four basic operations for data management
- **Dialog**: A modal overlay component for forms and confirmations
- **Toast**: A brief notification message that appears temporarily

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to view a list of all customers, so that I can see and manage the company's client base.

#### Acceptance Criteria

1. WHEN a user navigates to the customers page THEN the Gama ERP System SHALL fetch and display all customers from the database ordered by name
2. WHEN customers are displayed THEN the Gama ERP System SHALL show each customer's name, email, phone, and action buttons in a table format
3. WHEN the customers table is loading THEN the Gama ERP System SHALL display a loading indicator
4. WHEN no customers exist in the database THEN the Gama ERP System SHALL display an empty state message with a prompt to add the first customer
5. IF fetching customers fails THEN the Gama ERP System SHALL display an error message to the user

### Requirement 2

**User Story:** As an admin user, I want to search and filter customers by name, so that I can quickly find specific customers.

#### Acceptance Criteria

1. WHEN a user types in the search box THEN the Gama ERP System SHALL filter the displayed customers to show only those whose name contains the search term
2. WHEN the search term is cleared THEN the Gama ERP System SHALL display all customers again
3. WHEN no customers match the search term THEN the Gama ERP System SHALL display a "no results" message

### Requirement 3

**User Story:** As an admin user, I want to add new customers via a dialog form, so that I can register new clients in the system.

#### Acceptance Criteria

1. WHEN a user clicks the "Add Customer" button THEN the Gama ERP System SHALL open a dialog with a customer form
2. WHEN the add customer form is displayed THEN the Gama ERP System SHALL show fields for name (required), email, phone, and address
3. WHEN a user submits the form with a valid name THEN the Gama ERP System SHALL insert the customer into the database
4. WHEN a user enters an invalid email format THEN the Gama ERP System SHALL display a validation error and prevent submission
5. WHEN a customer is successfully added THEN the Gama ERP System SHALL close the dialog, refresh the customer list, and show a success toast
6. IF adding a customer fails THEN the Gama ERP System SHALL display an error toast with the failure reason

### Requirement 4

**User Story:** As an admin user, I want to edit existing customer information, so that I can keep customer records up to date.

#### Acceptance Criteria

1. WHEN a user clicks the edit icon on a customer row THEN the Gama ERP System SHALL open a dialog with the customer form pre-filled with existing data
2. WHEN a user modifies and submits the edit form THEN the Gama ERP System SHALL update the customer record in the database
3. WHEN a customer is successfully updated THEN the Gama ERP System SHALL close the dialog, refresh the customer list, and show a success toast
4. IF updating a customer fails THEN the Gama ERP System SHALL display an error toast with the failure reason

### Requirement 5

**User Story:** As an admin user, I want to view detailed customer information on a dedicated page, so that I can see all customer data and related projects.

#### Acceptance Criteria

1. WHEN a user clicks on a customer name or view button THEN the Gama ERP System SHALL navigate to the customer detail page
2. WHEN the customer detail page loads THEN the Gama ERP System SHALL display all customer fields including name, email, phone, and address
3. WHEN viewing a customer THEN the Gama ERP System SHALL display a list of projects belonging to that customer
4. WHEN viewing a customer THEN the Gama ERP System SHALL provide a link to create a new project for that customer
5. IF the customer ID does not exist THEN the Gama ERP System SHALL display a "customer not found" message
