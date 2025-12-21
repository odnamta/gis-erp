# Implementation Plan: Equipment Asset Registry

## Overview

This implementation plan breaks down the Equipment Asset Registry module into discrete coding tasks. Each task builds incrementally on previous work, ensuring no orphaned code. The implementation follows existing patterns in the codebase (vendors, employees modules).

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create database migration for asset_categories table with default data
    - Create table with columns: id, category_code, category_name, description, default_useful_life_years, default_depreciation_method, default_total_units, parent_category_id, is_active, display_order, created_at
    - Insert default categories: TRUCK, TRAILER, CRANE, FORKLIFT, SUPPORT, VEHICLE, OFFICE, IT
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create database migration for asset_locations table with default data
    - Create table with columns: id, location_code, location_name, address, city, is_active, created_at
    - Insert default locations: HQ (Surabaya), JKT (Jakarta), BPN (Balikpapan), FIELD
    - _Requirements: 2.1_

  - [x] 1.3 Create database migration for assets table
    - Create table with all columns as specified in design
    - Create asset_seq sequence for auto-numbering
    - Create trigger function generate_asset_code() for auto-generating asset codes
    - Create indexes on category_id, status, current_location_id, registration_number
    - _Requirements: 3.1, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [x] 1.4 Create database migration for asset_status_history table
    - Create table with columns: id, asset_id, previous_status, new_status, previous_location_id, new_location_id, reason, notes, changed_by, changed_at
    - Create index on asset_id
    - _Requirements: 6.3_

  - [x] 1.5 Create database migration for asset_documents table
    - Create table with columns: id, asset_id, document_type, document_name, document_url, issue_date, expiry_date, reminder_days, notes, uploaded_by, uploaded_at
    - Create index on expiry_date
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 1.6 Create database views for asset_expiring_documents and asset_summary
    - Create asset_expiring_documents view with expiry status calculation
    - Create asset_summary view grouped by category
    - _Requirements: 10.1, 10.3, 11.1_

- [x] 2. Type Definitions and Utilities
  - [x] 2.1 Create types/assets.ts with all type definitions
    - Define AssetStatus, DepreciationMethod, AssetDocumentType types
    - Define AssetCategory, AssetLocation, Asset, AssetWithRelations interfaces
    - Define AssetStatusHistory, AssetDocument, ExpiringDocument interfaces
    - Define AssetCategorySummary, AssetSummaryStats, AssetFilterState interfaces
    - Define AssetFormData, StatusChangeFormData, AssetDocumentFormData interfaces
    - _Requirements: 3.1, 6.1, 8.1, 9.1_

  - [x] 2.2 Create lib/asset-utils.ts with utility functions
    - Implement status, depreciation method, document type option arrays
    - Implement label getter functions
    - Implement validation functions (isValidAssetStatus, isValidDepreciationMethod, isValidAssetDocumentType)
    - Implement calculateAssetSummaryStats function
    - Implement filterAssetsBySearch function
    - Implement document expiry functions (getDocumentExpiryStatus, isDocumentExpired, isDocumentExpiringSoon, calculateDaysUntilExpiry)
    - Implement formatAssetCurrency, formatAssetDate, calculateAssetAge functions
    - Implement calculateStraightLineDepreciation function
    - Implement isValidAssetCode, getAssetStatusBadgeVariant functions
    - _Requirements: 4.1, 4.5, 6.1, 8.1, 8.4, 9.1, 10.1_

  - [x] 2.3 Write property tests for asset utility functions
    - **Property 9: Valid Status Values** - Test isValidAssetStatus accepts only valid statuses
    - **Property 13: Valid Depreciation Methods** - Test isValidDepreciationMethod accepts only valid methods
    - **Property 15: Valid Document Types** - Test isValidAssetDocumentType accepts only valid types
    - **Property 14: Straight Line Depreciation Calculation** - Test calculateStraightLineDepreciation
    - **Property 16: Document Expiry Status Calculation** - Test getDocumentExpiryStatus
    - **Validates: Requirements 6.1, 8.1, 8.4, 9.1, 10.1**

- [x] 3. Checkpoint - Verify database and utilities
  - Ensure all migrations applied successfully
  - Ensure all utility tests pass
  - Ask the user if questions arise

