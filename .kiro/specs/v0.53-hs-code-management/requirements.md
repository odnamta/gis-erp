# Requirements Document

## Introduction

This document defines the requirements for the HS (Harmonized System) Code Management module in Gama ERP. The module provides a searchable database of HS codes with duty rates, preferential rates by FTA (Free Trade Agreement), and import/export restrictions. This supports the customs documentation workflow by enabling accurate tariff classification and duty calculation.

## Glossary

- **HS_Code_System**: The Harmonized System code database and search functionality
- **HS_Code**: A standardized numerical code (8-10 digits in Indonesian BTKI) used to classify traded products
- **HS_Chapter**: The first 2 digits of an HS code representing broad product categories
- **HS_Heading**: The first 4 digits of an HS code representing more specific product groups
- **MFN_Rate**: Most Favored Nation duty rate - the standard import duty rate
- **Preferential_Rate**: Reduced duty rate available under Free Trade Agreements
- **FTA**: Free Trade Agreement (e.g., ATIGA, ACFTA, AKFTA, AJCEP, AANZFTA, IJEPA)
- **Lartas**: Indonesian term for import/export restrictions (Larangan dan Pembatasan)
- **PPN**: Value Added Tax (Pajak Pertambahan Nilai) - currently 11%
- **PPnBM**: Luxury Goods Tax (Pajak Penjualan atas Barang Mewah)
- **PPh_Import**: Income Tax on Imports (Pajak Penghasilan Impor) - typically 2.5%
- **COO**: Certificate of Origin - required document for preferential rates
- **BTKI**: Indonesian Customs Tariff Book (Buku Tarif Kepabeanan Indonesia)
- **Search_History**: Record of user searches for providing suggestions

## Requirements

### Requirement 1: HS Code Database Structure

**User Story:** As a customs administrator, I want a comprehensive HS code database with hierarchical structure, so that I can accurately classify goods for import/export documentation.

#### Acceptance Criteria

1. THE HS_Code_System SHALL store HS chapters with 2-digit chapter codes, chapter names in English and Indonesian, and section information
2. THE HS_Code_System SHALL store HS headings with 4-digit heading codes linked to their parent chapters
3. THE HS_Code_System SHALL store full HS codes (8-10 digits BTKI format) with descriptions in English and Indonesian
4. THE HS_Code_System SHALL store statistical units for each HS code
5. WHEN an HS code is created, THE HS_Code_System SHALL link it to its parent heading
6. THE HS_Code_System SHALL support soft-delete via is_active flag for HS codes

### Requirement 2: Duty Rate Management

**User Story:** As a customs administrator, I want to view and manage duty rates for HS codes, so that I can calculate accurate import duties.

#### Acceptance Criteria

1. THE HS_Code_System SHALL store MFN (Most Favored Nation) duty rates as decimal percentages for each HS code
2. THE HS_Code_System SHALL store PPN (VAT) rates for each HS code with default of 11%
3. THE HS_Code_System SHALL store PPnBM (luxury goods tax) rates for applicable HS codes
4. THE HS_Code_System SHALL store PPh Import rates for each HS code with default of 2.5%
5. WHEN duty rates are retrieved, THE HS_Code_System SHALL return all applicable rates (MFN, PPN, PPnBM, PPh)

### Requirement 3: Preferential Rate Management

**User Story:** As a customs administrator, I want to access preferential duty rates by FTA, so that I can apply correct rates when Certificate of Origin is available.

#### Acceptance Criteria

1. THE HS_Code_System SHALL store preferential rates linked to specific HS codes and FTA codes
2. THE HS_Code_System SHALL support FTA codes including ATIGA, ACFTA, AKFTA, AJCEP, AANZFTA, and IJEPA
3. THE HS_Code_System SHALL store effective date ranges for preferential rates
4. THE HS_Code_System SHALL indicate whether COO (Certificate of Origin) is required for each preferential rate
5. WHEN a preferential rate is requested, THE HS_Code_System SHALL return only rates valid for the current date
6. WHEN no valid preferential rate exists, THE HS_Code_System SHALL return null

