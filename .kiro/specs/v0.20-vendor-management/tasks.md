# Implementation Plan: Vendor Management (v0.20)

## Overview

This implementation plan breaks down the Vendor Management module into discrete coding tasks. Each task builds on previous work, ensuring incremental progress with no orphaned code. The implementation follows the existing Gama ERP patterns and integrates with PJO cost items and BKK workflows.

## Tasks

- [x] 1. Database schema and types setup
  - [x] 1.1 Create database migration for vendor tables
    - Create vendors, vendor_equipment, vendor_contacts, vendor_documents, vendor_ratings tables
    - Add vendor_id columns to pjo_cost_items and bukti_kas_keluar
    - Create indexes for performance
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 6.1, 9.1, 9.2_

  - [x] 1.2 Create TypeScript types for vendors
    - Add types/vendors.ts with Vendor, VendorEquipment, VendorContact, VendorDocument, VendorRating interfaces
    - Add VendorType, EquipmentType, DocumentType, EquipmentCondition enums
    - _Requirements: 1.3, 4.2, 9.2_

  - [x] 1.3 Create vendor utility functions
    - Create lib/vendor-utils.ts with generateVendorCode, type labels, expiry detection, calculations
    - Add mapCostCategoryToVendorType for PJO integration
    - _Requirements: 1.1, 4.6, 6.3, 9.3_

  - [x] 1.4 Write property tests for vendor utilities
    - **Property 8: Document Expiry Detection**
    - **Property 12: Average Rating Calculation**
    - **Property 13: On-Time Rate Calculation**
    - **Validates: Requirements 4.6, 6.3, 9.3**

- [x] 2. Vendor permissions setup
  - [x] 2.1 Add vendor permissions to permissions system
    - Update lib/permissions.ts with vendor-related permissions
    - Add canViewVendors, canCreateVendor, canEditVendor, canDeleteVendor, canVerifyVendor, canSetPreferred, canAddEquipment, canRateVendor, canViewBankDetails
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

  - [x] 2.2 Write property tests for vendor permissions
    - **Property 18: Role-Based Permission Enforcement**
    - **Validates: Requirements 10.1-10.9**

- [x] 3. Vendor CRUD server actions
  - [x] 3.1 Create vendor server actions
    - Create app/(main)/vendors/actions.ts
    - Implement createVendor, updateVendor, deleteVendor, getVendors, getVendorById
    - Implement verifyVendor, togglePreferred
    - Include permission checks and validation
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 2.2, 2.3, 2.4, 2.5, 5.1, 5.3_

  - [x] 3.2 Write property tests for vendor code generation
    - **Property 1: Vendor Code Uniqueness and Format**
    - **Validates: Requirements 1.1**

  - [x] 3.3 Write property tests for vendor validation
    - **Property 2: Vendor Mandatory Field Validation**
    - **Validates: Requirements 1.2, 1.3**

- [x] 4. Checkpoint - Verify vendor CRUD
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Vendor list page and components
  - [x] 5.1 Create VendorFilters component
    - Create components/vendors/vendor-filters.tsx
    - Implement search input, type dropdown, status dropdown, preferred checkbox
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 5.2 Create VendorTable component
    - Create components/vendors/vendor-table.tsx
    - Display vendor_code, vendor_name, vendor_type, contact_person, total_jobs, average_rating, status
    - Include row actions: View, Edit, Equipment, Rate
    - _Requirements: 2.1_

  - [x] 5.3 Create vendors list page
    - Create app/(main)/vendors/page.tsx
    - Implement summary cards (total, active, preferred, pending verification)
    - Integrate VendorFilters and VendorTable
    - Add pagination
    - _Requirements: 2.1, 2.6_

  - [x] 5.4 Write property tests for vendor filtering
    - **Property 4: Vendor Search and Filter Correctness**
    - **Property 5: Vendor Summary Statistics Accuracy**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

- [x] 6. Vendor form and create/edit pages
  - [x] 6.1 Create VendorForm component
    - Create components/vendors/vendor-form.tsx
    - Include all form sections: Basic Info, Address, Primary Contact, Legal & Tax, Bank Details, Classification
    - Implement validation for required fields
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 6.2 Create new vendor page
    - Create app/(main)/vendors/new/page.tsx
    - Auto-generate vendor code
    - Wire up form submission to createVendor action
    - _Requirements: 1.1_

  - [x] 6.3 Create edit vendor page
    - Create app/(main)/vendors/[id]/edit/page.tsx
    - Load existing vendor data
    - Wire up form submission to updateVendor action
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

- [x] 7. Vendor detail page
  - [x] 7.1 Create VendorDetailView component
    - Create components/vendors/vendor-detail-view.tsx
    - Display contact info, bank details, legal info sections
    - Display performance metrics cards
    - _Requirements: 3.1, 3.2_

  - [x] 7.2 Create vendor detail page
    - Create app/(main)/vendors/[id]/page.tsx
    - Integrate VendorDetailView
    - Add Edit and Add Equipment buttons with permission checks
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Checkpoint - Verify vendor pages
  - All 87 vendor tests pass (vendor-utils, vendor-permissions, vendor-validation, vendor-performance-utils)