- [x] 4. Server Actions for Asset CRUD
  - [x] 4.1 Create lib/asset-actions.ts with getAssetCategories and getAssetLocations
    - Implement getAssetCategories() to fetch categories ordered by display_order
    - Implement getAssetLocations() to fetch active locations
    - _Requirements: 1.2, 2.1_

  - [x] 4.2 Implement createAsset server action
    - Validate required fields (category_id, asset_name)
    - Insert asset with initial status 'active'
    - Set book_value equal to purchase_price
    - Log initial status in asset_status_history
    - Return created asset with generated code
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.3 Implement getAssets server action with filtering
    - Accept AssetFilterState filters
    - Exclude disposed/sold assets by default
    - Apply category, status, location filters
    - Apply search filter on asset_code, asset_name, registration_number
    - Join with categories and locations for display
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.8_

  - [x] 4.4 Implement getAssetById server action
    - Fetch single asset with all relations
    - Include category, location, assigned employee, assigned job
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.5 Implement updateAsset server action
    - Validate asset exists
    - Prevent changing asset_code
    - Update allowed fields
    - Update updated_at timestamp
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.6 Implement changeAssetStatus server action
    - Validate new status is valid
    - Require reason for status change
    - Log status change in asset_status_history with all fields
    - Optionally update location
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.7 Write property tests for asset server actions
    - **Property 1: Asset Code Generation Format** - Test createAsset generates correct code format
    - **Property 2: Asset Creation Invariants** - Test createAsset sets correct initial values
    - **Property 3: Mandatory Field Validation** - Test createAsset rejects missing required fields
    - **Property 6: Filter Correctness** - Test getAssets returns only matching assets
    - **Property 7: Disposed/Sold Asset Exclusion** - Test getAssets excludes disposed/sold
    - **Property 10: Status Change Logging** - Test changeAssetStatus creates history entry
    - **Property 11: Asset Code Immutability** - Test updateAsset cannot change asset_code
    - **Property 12: Update Timestamp Refresh** - Test updateAsset updates timestamp
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4, 4.5, 4.8, 6.2, 6.3, 7.2, 7.3**

- [x] 5. Checkpoint - Verify server actions
  - Ensure all server action tests pass
  - Test CRUD operations manually if needed
  - Ask the user if questions arise

- [x] 6. Document and Summary Actions
  - [x] 6.1 Implement document management server actions
    - Implement uploadAssetDocument with file upload to Supabase storage
    - Implement getAssetDocuments to fetch documents for an asset
    - Implement deleteAssetDocument
    - Set default reminder_days to 30
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 6.2 Implement getExpiringDocuments server action
    - Query asset_expiring_documents view
    - Filter for expired and expiring_soon status
    - Order by expiry_date ascending
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 6.3 Implement getAssetCategorySummary server action
    - Query asset_summary view
    - Return aggregated data by category
    - _Requirements: 11.1, 11.2_

  - [x] 6.4 Implement getAssetStatusHistory server action
    - Fetch status history for an asset
    - Order by changed_at descending
    - _Requirements: 6.3_

  - [x] 6.5 Write property tests for document and summary actions
    - **Property 8: Asset Summary Calculation** - Test getAssetCategorySummary aggregates correctly
    - **Property 17: Expiring Documents Filter** - Test getExpiringDocuments returns only expired/expiring_soon
    - **Validates: Requirements 10.3, 11.1**

- [x] 7. Permissions Integration
  - [x] 7.1 Add asset permissions to types/permissions.ts
    - Add FeatureKey entries for assets.view, assets.create, assets.edit, assets.change_status, assets.view_financials, assets.dispose, assets.upload_documents
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 7.2 Add asset permission checks to lib/permissions.ts
    - Add FEATURE_PERMISSION_MAP entries for all asset permissions
    - Implement canViewAssets, canCreateAsset, canEditAsset, canChangeAssetStatus, canViewAssetFinancials, canDisposeAsset, canUploadAssetDocuments helper functions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 7.3 Write property tests for asset permissions
    - **Property 18: Role-Based Access Control** - Test each role has correct permissions
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7**

