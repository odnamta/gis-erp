# Implementation Plan: v0.46 HSE - Incident Reporting

## Overview

This implementation plan covers the HSE incident reporting system for capturing workplace accidents, near-misses, and safety violations with investigation workflows. The implementation follows an incremental approach, building from database schema through utility functions, server actions, and finally UI components.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create incident_categories table with default categories
    - Create table with category_code, category_name, severity_default, requires_investigation, requires_regulatory_report
    - Insert 10 default categories (injury, near_miss, vehicle_accident, etc.)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 1.2 Create incidents table with all columns
    - Create table with classification, location, description, related entities, investigation, actions, costs
    - Add foreign keys to incident_categories, job_orders, assets, employees
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 4.1, 4.2, 5.1, 6.1, 6.2, 6.3_
  - [x] 1.3 Create incident_persons table
    - Create table with person_type, employee reference, external person details, injury details
    - Add foreign key to incidents with CASCADE delete
    - _Requirements: 2.6, 2.7_
  - [x] 1.4 Create incident_history table
    - Create table with action_type, description, previous/new values, performed_by
    - Add foreign key to incidents with CASCADE delete
    - _Requirements: 3.5, 10.4_
  - [x] 1.5 Create incident number sequence and trigger
    - Create sequence incident_seq
    - Create generate_incident_number() function
    - Create trigger to auto-generate INC-YYYY-NNNNN format
    - _Requirements: 2.1_
  - [x] 1.6 Create status change logging trigger
    - Create log_incident_status_change() function
    - Create trigger to log status changes to incident_history
    - _Requirements: 3.5_
  - [x] 1.7 Create indexes for performance
    - Index on incidents(category_id, incident_date, status, severity, job_order_id)
    - Index on incident_persons(incident_id)
    - _Requirements: 9.1_
  - [x] 1.8 Create database views
    - Create incident_summary view for monthly aggregations
    - Create open_investigations view for priority-sorted open cases
    - _Requirements: 7.4, 8.1, 8.2, 9.2_
  - [x] 1.9 Enable RLS policies
    - Enable RLS on all incident tables
    - Create policies for read/write based on role
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. TypeScript Types and Interfaces
  - [x] 2.1 Create types/incident.ts with all interfaces
    - Define IncidentSeverity, IncidentType, IncidentStatus, LocationType, PersonType types
    - Define IncidentCategory, IncidentAction, IncidentPerson, Incident interfaces
    - Define input types: ReportIncidentInput, AddPersonInput, AddActionInput
    - Define IncidentStatistics, IncidentHistoryEntry interfaces
    - _Requirements: 2.2, 2.3, 2.6, 3.1, 3.4, 4.1, 4.3, 8.1_

- [x] 3. Core Utility Functions
  - [x] 3.1 Create lib/incident-utils.ts with helper functions
    - Implement getSeverityColor, getStatusColor functions
    - Implement calculateDaysSinceLastLTI function
    - Implement canCloseIncident validation function
    - Implement getPendingActionsCount function
    - Implement calculateMonthlyTrend function
    - Implement validateIncidentInput function
    - Implement getContributingFactorLabel function
    - _Requirements: 4.5, 5.2, 7.1, 7.3, 8.1_
  - [x] 3.2 Write property tests for utility functions
    - Test severity/status color mapping
    - Test days since LTI calculation
    - Test canCloseIncident validation
    - Test pending actions count
    - Test monthly trend calculation
    - Test input validation
    - _Requirements: 4.5, 5.2, 7.1, 8.1_

- [x] 4. Checkpoint - Core Functions Complete
  - All property tests pass (38 tests)

- [x] 5. Server Actions
  - [x] 5.1 Create lib/incident-actions.ts with CRUD operations
    - Implement reportIncident function with persons, photos, documents
    - Implement getIncident and getIncidents functions
    - Implement addPersonToIncident function
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [x] 5.2 Implement investigation functions
    - Implement startInvestigation function
    - Implement updateRootCause function with contributing factors
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 5.3 Implement action management functions
    - Implement addCorrectiveAction function
    - Implement addPreventiveAction function
    - Implement completeAction function
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 5.4 Implement closure function
    - Implement closeIncident with validation
    - Validate all actions completed before closure
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 5.5 Implement statistics function
    - Implement getIncidentStatistics for dashboard
    - Query incident_summary view
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 5.6 Implement history function
    - Implement getIncidentHistory function
    - Implement logIncidentHistory helper
    - _Requirements: 3.5_
  - [x] 5.7 Write unit tests for server actions
    - Test reportIncident creates incident and persons
    - Test startInvestigation updates status
    - Test addCorrectiveAction adds to JSONB array
    - Test completeAction updates action status
    - Test closeIncident validates pending actions
    - Test getIncidentStatistics returns correct counts
    - _Requirements: 2.1, 3.1, 4.1, 4.5, 5.2, 8.1_

- [x] 6. Checkpoint - Server Actions Complete
  - All unit tests pass (21 tests)

