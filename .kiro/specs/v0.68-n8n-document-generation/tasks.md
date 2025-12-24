# Implementation Plan: n8n Document Generation

## Overview

This implementation plan covers the n8n Document Generation module (v0.68) which automates PDF document creation for invoices, quotations, delivery notes, and other business documents using HTML templates, variable substitution, and Supabase storage.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Create document_templates table with all columns (template_code, template_name, document_type, html_template, css_styles, page_size, orientation, margins, header_html, footer_html, include_letterhead, available_variables, is_active)
    - Include CHECK constraints for document_type, page_size, orientation
    - Add unique constraint on template_code
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Create generated_documents table with all columns (template_id, document_type, document_number, entity_type, entity_id, file_url, file_name, file_size_kb, generated_at, generated_by, variables_data, sent_to_email, sent_at)
    - Add foreign key to document_templates and user_profiles
    - _Requirements: 4.3, 4.4, 4.5_
  - [x] 1.3 Create indexes for performance (document_type, template_code, entity lookup, date)
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 1.4 Create RLS policies for both tables
    - Templates viewable by all authenticated, manageable by admins
    - Generated documents viewable by all, insertable by authenticated, updatable by owner/admin
    - _Requirements: 1.1_
  - [x] 1.5 Insert default templates (INV_STANDARD, QUOTE_STANDARD, DN_STANDARD)
    - _Requirements: 5.1, 6.1, 7.1_

- [x] 2. Template Manager Implementation
  - [x] 2.1 Create TypeScript types for DocumentTemplate, DocumentType, MarginSettings
    - Define in types/document-generation.ts
    - _Requirements: 1.3, 1.4_
  - [x] 2.2 Implement template utility functions in lib/document-template-utils.ts
    - validateTemplate(): Check html_template not empty, document_type valid
    - extractAvailableVariables(): Parse template for {{variable}} patterns
    - _Requirements: 1.2, 1.3_
  - [x] 2.3 Write property tests for template validation
    - **Property 2: Template HTML Validation**
    - **Property 3: Document Type Validation**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 2.4 Implement template CRUD actions in lib/document-template-actions.ts
    - createTemplate(), updateTemplate(), getTemplate(), getTemplateByCode(), listTemplates(), deleteTemplate()
    - _Requirements: 1.1, 1.4, 1.5, 1.6_
  - [x] 2.5 Write property tests for template CRUD
    - **Property 1: Template Code Uniqueness**
    - **Property 4: Template Round-Trip Consistency**
    - **Property 5: Template Filtering Correctness**
    - **Validates: Requirements 1.1, 1.4, 1.5, 1.6**