- [x] 8. Checkpoint - Verify all backend functionality
  - Ensure all property tests pass
  - Ensure permissions are correctly configured
  - Ask the user if questions arise

- [x] 9. UI Components - Core
  - [x] 9.1 Create components/equipment/asset-status-badge.tsx
    - Display status with appropriate color variant
    - Use Badge component from shadcn/ui
    - _Requirements: 4.6_

  - [x] 9.2 Create components/equipment/asset-summary-cards.tsx
    - Display total, active, maintenance, book value, expiring docs counts
    - Use Card components from shadcn/ui
    - _Requirements: 4.1_

  - [x] 9.3 Create components/equipment/asset-filters.tsx
    - Category dropdown filter
    - Status dropdown filter
    - Location dropdown filter
    - Search input
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 9.4 Create components/equipment/asset-table.tsx
    - Display asset list with columns: code, name, category, registration, status, location
    - Show job reference if assigned
    - Pagination support
    - _Requirements: 4.6, 4.7_

- [x] 10. UI Components - Forms and Dialogs
  - [x] 10.1 Create components/equipment/asset-form.tsx
    - Form sections: Basic Info, Vehicle Details, Capacity & Dimensions, Purchase & Financials, Depreciation, Location & Assignment
    - Use form validation for required fields
    - Support create and edit modes
    - _Requirements: 3.2, 3.6, 3.7, 3.8, 3.9, 3.10, 7.1_

  - [x] 10.2 Create components/equipment/asset-status-dialog.tsx
    - Status selection dropdown
    - Reason text input (required)
    - Optional location change
    - Optional notes
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 10.3 Create components/equipment/asset-document-form.tsx
    - Document type selection
    - File upload
    - Expiry date picker
    - Reminder days input
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 10.4 Create components/equipment/asset-document-list.tsx
    - Display documents with expiry status indicators
    - Show days until expiry
    - Delete button with confirmation
    - _Requirements: 5.4, 10.1_

- [x] 11. UI Components - Detail View
  - [x] 11.1 Create components/equipment/asset-detail-view.tsx
    - Specifications section (vehicle info, capacity, dimensions)
    - Financial summary section (purchase info, depreciation)
    - Documents section with expiry status
    - Status history section
    - Photo gallery section
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 11.2 Create components/equipment/asset-photo-gallery.tsx
    - Display photos in grid
    - Primary photo indicator
    - Lightbox for full view
    - _Requirements: 5.5_

  - [x] 11.3 Create components/equipment/expiring-documents-list.tsx
    - List all expiring/expired documents across assets
    - Show asset reference, document type, expiry date, status
    - _Requirements: 10.3, 10.4_

  - [x] 11.4 Create components/equipment/index.ts barrel export
    - Export all equipment components
    - _Requirements: N/A_

- [x] 12. Pages
  - [x] 12.1 Create app/(main)/equipment/page.tsx - Asset List Page
    - Fetch and display assets with filters
    - Show summary cards
    - Add Asset button (permission gated)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 12.2 Create app/(main)/equipment/new/page.tsx - Create Asset Page
    - Asset form in create mode
    - Permission check for create
    - Redirect to detail on success
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 12.2_

  - [x] 12.3 Create app/(main)/equipment/[id]/page.tsx - Asset Detail Page
    - Display asset detail view
    - Edit button (permission gated)
    - Change status button (permission gated)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1, 12.4_

  - [x] 12.4 Create app/(main)/equipment/[id]/edit/page.tsx - Edit Asset Page
    - Asset form in edit mode
    - Permission check for edit
    - Redirect to detail on success
    - _Requirements: 7.1, 7.2, 7.3, 12.3_

- [x] 13. Navigation Integration
  - [x] 13.1 Add Equipment to navigation in lib/navigation.ts
    - Add Equipment nav item with Truck icon
    - Set href to /equipment
    - Set roles to ['owner', 'admin', 'manager', 'ops', 'finance']
    - _Requirements: 13.1, 13.2_

- [x] 14. Final Checkpoint
  - Ensure all tests pass
  - Verify navigation works
  - Test full CRUD workflow
  - Test document upload and expiry alerts
  - Test status change with history
  - Ask the user if questions arise

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation follows existing patterns from vendors and employees modules
