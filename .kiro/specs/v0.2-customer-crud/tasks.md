# Implementation Plan

- [x] 1. Create customer form and dialog components
  - [x] 1.1 Create customer form component with validation
    - Create `components/customers/customer-form.tsx`
    - Add fields: name (required), email, phone, address
    - Implement email validation using zod schema
    - Handle loading state during submission
    - _Requirements: 3.2, 3.4_
  - [x] 1.2 Write property test for email validation
    - **Property 3: Email validation rejects invalid formats**
    - Generate invalid email strings, verify rejection
    - **Validates: Requirements 3.4**
  - [x] 1.3 Create customer dialog component
    - Create `components/customers/customer-dialog.tsx`
    - Support both add and edit modes
    - Pre-fill form when editing existing customer
    - Handle dialog open/close state
    - _Requirements: 3.1, 4.1_
  - [x] 1.4 Write property test for edit form pre-fill
    - **Property 4: Edit form pre-fills all customer data**
    - Generate random customer data, verify all fields pre-filled
    - **Validates: Requirements 4.1**

- [x] 2. Implement server actions for CRUD operations
  - [x] 2.1 Create server actions file
    - Create `app/(main)/customers/actions.ts`
    - Implement `createCustomer` action with validation
    - Implement `updateCustomer` action with validation
    - Handle errors and return appropriate messages
    - _Requirements: 3.3, 4.2_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Build customer list page with search
  - [x] 4.1 Create customer table component
    - Create `components/customers/customer-table.tsx`
    - Display customers in table format (name, email, phone, actions)
    - Add search input for filtering by name
    - Add edit and view action buttons per row
    - Handle empty state and loading state
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_
  - [x] 4.2 Write property test for search filtering
    - **Property 2: Search filter returns only matching customers**
    - Generate random search terms and customer names, verify filter correctness
    - **Validates: Requirements 2.1**
  - [x] 4.3 Write property test for customer ordering
    - **Property 1: Customer list displays all fields in order**
    - Generate random customer lists, verify alphabetical ordering
    - **Validates: Requirements 1.1, 1.2**
  - [x] 4.4 Update customers page to use new components
    - Update `app/(main)/customers/page.tsx`
    - Fetch customers from Supabase ordered by name
    - Integrate CustomerTable and CustomerDialog components
    - Handle add customer flow with toast notifications
    - _Requirements: 1.1, 1.5, 3.5, 3.6, 4.3, 4.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create customer detail page
  - [x] 6.1 Create customer detail page
    - Create `app/(main)/customers/[id]/page.tsx`
    - Fetch customer by ID from Supabase
    - Display all customer fields
    - Handle customer not found (404)
    - _Requirements: 5.1, 5.2, 5.5_
  - [x] 6.2 Add projects list to detail page
    - Fetch projects for the customer
    - Display projects in a list/table
    - Add link to create new project for customer
    - _Requirements: 5.3, 5.4_
  - [x] 6.3 Write property test for customer detail display
    - **Property 5: Customer detail displays all fields**
    - Generate random customer data, verify all fields displayed
    - **Validates: Requirements 5.2**

- [x] 7. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
