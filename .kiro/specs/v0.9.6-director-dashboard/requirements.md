# Requirements Document

## Introduction

This document defines the requirements for the Director Dashboard feature (v0.9.6) in GAMA ERP. The Director Dashboard provides business-focused metrics and operational oversight for users with the director role. Unlike the Owner dashboard which focuses on system administration and user management, the Director dashboard emphasizes business performance, operational KPIs, and department comparisons - designed for executives who need business insights without technical complexity.

## Glossary

- **Director_Dashboard**: The main dashboard page for director role users showing business performance metrics
- **Director_Data_Service**: Server-side service that fetches director-specific dashboard metrics
- **Dashboard_Cache**: 5-minute in-memory cache system for dashboard data
- **Current_User**: The authenticated user viewing the dashboard
- **Business_KPIs**: Key performance indicators (revenue, profit, margins, growth)
- **Operational_KPIs**: Operational metrics (active jobs, completion rate, equipment utilization)
- **Department_Performance**: Comparative metrics across departments

## Requirements

### Requirement 1: Business Performance Overview

**User Story:** As a director, I want to see key business metrics at a glance, so that I can monitor company financial health.

#### Acceptance Criteria

1. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the total revenue from completed job orders
2. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the total profit (revenue - cost)
3. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL calculate the profit margin percentage
4. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch revenue for current month and previous month for comparison
5. THE Director_Dashboard SHALL display revenue and profit formatted as Indonesian Rupiah currency
6. THE Director_Dashboard SHALL display month-over-month revenue change as a percentage with trend indicator
7. THE Director_Dashboard SHALL display profit margin with color coding (green if >= 25%, yellow if 15-25%, red if < 15%)

### Requirement 2: Operational KPIs

**User Story:** As a director, I want to see operational performance metrics, so that I can understand how efficiently the company is operating.

#### Acceptance Criteria

1. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the count of active job orders (status = 'active')
2. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the count of completed job orders this month
3. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL calculate job completion rate (completed / total this month)
4. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the count of pending PJO approvals
5. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the count of pending BKK approvals
6. THE Director_Dashboard SHALL display pending approvals with a warning indicator if count > 5

### Requirement 3: Pipeline Overview

**User Story:** As a director, I want to see the sales and operations pipeline, so that I can forecast upcoming work and revenue.

#### Acceptance Criteria

1. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the count of quotations by status (draft, submitted, won, lost)
2. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the total value of won quotations this month
3. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch the count of PJOs by status (draft, pending_approval, approved)
4. THE Director_Dashboard SHALL display a pipeline summary showing quotations → PJOs → JOs flow
5. THE Director_Dashboard SHALL display win rate percentage (won / (won + lost) quotations)

### Requirement 4: Financial Health Indicators

**User Story:** As a director, I want to see financial health indicators, so that I can monitor cash flow and receivables.

#### Acceptance Criteria

1. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch total outstanding AR (unpaid invoices)
2. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch total overdue AR (invoices past due date)
3. WHEN the Director_Dashboard loads, THE Director_Data_Service SHALL fetch collection rate (paid / total invoiced)
4. THE Director_Dashboard SHALL display overdue AR with a red warning indicator if amount > 0
5. THE Director_Dashboard SHALL display collection rate with color coding (green if >= 85%, yellow if 70-85%, red if < 70%)

### Requirement 5: Quick Actions (Business-Focused)

**User Story:** As a director, I want quick access to business reports and approvals, so that I can take action on important items.

#### Acceptance Criteria

1. THE Director_Dashboard SHALL display a "View Reports" button linking to /reports
2. THE Director_Dashboard SHALL display a "Pending Approvals" button linking to /approvals (or relevant page)
3. THE Director_Dashboard SHALL display an "Active Jobs" button linking to /job-orders?status=active
4. THE Director_Dashboard SHALL NOT display user management or system settings links (owner-only functions)
5. THE Director_Dashboard SHALL style action buttons consistently with the design system

### Requirement 6: Recent Activity Summary

**User Story:** As a director, I want to see recent business activity, so that I can stay informed about company operations.

#### Acceptance Criteria

1. THE Director_Dashboard SHALL display the 5 most recent completed job orders with customer name and amount
2. THE Director_Dashboard SHALL display the 5 most recent won quotations with customer name and value
3. THE Director_Dashboard SHALL format dates using relative time (e.g., "2 days ago")
4. THE Director_Dashboard SHALL format amounts as Indonesian Rupiah currency

### Requirement 7: Data Caching

**User Story:** As a system, I want to cache dashboard data, so that page loads are fast and database queries are minimized.

#### Acceptance Criteria

1. THE Director_Data_Service SHALL use the Dashboard_Cache with a 5-minute TTL
2. WHEN cached data exists and is not expired, THE Director_Data_Service SHALL return cached data without querying the database
3. WHEN cached data is expired or missing, THE Director_Data_Service SHALL fetch fresh data and update the cache
4. THE Director_Data_Service SHALL generate cache keys using the pattern 'director-dashboard-metrics:{date}'

### Requirement 8: Role-Based Access Control

**User Story:** As a system administrator, I want to restrict dashboard access to authorized roles, so that sensitive company data is protected.

#### Acceptance Criteria

1. WHEN a user with role 'director' accesses the Director_Dashboard, THE Director_Dashboard SHALL display the full dashboard
2. WHEN a user with role 'owner' accesses the Director_Dashboard, THE Director_Dashboard SHALL display the full dashboard
3. WHEN a user with an unauthorized role accesses the Director_Dashboard, THE Director_Dashboard SHALL redirect to the default dashboard
4. IF a user is not authenticated, THEN THE Director_Dashboard SHALL redirect to the login page

### Requirement 9: Visual Identity

**User Story:** As a director, I want a distinct dashboard identity, so that I can clearly identify my role-specific view.

#### Acceptance Criteria

1. THE Director_Dashboard SHALL display a header with "Director Dashboard" title
2. THE Director_Dashboard SHALL display a briefcase icon in the header
3. THE Director_Dashboard SHALL display a subtitle "Business performance and operational oversight"
4. THE Director_Dashboard SHALL use an indigo color scheme to differentiate from owner dashboard (amber)

### Requirement 10: Mobile Responsiveness

**User Story:** As a director working remotely, I want to access the dashboard on mobile devices, so that I can monitor company status from anywhere.

#### Acceptance Criteria

1. THE Director_Dashboard SHALL display metrics in a responsive grid that adapts to screen size
2. WHEN viewed on mobile devices, THE Director_Dashboard SHALL stack cards vertically for readability
3. THE Director_Dashboard SHALL prioritize business KPIs (revenue, profit, margin) at the top on mobile view
4. THE Director_Dashboard SHALL maintain touch-friendly tap targets (minimum 44px) for all interactive elements
