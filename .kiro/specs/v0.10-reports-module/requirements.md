# Requirements Document

## Introduction

This document specifies the requirements for the Reports Module (v0.10) in Gama ERP. The Reports Module provides a dedicated section for generating business reports across financial, operational, accounts receivable, and sales domains. Phase 1 focuses on data tables with period filtering; Phase 2 (future) will add PDF export and charts.

## Glossary

- **Reports_Module**: The dedicated reports section accessible from the main navigation
- **Report_Index**: The landing page showing all available reports grouped by category
- **Report_Page**: Individual report view with filters and data table
- **Period_Filter**: Date range selector for filtering report data
- **P&L_Report**: Profit and Loss statement showing revenue, costs, and margins
- **Budget_Variance**: Comparison of estimated vs actual costs per PJO
- **AR_Aging**: Accounts Receivable aging report grouping invoices by days outstanding
- **Aging_Bucket**: Time-based grouping for invoice age (Current, 1-30, 31-60, 61-90, 90+ days)
- **Conversion_Rate**: Percentage of PJOs that progress from one status to the next

## Requirements

### Requirement 1

**User Story:** As a user, I want to access a reports section from the main navigation, so that I can find and generate business reports.

#### Acceptance Criteria

1. WHEN a user clicks on "Reports" in the navigation THEN the Reports_Module SHALL display the Report_Index page
2. WHEN the Report_Index loads THEN the Reports_Module SHALL display reports grouped into four categories: Financial Reports, Operational Reports, Accounts Receivable, and Sales Reports
3. WHEN displaying report cards THEN the Reports_Module SHALL show report name, brief description, and a "Generate" action button
4. WHEN a user's role lacks permission for a report THEN the Reports_Module SHALL hide that report from the Report_Index
5. WHEN a user attempts to access a report URL directly without permission THEN the Reports_Module SHALL redirect to the Report_Index with an access denied message

### Requirement 2

**User Story:** As a manager or finance user, I want to generate a Profit & Loss statement, so that I can analyze revenue and costs for a period.

#### Acceptance Criteria

1. WHEN the P&L_Report loads THEN the Reports_Module SHALL display period filter controls with preset options (This Month, Last Month, This Quarter, Custom)
2. WHEN generating the P&L_Report THEN the Reports_Module SHALL group revenue by service type (Trucking Services, Port Handling, Documentation Services)
3. WHEN generating the P&L_Report THEN the Reports_Module SHALL group costs by category (Trucking, Port Charges, Crew, Fuel, Tolls, Documentation, Other)
4. WHEN displaying the P&L_Report THEN the Reports_Module SHALL show Total Revenue, Total Cost, Gross Profit, and Gross Margin percentage
5. WHEN calculating Gross Margin THEN the Reports_Module SHALL compute ((Total Revenue - Total Cost) / Total Revenue) * 100
6. WHEN Total Revenue is zero THEN the Reports_Module SHALL display Gross Margin as 0% instead of NaN or infinity
7. WHEN the user changes the period filter THEN the Reports_Module SHALL regenerate the report with data for the selected period

### Requirement 3

**User Story:** As a manager or ops user, I want to generate a Budget Variance report, so that I can identify cost overruns across PJOs.

#### Acceptance Criteria

1. WHEN generating the Budget_Variance report THEN the Reports_Module SHALL list all PJOs with their estimated and actual costs
2. WHEN displaying Budget_Variance items THEN the Reports_Module SHALL show PJO number, customer name, estimated total, actual total, variance amount, and variance percentage
3. WHEN calculating variance THEN the Reports_Module SHALL compute (Actual - Estimated) and ((Actual - Estimated) / Estimated) * 100
4. WHEN variance percentage exceeds 10% THEN the Reports_Module SHALL highlight the row with a warning indicator
5. WHEN estimated cost is zero THEN the Reports_Module SHALL display variance percentage as "N/A" instead of infinity
6. WHEN the user clicks on a PJO number THEN the Reports_Module SHALL navigate to the PJO detail page