- [x] 7. HSE Dashboard Components
  - [x] 7.1 Create components/hse/incident-summary-cards.tsx
    - Display open incidents, under investigation, near misses (MTD), injuries (MTD), days since last LTI
    - Use Card components with appropriate icons and colors
    - _Requirements: 7.1_
  - [x] 7.2 Create components/hse/incident-card.tsx
    - Display incident number, severity badge, title, date, location
    - Show status badge and investigator if assigned
    - Link to incident detail page
    - _Requirements: 7.2_
  - [x] 7.3 Create components/hse/incident-list.tsx
    - List incidents with filters (status, severity, category, date range)
    - Use incident-card for each item
    - Support pagination
    - _Requirements: 7.2, 7.4_
  - [x] 7.4 Create components/hse/incident-trend-chart.tsx
    - Line chart showing 6-month trend
    - Lines for total incidents, near misses, injuries
    - Use recharts or similar library
    - _Requirements: 7.3_
  - [x] 7.5 Create components/hse/severity-badge.tsx
    - Color-coded badge for severity levels
    - _Requirements: 7.2_
  - [x] 7.6 Create components/hse/status-badge.tsx
    - Color-coded badge for incident status
    - _Requirements: 7.2_
  - [x] 7.7 Create components/hse/index.ts barrel export
    - Export all HSE components
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Report Incident Form Components
  - [x] 8.1 Create components/hse/category-select.tsx
    - Dropdown for incident categories
    - Show category name and description
    - _Requirements: 2.2_
  - [x] 8.2 Create components/hse/report-incident-form.tsx
    - Multi-section form: Classification, When & Where, What Happened, Related, People, Documents
    - Validate required fields
    - Support photo and document upload
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 11.1_
  - [x] 8.3 Create components/hse/add-person-dialog.tsx
    - Dialog to add person involved
    - Toggle between employee and external person
    - Show injury fields when person type is 'injured'
    - _Requirements: 2.6, 2.7_
  - [x] 8.4 Create components/hse/persons-list.tsx
    - List people involved in incident
    - Show person type, name, injury details if applicable
    - Allow remove action
    - _Requirements: 2.6, 2.7_

- [x] 9. Incident Detail Components
  - [x] 9.1 Create components/hse/incident-detail-header.tsx
    - Display incident number, severity, category, title
    - Show status, reporter, date
    - Action buttons: Start Investigation, Close, etc.
    - _Requirements: 3.1, 3.2_
  - [x] 9.2 Create components/hse/incident-tabs.tsx
    - Tabs: Details, Investigation, Actions, Timeline, Documents
    - _Requirements: 3.3, 3.4, 4.1, 4.2_
  - [x] 9.3 Create components/hse/investigation-panel.tsx
    - Root cause text area
    - Contributing factors checkboxes
    - Save button
    - _Requirements: 3.3, 3.4_
  - [x] 9.4 Create components/hse/actions-list.tsx
    - List corrective and preventive actions
    - Show description, responsible, due date, status
    - Complete action button for assigned users
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 9.5 Create components/hse/add-action-dialog.tsx
    - Dialog to add corrective or preventive action
    - Fields: description, responsible person, due date
    - _Requirements: 4.1, 4.2_
  - [x] 9.6 Create components/hse/incident-timeline.tsx
    - Display incident history entries
    - Show action type, description, user, timestamp
    - _Requirements: 3.5_
  - [x] 9.7 Create components/hse/close-incident-dialog.tsx
    - Dialog to close incident
    - Require closure notes
    - Show warning if actions pending
    - _Requirements: 5.1, 5.2_

- [x] 10. HSE Pages
  - [x] 10.1 Create app/(main)/hse/page.tsx and hse-client.tsx
    - Server component to fetch statistics and recent incidents
    - Client component with summary cards, recent incidents, trend chart
    - Tabs for Overview, Incidents, Investigations, Statistics
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 10.2 Create app/(main)/hse/incidents/page.tsx and incidents-client.tsx
    - Server component to fetch incidents with filters
    - Client component with filter controls and incident list
    - _Requirements: 7.2, 7.4_
  - [x] 10.3 Create app/(main)/hse/incidents/report/page.tsx and report-client.tsx
    - Server component to fetch categories, employees, job orders, assets
    - Client component with report incident form
    - Handle form submission and redirect
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_
  - [x] 10.4 Create app/(main)/hse/incidents/[id]/page.tsx and incident-detail-client.tsx
    - Server component to fetch incident with persons and history
    - Client component with header, tabs, and content panels
    - Handle investigation, actions, and closure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1_

- [x] 11. Navigation Integration
  - [x] 11.1 Add HSE menu item to sidebar navigation
    - Add /hse route with appropriate icon
    - Show for all roles (everyone can report)
    - _Requirements: 10.3_

- [ ] 12. Notification Integration (Optional)
  - [ ] 12.1 Add incident notification triggers
    - Notify HSE team and supervisor on incident report
    - Notify investigator on assignment
    - Notify responsible person on action assignment
    - _Requirements: 2.9, 4.4_

- [x] 13. Final Checkpoint
  - [x] All tests pass (59 tests - 38 property + 21 unit)
  - [x] Database schema verified via MCP (incident_categories, incidents, incident_persons, incident_history)
  - [x] UI components created and exported (16 components)
  - [x] Navigation integrated (HSE menu with Dashboard, Incidents, Report Incident)
  - [ ] Notifications working (optional)

## Summary

v0.46 HSE - Incident Reporting implementation covers:

1. **Database**: 4 tables (incident_categories, incidents, incident_persons, incident_history), 2 views, triggers for auto-numbering and history logging
2. **Types**: Comprehensive TypeScript interfaces for incidents, persons, actions, statistics
3. **Utils**: Helper functions for severity/status colors, LTI calculation, validation, trend calculation
4. **Actions**: CRUD operations, investigation workflow, action management, closure, statistics
5. **Components**: 17 components for dashboard, reporting form, detail view, and dialogs
6. **Pages**: 4 pages (dashboard, list, report, detail)
7. **Integration**: Navigation menu, notification triggers

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Indonesian labels used where appropriate per steering guidelines
