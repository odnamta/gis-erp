# Requirements Document

## Introduction

A user-friendly feedback system allowing team members to report bugs and request improvements directly from the Gama ERP application. The system features automatic context capture, screenshot support, and a centralized review dashboard for administrators. This enables efficient collection, tracking, and prioritization of issues without relying on informal communication channels.

## Glossary

- **Feedback_System**: The overall system for collecting, managing, and resolving user feedback
- **Feedback_Submission**: A single bug report, improvement request, question, or other feedback item
- **Ticket_Number**: Auto-generated unique identifier for each submission (BUG-XXXXX or REQ-XXXXX)
- **Feedback_Button**: The floating UI element that opens the feedback modal
- **Feedback_Modal**: The dialog interface for submitting feedback
- **Admin_Dashboard**: The administrative interface for reviewing and managing all feedback
- **Browser_Context**: Automatically captured information about the user's environment
- **Screenshot_Capture**: Functionality to capture the current screen state

## Requirements

### Requirement 1: Floating Feedback Button

**User Story:** As a user, I want a persistent feedback button visible on all pages, so that I can quickly report issues or request improvements from anywhere in the application.

#### Acceptance Criteria

1. THE Feedback_Button SHALL be displayed as a fixed-position circular button in the bottom-right corner of the viewport
2. THE Feedback_Button SHALL remain visible across all authenticated pages of the application
3. WHEN a user clicks the Feedback_Button, THE Feedback_System SHALL open the Feedback_Modal
4. THE Feedback_Button SHALL display a badge showing the count of the user's open tickets
5. WHEN the user has zero open tickets, THE Feedback_Button SHALL hide the badge
6. THE Feedback_Button SHALL have a z-index high enough to overlay other UI elements including modals

### Requirement 2: Bug Report Submission

**User Story:** As a user, I want to report bugs with detailed information, so that developers can understand and fix issues quickly.

#### Acceptance Criteria

1. WHEN a user selects the Bug Report tab, THE Feedback_Modal SHALL display bug-specific form fields
2. THE Feedback_Modal SHALL require the user to select a severity level (critical, high, medium, low)
3. THE Feedback_Modal SHALL require a title field with a maximum of 200 characters
4. THE Feedback_Modal SHALL require a description field explaining what happened
5. THE Feedback_Modal SHALL provide an optional steps-to-reproduce field
6. THE Feedback_Modal SHALL provide optional expected-behavior and actual-behavior fields
7. WHEN a user submits a bug report, THE Feedback_System SHALL generate a ticket number with format BUG-XXXXX
8. WHEN a user submits a bug report with empty title, THE Feedback_System SHALL prevent submission and display a validation error

### Requirement 3: Improvement Request Submission

**User Story:** As a user, I want to request feature improvements with context about current limitations, so that my suggestions can be properly evaluated.

#### Acceptance Criteria

1. WHEN a user selects the Improvement Request tab, THE Feedback_Modal SHALL display improvement-specific form fields
2. THE Feedback_Modal SHALL provide a module/area selection dropdown
3. THE Feedback_Modal SHALL require a title field describing the desired improvement
4. THE Feedback_Modal SHALL provide a current-behavior field explaining how it works now
5. THE Feedback_Modal SHALL require a desired-behavior field explaining the requested change
6. THE Feedback_Modal SHALL provide an optional business-justification field
7. THE Feedback_Modal SHALL allow the user to suggest a priority level (urgent, high, medium, low)
8. WHEN a user submits an improvement request, THE Feedback_System SHALL generate a ticket number with format REQ-XXXXX

### Requirement 4: Screenshot Capture and Upload

**User Story:** As a user, I want to attach screenshots to my feedback, so that I can visually demonstrate the issue or desired change.

#### Acceptance Criteria

1. THE Feedback_Modal SHALL provide a "Capture Screenshot" button
2. WHEN a user clicks Capture Screenshot, THE Feedback_System SHALL capture the current page state using html2canvas
3. THE Feedback_Modal SHALL temporarily close during screenshot capture to exclude itself from the image
4. THE Feedback_Modal SHALL provide an "Upload" button for manually uploading image files
5. THE Feedback_Modal SHALL display thumbnail previews of all attached screenshots
6. WHEN a user clicks the remove button on a screenshot thumbnail, THE Feedback_System SHALL remove that screenshot from the submission
7. THE Feedback_System SHALL upload screenshots to Supabase storage with public URLs
8. THE Feedback_System SHALL support multiple screenshots per submission

### Requirement 5: Automatic Context Capture