### Requirement 4: Restriction Tracking

**User Story:** As a customs administrator, I want to see import/export restrictions (Lartas) for HS codes, so that I can ensure compliance with regulations.

#### Acceptance Criteria

1. THE HS_Code_System SHALL flag HS codes that have import restrictions
2. THE HS_Code_System SHALL store restriction type and issuing authority for restricted HS codes
3. THE HS_Code_System SHALL flag HS codes that have export restrictions separately from import restrictions
4. THE HS_Code_System SHALL store export restriction type for applicable HS codes
5. WHEN an HS code with restrictions is displayed, THE HS_Code_System SHALL prominently show the restriction warning

### Requirement 5: HS Code Search

**User Story:** As a user, I want to search HS codes by code prefix or description, so that I can quickly find the correct classification.

#### Acceptance Criteria

1. WHEN a user enters numeric digits, THE HS_Code_System SHALL search by HS code prefix
2. WHEN a user enters text, THE HS_Code_System SHALL search descriptions in both English and Indonesian
3. THE HS_Code_System SHALL rank search results by relevance score
4. THE HS_Code_System SHALL return chapter name with each search result for context
5. THE HS_Code_System SHALL limit search results to a configurable maximum (default 20)
6. THE HS_Code_System SHALL only return active HS codes in search results

### Requirement 6: Search History and Suggestions

**User Story:** As a user, I want to see my frequently used HS codes, so that I can quickly select commonly used classifications.

#### Acceptance Criteria

1. WHEN a user selects an HS code from search results, THE HS_Code_System SHALL log the search term and selected code
2. THE HS_Code_System SHALL track search history per user
3. WHEN a user opens the HS code selector, THE HS_Code_System SHALL display frequently used codes based on search history
4. THE HS_Code_System SHALL calculate frequency from recent searches (last 100 searches)
5. THE HS_Code_System SHALL return a configurable number of frequent codes (default 10)

### Requirement 7: HS Code Browser

**User Story:** As a user, I want to browse HS codes by chapter hierarchy, so that I can explore available classifications systematically.

#### Acceptance Criteria

1. THE HS_Code_System SHALL display a list of all HS chapters with chapter codes and names
2. WHEN a user selects a chapter, THE HS_Code_System SHALL display all headings within that chapter
3. WHEN a user selects a heading, THE HS_Code_System SHALL display all HS codes within that heading
4. THE HS_Code_System SHALL show duty rates and restriction flags in the browse view

### Requirement 8: Rate Calculator

**User Story:** As a user, I want to calculate total duties for a given HS code and value, so that I can estimate import costs.

#### Acceptance Criteria

1. WHEN a user enters HS code and CIF value, THE HS_Code_System SHALL calculate total duties
2. THE HS_Code_System SHALL calculate BM (import duty) based on MFN or preferential rate
3. THE HS_Code_System SHALL calculate PPN based on (CIF + BM) value
4. THE HS_Code_System SHALL calculate PPnBM if applicable based on (CIF + BM) value
5. THE HS_Code_System SHALL calculate PPh Import based on (CIF + BM + PPN + PPnBM) value
6. WHEN preferential rate is selected, THE HS_Code_System SHALL use the FTA rate instead of MFN rate
7. THE HS_Code_System SHALL display itemized breakdown of all duty components

### Requirement 9: Integration with PIB/PEB Forms

**User Story:** As a user creating import/export documentation, I want a searchable HS code dropdown, so that I can quickly select correct classifications.

#### Acceptance Criteria

1. THE HS_Code_System SHALL provide a searchable dropdown component for PIB item forms
2. THE HS_Code_System SHALL provide a searchable dropdown component for PEB item forms
3. WHEN an HS code is selected, THE HS_Code_System SHALL auto-populate duty rates in the form
4. WHEN an HS code with restrictions is selected, THE HS_Code_System SHALL display a warning alert
5. THE HS_Code_System SHALL show frequently used codes at the top of the dropdown
