# Requirements Document

## Introduction

This feature implements a Terms & Conditions acceptance system for GAMA ERP. Users must accept the current version of Terms & Conditions before accessing any system features. The system tracks acceptance timestamps and T&C versions, requiring re-acceptance when terms are updated. This provides legal protection for PT. Gama Intisamudera.

## Glossary

- **T&C_System**: The Terms & Conditions acceptance and tracking system
- **T&C_Modal**: The dialog component that displays terms and requires user acceptance
- **T&C_Version**: A string identifier for the current version of Terms & Conditions
- **User_Profile**: The database record containing user information and T&C acceptance status
- **Acceptance_Record**: The combination of tc_accepted_at timestamp and tc_version stored in user_profiles

## Requirements

### Requirement 1: Database Schema Extension

**User Story:** As a system administrator, I want to track T&C acceptance in the database, so that we have a legal record of user consent.

#### Acceptance Criteria

1. THE T&C_System SHALL store tc_accepted_at as a TIMESTAMPTZ column in the user_profiles table
2. THE T&C_System SHALL store tc_version as a TEXT column in the user_profiles table
3. WHEN a user has not accepted T&C, THEN the tc_accepted_at column SHALL be NULL
4. WHEN a user accepts T&C, THEN the T&C_System SHALL record the current timestamp in tc_accepted_at
5. WHEN a user accepts T&C, THEN the T&C_System SHALL record the current TERMS_VERSION in tc_version

### Requirement 2: Terms Content Management

**User Story:** As a system administrator, I want to manage T&C content and versioning in code, so that I can update terms and force re-acceptance when needed.

#### Acceptance Criteria

1. THE T&C_System SHALL define a TERMS_VERSION constant in lib/terms-conditions.ts
2. THE T&C_System SHALL define TERMS_CONTENT as markdown text containing all required sections
3. THE TERMS_CONTENT SHALL include sections for: Acceptance of Terms, Authorized Use, User Responsibilities, Data Handling, Prohibited Actions, System Availability, Monitoring, Termination, Updates to Terms, and Contact
4. WHEN TERMS_VERSION is updated, THEN all users SHALL be required to re-accept the new terms

### Requirement 3: Terms & Conditions Modal

**User Story:** As a user, I want to view and accept Terms & Conditions in a clear modal dialog, so that I understand my obligations before using the system.

#### Acceptance Criteria

1. WHEN the T&C_Modal is displayed, THE T&C_System SHALL show the TERMS_CONTENT in a scrollable area
2. THE T&C_Modal SHALL include a checkbox for the user to confirm acceptance
3. THE T&C_Modal SHALL include an "Accept" button that is disabled until the checkbox is checked
4. THE T&C_Modal SHALL NOT be dismissible without accepting the terms (no close button, no backdrop click)
5. WHEN the user checks the acceptance checkbox and clicks Accept, THEN the T&C_System SHALL call the acceptTerms server action
6. IF the acceptTerms action fails, THEN the T&C_System SHALL display an error message to the user

### Requirement 4: Server Action for Acceptance

**User Story:** As a developer, I want a secure server action to record T&C acceptance, so that the acceptance is properly validated and stored.

#### Acceptance Criteria

1. THE acceptTerms server action SHALL update the user_profiles table with tc_accepted_at and tc_version
2. THE acceptTerms action SHALL use the current server timestamp for tc_accepted_at
3. THE acceptTerms action SHALL use the current TERMS_VERSION constant for tc_version
4. THE acceptTerms action SHALL verify the user is authenticated before updating
5. IF the user is not authenticated, THEN the acceptTerms action SHALL return an error
6. WHEN acceptance is recorded successfully, THEN the acceptTerms action SHALL return success

### Requirement 5: Layout Integration and Version Checking

**User Story:** As a user, I want to be prompted to accept T&C only when necessary, so that I'm not interrupted unnecessarily.

#### Acceptance Criteria

1. WHEN a user accesses any page in app/(main)/, THE T&C_System SHALL check if the user has accepted the current TERMS_VERSION
2. IF the user's tc_version matches the current TERMS_VERSION, THEN the T&C_Modal SHALL NOT be displayed
3. IF the user's tc_version does not match the current TERMS_VERSION, THEN the T&C_Modal SHALL be displayed
4. IF the user's tc_accepted_at is NULL, THEN the T&C_Modal SHALL be displayed
5. WHILE the T&C_Modal is displayed, THE T&C_System SHALL prevent access to other system features
6. WHEN the user successfully accepts T&C, THEN the T&C_Modal SHALL close and the user SHALL access the system normally

### Requirement 6: First Login Experience

**User Story:** As a new user, I want to see and accept Terms & Conditions on my first login, so that I'm aware of my obligations from the start.

#### Acceptance Criteria

1. WHEN a new user logs in for the first time, THE T&C_System SHALL display the T&C_Modal
2. THE T&C_Modal SHALL be the first interaction required before accessing any features
3. WHEN the new user accepts T&C, THEN the T&C_System SHALL record the acceptance and allow system access
