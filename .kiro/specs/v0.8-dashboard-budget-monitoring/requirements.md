# Requirements Document

## Introduction

This document specifies the requirements for an Enhanced Dashboard with Budget Monitoring in the Gama ERP system. The dashboard provides role-based views with KPI cards, budget health alerts, recent activity tracking, and an operations queue. The feature enables users to monitor workflow status at a glance, identify budget overruns quickly, and access pending work items efficiently.

## Glossary

- **KPI Card**: A visual summary card displaying a key performance indicator with count, label, and navigation link
- **Budget Health**: An aggregate measure of cost items that have exceeded their estimated amounts
- **Budget Alert**: A notification highlighting a specific cost item that has exceeded its budget cap
- **Outstanding AR**: Accounts Receivable - the total value of unpaid invoices
- **Operations Queue**: A list of pending work items for Operations users to complete
- **Exceeded Status**: A cost item where actual_amount is greater than estimated_amount
- **Ready for Conversion**: A PJO with status "approved" and all_costs_confirmed = true
- **Awaiting Ops Input**: A PJO with status "approved" and all_costs_confirmed = false

## Requirements

### Requirement 1

**User Story:** As an admin user, I want to see KPI cards showing workflow status counts, so that I can monitor business operations at a glance.

#### Acceptance Criteria

1. WHEN a user navigates to the dashboard THEN the Dashboard_System SHALL display four KPI cards in a responsive grid layout
2. WHEN displaying the "Awaiting Ops Input" card THEN the Dashboard_System SHALL show the count of PJOs where status is "approved" AND all_costs_confirmed is false
3. WHEN displaying the "Budget Health" card THEN the Dashboard_System SHALL show the count of cost items where status is "exceeded"
4. WHEN displaying the "Ready for Conversion" card THEN the Dashboard_System SHALL show the count of PJOs where status is "approved" AND all_costs_confirmed is true
5. WHEN displaying the "Outstanding AR" card THEN the Dashboard_System SHALL show the sum of grand_total from invoices where status is "sent" or "overdue"
6. WHEN a user clicks on a KPI card THEN the Dashboard_System SHALL navigate to the corresponding filtered list page

### Requirement 2

**User Story:** As an admin user, I want to see budget alerts for exceeded cost items, so that I can quickly identify and address budget overruns.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the Dashboard_System SHALL display a Budget Alerts section showing the most recent exceeded cost items
2. WHEN displaying budget alerts THEN the Dashboard_System SHALL show the PJO number, cost category, variance amount, and variance percentage for each exceeded item
3. WHEN displaying variance amounts THEN the Dashboard_System SHALL format values as IDR (Rp XX.XXX.XXX)
4. WHEN displaying variance percentage THEN the Dashboard_System SHALL calculate it as ((actual - estimated) / estimated) × 100
5. WHEN there are more than 5 exceeded items THEN the Dashboard_System SHALL display a "View All Exceeded Items" link
6. WHEN there are no exceeded items THEN the Dashboard_System SHALL display a success message indicating healthy budget status

### Requirement 3

**User Story:** As an admin user, I want to see recent activity in the system, so that I can track workflow progress and team actions.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the Dashboard_System SHALL display a Recent Activity section showing the last 5 system actions
2. WHEN displaying activity items THEN the Dashboard_System SHALL show the action type, related document number, and user who performed the action
3. WHEN displaying activity items THEN the Dashboard_System SHALL show the timestamp in relative format (e.g., "2 hours ago")
4. WHEN a PJO is approved THEN the Dashboard_System SHALL record an activity entry with format "[PJO number] approved by [user name]"
5. WHEN a JO is created THEN the Dashboard_System SHALL record an activity entry with format "JO created from [PJO number]"
6. WHEN an invoice is paid THEN the Dashboard_System SHALL record an activity entry with format "Invoice [invoice number] paid"

### Requirement 4

**User Story:** As an operations user, I want to see my pending work queue, so that I can efficiently complete cost entry tasks.

#### Acceptance Criteria

