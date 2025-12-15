# Requirements: Administration Dashboard (v0.9.5)

## Overview
Create a dedicated dashboard for **Administration Division** users (role: `admin`) who manage PJOs, JOs, and Invoices as part of the business workflow. This is NOT for system administrators (role: `super_admin`).

The Administration Division handles:
- Receiving awards and creating PJOs
- Converting approved PJOs to JOs
- Generating invoices from completed JOs
- Tracking payment collection

The dashboard provides a comprehensive view of pending work items, document status, and workflow bottlenecks.

## Functional Requirements

### 1. Dashboard Layout
- 1.1 Display Admin Dashboard when user role is 'admin'
- 1.2 Show welcome message with admin's name
- 1.3 Provide period filter (This Week, This Month, This Quarter)

### 2. KPI Cards (Top Row)
- 2.1 Display 6 KPI cards in a responsive grid
- 2.2 **PJOs Pending Approval**: Count of PJOs with status 'pending_approval'
- 2.3 **PJOs Ready for JO**: Count of approved PJOs with all costs confirmed, not yet converted
- 2.4 **JOs In Progress**: Count of JOs with status 'active'
- 2.5 **Invoices Unpaid**: Count of invoices with status 'sent' or 'overdue'
- 2.6 **Revenue This Period**: Sum of invoice amounts for paid invoices in period
- 2.7 **Documents Created**: Count of PJOs + JOs + Invoices created in period

### 3. PJO Status Pipeline
- 3.1 Display horizontal pipeline showing PJO counts by status
- 3.2 Statuses: Draft → Pending Approval → Approved → Converted to JO
- 3.3 Show count and percentage for each stage
- 3.4 Clickable stages to filter/navigate to PJO list

### 4. Pending Work Queue
- 4.1 Display table of items requiring admin action
- 4.2 Columns: Type (PJO/JO/Invoice), Number, Customer, Action Needed, Days Pending
- 4.3 Action types: "Create JO", "Create Invoice", "Send Invoice", "Follow Up Payment"
- 4.4 Sort by days pending descending (oldest first)
- 4.5 Quick action buttons for each item
- 4.6 Show empty state when no pending work

### 5. Recent Documents Table
- 5.1 Display table of recently created/updated documents
- 5.2 Columns: Type, Number, Customer, Status, Created Date, Updated Date
- 5.3 Filter by document type (All, PJO, JO, Invoice)
- 5.4 Show last 10 documents by default
- 5.5 Link to document detail page

### 6. Invoice Aging Summary
- 6.1 Display aging buckets: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days
- 6.2 Show count and total amount per bucket
- 6.3 Highlight overdue buckets with warning colors
- 6.4 Click bucket to filter invoice list

### 7. Quick Actions Panel
- 7.1 Provide quick action buttons for common tasks
- 7.2 Actions: New PJO, New Customer, View All PJOs, View All JOs, View All Invoices
- 7.3 Keyboard shortcuts for power users (optional)

## Non-Functional Requirements

### 8. Performance
- 8.1 Dashboard loads within 2 seconds
- 8.2 Use parallel data fetching for all sections
- 8.3 Implement loading skeletons for each section

### 9. Testing
- 9.1 Property-based tests for all utility functions
- 9.2 Test KPI calculations with edge cases (zero values, null data)
- 9.3 Test aging bucket calculations
- 9.4 Test pending work queue sorting and filtering
