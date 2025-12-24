# Implementation Plan: n8n External Integrations

## Overview

This implementation plan covers the external integrations framework for Gama ERP, enabling synchronization with accounting software, GPS tracking, and cloud storage. Tasks are organized to build foundational components first, then specific integrations.

## Tasks

- [ ] 1. Database Schema Setup
  - [ ] 1.1 Create integration_connections table with all fields including OAuth token storage
    - Apply migration for integration_connections table
    - Add indexes for integration_type lookup
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Create sync_mappings table with field mapping support
    - Apply migration for sync_mappings table
    - Add foreign key to integration_connections
    - _Requirements: 2.1, 2.2_
  - [ ] 1.3 Create sync_log table for audit trail
    - Apply migration for sync_log table
    - Add indexes for connection_id, status, started_at
    - _Requirements: 6.3, 8.1_
  - [ ] 1.4 Create external_id_mappings table with unique constraint
    - Apply migration for external_id_mappings table
    - Add unique constraint on (connection_id, local_table, local_id)
    - _Requirements: 7.1, 7.3_
  - [ ] 1.5 Insert sample connection configurations
    - Add Accurate Online, GPS Tracking, Google Drive sample connections
    - _Requirements: 1.6, 1.7_

- [ ] 2. Core Integration Utilities
  - [ ] 2.1 Create integration-utils.ts with type definitions and validation
    - Define IntegrationConnection, SyncMapping, SyncLog, ExternalIdMapping types
    - Implement validateIntegrationType and validateProvider functions
    - Implement validateSyncDirection and validateSyncFrequency functions
    - _Requirements: 1.6, 1.7, 2.3, 2.4_
  - [ ] 2.2 Write property test for enum validation
    - **Property 2: Enum Value Validation**
    - **Validates: Requirements 1.6, 1.7, 2.3, 2.4**
  - [ ] 2.3 Create integration-actions.ts with connection CRUD operations
    - Implement createConnection, updateConnection, deleteConnection
    - Implement getConnection, listConnections
    - Implement testConnection for credential validation
    - _Requirements: 1.1, 1.3, 1.5_
  - [ ] 2.4 Write property test for connection data persistence
    - **Property 1: Connection Data Persistence**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**

- [ ] 3. Sync Mapping Management
  - [ ] 3.1 Create sync-mapping-utils.ts with mapping utilities
    - Implement createSyncMapping, updateSyncMapping functions
    - Implement applyFieldMappings transformation function
    - Implement evaluateFilterConditions function
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ] 3.2 Write property test for sync mapping persistence
    - **Property 3: Sync Mapping Persistence**
    - **Validates: Requirements 2.1, 2.2**
  - [ ] 3.3 Write property test for filter application
    - **Property 4: Filter Application**
    - **Validates: Requirements 2.5, 2.6**

- [ ] 4. External ID Mapping
  - [ ] 4.1 Create external-id-utils.ts with mapping operations
    - Implement getExternalId, createExternalIdMapping, updateExternalIdMapping
    - Implement determineOperation (create vs update) based on existing mapping
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  - [ ] 4.2 Write property test for external ID mapping lifecycle
    - **Property 6: External ID Mapping Lifecycle**
    - **Validates: Requirements 3.5, 3.6, 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 5. Sync Logging
  - [ ] 5.1 Create sync-log-utils.ts with logging operations
    - Implement startSyncLog, updateSyncProgress, completeSyncLog, failSyncLog
    - Implement getSyncHistory with filtering support
    - _Requirements: 6.3, 6.4, 6.5, 8.1, 8.4_
  - [ ] 5.2 Write property test for sync log state machine
    - **Property 9: Sync Log State Machine**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6**
  - [ ] 5.3 Write property test for sync log completeness
    - **Property 10: Sync Log Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [ ] 6. Checkpoint - Core Infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Data Transformers
  - [ ] 7.1 Create accounting-transformer.ts for Accurate Online
    - Implement transformInvoiceToAccurate function
    - Implement transformPaymentToAccurate function
    - Implement transformCustomerToAccurate function
    - _Requirements: 3.2_
  - [ ] 7.2 Write property test for invoice transformation
    - **Property 5: Invoice Transformation Round-Trip**
    - **Validates: Requirements 3.2**
  - [ ] 7.3 Create gps-transformer.ts for location data
    - Implement transformLocationData function
    - Implement updateAssetLocation function
    - Implement recordLocationHistory function
    - _Requirements: 4.2, 4.3, 4.4_
  - [ ] 7.4 Write property test for location data handling
    - **Property 7: Location Data Handling**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
  - [ ] 7.5 Create storage-transformer.ts for Google Drive
    - Implement generateFolderPath function
    - Implement transformDocumentMetadata function
    - _Requirements: 5.3, 5.5_
  - [ ] 7.6 Write property test for folder structure generation
    - **Property 8: Folder Structure Generation**
    - **Validates: Requirements 5.3, 5.5**

- [ ] 8. Sync Engine
  - [ ] 8.1 Create sync-engine.ts with core sync operations
    - Implement executePushSync function
    - Implement executePullSync function
    - Implement executeFullSync function
    - _Requirements: 6.1, 6.2_
  - [ ] 8.2 Implement retry logic with exponential backoff
    - Create retryWithBackoff utility function
    - Implement token refresh on expiration
    - Handle partial failures
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ] 8.3 Write property test for retry logic
    - **Property 11: Retry Logic**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [ ] 9. Checkpoint - Sync Engine Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration Management UI
  - [ ] 10.1 Create integrations list page at /settings/integrations
    - Display all connections with status, last sync, error state
    - Add connection type and provider badges
    - _Requirements: 1.5_
  - [ ] 10.2 Create connection form component
    - Form fields for connection_code, connection_name, integration_type, provider
    - Credential input fields (masked)
    - Configuration options based on provider
    - _Requirements: 1.1, 1.2_
  - [ ] 10.3 Create sync mapping configuration UI
    - Field mapping editor with local/remote field selection
    - Transform function selector
    - Filter condition builder
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ] 10.4 Create sync history viewer
    - List sync logs with status, timestamps, record counts
    - Filter by connection, status, date range
    - Error details expansion
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 11. Server Actions
  - [ ] 11.1 Create integration-connection-actions.ts
    - Implement createIntegrationConnection server action
    - Implement updateIntegrationConnection server action
    - Implement deleteIntegrationConnection server action
    - Implement testIntegrationConnection server action
    - _Requirements: 1.1, 1.3_
  - [ ] 11.2 Create sync-actions.ts
    - Implement triggerManualSync server action
    - Implement retryFailedSync server action
    - _Requirements: 6.1, 9.5_

- [ ] 12. n8n Workflow Templates
  - [ ] 12.1 Create accounting sync workflow JSON template
    - Webhook trigger for invoice/payment/customer events
    - Data transformation node
    - Accurate Online API integration
    - External ID mapping update
    - Sync log recording
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [ ] 12.2 Create GPS tracking workflow JSON template
    - Scheduled trigger for location polling
    - GPS API data fetch
    - Asset location update
    - Location history recording
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 12.3 Create storage sync workflow JSON template
    - Document upload trigger
    - Google Drive OAuth authentication
    - File upload with folder structure
    - External ID mapping
    - _Requirements: 5.1, 5.2, 5.4_

- [ ] 13. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all integration types work correctly
  - Test error handling and retry logic

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- n8n workflow templates are JSON files that can be imported into n8n
