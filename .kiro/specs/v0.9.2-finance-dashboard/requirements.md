# Requirements Document

## Introduction

This feature implements a dedicated Finance Dashboard for finance staff in Gama ERP. The dashboard provides a focused view of accounts receivable, invoice tracking, quotation pipeline monitoring, and payment management - giving finance users the tools they need to manage cash flow and follow up on outstanding payments.

## Glossary

- **Finance User**: A user with role='finance' who handles invoicing, AR tracking, and payment collection
- **AR (Accounts Receivable)**: Money owed to the company by customers for invoiced services
- **AR Aging**: Categorization of outstanding invoices by how long they've been unpaid (0-30, 31-60, 61-90, 90+ days)
- **Overdue Invoice**: An invoice past its due date that hasn't been paid
- **PJO Pipeline**: The flow of Proforma Job Orders through various statuses (draft → pending → approved/rejected)
- **Payment Reminder**: A notification sent to customers about outstanding invoices
- **Due Date**: The date by which an invoice should be paid

## Requirements

### Requirement 1

**User Story:** As a finance user, I want to see a dashboard tailored to my work, so that I can focus on AR management and payment tracking.

#### Acceptance Criteria

1. WHEN a finance user logs in THEN the System SHALL display the Finance Dashboard instead of the main dashboard
2. WHEN displaying the Finance Dashboard THEN the System SHALL show KPI cards for total outstanding AR, overdue amount, and monthly revenue
3. WHEN displaying the Finance Dashboard THEN the System SHALL show the count of invoices and completed JOs alongside monetary values
4. WHEN a finance user navigates to any page THEN the System SHALL enforce role-appropriate data access

### Requirement 2

**User Story:** As a finance user, I want to see AR aging breakdown, so that I can prioritize collection efforts on older receivables.

#### Acceptance Criteria

1. WHEN displaying AR aging THEN the System SHALL group outstanding invoices into 0-30, 31-60, 61-90, and 90+ day buckets
2. WHEN displaying an aging bucket THEN the System SHALL show the count of invoices and total amount for that bucket
3. WHEN an invoice moves to a higher aging bucket THEN the System SHALL update the aging display accordingly
4. WHEN a user clicks on an aging bucket THEN the System SHALL filter the invoice list to show only invoices in that bucket

### Requirement 3

**User Story:** As a finance user, I want to see the quotation pipeline, so that I can track potential revenue and follow up on pending approvals.

#### Acceptance Criteria

1. WHEN displaying the quotation pipeline THEN the System SHALL show PJOs grouped by status (draft, pending_approval, approved, rejected)
2. WHEN displaying a pipeline row THEN the System SHALL show status, count of PJOs, and total estimated revenue value
3. WHEN a user clicks "Review" on draft PJOs THEN the System SHALL navigate to the PJO list filtered by draft status
4. WHEN a user clicks "Track execution" on approved PJOs THEN the System SHALL navigate to the JO list for those PJOs

### Requirement 4

**User Story:** As a finance user, I want to see overdue invoices prominently, so that I can send payment reminders quickly.

#### Acceptance Criteria

1. WHEN displaying overdue invoices THEN the System SHALL show invoices where current date exceeds due date
2. WHEN displaying an overdue invoice row THEN the System SHALL show invoice number, customer name, amount, due date, and days overdue
3. WHEN displaying overdue invoices THEN the System SHALL sort by days overdue (oldest first)
4. WHEN a user clicks "Remind" on an overdue invoice THEN the System SHALL open a reminder action dialog

### Requirement 5

**User Story:** As a finance user, I want to see recent payments, so that I can track cash flow and reconcile accounts.

#### Acceptance Criteria

1. WHEN displaying recent payments THEN the System SHALL show invoices with status 'paid' from the last 30 days
2. WHEN displaying a payment row THEN the System SHALL show payment date, invoice number, customer name, amount, and payment reference
3. WHEN a new payment is recorded THEN the System SHALL update the recent payments list without full page reload
4. WHEN displaying recent payments THEN the System SHALL sort by payment date (most recent first)

### Requirement 6

**User Story:** As a finance user, I want to export financial reports, so that I can share data with management and external stakeholders.

#### Acceptance Criteria

1. WHEN a user clicks "Export Report" THEN the System SHALL show export format options (CSV, PDF)
2. WHEN exporting AR aging report THEN the System SHALL include all outstanding invoices with aging bucket classification
3. WHEN exporting payment report THEN the System SHALL include payment date, invoice details, and reference information
4. WHEN export completes THEN the System SHALL download the file to the user's device

### Requirement 7

**User Story:** As a finance user, I want to see monthly revenue trends, so that I can track business performance over time.

#### Acceptance Criteria

1. WHEN displaying monthly revenue THEN the System SHALL show total revenue from completed JOs in the current month
2. WHEN displaying monthly revenue THEN the System SHALL compare current month to previous month with trend indicator
3. WHEN displaying revenue KPI THEN the System SHALL show the count of JOs contributing to the revenue

### Requirement 8

**User Story:** As a finance user, I want overdue invoices highlighted by severity, so that I can prioritize the most critical collections.

#### Acceptance Criteria

1. WHEN an invoice is 1-30 days overdue THEN the System SHALL display a yellow warning indicator
2. WHEN an invoice is 31-60 days overdue THEN the System SHALL display an orange warning indicator
3. WHEN an invoice is more than 60 days overdue THEN the System SHALL display a red critical indicator
4. WHEN there are critical overdue invoices THEN the System SHALL show an alert count in the KPI card