- [x] 3. Variable Processor Implementation
  - [x] 3.1 Implement variable processing functions in lib/variable-processor-utils.ts
    - extractVariables(): Find all {{variable}} patterns in template
    - substituteVariable(): Replace single variable with value
    - processTemplate(): Full template processing with context
    - _Requirements: 2.1, 2.2_
  - [x] 3.2 Implement loop processing in lib/variable-processor-utils.ts
    - processLoop(): Handle {{#items}}...{{/items}} constructs
    - Support nested variable substitution within loops
    - _Requirements: 2.3, 2.4_
  - [x] 3.3 Write property tests for variable substitution
    - **Property 6: Variable Substitution Completeness**
    - **Validates: Requirements 2.1, 2.2**
  - [x] 3.4 Write property tests for loop processing
    - **Property 7: Loop Processing Correctness**
    - **Validates: Requirements 2.3, 2.4**
  - [x] 3.5 Implement letterhead injection
    - injectLetterhead(): Replace {{letterhead}} with company HTML when include_letterhead=true
    - _Requirements: 2.6_
  - [x] 3.6 Write property tests for letterhead injection
    - **Property 9: Letterhead Injection Correctness**
    - **Validates: Requirements 2.6**

- [x] 4. Checkpoint - Template and Variable Processing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. PDF Converter Implementation
  - [x] 5.1 Create PDF conversion types and interfaces
    - PDFOptions, PDFResult interfaces
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 5.2 Implement PDF conversion function in lib/pdf-converter-utils.ts
    - convertToPDF(): Call HTML2PDF API with options
    - validatePDFOptions(): Validate page_size, orientation, margins
    - Handle header_html and footer_html inclusion
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 5.3 Write property tests for PDF conversion error handling
    - **Property 10: PDF Conversion Error Handling**
    - **Validates: Requirements 3.6**

- [x] 6. Storage Manager Implementation
  - [x] 6.1 Implement storage utility functions in lib/document-storage-utils.ts
    - buildStoragePath(): Construct {document_type}/{year}/{month}/{filename} path
    - getPublicUrl(): Generate public URL for uploaded file
    - _Requirements: 4.2, 4.6_
  - [x] 6.2 Write property tests for storage path construction
    - **Property 11: Storage Path Structure**
    - **Validates: Requirements 4.2**
  - [x] 6.3 Implement storage actions in lib/document-storage-actions.ts
    - uploadDocument(): Upload PDF to Supabase storage
    - deleteDocument(): Remove document from storage
    - _Requirements: 4.1, 4.6_
  - [x] 6.4 Write property tests for storage URL validity
    - **Property 13: Storage URL Validity**
    - **Validates: Requirements 4.6**

- [x] 7. Document Generator Core Implementation
  - [x] 7.1 Create generated document types
    - GeneratedDocument, GenerationRequest, GenerationResult interfaces
    - _Requirements: 4.3, 4.4_
  - [x] 7.2 Implement document generation actions in lib/document-generator-actions.ts
    - generateDocument(): Core generation orchestration
    - createGeneratedDocumentRecord(): Insert record with all fields
    - updateSourceEntityPdfUrl(): Update invoice/quotation with pdf_url
    - _Requirements: 4.3, 4.4, 4.5, 5.5, 6.5_
  - [x] 7.3 Write property tests for document record completeness
    - **Property 12: Generated Document Record Completeness**
    - **Validates: Requirements 4.3, 4.4, 4.5**

- [x] 8. Invoice Document Generation
  - [x] 8.1 Implement invoice data fetching in lib/document-generator-actions.ts
    - fetchInvoiceData(): Get invoice with customer and line items
    - buildInvoiceVariables(): Construct variable context for template
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 8.2 Implement invoice calculations
    - calculateInvoiceTotals(): Compute subtotal, tax (11%), total
    - _Requirements: 5.4_
  - [x] 8.3 Write property tests for invoice calculation
    - **Property 15: Invoice Calculation Correctness**
    - **Validates: Requirements 5.4**
  - [x] 8.4 Implement generateInvoice() function
    - Fetch data, process template, convert to PDF, upload, update record
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [x] 8.5 Write property tests for invoice data completeness
    - **Property 14: Invoice Data Completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  - [x] 8.6 Implement invoice validation
    - validateInvoiceData(): Check required fields present
    - _Requirements: 5.6_
  - [x] 8.7 Write property tests for incomplete data validation
    - **Property 17: Incomplete Data Validation**
    - **Validates: Requirements 5.6**

- [x] 9. Checkpoint - Invoice Generation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Quotation Document Generation
  - [x] 10.1 Implement quotation data fetching
    - fetchQuotationData(): Get quotation with customer, project, revenue items
    - buildQuotationVariables(): Construct variable context
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 10.2 Implement generateQuotation() function
    - Fetch data, process template, convert to PDF, upload, update record
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 10.3 Write property tests for quotation data completeness
    - **Property 18: Quotation Data Completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 11. Delivery Note Document Generation
  - [x] 11.1 Implement delivery note data fetching
    - fetchDeliveryNoteData(): Get job order with route and items
    - buildDeliveryNoteVariables(): Construct variable context
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 11.2 Implement generateDeliveryNote() function
    - Fetch data, process template, convert to PDF, upload, create record
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [x] 11.3 Write property tests for delivery note data completeness
    - **Property 19: Delivery Note Data Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 12. Email Delivery Implementation
  - [x] 12.1 Implement email sending functions in lib/document-email-utils.ts
    - sendDocumentEmail(): Send email with PDF attachment
    - updateDocumentEmailStatus(): Update sent_to_email and sent_at
    - _Requirements: 8.1, 8.2_
  - [x] 12.2 Write property tests for email tracking
    - **Property 20: Email Send Tracking**
    - **Validates: Requirements 8.2**
  - [x] 12.3 Implement email error handling
    - Handle failed sends, log errors, return failure status
    - _Requirements: 8.3_
  - [x] 12.4 Write property tests for email error handling
    - **Property 21: Email Error Handling**
    - **Validates: Requirements 8.3**
  - [x] 12.5 Implement multi-recipient support
    - Support array of email addresses
    - _Requirements: 8.4_
  - [x] 12.6 Write property tests for multi-recipient email
    - **Property 22: Multi-Recipient Email Support**
    - **Validates: Requirements 8.4**

- [x] 13. Document History Implementation
  - [x] 13.1 Implement history query functions in lib/document-generator-actions.ts
    - getGenerationHistory(): Query with filters (entity, type, date range)
    - Build dynamic query based on provided filters
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 13.2 Write property tests for history filtering
    - **Property 23: Document History Filtering**
    - **Validates: Requirements 9.1, 9.2, 9.3**
  - [x] 13.3 Implement history data enrichment
    - Join with document_templates for template_name
    - Join with user_profiles for generated_by info
    - _Requirements: 9.4_
  - [x] 13.4 Write property tests for history data completeness
    - **Property 24: Document History Data Completeness**
    - **Validates: Requirements 9.4**

- [x] 14. Checkpoint - All Generation Types Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. UI Components
  - [x] 15.1 Create template management page at app/(main)/settings/document-templates/page.tsx
    - List templates with filters by document_type
    - Add/Edit/Delete template functionality
    - _Requirements: 1.1, 1.5, 1.6_
  - [x] 15.2 Create template editor component at components/document-templates/template-editor.tsx
    - HTML editor with syntax highlighting
    - Variable insertion helper
    - Preview functionality
    - _Requirements: 1.2, 1.4_
  - [x] 15.3 Create document generation dialog component at components/document-generation/generate-dialog.tsx
    - Template selection
    - Preview before generation
    - Generate button with loading state
    - _Requirements: 5.1, 6.1, 7.1_
  - [x] 15.4 Create document history component at components/document-generation/document-history.tsx
    - List generated documents with filters
    - Download and email actions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 15.5 Integrate generation buttons into existing pages
    - Add "Generate PDF" button to invoice detail page
    - Add "Generate PDF" button to quotation detail page
    - Add "Generate Delivery Note" button to job order page
    - _Requirements: 5.1, 6.1, 7.1_

- [x] 16. n8n Workflow Setup
  - [x] 16.1 Create invoice generation workflow JSON
    - Webhook trigger, data fetch, template process, PDF convert, upload, update
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 16.2 Create quotation generation workflow JSON
    - Similar flow for quotations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 16.3 Create delivery note generation workflow JSON
    - Similar flow for delivery notes
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [x] 16.4 Document workflow setup instructions
    - Environment variables needed (HTML2PDF_API_KEY, SUPABASE_URL, etc.)
    - Import instructions for n8n
    - _Requirements: 3.1, 4.1_

- [x] 17. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all document types generate correctly
  - Verify email delivery works
  - Verify history tracking is complete

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- n8n workflows can be imported directly into n8n instance
