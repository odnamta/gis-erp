# Requirements Document

## Introduction

This document defines the requirements for the Guided Tours system (v0.37) in Gama ERP. The system provides interactive step-by-step tutorials that walk users through key workflows using tooltips and element highlighting. Tours help new users learn the system and serve as refresher training for existing users.

## Glossary

- **Guided_Tour**: A predefined sequence of instructional steps that guide users through a specific workflow or feature
- **Tour_Step**: A single instruction within a tour, consisting of a target element, title, content, and placement
- **Tour_Progress**: A record tracking a user's advancement through a specific tour
- **Tour_Launcher**: The UI page where users can browse and start available tours
- **Tour_Tooltip**: The floating UI component that displays step instructions and navigation controls
- **Target_Element**: The DOM element that a tour step highlights and references

## Requirements

### Requirement 1: Tour Data Storage

**User Story:** As a system administrator, I want tour definitions stored in the database, so that tours can be managed and updated without code deployments.

#### Acceptance Criteria

1. THE Database SHALL store tour definitions in a `guided_tours` table with fields: id, tour_code, tour_name, description, applicable_roles, start_route, steps (JSONB), estimated_minutes, is_active, display_order, created_at
2. THE Database SHALL store user progress in a `user_tour_progress` table with fields: id, user_id, tour_id, status, current_step, started_at, completed_at
3. THE Database SHALL enforce unique constraint on tour_code in guided_tours table
4. THE Database SHALL enforce unique constraint on (user_id, tour_id) combination in user_tour_progress table
5. WHEN a tour is created, THE System SHALL set default values: is_active=true, display_order=0, steps=[]

### Requirement 2: Default Tours

**User Story:** As a new user, I want pre-configured tours for common workflows, so that I can learn the system immediately without waiting for custom tours to be created.

#### Acceptance Criteria

1. THE System SHALL include a "Dashboard Overview" tour for all roles covering dashboard navigation (~3 min)
2. THE System SHALL include a "Creating a Quotation" tour for owner, admin, and sales roles (~5 min)
3. THE System SHALL include a "Managing Invoices" tour for owner, admin, and finance roles (~4 min)
4. THE System SHALL include a "Cash Disbursement (BKK)" tour for owner, admin, ops, and finance roles (~5 min)
5. WHEN default tours are inserted, THE System SHALL configure appropriate applicable_roles arrays for each tour

### Requirement 3: Tour Launcher Page

**User Story:** As a user, I want a dedicated page to browse and start tours, so that I can choose which workflows to learn.

#### Acceptance Criteria

1. WHEN a user visits /help/tours, THE Tour_Launcher SHALL display all tours applicable to the user's role
2. THE Tour_Launcher SHALL display for each tour: name, description, estimated duration, and completion status
3. WHEN a tour has status 'not_started', THE Tour_Launcher SHALL show a "Start Tour" button
4. WHEN a tour has status 'in_progress', THE Tour_Launcher SHALL show current step progress and a "Continue" button
5. WHEN a tour has status 'completed', THE Tour_Launcher SHALL display a checkmark indicator
6. THE Tour_Launcher SHALL order tours by display_order field

### Requirement 4: Tour Step Display

**User Story:** As a user taking a tour, I want clear visual guidance showing me where to look and what to do, so that I can follow along easily.

#### Acceptance Criteria

1. WHEN a tour step is active, THE Tour_Tooltip SHALL appear positioned relative to the target element based on the placement property (top, bottom, left, right)
2. WHEN a tour step is active, THE System SHALL visually highlight the target element
3. THE Tour_Tooltip SHALL display: step number, total steps, step title, and step content
4. THE Tour_Tooltip SHALL provide navigation buttons: Back (except on first step), Skip Tour, and Next (or Finish on last step)
5. IF the target element does not exist on the page, THEN THE System SHALL skip to the next step or show an error message

### Requirement 5: Tour Navigation

**User Story:** As a user taking a tour, I want to control my progress through the tour, so that I can learn at my own pace.

#### Acceptance Criteria

1. WHEN a user clicks "Next", THE System SHALL advance to the next step and update progress in the database
2. WHEN a user clicks "Back", THE System SHALL return to the previous step
3. WHEN a user clicks "Skip Tour", THE System SHALL mark the tour as 'skipped' and close the tour
4. WHEN a user completes the final step, THE System SHALL mark the tour as 'completed' with completed_at timestamp
5. WHEN a step has a nextRoute property, THE System SHALL navigate to that route before showing the step

### Requirement 6: Tour Persistence

**User Story:** As a user, I want my tour progress saved automatically, so that I can resume where I left off if I navigate away or close the browser.

#### Acceptance Criteria

1. WHEN a user starts a tour, THE System SHALL create or update a progress record with status 'in_progress' and started_at timestamp
2. WHEN a user advances a step, THE System SHALL update the current_step in the progress record
3. WHEN a user returns to the Tour_Launcher, THE System SHALL show accurate progress for all tours
4. WHEN a user clicks "Continue" on an in-progress tour, THE System SHALL resume from the saved current_step

### Requirement 7: Role-Based Tour Filtering

**User Story:** As a user, I want to only see tours relevant to my role, so that I don't waste time on features I can't access.

#### Acceptance Criteria

1. WHEN fetching available tours, THE System SHALL filter tours where applicable_roles contains the user's role
2. WHEN a tour's applicable_roles is empty, THE System SHALL make it available to all roles
3. THE System SHALL not display inactive tours (is_active=false) to users

### Requirement 8: Tour Integration with Onboarding

**User Story:** As a new user, I want guided tours suggested as part of my onboarding, so that I have a structured learning path.

#### Acceptance Criteria

1. WHEN a user completes onboarding, THE System SHALL suggest relevant tours based on their role
2. THE Onboarding_Widget MAY display a link to the Tour_Launcher page
