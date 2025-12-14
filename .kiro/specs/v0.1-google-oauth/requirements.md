# Requirements Document

## Introduction

This feature implements Google OAuth authentication for Gama ERP using Supabase Auth. It provides secure user authentication, route protection, and session management for the logistics management system. Only authorized users with Google accounts can access the application.

## Glossary

- **Gama ERP**: The logistics management system for PT. Gama Intisamudera
- **OAuth**: Open Authorization protocol for secure delegated access
- **Supabase Auth**: Authentication service provided by Supabase using PostgreSQL
- **Session**: A user's authenticated state maintained across requests
- **Protected Route**: A URL path that requires authentication to access
- **Callback URL**: The endpoint that receives the OAuth response from Google

## Requirements

### Requirement 1

**User Story:** As a user, I want to sign in with my Google account, so that I can access the Gama ERP system securely without creating a separate password.

#### Acceptance Criteria

1. WHEN a user visits the login page THEN the Gama ERP System SHALL display a "Sign in with Google" button prominently on the page
2. WHEN a user clicks the "Sign in with Google" button THEN the Gama ERP System SHALL initiate the Google OAuth flow via Supabase Auth
3. WHEN the Google OAuth popup appears THEN the Gama ERP System SHALL allow the user to select their Google account
4. WHEN a user successfully authenticates with Google THEN the Gama ERP System SHALL redirect the user to the dashboard page
5. IF the Google OAuth flow fails THEN the Gama ERP System SHALL display a user-friendly error message on the login page

### Requirement 2

**User Story:** As an authenticated user, I want to see my identity in the application header, so that I can confirm I am logged in with the correct account.

#### Acceptance Criteria

1. WHEN an authenticated user views any protected page THEN the Gama ERP System SHALL display the user's name from their Google profile in the header
2. WHEN an authenticated user views any protected page THEN the Gama ERP System SHALL display the user's avatar image from their Google profile in the header
3. WHEN the user's avatar image fails to load THEN the Gama ERP System SHALL display a fallback with the user's initials

### Requirement 3

**User Story:** As an authenticated user, I want to sign out of the application, so that I can secure my session when I'm done working.

#### Acceptance Criteria

1. WHEN an authenticated user is on any protected page THEN the Gama ERP System SHALL display a logout button or menu option
2. WHEN a user clicks the logout button THEN the Gama ERP System SHALL terminate the user's session via Supabase Auth
3. WHEN a user's session is terminated THEN the Gama ERP System SHALL redirect the user to the login page
4. WHEN a user logs out THEN the Gama ERP System SHALL clear all session data from the browser

### Requirement 4

**User Story:** As a system administrator, I want all application routes protected except the login page, so that unauthorized users cannot access sensitive business data.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access any route other than /login or /auth/callback THEN the Gama ERP System SHALL redirect the user to the login page
2. WHEN an authenticated user attempts to access the login page THEN the Gama ERP System SHALL redirect the user to the dashboard page
3. WHEN a user's session expires THEN the Gama ERP System SHALL redirect the user to the login page on the next request

### Requirement 5

**User Story:** As a user, I want visual feedback during authentication, so that I know the system is processing my request.

#### Acceptance Criteria

1. WHEN the OAuth flow is in progress THEN the Gama ERP System SHALL display a loading indicator on the sign-in button
2. WHEN the OAuth callback is processing THEN the Gama ERP System SHALL display a loading state to the user
3. WHEN redirecting after successful authentication THEN the Gama ERP System SHALL maintain the loading state until the dashboard loads
