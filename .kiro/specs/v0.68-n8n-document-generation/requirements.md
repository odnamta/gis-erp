# Requirements Document

## Introduction

This document defines the requirements for the n8n Document Generation module (v0.68) in Gama ERP. The system automates document generation including invoices, quotations, delivery notes, contracts, and certificates using n8n workflows with HTML-to-PDF conversion and Supabase storage integration.

## Glossary

- **Document_Generator**: The system component responsible for creating PDF documents from templates
- **Template_Engine**: The component that processes HTML templates with variable substitution
- **PDF_Converter**: The service that converts rendered HTML to PDF format
- **Storage_Manager**: The component that handles file uploads to Supabase storage
- **Template_Manager**: The component that manages document templates (CRUD operations)
- **Variable_Processor**: The component that extracts and substitutes variables in templates

## Requirements

### Requirement 1: Document Template Management

**User Story:** As an administrator, I want to manage document templates, so that I can customize the appearance and content of generated documents.

#### Acceptance Criteria

1. THE Template_Manager SHALL store templates with unique template_code identifiers
2. WHEN a template is created, THE Template_Manager SHALL validate that html_template field is not empty
3. THE Template_Manager SHALL support document types: invoice, quotation, contract, certificate, report, packing_list, delivery_note
4. WHEN a template is retrieved, THE Template_Manager SHALL return all template properties including html_template, css_styles, page_size, orientation, and margins
5. THE Template_Manager SHALL allow templates to be activated or deactivated via is_active flag
6. WHEN listing templates, THE Template_Manager SHALL filter by document_type when specified

### Requirement 2: Variable Substitution in Templates

**User Story:** As a system, I want to substitute variables in templates with actual data, so that documents contain accurate entity-specific information.

#### Acceptance Criteria

1. WHEN rendering a template, THE Variable_Processor SHALL replace all {{variable_name}} placeholders with corresponding values
2. WHEN a variable value is missing, THE Variable_Processor SHALL replace the placeholder with an empty string
3. THE Variable_Processor SHALL support loop constructs {{#items}}...{{/items}} for repeating sections
4. WHEN processing loops, THE Variable_Processor SHALL iterate over array data and render each item
5. THE Variable_Processor SHALL preserve HTML structure when substituting variables
6. WHEN a template includes {{letterhead}}, THE Variable_Processor SHALL inject company letterhead HTML if include_letterhead is true

### Requirement 3: HTML to PDF Conversion

**User Story:** As a user, I want to convert rendered HTML documents to PDF format, so that I can share professional documents with customers and vendors.

#### Acceptance Criteria

1. WHEN converting HTML to PDF, THE PDF_Converter SHALL apply page_size setting from template (A4, Letter, Legal)
2. WHEN converting HTML to PDF, THE PDF_Converter SHALL apply orientation setting (portrait, landscape)
3. WHEN converting HTML to PDF, THE PDF_Converter SHALL apply margin settings from template
4. IF header_html is defined, THEN THE PDF_Converter SHALL include header on each page
5. IF footer_html is defined, THEN THE PDF_Converter SHALL include footer on each page
6. WHEN conversion fails, THE PDF_Converter SHALL return a descriptive error message

### Requirement 4: Document Storage and Tracking

**User Story:** As a user, I want generated documents stored and tracked, so that I can access document history and download files later.

#### Acceptance Criteria

1. WHEN a document is generated, THE Storage_Manager SHALL upload the PDF to Supabase storage bucket
2. WHEN uploading, THE Storage_Manager SHALL use a structured file path: {document_type}/{year}/{month}/{filename}
3. THE Document_Generator SHALL create a generated_documents record linking to the source entity
4. THE Document_Generator SHALL record file_url, file_name, file_size_kb, and generated_at timestamp
5. WHEN a document is generated, THE Document_Generator SHALL store the variables_data used for generation
6. THE Storage_Manager SHALL return a public URL for the uploaded document

### Requirement 5: Invoice Document Generation

**User Story:** As an administrator, I want to generate invoice PDFs from invoice records, so that I can send professional invoices to customers.

#### Acceptance Criteria

1. WHEN generating an invoice document, THE Document_Generator SHALL fetch invoice data including invoice_number, invoice_date, and total_amount
2. WHEN generating an invoice document, THE Document_Generator SHALL fetch associated customer data (name, address, email)
3. WHEN generating an invoice document, THE Document_Generator SHALL fetch all invoice line items
4. THE Document_Generator SHALL calculate subtotal, tax_amount, and total_amount for display
5. WHEN invoice generation completes, THE Document_Generator SHALL update the invoice record with pdf_url
6. IF invoice data is incomplete, THEN THE Document_Generator SHALL return a validation error

### Requirement 6: Quotation Document Generation

**User Story:** As a sales user, I want to generate quotation PDFs, so that I can send professional proposals to potential customers.

#### Acceptance Criteria

1. WHEN generating a quotation document, THE Document_Generator SHALL fetch quotation data including quotation_number, quotation_date, and valid_until
2. WHEN generating a quotation document, THE Document_Generator SHALL fetch associated customer and project data
3. WHEN generating a quotation document, THE Document_Generator SHALL include scope of work and terms
4. THE Document_Generator SHALL fetch all quotation revenue items for the price breakdown
5. WHEN quotation generation completes, THE Document_Generator SHALL update the quotation record with pdf_url

### Requirement 7: Delivery Note Document Generation

**User Story:** As an operations user, I want to generate delivery note PDFs, so that I can document cargo handover with proper paperwork.

#### Acceptance Criteria

1. WHEN generating a delivery note, THE Document_Generator SHALL fetch job order data including jo_number and delivery details
2. WHEN generating a delivery note, THE Document_Generator SHALL include origin and destination information
3. THE Document_Generator SHALL include a list of items delivered with quantities and conditions
4. THE Document_Generator SHALL include signature fields for receiver acknowledgment
5. WHEN delivery note generation completes, THE Document_Generator SHALL create a generated_documents record

### Requirement 8: Document Delivery via Email

**User Story:** As a user, I want to email generated documents to recipients, so that I can efficiently share documents with customers and vendors.

#### Acceptance Criteria

1. WHEN sending a document via email, THE Document_Generator SHALL attach the PDF file
2. WHEN sending a document, THE Document_Generator SHALL record sent_to_email and sent_at in generated_documents
3. IF email delivery fails, THEN THE Document_Generator SHALL log the error and return failure status
4. THE Document_Generator SHALL support sending to multiple email addresses

### Requirement 9: Document Generation History

**User Story:** As an administrator, I want to view document generation history, so that I can track what documents were created and when.

#### Acceptance Criteria

1. THE Document_Generator SHALL provide a list of generated documents filtered by entity_type and entity_id
2. THE Document_Generator SHALL provide a list of generated documents filtered by document_type
3. THE Document_Generator SHALL provide a list of generated documents filtered by date range
4. WHEN listing documents, THE Document_Generator SHALL include template_name, generated_at, and generated_by information
5. THE Document_Generator SHALL allow downloading previously generated documents via file_url