### Requirement 4

**User Story:** As a manager or finance user, I want to generate an AR Aging report, so that I can track outstanding invoices by age.

#### Acceptance Criteria

1. WHEN generating the AR_Aging report THEN the Reports_Module SHALL group unpaid invoices into aging buckets: Current (not due), 1-30 days, 31-60 days, 61-90 days, and 90+ days overdue
2. WHEN displaying AR_Aging summary THEN the Reports_Module SHALL show count and total amount for each Aging_Bucket
3. WHEN displaying AR_Aging details THEN the Reports_Module SHALL show invoice number, customer name, invoice date, due date, amount, and days overdue
4. WHEN an invoice is 31+ days overdue THEN the Reports_Module SHALL highlight the row with a warning color
5. WHEN an invoice is 90+ days overdue THEN the Reports_Module SHALL highlight the row with a critical color
6. WHEN the user clicks on an Aging_Bucket header THEN the Reports_Module SHALL filter the detail table to show only invoices in that bucket
7. WHEN the user clicks on an invoice number THEN the Reports_Module SHALL navigate to the invoice detail page

### Requirement 5

**User Story:** As a manager or sales user, I want to generate a Quotation Conversion report, so that I can analyze sales pipeline effectiveness.

#### Acceptance Criteria

1. WHEN generating the Quotation_Conversion report THEN the Reports_Module SHALL show PJO counts by status (Draft, Pending Approval, Approved, Rejected, Converted to JO)
2. WHEN displaying conversion metrics THEN the Reports_Module SHALL show conversion rate from Draft to Approved and from Approved to Converted
3. WHEN calculating conversion rate THEN the Reports_Module SHALL compute (Converted Count / Starting Count) * 100
4. WHEN displaying pipeline analysis THEN the Reports_Module SHALL show average days spent in each status stage
5. WHEN the user clicks on a status count THEN the Reports_Module SHALL navigate to the PJO list filtered by that status

### Requirement 6

**User Story:** As a user, I want report data to load efficiently with visual feedback, so that I have a smooth experience.

#### Acceptance Criteria

1. WHEN a report is generating THEN the Reports_Module SHALL display a loading skeleton in the data area
2. WHEN report generation fails THEN the Reports_Module SHALL display an error message with a retry option
3. WHEN report data is empty THEN the Reports_Module SHALL display an empty state message appropriate to the report type
4. WHEN displaying large datasets THEN the Reports_Module SHALL paginate results with 25 rows per page

### Requirement 7

**User Story:** As an administrator, I want to control which roles can access which reports, so that sensitive data is protected.

#### Acceptance Criteria

1. WHEN a user with role 'admin' or 'manager' accesses reports THEN the Reports_Module SHALL display all available reports
2. WHEN a user with role 'finance' accesses reports THEN the Reports_Module SHALL display Financial Reports and Accounts Receivable reports only
3. WHEN a user with role 'ops' accesses reports THEN the Reports_Module SHALL display Operational Reports only
4. WHEN a user with role 'sales' accesses reports THEN the Reports_Module SHALL display Sales Reports and Revenue by Customer report only
5. WHEN checking report access THEN the Reports_Module SHALL validate permissions on both client and server side

### Requirement 8

**User Story:** As a user, I want to filter reports by custom date ranges, so that I can analyze specific time periods.

#### Acceptance Criteria

1. WHEN displaying period filters THEN the Reports_Module SHALL show preset options: This Week, This Month, Last Month, This Quarter, Last Quarter, This Year, Custom
2. WHEN the user selects "Custom" THEN the Reports_Module SHALL display date picker inputs for start and end dates
3. WHEN the user enters an invalid date range (end before start) THEN the Reports_Module SHALL display a validation error and prevent report generation
4. WHEN the user changes the period THEN the Reports_Module SHALL preserve the selection in the URL query parameters
5. WHEN the page loads with period parameters in the URL THEN the Reports_Module SHALL apply those filters automatically