1. WHEN a user with role "ops" views the dashboard THEN the Dashboard_System SHALL display an Operations Queue section
2. WHEN displaying the operations queue THEN the Dashboard_System SHALL list PJOs that require actual cost entry (status "approved" AND all_costs_confirmed is false)
3. WHEN displaying each queue item THEN the Dashboard_System SHALL show the PJO number, customer name, and cost entry progress
4. WHEN displaying cost entry progress THEN the Dashboard_System SHALL show format "X of Y costs filled" where X is confirmed count and Y is total count
5. WHEN a user clicks on a queue item THEN the Dashboard_System SHALL navigate to the cost entry page for that PJO
6. WHEN all costs are confirmed for a PJO THEN the Dashboard_System SHALL remove it from the operations queue

### Requirement 5

**User Story:** As an admin user, I want KPI cards to display visual indicators, so that I can quickly assess status severity.

#### Acceptance Criteria

1. WHEN the Budget Health card shows exceeded items greater than zero THEN the Dashboard_System SHALL display the card with a red warning indicator
2. WHEN the Budget Health card shows zero exceeded items THEN the Dashboard_System SHALL display the card with a green success indicator
3. WHEN the Outstanding AR card shows a value greater than zero THEN the Dashboard_System SHALL display the card with a yellow indicator
4. WHEN displaying KPI values THEN the Dashboard_System SHALL format monetary amounts as IDR (Rp XX.XXX.XXX)
5. WHEN displaying count values THEN the Dashboard_System SHALL show integer numbers without decimal places

### Requirement 6

**User Story:** As a manager user, I want to see a comprehensive dashboard view, so that I can oversee all operations and financial status.

#### Acceptance Criteria

1. WHEN a user with role "manager" views the dashboard THEN the Dashboard_System SHALL display all KPI cards, budget alerts, recent activity, and operations queue
2. WHEN displaying the manager dashboard THEN the Dashboard_System SHALL show additional summary metrics including total revenue, total costs, and overall margin
3. WHEN displaying summary metrics THEN the Dashboard_System SHALL calculate values from all active JOs in the current month
4. WHEN a manager clicks on summary metrics THEN the Dashboard_System SHALL navigate to detailed financial reports

### Requirement 7

**User Story:** As a system user, I want dashboard data to load efficiently, so that I can access information without delays.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the Dashboard_System SHALL fetch all KPI data in parallel queries
2. WHEN fetching KPI counts THEN the Dashboard_System SHALL use count queries with head: true for optimal performance
3. WHEN fetching budget alerts THEN the Dashboard_System SHALL limit results to 5 most recent exceeded items
4. WHEN fetching recent activity THEN the Dashboard_System SHALL limit results to 5 most recent entries
5. WHEN data is loading THEN the Dashboard_System SHALL display skeleton loading states for each section

### Requirement 8

**User Story:** As a system user, I want dashboard data to refresh automatically, so that I see current information.

#### Acceptance Criteria

1. WHEN the dashboard is displayed THEN the Dashboard_System SHALL refresh KPI data every 60 seconds
2. WHEN a user performs an action that affects KPI counts THEN the Dashboard_System SHALL trigger an immediate refresh
3. WHEN refreshing data THEN the Dashboard_System SHALL update values without full page reload
4. WHEN a refresh fails THEN the Dashboard_System SHALL display the last known values with a stale data indicator

### Requirement 9

**User Story:** As a system user, I want dashboard links to navigate to filtered views, so that I can drill down into specific data.

#### Acceptance Criteria

1. WHEN a user clicks "Awaiting Ops Input" card THEN the Dashboard_System SHALL navigate to /proforma-jo?status=approved&costs_confirmed=false
2. WHEN a user clicks "Budget Health" card THEN the Dashboard_System SHALL navigate to a view showing all exceeded cost items
3. WHEN a user clicks "Ready for Conversion" card THEN the Dashboard_System SHALL navigate to /proforma-jo?status=approved&costs_confirmed=true
4. WHEN a user clicks "Outstanding AR" card THEN the Dashboard_System SHALL navigate to /invoices?status=sent,overdue
5. WHEN a user clicks "View All Exceeded Items" THEN the Dashboard_System SHALL navigate to a dedicated budget alerts page

