# Requirements Document

## Introduction

This document defines the requirements for the HSE (Health, Safety, Environment) Dashboard feature (v0.9.18) in GAMA ERP. The HSE Dashboard provides HSE personnel (primary user: Iqbal Tito) with a centralized view of safety metrics, incidents, inspections, permits, training compliance, and PPE status. The dashboard follows existing patterns established by the Engineering Dashboard and other role-specific dashboards.

## Glossary

- **HSE_Dashboard**: The main dashboard page for HSE personnel showing safety metrics, incidents, permits, training, and PPE status
- **Incident**: A safety incident record documenting accidents, near-misses, or safety violations
- **Safety_Permit**: A work permit required for hazardous activities (hot work, confined space, etc.)
- **PPE**: Personal Protective Equipment issued to employees
- **Training_Record**: A record of safety training completed by employees
- **HSE_Data_Service**: Server-side service that fetches and caches HSE metrics
- **Dashboard_Cache**: 5-minute in-memory cache system for dashboard data
- **Current_User**: The authenticated user viewing the dashboard
- **Days_Since_Last_Incident**: The number of days since the most recent incident occurred

## Requirements

### Requirement 1: Safety Overview Metrics

**User Story:** As an HSE officer, I want to see a prominent safety overview, so that I can immediately understand the current safety status.

#### Acceptance Criteria

1. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL calculate the Days_Since_Last_Incident by finding the most recent incident date
2. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the total count of incidents year-to-date
3. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of open/unresolved incidents (status NOT IN 'closed', 'resolved')
4. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch incident counts grouped by severity (critical, major, minor)
5. THE HSE_Dashboard SHALL display the Days_Since_Last_Incident prominently as a large counter
6. IF Days_Since_Last_Incident is less than 7, THEN THE HSE_Dashboard SHALL display the counter with a warning indicator

### Requirement 2: Permit Status Metrics

**User Story:** As an HSE officer, I want to monitor safety permit status, so that I can ensure all work permits are valid and properly managed.

#### Acceptance Criteria

1. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of active permits (status = 'active' AND valid_to >= today)
2. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of permits expiring within 30 days
3. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of expired permits (valid_to < today AND status != 'closed')
4. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the 5 most recent permits ordered by created_at descending
5. THE HSE_Dashboard SHALL display expired permits count with a RED alert indicator
6. THE HSE_Dashboard SHALL display expiring permits count with a WARNING (yellow) indicator

### Requirement 3: Training Compliance Metrics

**User Story:** As an HSE officer, I want to track training compliance, so that I can ensure all employees have valid safety certifications.

#### Acceptance Criteria

1. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of training records expiring within 30 days from the expiring_training view
2. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of overdue/expired training records
3. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL calculate the overall training compliance percentage from the training_compliance view
4. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the 5 employees with soonest expiring training
5. THE HSE_Dashboard SHALL display overdue training count with a RED alert indicator
6. THE HSE_Dashboard SHALL display compliance percentage with color coding (green >= 90%, yellow >= 70%, red < 70%)

### Requirement 4: PPE Status Metrics

**User Story:** As an HSE officer, I want to monitor PPE compliance, so that I can ensure all employees have proper protective equipment.

#### Acceptance Criteria

1. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of PPE items due for replacement from the ppe_replacement_due view
2. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the count of employees with incomplete PPE from the employee_ppe_status view
3. WHEN the HSE_Dashboard loads, THE HSE_Data_Service SHALL fetch the 5 most overdue PPE replacements
4. THE HSE_Dashboard SHALL display PPE replacement due count with appropriate alert indicators
5. THE HSE_Dashboard SHALL display PPE items overdue more than 30 days with a RED alert indicator

### Requirement 5: Recent Incidents List

**User Story:** As an HSE officer, I want to see recent incidents, so that I can quickly review and follow up on safety events.

#### Acceptance Criteria

1. THE HSE_Dashboard SHALL display a Recent Incidents list showing incident_number, title, severity, status, and incident_date
2. THE HSE_Dashboard SHALL display severity with color-coded badges (critical=red, major=orange, minor=yellow)
3. WHEN a user clicks on a recent incident, THE HSE_Dashboard SHALL navigate to that incident's detail page
4. THE HSE_Dashboard SHALL format dates using the centralized formatDate utility from lib/utils/format.ts

### Requirement 6: Quick Actions

**User Story:** As an HSE officer, I want quick access to common HSE tasks, so that I can efficiently manage safety activities.

#### Acceptance Criteria

1. THE HSE_Dashboard SHALL display a Quick Actions section with navigation links
2. WHEN a user clicks "Report Incident", THE HSE_Dashboard SHALL navigate to the incident creation page
3. WHEN a user clicks "View All Incidents", THE HSE_Dashboard SHALL navigate to the incidents list page
4. WHEN a user clicks "View Training Records", THE HSE_Dashboard SHALL navigate to the training records page
5. WHEN a user clicks "View PPE Status", THE HSE_Dashboard SHALL navigate to the PPE management page

### Requirement 7: Data Caching

**User Story:** As a system, I want to cache dashboard data, so that page loads are fast and database queries are minimized.

#### Acceptance Criteria

1. THE HSE_Data_Service SHALL use the Dashboard_Cache with a 5-minute TTL
2. WHEN cached data exists and is not expired, THE HSE_Data_Service SHALL return cached data without querying the database
3. WHEN cached data is expired or missing, THE HSE_Data_Service SHALL fetch fresh data and update the cache
4. THE HSE_Data_Service SHALL generate cache keys using the pattern 'hse-dashboard-metrics:{role}:{date}'

### Requirement 8: Role-Based Access Control

**User Story:** As a system administrator, I want to restrict dashboard access to authorized roles, so that sensitive HSE data is protected.

#### Acceptance Criteria

1. WHEN a user with role 'hse' accesses the HSE_Dashboard, THE HSE_Dashboard SHALL display the full dashboard
2. WHEN a user with role 'owner', 'director', or 'operations_manager' accesses the HSE_Dashboard, THE HSE_Dashboard SHALL display the full dashboard
3. WHEN a user with an unauthorized role accesses the HSE_Dashboard, THE HSE_Dashboard SHALL redirect to the default dashboard
4. IF a user is not authenticated, THEN THE HSE_Dashboard SHALL redirect to the login page

### Requirement 9: Mobile Responsiveness

**User Story:** As an HSE officer on site visits, I want to access the dashboard on mobile devices, so that I can monitor safety metrics from the field.

#### Acceptance Criteria

1. THE HSE_Dashboard SHALL display metrics in a responsive grid that adapts to screen size
2. WHEN viewed on mobile devices, THE HSE_Dashboard SHALL stack cards vertically for readability
3. THE HSE_Dashboard SHALL maintain touch-friendly tap targets (minimum 44px) for all interactive elements
4. THE HSE_Dashboard SHALL prioritize critical alerts (Days Since Last Incident, expired items) at the top on mobile view
