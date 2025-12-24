# Implementation Plan: n8n Notification Workflows

## Overview

This implementation plan covers the n8n notification workflows feature for Gama ERP. The plan follows an incremental approach, starting with database schema and types, then building utility functions, actions, and finally UI components.

## Tasks

- [x] 1. Set up database schema and types
  - [x] 1.1 Create database migration for notification_templates, notification_workflow_preferences, and notification_log tables
    - Created tables with all columns as specified in design
    - Added indexes for performance
    - Inserted 8 default notification templates
    - Added RLS policies for all tables
    - Note: Used notification_workflow_preferences to avoid conflict with existing notification_preferences table
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 1.2 Create TypeScript types for notification workflows
    - Define NotificationChannel, EventType, DigestFrequency, NotificationStatus types
    - Define NotificationTemplate, NotificationPreference, NotificationLogEntry interfaces
    - Define PlaceholderDefinition, RenderTemplateInput, SendNotificationInput interfaces
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement template utilities
  - [x] 2.1 Create notification-template-utils.ts with template CRUD functions
    - Implement getTemplateByCode, getActiveTemplates, createTemplate, updateTemplate
    - Implement template validation logic
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Write property test for template storage integrity
    - **Property 1: Template Storage Integrity**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [x] 2.3 Implement placeholder replacement engine
    - Create replacePlaceholders function for {{key}} pattern replacement
    - Handle default values for missing keys
    - Handle unchanged placeholders when no data or default
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.4 Write property test for placeholder replacement
    - **Property 2: Placeholder Replacement Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 2.5 Write property test for template rendering round-trip
    - **Property 3: Template Rendering Round-Trip**
    - **Validates: Requirements 2.5**

- [x] 3. Checkpoint - Ensure template utilities pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement preference utilities
  - [x] 4.1 Create notification-preference-utils.ts with preference management
    - Implement getPreference, getPreferenceOrDefault, upsertPreference
    - Implement default preference logic (email and in_app enabled, immediate)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Write property test for preference storage and defaults
    - **Property 4: Preference Storage and Defaults**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 5. Implement phone validation utilities
  - [x] 5.1 Create phone-validation-utils.ts with Indonesian phone validation
    - Implement validatePhoneNumber function
    - Support +62 and 08 prefixes
    - Normalize to international format
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.2 Write property test for phone validation
    - **Property 9: Phone Validation and Normalization**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 6. Checkpoint - Ensure preference and phone utilities pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement notification sending utilities
  - [x] 7.1 Create notification-sender-utils.ts with channel filtering
    - Implement getEnabledChannels based on user preferences
    - Implement isInQuietHours check
    - Implement shouldBatchNotification for digest frequency
    - _Requirements: 4.1, 4.5, 4.6_

  - [x] 7.2 Write property test for channel filtering
    - **Property 5: Channel Filtering by Preferences**
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [x] 7.3 Write property test for quiet hours and batching
    - **Property 6: Quiet Hours and Digest Batching**
    - **Validates: Requirements 4.5, 4.6**

  - [x] 7.4 Implement renderNotification function
    - Render template for specific channel
    - Apply placeholder replacement
    - Return RenderedNotification object
    - _Requirements: 4.2, 4.4_

- [x] 8. Implement notification logging utilities
  - [x] 8.1 Create notification-log-utils.ts with logging functions
    - Implement createLogEntry, updateLogStatus, getLogsByEntity
    - Implement status transition validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.2 Write property test for log entry completeness
    - **Property 7: Log Entry Completeness**
    - **Validates: Requirements 5.1, 5.4, 5.5**

  - [x] 8.3 Write property test for status transitions
    - **Property 8: Status Transition Validity**
    - **Validates: Requirements 5.2, 5.3**

- [ ] 9. Checkpoint - Ensure notification utilities pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement notification statistics utilities
  - [x] 10.1 Create notification-stats-utils.ts with statistics functions
    - Implement calculateStats with channel and status breakdowns
    - Implement success/failure rate calculations
    - Implement common error aggregation
    - Implement date range and event_type filtering
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 10.2 Write property test for statistics calculation
    - **Property 10: Statistics Calculation Invariant**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 11. Implement server actions
  - [x] 11.1 Create notification-workflow-actions.ts with server actions
    - Implement sendNotification action
    - Implement triggerEventNotification action
    - Implement updateNotificationPreferences action
    - _Requirements: 4.1, 4.2, 4.4, 6.1-6.8_

  - [x] 11.2 Create notification-template-actions.ts for template management
    - Implement CRUD actions for templates
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 12. Checkpoint - Ensure all actions work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement UI components
  - [x] 13.1 Create NotificationPreferencesForm component
    - Channel toggles per event type
    - Quiet hours time pickers
    - Digest frequency selector
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 13.2 Create NotificationTemplateEditor component
    - Template field editors for all channels
    - Placeholder management UI
    - Preview functionality
    - _Requirements: 1.2, 1.3, 2.1_

  - [x] 13.3 Create NotificationLogViewer component
    - Log table with filtering
    - Status badges
    - Entity links
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 13.4 Create NotificationStatsCard component
    - Channel breakdown chart
    - Success/failure rates
    - Common errors list
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 14. Implement pages
  - [x] 14.1 Create notification preferences settings page
    - User preference management
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 14.2 Create notification templates admin page
    - Template list and editor
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 14.3 Create notification log page
    - Log viewer with filters
    - Statistics dashboard
    - _Requirements: 5.1, 8.1, 8.2, 8.3, 8.4_

- [x] 15. Final checkpoint - Ensure all features work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required (comprehensive testing from start)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
