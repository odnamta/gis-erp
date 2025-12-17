# Requirements Document

## Introduction

This document defines the requirements for the Company Settings feature in Gama ERP. The Company Settings page allows administrators to configure company-wide settings including company information, invoice defaults, document numbering formats, and company logo. These settings are used throughout the application for document generation, invoice calculations, and branding.

## Glossary

- **Company_Settings_System**: The module responsible for storing, retrieving, and applying company-wide configuration settings
- **VAT_Rate**: Value Added Tax percentage applied to invoice calculations
- **Payment_Terms**: Default number of days allowed for invoice payment
- **Document_Number_Format**: Template pattern used to generate sequential document numbers (PJO, JO, Invoice)
- **NPWP**: Nomor Pokok Wajib Pajak - Indonesian Tax Identification Number

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to view and edit company information, so that the correct company details appear on all generated documents.

#### Acceptance Criteria

1. WHEN an administrator navigates to the company settings page THEN the Company_Settings_System SHALL display all current company information fields including company name, legal name, tax ID, address, phone, and email
2. WHEN an administrator modifies company information fields and clicks save THEN the Company_Settings_System SHALL persist the updated values to the database
3. WHEN company information is saved THEN the Company_Settings_System SHALL record the timestamp and user who made the update
4. IF an administrator attempts to save with required fields empty THEN the Company_Settings_System SHALL display validation errors and prevent the save operation

### Requirement 2

**User Story:** As an administrator, I want to configure invoice settings, so that new invoices use the correct VAT rate, payment terms, and bank details.

#### Acceptance Criteria

1. WHEN an administrator views invoice settings THEN the Company_Settings_System SHALL display current VAT rate, default payment terms, invoice prefix, bank name, bank account number, and bank account name
2. WHEN an administrator updates the VAT rate THEN the Company_Settings_System SHALL validate that the value is a valid percentage between 0 and 100
3. WHEN an administrator updates default payment terms THEN the Company_Settings_System SHALL validate that the value is a positive integer representing days
4. WHEN a new invoice is created THEN the Invoice_System SHALL use the configured VAT rate for tax calculations
5. WHEN a new invoice is created THEN the Invoice_System SHALL use the configured payment terms as the default due date offset

### Requirement 3

**User Story:** As an administrator, I want to configure document numbering formats, so that PJOs, JOs, and invoices follow the company's numbering convention.

#### Acceptance Criteria

1. WHEN an administrator views document numbering settings THEN the Company_Settings_System SHALL display current format patterns for PJO, JO, and Invoice numbers
2. WHEN an administrator modifies a document number format THEN the Company_Settings_System SHALL display a live preview of the resulting number
3. WHEN a document number format is saved THEN the Company_Settings_System SHALL validate that the format contains required placeholders (NNNN for sequence, MM for month, YYYY for year)
4. WHEN a new PJO is created THEN the PJO_System SHALL generate the number using the configured PJO format
5. WHEN a new JO is created THEN the JO_System SHALL generate the number using the configured JO format
6. WHEN a new invoice is created THEN the Invoice_System SHALL generate the number using the configured invoice format

### Requirement 4

**User Story:** As an administrator, I want to upload and manage the company logo, so that it appears on generated documents and the application interface.

#### Acceptance Criteria

1. WHEN an administrator views the logo section THEN the Company_Settings_System SHALL display the current company logo if one exists
2. WHEN an administrator uploads a new logo THEN the Company_Settings_System SHALL accept image files in PNG, JPG, or SVG format
3. WHEN an administrator uploads a new logo THEN the Company_Settings_System SHALL validate that the file size does not exceed 2MB
4. WHEN a logo is successfully uploaded THEN the Company_Settings_System SHALL store the image in Supabase Storage and update the logo URL setting
5. IF an administrator uploads an invalid file type THEN the Company_Settings_System SHALL display an error message and reject the upload

### Requirement 5

**User Story:** As an administrator, I want settings changes to take effect immediately, so that subsequent operations use the updated configuration.

#### Acceptance Criteria

1. WHEN settings are successfully saved THEN the Company_Settings_System SHALL display a success confirmation message
2. WHEN settings are saved THEN the Company_Settings_System SHALL make the new values available to all system components immediately
3. IF a database error occurs during save THEN the Company_Settings_System SHALL display an error message and preserve the form state for retry

### Requirement 6

**User Story:** As a system administrator, I want only authorized users to access company settings, so that sensitive configuration is protected.

#### Acceptance Criteria

1. WHEN a user without admin or owner role attempts to access company settings THEN the Company_Settings_System SHALL deny access and redirect to the dashboard
2. WHEN an authorized administrator accesses company settings THEN the Company_Settings_System SHALL load and display all settings sections
