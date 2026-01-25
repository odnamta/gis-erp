# Requirements Document

## Introduction

This document defines the requirements for the Customs Dashboard feature (v0.9.19) in GAMA ERP. The Customs Dashboard provides customs personnel (primary user: Khuzainan, Customs Assistant Manager) with a centralized view of import/export document status, duty tracking, deadline warnings, and HS code usage statistics. The dashboard follows existing patterns established by the HSE Dashboard and other role-specific dashboards.

## Glossary

- **Customs_Dashboard**: The main dashboard page for customs personnel showing PIB/PEB status, duties, deadlines, and activity
- **PIB**: Pemberitahuan Impor Barang - Import declaration document
- **PEB**: Pemberitahuan Ekspor Barang - Export declaration document
- **Customs_Data_Service**: Server-side service that fetches and caches customs metrics
- **Dashboard_Cache**: 5-minute in-memory cache system for dashboard data
- **Current_User**: The authenticated user viewing the dashboard
- **HS_Code**: Harmonized System code for classifying traded products
- **Customs_Fee**: Fee or duty associated with import/export documents
- **Document_Pipeline**: Visual representation of documents by status stage

## Requirements

### Requirement 1: Document Overview Metrics

**User Story:** As a customs officer, I want to see a document overview, so that I can immediately understand the current workload and status of import/export declarations.

#### Acceptance Criteria

1. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the count of pending PIB documents (status IN 'draft', 'submitted', 'checking')
2. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the count of completed PIB documents (status IN 'approved', 'released')
3. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the count of pending PEB documents (status IN 'draft', 'submitted')
4. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the count of completed PEB documents (status IN 'approved', 'loaded', 'departed')
5. THE Customs_Dashboard SHALL display PIB and PEB counts in separate metric cards
6. THE Customs_Dashboard SHALL display total documents processed this month

### Requirement 2: Document Pipeline Visualization

**User Story:** As a customs officer, I want to see documents grouped by status, so that I can understand the workflow pipeline and identify bottlenecks.

#### Acceptance Criteria

1. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch document counts grouped by status
2. THE Customs_Dashboard SHALL display a status breakdown showing: draft, submitted, processing, cleared, rejected counts
3. THE Customs_Dashboard SHALL display processing documents with a distinct visual indicator
4. THE Customs_Dashboard SHALL display rejected documents with a RED alert indicator

### Requirement 3: Duty Tracking Metrics

**User Story:** As a customs officer, I want to track customs duties and fees, so that I can monitor payment status and outstanding amounts.

#### Acceptance Criteria

1. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the total duties paid this month from customs_fees table
2. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the count of unpaid fees (payment_status = 'unpaid')
3. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the total amount of unpaid fees
4. THE Customs_Dashboard SHALL display duties paid this month formatted as currency
5. THE Customs_Dashboard SHALL display unpaid fees count with a WARNING indicator if count > 0
6. THE Customs_Dashboard SHALL display unpaid amount formatted as currency

### Requirement 4: Deadline Warnings

**User Story:** As a customs officer, I want to see deadline warnings, so that I can prioritize documents that need immediate attention.

#### Acceptance Criteria

1. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the count of documents with ETA within 7 days
2. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the count of overdue documents (ETA < today AND status NOT IN 'released', 'completed', 'cancelled')
3. THE Customs_Dashboard SHALL display due soon count with a WARNING (yellow) indicator
4. THE Customs_Dashboard SHALL display overdue count with a RED alert indicator
5. THE Customs_Dashboard SHALL display a list of up to 5 documents due soonest

### Requirement 5: Recent Activity Tracking

**User Story:** As a customs officer, I want to see recent document activity, so that I can quickly review and follow up on recent submissions.

#### Acceptance Criteria

1. THE Customs_Dashboard SHALL display a Recent Documents list showing document_ref, type (PIB/PEB), status, and date
2. THE Customs_Dashboard SHALL display the 10 most recent documents ordered by created_at descending
3. WHEN a user clicks on a recent document, THE Customs_Dashboard SHALL navigate to that document's detail page
4. THE Customs_Dashboard SHALL format dates using the centralized formatDate utility from lib/utils/format.ts
5. THE Customs_Dashboard SHALL display document type with color-coded badges (PIB=blue, PEB=green)

### Requirement 6: HS Code Usage Statistics

**User Story:** As a customs officer, I want to see frequently used HS codes, so that I can identify common product categories and streamline future declarations.

#### Acceptance Criteria

1. WHEN the Customs_Dashboard loads, THE Customs_Data_Service SHALL fetch the top 5 most frequently used HS codes from PIB/PEB items
2. THE Customs_Dashboard SHALL display HS code, description, and usage count
3. THE Customs_Dashboard SHALL order HS codes by usage count descending

### Requirement 7: Quick Actions

**User Story:** As a customs officer, I want quick access to common customs tasks, so that I can efficiently manage import/export documentation.

#### Acceptance Criteria

1. THE Customs_Dashboard SHALL display a Quick Actions section with navigation links
2. WHEN a user clicks "New PIB", THE Customs_Dashboard SHALL navigate to the PIB creation page
3. WHEN a user clicks "New PEB", THE Customs_Dashboard SHALL navigate to the PEB creation page
4. WHEN a user clicks "View All PIB", THE Customs_Dashboard SHALL navigate to the PIB list page
5. WHEN a user clicks "View All PEB", THE Customs_Dashboard SHALL navigate to the PEB list page
6. WHEN a user clicks "Pending Fees", THE Customs_Dashboard SHALL navigate to the pending fees page

### Requirement 8: Data Caching

**User Story:** As a system, I want to cache dashboard data, so that page loads are fast and database queries are minimized.

#### Acceptance Criteria

1. THE Customs_Data_Service SHALL use the Dashboard_Cache with a 5-minute TTL
2. WHEN cached data exists and is not expired, THE Customs_Data_Service SHALL return cached data without querying the database
3. WHEN cached data is expired or missing, THE Customs_Data_Service SHALL fetch fresh data and update the cache
4. THE Customs_Data_Service SHALL generate cache keys using the pattern 'customs-dashboard-metrics:{role}:{date}'

### Requirement 9: Role-Based Access Control

**User Story:** As a system administrator, I want to restrict dashboard access to authorized roles, so that sensitive customs data is protected.

#### Acceptance Criteria

1. WHEN a user with role 'customs' accesses the Customs_Dashboard, THE Customs_Dashboard SHALL display the full dashboard
2. WHEN a user with role 'owner', 'director', or 'finance_manager' accesses the Customs_Dashboard, THE Customs_Dashboard SHALL display the full dashboard
3. WHEN a user with an unauthorized role accesses the Customs_Dashboard, THE Customs_Dashboard SHALL redirect to the default dashboard
4. IF a user is not authenticated, THEN THE Customs_Dashboard SHALL redirect to the login page

### Requirement 10: Mobile Responsiveness

**User Story:** As a customs officer working remotely, I want to access the dashboard on mobile devices, so that I can monitor customs status from anywhere.

#### Acceptance Criteria

1. THE Customs_Dashboard SHALL display metrics in a responsive grid that adapts to screen size
2. WHEN viewed on mobile devices, THE Customs_Dashboard SHALL stack cards vertically for readability
3. THE Customs_Dashboard SHALL maintain touch-friendly tap targets (minimum 44px) for all interactive elements
4. THE Customs_Dashboard SHALL prioritize critical alerts (overdue documents, unpaid fees) at the top on mobile view
