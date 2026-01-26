# Requirements Document

## Introduction

This document specifies the requirements for the Welcome Flow feature (v0.86) in GAMA ERP. The feature provides a welcoming first-login experience with role-specific guidance for new users. After accepting Terms & Conditions, users see a welcome modal that explains their role capabilities and provides quick action buttons to help them get started. The modal only appears once per user.

## Glossary

- **Welcome_Modal**: A dismissible dialog component that displays role-specific welcome content and quick action buttons
- **Quick_Action**: A button within the Welcome_Modal that links to a relevant page based on the user's role
- **Welcome_Content**: Role-specific data structure containing title, description, and quick actions for each user role
- **User_Profile**: The database record containing user information including role and welcome_shown_at timestamp
- **Role**: The user's assigned role in the system (owner, director, finance_manager, etc.)

## Requirements

### Requirement 1: Database Schema Extension

**User Story:** As a system administrator, I want to track when users have seen the welcome modal, so that we don't show it repeatedly.

#### Acceptance Criteria

1. THE Database_Schema SHALL include a welcome_shown_at column of type TIMESTAMPTZ in the user_profiles table
2. WHEN a user has not seen the welcome modal, THE welcome_shown_at column SHALL be NULL
3. WHEN a user dismisses the welcome modal, THE System SHALL store the current timestamp in welcome_shown_at

### Requirement 2: Welcome Content Definition

**User Story:** As a user, I want to see welcome content specific to my role, so that I understand what I can do in the system.

#### Acceptance Criteria

1. THE Welcome_Content SHALL define role-specific content for all 15 roles: owner, director, sysadmin, marketing_manager, finance_manager, operations_manager, administration, finance, marketing, ops, engineer, hr, hse, agency, customs
2. WHEN a role does not have specific content defined, THE System SHALL display default welcome content
3. THE Welcome_Content for each role SHALL include a title, description, and 2-3 quick actions
4. THE Quick_Action for each role SHALL include a label, href (destination URL), and description

### Requirement 3: Welcome Modal Display Logic

**User Story:** As a new user, I want to see a welcome modal after accepting Terms & Conditions, so that I can learn about my role capabilities.

#### Acceptance Criteria

1. WHEN a user has accepted Terms & Conditions AND welcome_shown_at is NULL, THE System SHALL display the Welcome_Modal
2. WHEN a user has a non-NULL welcome_shown_at timestamp, THE System SHALL NOT display the Welcome_Modal
3. WHEN the Welcome_Modal is displayed, THE System SHALL show the role-specific title and description
4. WHEN the Welcome_Modal is displayed, THE System SHALL show 2-3 quick action buttons based on the user's role

### Requirement 4: Welcome Modal Interaction

**User Story:** As a user, I want to dismiss the welcome modal or click quick actions, so that I can start using the system.

#### Acceptance Criteria

1. WHEN a user clicks the dismiss button, THE System SHALL close the Welcome_Modal and record the timestamp
2. WHEN a user clicks a Quick_Action button, THE System SHALL navigate to the specified href AND close the Welcome_Modal AND record the timestamp
3. WHEN the Welcome_Modal is dismissed, THE System SHALL update welcome_shown_at in the user_profiles table
4. IF the database update fails, THEN THE System SHALL display an error message and keep the modal open

### Requirement 5: Server Action for Recording Welcome Shown

**User Story:** As a developer, I want a server action to record when the welcome modal was shown, so that the timestamp is securely stored.

#### Acceptance Criteria

1. THE markWelcomeShown server action SHALL update the welcome_shown_at column with the current server timestamp
2. WHEN the user is not authenticated, THE markWelcomeShown action SHALL return an error
3. WHEN the database update succeeds, THE markWelcomeShown action SHALL return success
4. WHEN the database update fails, THE markWelcomeShown action SHALL return an error with a descriptive message

### Requirement 6: Integration with Main Layout

**User Story:** As a user, I want the welcome flow to integrate seamlessly after T&C acceptance, so that my onboarding experience is smooth.

#### Acceptance Criteria

1. THE Welcome_Modal SHALL be displayed after the Terms & Conditions modal is accepted (not simultaneously)
2. WHEN both T&C acceptance and welcome modal are needed, THE System SHALL show T&C first, then welcome modal
3. THE Welcome_Modal SHALL be dismissible (unlike the T&C modal which is non-dismissible)
4. WHEN the Welcome_Modal is open, THE System SHALL allow backdrop click or escape key to dismiss it
