# Requirements Document

## Introduction

The Onboarding Checklist System provides a step-by-step guidance experience for new users of GAMA ERP. It introduces users to essential setup tasks and key features based on their role, helping them become productive quickly. The system tracks progress, provides visual feedback, and offers gamification elements (points) to encourage completion.

## Glossary

- **Onboarding_Step**: A single task or action that a user should complete as part of their onboarding journey
- **Onboarding_Progress**: The tracking record of a user's status on a specific onboarding step
- **Onboarding_Status**: The summary of a user's overall onboarding completion state
- **Completion_Type**: The method by which a step is marked complete (manual, auto_route, auto_action, auto_count)
- **Category**: A grouping of related onboarding steps (profile, explore, first_action, advanced)
- **Widget**: A compact UI component displayed on the dashboard showing onboarding progress
- **Points**: Gamification rewards earned by completing onboarding steps

## Requirements

### Requirement 1: Database Schema for Onboarding Steps

**User Story:** As a system administrator, I want to define onboarding steps with role-specific visibility and completion criteria, so that each user sees relevant guidance for their role.

#### Acceptance Criteria

1. THE Onboarding_System SHALL store step definitions with code, name, description, category, and order
2. THE Onboarding_System SHALL support role-based filtering via an applicable_roles array field
3. THE Onboarding_System SHALL support four completion types: manual, auto_route, auto_action, and auto_count
4. WHEN a step has completion_type of auto_route, THE Onboarding_System SHALL store the completion_route to track
5. WHEN a step has completion_type of auto_count, THE Onboarding_System SHALL store completion_table and completion_count
6. THE Onboarding_System SHALL store UI hints including icon, action_label, and action_route for each step
7. THE Onboarding_System SHALL support points and is_required flags for each step

### Requirement 2: User Onboarding Progress Tracking

**User Story:** As a user, I want my onboarding progress to be tracked automatically, so that I can see which steps I've completed and what's remaining.

#### Acceptance Criteria

1. THE Onboarding_System SHALL create progress records for each applicable step when a user is created
2. THE Onboarding_System SHALL track status as pending, in_progress, completed, or skipped for each step
3. WHEN a step is completed, THE Onboarding_System SHALL record the completed_at timestamp
4. WHEN a step has completion_type of auto_count, THE Onboarding_System SHALL track current_count
5. THE Onboarding_System SHALL maintain a summary record with total_steps, completed_steps, and total_points
6. WHEN all steps are completed or skipped, THE Onboarding_System SHALL mark is_onboarding_complete as true

### Requirement 3: Automatic Progress Initialization

**User Story:** As a new user, I want my onboarding to be automatically initialized based on my role, so that I see relevant steps immediately upon first login.

#### Acceptance Criteria

1. WHEN a new user_profile is created, THE Onboarding_System SHALL automatically create onboarding_status record
2. WHEN a new user_profile is created, THE Onboarding_System SHALL create progress entries for all applicable steps based on user role
3. THE Onboarding_System SHALL calculate and store total_steps count in the status record
4. THE Onboarding_System SHALL order progress entries by step_order

### Requirement 4: Route Visit Tracking for Auto-Completion

**User Story:** As a user, I want my onboarding steps to complete automatically when I visit certain pages, so that I don't have to manually mark exploration tasks as done.

#### Acceptance Criteria

1. WHEN a user visits a route matching a step's completion_route, THE Onboarding_System SHALL mark that step as completed
2. THE Onboarding_System SHALL only auto-complete steps with completion_type of auto_route
3. THE Onboarding_System SHALL only auto-complete steps that are currently pending
4. WHEN a step is auto-completed, THE Onboarding_System SHALL award the step's points to the user

### Requirement 5: Action Tracking for Count-Based Completion

**User Story:** As a user, I want my "first action" steps to complete automatically when I create records, so that my progress reflects my actual usage.

#### Acceptance Criteria

1. WHEN a user creates a record in a tracked table, THE Onboarding_System SHALL increment current_count for matching steps
2. WHEN current_count reaches completion_count, THE Onboarding_System SHALL mark the step as completed
3. WHEN current_count is incremented but not yet at completion_count, THE Onboarding_System SHALL set status to in_progress
4. THE Onboarding_System SHALL only track create actions, not updates or deletes

### Requirement 6: Onboarding Widget Display

**User Story:** As a user, I want to see a compact onboarding widget on my dashboard, so that I can track my progress and access next steps quickly.

#### Acceptance Criteria

1. WHEN show_onboarding_widget is true, THE Dashboard SHALL display the onboarding widget
2. THE Widget SHALL display overall progress as a percentage and progress bar
3. THE Widget SHALL display the next 2-3 pending steps with action buttons
4. WHEN a user clicks an action button, THE Widget SHALL navigate to the step's action_route
5. THE Widget SHALL provide a "Hide" button to dismiss the widget
6. THE Widget SHALL provide a "View All Steps" link to the full onboarding page

### Requirement 7: Full Onboarding Checklist Page

**User Story:** As a user, I want to view all my onboarding steps on a dedicated page, so that I can see my complete progress and access any step.

#### Acceptance Criteria

1. THE Onboarding_Page SHALL display all steps grouped by category
2. THE Onboarding_Page SHALL show completed steps with checkmarks and completion dates
3. THE Onboarding_Page SHALL show pending steps with action buttons
4. THE Onboarding_Page SHALL display overall progress bar and points earned
5. THE Onboarding_Page SHALL provide a "Skip Onboarding" button to mark all pending steps as skipped
6. THE Onboarding_Page SHALL provide an "I'll continue later" button to return to dashboard

### Requirement 8: Skip and Hide Functionality

**User Story:** As a user, I want to skip onboarding or hide the widget, so that I can use the system without being prompted if I prefer.

#### Acceptance Criteria

1. WHEN a user clicks "Skip Onboarding", THE Onboarding_System SHALL mark all pending steps as skipped
2. WHEN a user skips onboarding, THE Onboarding_System SHALL set is_onboarding_complete to true
3. WHEN a user skips onboarding, THE Onboarding_System SHALL hide the onboarding widget
4. WHEN a user clicks "Hide" on the widget, THE Onboarding_System SHALL set show_onboarding_widget to false
5. WHEN the widget is hidden, THE Onboarding_System SHALL NOT display it on the dashboard

### Requirement 9: Points and Progress Calculation

**User Story:** As a user, I want to earn points for completing onboarding steps, so that I feel rewarded for learning the system.

#### Acceptance Criteria

1. WHEN a step is completed, THE Onboarding_System SHALL add the step's points to total_points
2. THE Onboarding_System SHALL calculate percent_complete as (completed_steps / total_steps) * 100
3. THE Onboarding_System SHALL NOT award points for skipped steps
4. THE Onboarding_System SHALL display points earned on both widget and full page

### Requirement 10: Role-Specific Step Filtering

**User Story:** As a user with a specific role, I want to see only onboarding steps relevant to my role, so that I'm not confused by irrelevant tasks.

#### Acceptance Criteria

1. THE Onboarding_System SHALL filter steps where user's role is in applicable_roles array
2. WHEN a sales user logs in, THE Onboarding_System SHALL show quotation and customer-related steps
3. WHEN a finance user logs in, THE Onboarding_System SHALL show invoice and payment-related steps
4. WHEN an ops user logs in, THE Onboarding_System SHALL show job order and delivery-related steps
5. THE Onboarding_System SHALL show common steps (profile, dashboard) to all roles