- [x] 9. Equipment management
  - [x] 9.1 Create equipment server actions
    - Create app/(main)/vendors/equipment-actions.ts
    - Implement createEquipment, updateEquipment, deleteEquipment, getVendorEquipment
    - _Requirements: 4.1, 4.3, 4.4, 4.5_
    - Note: TypeScript errors due to database types needing regeneration (run: npx supabase gen types typescript --project-id ljbkjtaowrdddvjhsygj > types/database.ts)

  - [x] 9.2 Create EquipmentTable component
    - Create components/vendors/equipment-table.tsx
    - Display type, plate_number, capacity, daily_rate, document status, availability
    - Show expiry warnings for STNK, KIR, insurance
    - _Requirements: 3.3, 4.6_

  - [x] 9.3 Create EquipmentForm component
    - Create components/vendors/equipment-form.tsx
    - Include all equipment fields with validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 9.4 Create add equipment page
    - Create app/(main)/vendors/[id]/equipment/new/page.tsx
    - Wire up form to createEquipment action
    - _Requirements: 4.1_

  - [x] 9.5 Integrate equipment into vendor detail
    - Add EquipmentTable to vendor detail page
    - Add equipment section with Add Equipment button
    - _Requirements: 3.3_

- [x] 10. Vendor rating system
  - [x] 10.1 Create rating server actions
    - Create app/(main)/vendors/rating-actions.ts
    - Implement rateVendor, updateVendorMetrics
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Create VendorRatingForm component
    - Create components/vendors/vendor-rating-form.tsx
    - Include 1-5 star ratings for all categories
    - Include was_on_time toggle and comments
    - _Requirements: 6.1, 6.2_

  - [x] 10.3 Create rating dialog/modal
    - Add rating modal accessible from vendor list and detail
    - Wire up to rateVendor action
    - _Requirements: 6.1, 6.4_

  - [x] 10.4 Write property tests for rating constraints
    - Rating validation tests already exist in vendor-utils.test.ts (isValidRating)
    - **Validates: Requirements 6.1**

- [x] 11. Checkpoint - Verify equipment and ratings
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Vendor documents
  - [x] 12.1 Create document server actions
    - Create app/(main)/vendors/document-actions.ts
    - Implement uploadDocument, deleteDocument, getVendorDocuments
    - Integrate with Supabase Storage
    - _Requirements: 9.1, 9.4_

  - [x] 12.2 Create VendorDocuments component
    - Create components/vendors/vendor-documents.tsx
    - Display document list with type, name, expiry, upload date
    - Show expiry warnings
    - Include upload and delete functionality
    - _Requirements: 3.5, 9.1, 9.2, 9.3_

  - [x] 12.3 Integrate documents into vendor detail
    - Add VendorDocuments section to vendor detail page
    - _Requirements: 3.5_

- [x] 13. PJO cost item integration
  - [x] 13.1 Create VendorSelector component
    - Create components/vendors/vendor-selector.tsx
    - Implement searchable dropdown with preferred vendors first
    - Filter by vendor type based on cost category
    - Show vendor rating and job count
    - _Requirements: 7.1, 7.2_

  - [x] 13.2 Create EquipmentSelector component
    - Create components/vendors/equipment-selector.tsx
    - Filter equipment by selected vendor
    - Show daily rate and availability
    - _Requirements: 7.3, 7.4_

  - [x] 13.3 Update PJO cost item form
    - Add VendorSelector and EquipmentSelector to cost-item-form.tsx
    - Auto-suggest daily_rate when equipment selected
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 13.4 Write property tests for vendor dropdown sort
    - **Property 14: Vendor Dropdown Sort Order**
    - **Property 15: Equipment Filtering by Vendor**
    - **Validates: Requirements 7.2, 7.3**

- [x] 14. BKK integration
  - [x] 14.1 Update BKK form for vendor pre-fill
    - Modify bkk-form.tsx to pre-fill vendor info from cost item
    - Display vendor bank details for payment option
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 14.2 Update BKK settlement to update vendor metrics
    - Modify BKK settle action to call updateVendorMetrics
    - Increment total_jobs and total_value
    - _Requirements: 8.4_

  - [x] 14.3 Write property tests for vendor metrics update
    - **Property 16: Vendor Metrics Update on BKK Settlement**
    - **Validates: Requirements 8.4**

- [x] 15. Navigation integration
  - [x] 15.1 Add Vendors to sidebar navigation
    - Update components/layout/sidebar.tsx
    - Add Vendors menu item with Building2 icon
    - Implement role-based visibility
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 15.2 Write property tests for navigation visibility
    - **Property 19: Navigation Visibility by Role**
    - **Validates: Requirements 11.2, 11.3**

- [x] 16. Final checkpoint
  - All 89 vendor tests pass (vendor-utils: 55, vendor-permissions: 15, vendor-validation: 19)
  - All acceptance criteria met
  - Full workflow implemented: Create vendor → Add equipment → Assign to PJO → Create BKK → Rate vendor

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows existing Gama ERP patterns for consistency