**User Story:** As a user, I want the system to automatically capture technical context, so that I don't have to manually provide browser and page information.

#### Acceptance Criteria

1. WHEN the Feedback_Modal opens, THE Feedback_System SHALL capture the current page URL
2. THE Feedback_System SHALL capture the page title
3. THE Feedback_System SHALL detect and record the current module based on the URL path
4. THE Feedback_System SHALL capture browser information including name, version, and platform
5. THE Feedback_System SHALL capture the screen resolution
6. THE Feedback_System SHALL capture the user's name, email, role, and department
7. THE Feedback_Modal SHALL display the auto-captured information to the user before submission
8. THE Feedback_System SHALL store all captured context with the submission

### Requirement 6: Ticket Number Generation

**User Story:** As a system administrator, I want unique ticket numbers for all feedback, so that submissions can be easily referenced and tracked.

#### Acceptance Criteria

1. THE Feedback_System SHALL auto-generate ticket numbers using a database sequence
2. WHEN a bug report is created, THE Feedback_System SHALL assign a ticket number with format BUG-XXXXX (5-digit zero-padded)
3. WHEN an improvement request is created, THE Feedback_System SHALL assign a ticket number with format REQ-XXXXX
4. WHEN a question or other feedback is created, THE Feedback_System SHALL assign a ticket number with format REQ-XXXXX
5. THE Feedback_System SHALL ensure ticket numbers are unique across all submissions

### Requirement 7: Admin Feedback Dashboard

**User Story:** As an administrator, I want a centralized dashboard to review all feedback, so that I can efficiently triage and manage submissions.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display summary statistics including new count, critical count, open bugs, open requests, and resolved this week
2. THE Admin_Dashboard SHALL list all feedback submissions with ticket number, type, severity, title, submitter, and status
3. THE Admin_Dashboard SHALL provide filters for feedback type, status, severity, and module
4. THE Admin_Dashboard SHALL provide a search function to find submissions by title or description
5. THE Admin_Dashboard SHALL sort submissions by severity (critical first) then by creation date (newest first)
6. WHEN an administrator clicks on a submission, THE Admin_Dashboard SHALL display the full details including screenshots and comments
7. THE Admin_Dashboard SHALL support pagination for large numbers of submissions

### Requirement 8: Feedback Status Management

**User Story:** As an administrator, I want to update feedback status and track progress, so that users know their submissions are being addressed.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL allow administrators to update submission status
2. THE Feedback_System SHALL support statuses: new, reviewing, confirmed, in_progress, resolved, closed, wont_fix, duplicate
3. WHEN a status is changed, THE Feedback_System SHALL record the change in the status history table
4. WHEN a submission is marked as resolved, THE Feedback_System SHALL record the resolution timestamp and resolver
5. THE Admin_Dashboard SHALL allow administrators to add resolution notes when resolving
6. THE Admin_Dashboard SHALL allow administrators to mark a submission as duplicate of another ticket
7. THE Admin_Dashboard SHALL allow administrators to assign submissions to themselves or other users

### Requirement 9: Feedback Comments

**User Story:** As a user or administrator, I want to add comments to feedback submissions, so that we can discuss and clarify issues.

#### Acceptance Criteria

1. THE Feedback_System SHALL allow users to add comments to their own submissions
2. THE Feedback_System SHALL allow administrators to add comments to any submission
3. THE Feedback_System SHALL support internal-only comments visible only to administrators
4. THE Feedback_System SHALL display comments in chronological order with commenter name and timestamp
5. THE Feedback_System SHALL display the comment count on the submission list view

### Requirement 10: Notifications

**User Story:** As a user, I want to be notified when my feedback status changes, so that I stay informed about the progress of my submissions.

#### Acceptance Criteria

1. WHEN a new feedback submission is created, THE Feedback_System SHALL notify administrators
2. WHEN a submission status is changed, THE Feedback_System SHALL notify the original submitter
3. WHEN a comment is added to a submission, THE Feedback_System SHALL notify relevant parties
4. THE Feedback_System SHALL use the existing notification system for in-app notifications

### Requirement 11: User's Own Submissions View

**User Story:** As a user, I want to view my own feedback submissions, so that I can track the status of issues I've reported.

#### Acceptance Criteria

1. THE Feedback_System SHALL provide a view for users to see their own submissions
2. THE user submissions view SHALL display ticket number, type, title, status, and creation date
3. THE user submissions view SHALL allow users to view full details of their submissions
4. THE user submissions view SHALL allow users to add comments to their submissions
5. WHEN a user clicks the badge on the Feedback_Button, THE Feedback_System SHALL navigate to their submissions view
