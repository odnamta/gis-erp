# Requirements Document

## Introduction

This feature implements a dedicated Operations Dashboard for ops staff in Gama ERP. The dashboard provides a focused view of their work including pending cost entries, active jobs, and budget status - without exposing sensitive financial data like revenue, profit, or margins.

## Glossary

- **Ops User**: A user with role='ops' who handles operational tasks like cost entry
- **Cost Entry**: The process of filling actual costs for PJO cost items
- **Budget Cap**: The estimated amount set for each cost item (visible to ops)
- **Variance**: Difference between actual cost and budget cap
- **PJO**: Proforma Job Order - a quotation that needs cost confirmation before conversion to JO
- **JO**: Job Order - an active job being executed

## Requirements

### Requirement 1

**User Story:** As an ops user, I want to see a dashboard tailored to my work, so that I can focus on cost entry and job management without seeing financial data I shouldn't access.

#### Acceptance Criteria

1. WHEN an ops user logs in THEN the System SHALL display the Operations Dashboard instead of the main dashboard
2. WHEN displaying the Operations Dashboard THEN the System SHALL hide all revenue, profit, and margin data
3. WHEN displaying the Operations Dashboard THEN the System SHALL show KPI cards for pending cost entries, in-progress jobs, completed jobs this week, and over-budget items
4. WHEN an ops user navigates to any page THEN the System SHALL enforce the same financial data restrictions

### Requirement 2

**User Story:** As an ops user, I want to see my pending cost entries, so that I can quickly identify which PJOs need my attention.

#### Acceptance Criteria

1. WHEN displaying pending cost entries THEN the System SHALL show only approved PJOs with incomplete cost confirmations
2. WHEN displaying a pending cost entry row THEN the System SHALL show PJO number, project name, customer name, and progress (X/Y items confirmed)
3. WHEN all cost items for a PJO are confirmed THEN the System SHALL show a "Complete" status badge
4. WHEN a user clicks "Enter" on a pending entry THEN the System SHALL navigate to the cost entry page for that PJO

### Requirement 3

**User Story:** As an ops user, I want to see my active jobs, so that I can track ongoing work.

#### Acceptance Criteria

1. WHEN displaying active jobs THEN the System SHALL show JOs with status 'active' or 'in_progress'
2. WHEN displaying an active job row THEN the System SHALL show JO number, commodity, route (POL → POD), and status
3. WHEN a user clicks "View" on an active job THEN the System SHALL navigate to the JO detail page

### Requirement 4

**User Story:** As an ops user, I want to see budget information for cost items, so that I can enter costs within approved limits.

#### Acceptance Criteria

1. WHEN displaying cost items THEN the System SHALL show the budget cap (estimated amount) for each item
2. WHEN displaying cost items THEN the System SHALL show the variance between actual and budget
3. WHEN actual cost exceeds budget THEN the System SHALL display a warning indicator
4. IF a cost item exceeds budget THEN the System SHALL require a justification before confirmation

### Requirement 5

**User Story:** As an ops user, I want the sidebar navigation to show only relevant menu items, so that I don't see options I can't use.

#### Acceptance Criteria

1. WHEN an ops user views the sidebar THEN the System SHALL hide menu items for Customers, Invoices, and Reports
2. WHEN an ops user views the sidebar THEN the System SHALL show Dashboard, Projects, PJOs (cost entry view), and Job Orders
3. WHEN an ops user attempts to access a restricted page via URL THEN the System SHALL redirect to the Operations Dashboard

### Requirement 6

**User Story:** As an ops user, I want to see a quick summary of my weekly performance, so that I can track my productivity.

#### Acceptance Criteria

1. WHEN displaying the Operations Dashboard THEN the System SHALL show cost entries completed this week
2. WHEN displaying the Operations Dashboard THEN the System SHALL show average time from PJO approval to cost completion
3. WHEN displaying weekly stats THEN the System SHALL compare current week to previous week with trend indicators

### Requirement 7

**User Story:** As an ops user, I want to see urgent items highlighted, so that I can prioritize time-sensitive work.

#### Acceptance Criteria

1. WHEN a PJO has been awaiting cost entry for more than 3 days THEN the System SHALL display an "Urgent" badge
2. WHEN displaying pending entries THEN the System SHALL sort by urgency (oldest first)
3. WHEN there are urgent items THEN the System SHALL show a notification count in the KPI card

### Requirement 8

**User Story:** As an ops user, I want to quickly enter costs without navigating away, so that I can work more efficiently.

#### Acceptance Criteria

1. WHEN a user clicks "Quick Entry" on a cost item THEN the System SHALL open a modal dialog for cost entry
2. WHEN submitting a quick entry THEN the System SHALL update the dashboard without full page reload
3. WHEN a cost exceeds budget in quick entry THEN the System SHALL show justification field inline
