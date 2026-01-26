# Implementation Plan: Help Center Enhancement

## Overview

Enhance the Help Center (v0.38) with a dedicated FAQs page and comprehensive Indonesian FAQ content. This implementation leverages existing components and utilities.

## Tasks

- [x] 1. Create FAQ content migration
  - [x] 1.1 Create Supabase migration to insert FAQ content
    - Insert 20+ FAQ entries covering all 7 categories
    - All content in Indonesian (Bahasa Indonesia)
    - Set appropriate display_order for each category
    - Set applicable_roles for role-specific FAQs (empty array for general FAQs)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1-3.7_

- [x] 2. Create FAQs page
  - [x] 2.1 Create `app/help/faqs/page.tsx` server component
    - Fetch FAQs using existing getFAQsForRole action
    - Pass FAQs to client component for search/display
    - Add breadcrumb navigation (Help Center > FAQs)
    - Add "Back to Help Center" link
    - _Requirements: 1.1, 1.2, 1.4, 5.2, 5.3_
  
  - [x] 2.2 Create `components/help-center/faq-search.tsx` client component
    - Accept FAQs as props
    - Implement search input with state management
    - Filter FAQs by matching question or answer (case-insensitive)
    - Display filtered FAQs using FAQAccordion with showCategories=true
    - Show "Tidak ada FAQ yang ditemukan" when search has no results
    - _Requirements: 1.3, 1.5, 1.6, 4.1, 4.2, 4.3_

- [x] 3. Write tests
  - [x] 3.1 Write unit tests for FAQs page
    - Test page renders without errors
    - Test search filtering updates display
    - Test empty results message
    - _Requirements: 1.2, 1.6, 4.2_
  
  - [x] 3.2 Write property tests for FAQ search
    - **Property 1: FAQ Search Filter Correctness**
    - **Property 2: Category Grouping Completeness**
    - **Validates: Requirements 1.2, 4.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Reuse existing components: FAQAccordion, getFAQsForRole, filterFAQsByRole
- All text content in Indonesian (Bahasa Indonesia)
- Follow existing Help Center patterns from v0.38
- Property tests use fast-check library

