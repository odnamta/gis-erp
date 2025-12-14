# Requirements Document

## Introduction

This feature implements Project Management for Gama ERP. Projects are linked to customers and serve as containers for PJOs (Proforma Job Orders) and JOs (Job Orders). Users can create, edit, and view projects, filter by status or customer, and see related PJOs/JOs on the project detail page.

## Glossary

- **Project**: A work engagement linked to a customer, containing multiple PJOs and JOs
- **Customer**: A client company that owns one or more projects
- **Status**: Project lifecycle state (draft, active, completed, cancelled)
- **Site Address**: Physical location where the project work is performed
- **PJO**: Proforma Job Order - a quotation linked to a project
- **JO**: Job Order - actual work order linked to a project

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a list of all projects with customer information, so that I can quickly find and manage projects.

#### Acceptance Criteria

1. WHEN a user visits the projects page THE System SHALL display all active projects in a table
2. WHEN displaying projects THE System SHALL show project name, customer name, status, and site address columns
3. WHEN displaying projects THE System SHALL order projects by creation date descending
4. WHEN no projects exist THE System SHALL display an empty state message

### Requirement 2

**User Story:** As a user, I want to filter projects by status and customer, so that I can find specific projects quickly.

#### Acceptance Criteria

1. WHEN a user selects a status filter THE System SHALL display only projects matching that status
2. WHEN a user selects a customer filter THE System SHALL display only projects belonging to that customer
3. WHEN both filters are applied THE System SHALL display projects matching both criteria
4. WHEN filters are cleared THE System SHALL display all projects

### Requirement 3

**User Story:** As a user, I want to add a new project, so that I can track work for a customer.

#### Acceptance Criteria

1. WHEN a user clicks "Add Project" THE System SHALL display a form dialog
2. WHEN adding a project THE System SHALL require selecting a customer from a dropdown
3. WHEN adding a project THE System SHALL require entering a project name
4. WHEN adding a project THE System SHALL default status to "active"
5. WHEN a project is created THE System SHALL insert the record to Supabase and refresh the list
6. WHEN a project is created THE System SHALL display a success toast notification

### Requirement 4

**User Story:** As a user, I want to edit an existing project, so that I can update project details and status.

#### Acceptance Criteria

1. WHEN a user clicks edit on a project THE System SHALL display a pre-filled form dialog
2. WHEN editing a project THE System SHALL allow changing name, status, and site address
3. WHEN editing a project THE System SHALL NOT allow changing the customer
4. WHEN a project is updated THE System SHALL save changes to Supabase and refresh the list
5. WHEN a project is updated THE System SHALL display a success toast notification

### Requirement 5

**User Story:** As a user, I want to view project details, so that I can see all information and related records.

#### Acceptance Criteria

1. WHEN a user clicks on a project name THE System SHALL navigate to the project detail page
2. WHEN viewing project details THE System SHALL display all project fields (name, customer, status, site address, dates)
3. WHEN viewing project details THE System SHALL display the customer information with a link to customer detail
4. WHEN viewing project details THE System SHALL list all PJOs linked to this project
5. WHEN viewing project details THE System SHALL list all JOs linked to this project
6. WHEN a project is not found THE System SHALL display a 404 error page

### Requirement 6

**User Story:** As a user viewing a customer, I want to see their projects, so that I can understand the customer's engagement.

#### Acceptance Criteria

1. WHEN viewing customer detail THE System SHALL display a list of projects for that customer
2. WHEN viewing customer projects THE System SHALL show project name, status, and site address
3. WHEN a user clicks "Add Project" on customer detail THE System SHALL pre-select that customer in the form

### Requirement 7

**User Story:** As a user, I want visual status indicators, so that I can quickly identify project states.

#### Acceptance Criteria

1. WHEN displaying draft status THE System SHALL show a gray badge
2. WHEN displaying active status THE System SHALL show a green badge
3. WHEN displaying completed status THE System SHALL show a blue badge
4. WHEN displaying cancelled status THE System SHALL show a red badge

