# Design Document: Vendor Management (v0.20)

## Overview

The Vendor Management module provides a comprehensive system for managing vendors/suppliers in Gama ERP. It enables tracking of vendor information, equipment assets, performance ratings, and integrates with existing PJO cost items and BKK payment workflows. The module is designed to support manual input for non-tech-savvy vendors while establishing a foundation for future procurement enhancements.

## Architecture

The module follows the existing Gama ERP architecture patterns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  /vendors                    │  Vendor list page                │
│  /vendors/new                │  Create vendor form              │
│  /vendors/[id]               │  Vendor detail view              │
│  /vendors/[id]/edit          │  Edit vendor form                │
│  /vendors/[id]/equipment/new │  Add equipment form              │
├─────────────────────────────────────────────────────────────────┤
│                     Components Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  VendorTable          │  List view with filters                 │
│  VendorForm           │  Create/edit vendor form                │
│  VendorDetailView     │  Complete vendor information            │
│  VendorFilters        │  Search and filter controls             │
│  EquipmentTable       │  Equipment list for vendor              │
│  EquipmentForm        │  Add/edit equipment                     │
│  VendorRatingForm     │  Rate vendor after job                  │
│  VendorSelector       │  Dropdown for PJO/BKK integration       │
│  VendorDocuments      │  Document upload and list               │
├─────────────────────────────────────────────────────────────────┤
│                      Server Actions                              │
├─────────────────────────────────────────────────────────────────┤
│  app/(main)/vendors/actions.ts                                  │
│  - createVendor, updateVendor, deleteVendor                     │
│  - getVendors, getVendorById, getVendorsByType                  │
│  - verifyVendor, togglePreferred                                │
│  app/(main)/vendors/equipment-actions.ts                        │
│  - createEquipment, updateEquipment, deleteEquipment            │
│  - getVendorEquipment                                           │
│  app/(main)/vendors/rating-actions.ts                           │
│  - rateVendor, updateVendorMetrics                              │
│  app/(main)/vendors/document-actions.ts                         │
│  - uploadDocument, deleteDocument                               │
├─────────────────────────────────────────────────────────────────┤
│                      Supabase (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────────┤
│  vendors              │  Main vendor records                    │
│  vendor_equipment     │  Equipment/assets per vendor            │
│  vendor_contacts      │  Additional contacts                    │
│  vendor_documents     │  Uploaded documents                     │
│  vendor_ratings       │  Performance ratings                    │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Page Components

#### VendorsPage (`/vendors/page.tsx`)
Main listing page displaying all vendors with filtering and search capabilities.

```typescript
interface VendorsPageProps {
  searchParams: {
    search?: string;
    type?: VendorType;
    status?: 'active' | 'inactive';
    preferred?: 'true';
    page?: string;
  };
}
```

#### VendorDetailPage (`/vendors/[id]/page.tsx`)
Detailed view of a single vendor with all related information.

```typescript
interface VendorDetailPageProps {
  params: { id: string };
}
```

### UI Components

#### VendorTable
Displays paginated list of vendors with actions.

```typescript
interface VendorTableProps {
  vendors: VendorWithStats[];
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onRate: (id: string) => void;
}
```

#### VendorForm
Form for creating and editing vendors.

```typescript
interface VendorFormProps {
  vendor?: Vendor;
  onSubmit: (data: VendorFormData) => Promise<void>;
  onCancel: () => void;
}

interface VendorFormData {
  vendor_name: string;
  vendor_type: VendorType;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_position?: string;
  legal_name?: string;
  tax_id?: string;
  business_license?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account?: string;
  bank_account_name?: string;
  is_active: boolean;
  is_preferred: boolean;
  notes?: string;
}
```

#### VendorFilters
Filter controls for vendor list.

```typescript
interface VendorFiltersProps {
  filters: VendorFilterState;
  onFilterChange: (filters: VendorFilterState) => void;
}

interface VendorFilterState {
  search: string;
  type: VendorType | 'all';
  status: 'active' | 'inactive' | 'all';
  preferredOnly: boolean;
}
```

#### VendorSelector
Dropdown component for selecting vendors in PJO cost items and BKK.

```typescript
interface VendorSelectorProps {
  vendorType?: VendorType;
  value?: string;
  onChange: (vendorId: string | null) => void;
  showEquipment?: boolean;
  onEquipmentChange?: (equipmentId: string | null) => void;
}
```

#### EquipmentTable
Displays equipment list for a vendor.

```typescript
interface EquipmentTableProps {
  equipment: VendorEquipment[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

#### EquipmentForm
Form for adding/editing equipment.

```typescript
interface EquipmentFormProps {
  vendorId: string;
  equipment?: VendorEquipment;
  onSubmit: (data: EquipmentFormData) => Promise<void>;
  onCancel: () => void;
}
```

#### VendorRatingForm
Form for rating a vendor after job completion.

```typescript
interface VendorRatingFormProps {
  vendorId: string;
  joId?: string;
  bkkId?: string;
  onSubmit: (data: RatingFormData) => Promise<void>;
  onCancel: () => void;
}

interface RatingFormData {
  overall_rating: number;
  punctuality_rating: number;
  quality_rating: number;
  communication_rating: number;
  price_rating: number;
  was_on_time: boolean;
  had_issues: boolean;
  issue_description?: string;
  comments?: string;
}
```

#### VendorDocuments
Document upload and list component.

```typescript
interface VendorDocumentsProps {
  vendorId: string;
  documents: VendorDocument[];
  onUpload: (file: File, type: DocumentType, expiryDate?: Date) => Promise<void>;
  onDelete: (id: string) => void;
}
```

## Data Models

### Database Schema

```sql
-- Main vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(20) UNIQUE NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    contact_position VARCHAR(100),
    legal_name VARCHAR(255),
    tax_id VARCHAR(30),
    business_license VARCHAR(50),
    bank_name VARCHAR(100),
    bank_branch VARCHAR(100),
    bank_account VARCHAR(50),
    bank_account_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_preferred BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES user_profiles(id),
    total_jobs INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    average_rating DECIMAL(3,2),
    on_time_rate DECIMAL(5,2),
    registration_method VARCHAR(30) DEFAULT 'manual',
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor equipment/assets
CREATE TABLE vendor_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    equipment_type VARCHAR(50) NOT NULL,
    plate_number VARCHAR(20),
    brand VARCHAR(50),
    model VARCHAR(50),
    year_made INTEGER,
    capacity_kg DECIMAL(12,2),
    capacity_m3 DECIMAL(10,2),
    capacity_description VARCHAR(200),
    length_m DECIMAL(6,2),
    width_m DECIMAL(6,2),
    height_m DECIMAL(6,2),
    daily_rate DECIMAL(15,2),
    rate_notes VARCHAR(200),
    is_available BOOLEAN DEFAULT TRUE,
    condition VARCHAR(30) DEFAULT 'good',
    stnk_expiry DATE,
    kir_expiry DATE,
    insurance_expiry DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor contacts (additional)
CREATE TABLE vendor_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    contact_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    whatsapp VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor documents
CREATE TABLE vendor_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(200),
    file_url VARCHAR(500),
    expiry_date DATE,
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor ratings
CREATE TABLE vendor_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    jo_id UUID REFERENCES job_orders(id),
    bkk_id UUID REFERENCES bukti_kas_keluar(id),
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    price_rating INTEGER CHECK (price_rating BETWEEN 1 AND 5),
    was_on_time BOOLEAN,
    had_issues BOOLEAN DEFAULT FALSE,
    issue_description TEXT,
    comments TEXT,
    rated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_preferred ON vendors(is_preferred) WHERE is_preferred = TRUE;
CREATE INDEX idx_vendor_equipment_vendor ON vendor_equipment(vendor_id);
CREATE INDEX idx_vendor_equipment_type ON vendor_equipment(equipment_type);
CREATE INDEX idx_vendor_ratings_vendor ON vendor_ratings(vendor_id);
```

### TypeScript Types

```typescript
// types/vendors.ts

export type VendorType = 
  | 'trucking'
  | 'shipping'
  | 'port'
  | 'handling'
  | 'forwarding'
  | 'documentation'
  | 'other';

export type EquipmentType =
  | 'trailer_40ft'
  | 'trailer_20ft'
  | 'lowbed'
  | 'fuso'
  | 'wingbox'
  | 'crane'
  | 'forklift'
  | 'excavator'
  | 'other';

export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type DocumentType =
  | 'npwp'
  | 'siup'
  | 'nib'
  | 'stnk'
  | 'kir'
  | 'insurance'
  | 'contract'
  | 'other';

export interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: VendorType;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_position?: string;
  legal_name?: string;
  tax_id?: string;
  business_license?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account?: string;
  bank_account_name?: string;
  is_active: boolean;
  is_preferred: boolean;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  total_jobs: number;
  total_value: number;
  average_rating?: number;
  on_time_rate?: number;
  registration_method: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorWithStats extends Vendor {
  equipment_count: number;
  ratings_count: number;
}

export interface VendorEquipment {
  id: string;
  vendor_id: string;
  equipment_type: EquipmentType;
  plate_number?: string;
  brand?: string;
  model?: string;
  year_made?: number;
  capacity_kg?: number;
  capacity_m3?: number;
  capacity_description?: string;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  daily_rate?: number;
  rate_notes?: string;
  is_available: boolean;
  condition: EquipmentCondition;
  stnk_expiry?: string;
  kir_expiry?: string;
  insurance_expiry?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorContact {
  id: string;
  vendor_id: string;
  contact_name: string;
  position?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: DocumentType;
  document_name?: string;
  file_url?: string;
  expiry_date?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface VendorRating {
  id: string;
  vendor_id: string;
  jo_id?: string;
  bkk_id?: string;
  overall_rating: number;
  punctuality_rating: number;
  quality_rating: number;
  communication_rating: number;
  price_rating: number;
  was_on_time: boolean;
  had_issues: boolean;
  issue_description?: string;
  comments?: string;
  rated_by?: string;
  created_at: string;
}
```

### Utility Functions

```typescript
// lib/vendor-utils.ts

export const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: 'trucking', label: 'Trucking / Transport' },
  { value: 'shipping', label: 'Shipping Line' },
  { value: 'port', label: 'Port Agent' },
  { value: 'handling', label: 'Cargo Handling' },
  { value: 'forwarding', label: 'Freight Forwarding' },
  { value: 'documentation', label: 'Documentation / Customs' },
  { value: 'other', label: 'Other' },
];

export const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: 'trailer_40ft', label: 'Trailer 40ft' },
  { value: 'trailer_20ft', label: 'Trailer 20ft' },
  { value: 'lowbed', label: 'Lowbed' },
  { value: 'fuso', label: 'Fuso' },
  { value: 'wingbox', label: 'Wingbox' },
  { value: 'crane', label: 'Crane' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'excavator', label: 'Excavator' },
  { value: 'other', label: 'Other' },
];

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'npwp', label: 'NPWP' },
  { value: 'siup', label: 'SIUP' },
  { value: 'nib', label: 'NIB' },
  { value: 'stnk', label: 'STNK' },
  { value: 'kir', label: 'KIR' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

export function generateVendorCode(count: number): string {
  return `VND-${String(count + 1).padStart(3, '0')}`;
}

export function getVendorTypeLabel(type: VendorType): string {
  return VENDOR_TYPES.find(t => t.value === type)?.label || type;
}

export function getEquipmentTypeLabel(type: EquipmentType): string {
  return EQUIPMENT_TYPES.find(t => t.value === type)?.label || type;
}

export function isDocumentExpired(expiryDate: string | undefined): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

export function isDocumentExpiringSoon(expiryDate: string | undefined, days: number = 30): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return expiry <= threshold && expiry >= new Date();
}

export function calculateAverageRating(ratings: VendorRating[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.overall_rating, 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}

export function calculateOnTimeRate(ratings: VendorRating[]): number | null {
  if (ratings.length === 0) return null;
  const onTimeCount = ratings.filter(r => r.was_on_time).length;
  return Math.round((onTimeCount / ratings.length) * 100 * 100) / 100;
}

export function mapCostCategoryToVendorType(category: string): VendorType | undefined {
  const mapping: Record<string, VendorType> = {
    trucking: 'trucking',
    port_charges: 'port',
    documentation: 'documentation',
    handling: 'handling',
    customs: 'documentation',
    shipping: 'shipping',
  };
  return mapping[category];
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Vendor Code Uniqueness and Format

*For any* number of existing vendors in the system, when a new vendor is created, the generated vendor_code SHALL follow the format VND-XXX (where XXX is a zero-padded number) and SHALL be unique across all vendors.

**Validates: Requirements 1.1**

### Property 2: Vendor Mandatory Field Validation

*For any* vendor creation or update attempt, if vendor_name is empty or vendor_type is not one of the valid types (trucking, shipping, port, handling, forwarding, documentation, other), the operation SHALL be rejected and the vendor SHALL NOT be saved.

**Validates: Requirements 1.2, 1.3**

### Property 3: Vendor Data Round-Trip Consistency

*For any* valid vendor data including contact information, primary contact details, legal information, and bank details, saving the vendor and then retrieving it SHALL return data equivalent to the original input.

**Validates: Requirements 1.4, 1.5, 1.6, 1.7**

### Property 4: Vendor Search and Filter Correctness

*For any* search query or filter combination (type, status, preferred), all vendors returned in the results SHALL match the specified criteria:
- Search results contain vendors where vendor_name OR vendor_code contains the search term
- Type filter results contain only vendors with the specified vendor_type
- Status filter results contain only vendors with the specified is_active value
- Preferred filter results contain only vendors where is_preferred is true

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

### Property 5: Vendor Summary Statistics Accuracy

*For any* set of vendors, the summary statistics SHALL accurately reflect:
- Total vendors = count of all vendors
- Active vendors = count of vendors where is_active is true
- Preferred vendors = count of vendors where is_preferred is true
- Pending verification = count of vendors where is_verified is false

**Validates: Requirements 2.6**

### Property 6: Equipment Mandatory Field Validation

*For any* equipment creation attempt, if equipment_type is empty or not one of the valid types, the operation SHALL be rejected and the equipment SHALL NOT be saved.

**Validates: Requirements 4.1, 4.2**

### Property 7: Equipment Data Round-Trip Consistency

*For any* valid equipment data including plate_number, brand, model, capacity, dimensions, daily_rate, and document expiry dates, saving the equipment and then retrieving it SHALL return data equivalent to the original input.

**Validates: Requirements 4.3, 4.4**

### Property 8: Document Expiry Detection

*For any* date value, the system SHALL correctly identify:
- Expired: date is before current date
- Expiring soon: date is within 30 days of current date but not expired
- Valid: date is more than 30 days in the future

**Validates: Requirements 4.6, 9.3**

### Property 9: Vendor Verification Metadata

*For any* vendor verification action, the system SHALL record verified_at as the current timestamp and verified_by as the ID of the user performing the action, and is_verified SHALL be set to true.

**Validates: Requirements 5.1**

### Property 10: Inactive Vendor Exclusion

*For any* vendor where is_active is false, that vendor SHALL NOT appear in vendor selection dropdowns used for PJO cost items or BKK creation.

**Validates: Requirements 5.3**

### Property 11: Rating Value Constraints

*For any* vendor rating, all rating values (overall_rating, punctuality_rating, quality_rating, communication_rating, price_rating) SHALL be integers between 1 and 5 inclusive.

**Validates: Requirements 6.1**

### Property 12: Average Rating Calculation

*For any* vendor with one or more ratings, the average_rating SHALL equal the arithmetic mean of all overall_rating values, rounded to 2 decimal places.

**Validates: Requirements 6.3**

### Property 13: On-Time Rate Calculation

*For any* vendor with one or more ratings, the on_time_rate SHALL equal (count of ratings where was_on_time is true / total ratings) × 100, rounded to 2 decimal places.

**Validates: Requirements 6.3**

### Property 14: Vendor Dropdown Sort Order

*For any* list of vendors displayed in a selection dropdown, preferred vendors (is_preferred = true) SHALL appear before non-preferred vendors, and within each group, vendors SHALL be sorted by average_rating in descending order.

**Validates: Requirements 7.2**

### Property 15: Equipment Filtering by Vendor

*For any* vendor selection in a cost item form, the equipment dropdown SHALL only display equipment belonging to the selected vendor (vendor_id matches).

**Validates: Requirements 7.3**

### Property 16: Vendor Metrics Update on BKK Settlement

*For any* BKK that is settled with a linked vendor, the vendor's total_jobs SHALL be incremented by 1 and total_value SHALL be increased by the BKK amount_spent.

**Validates: Requirements 8.4**

### Property 17: Document Upload Validation

*For any* document upload attempt, if document_type is empty or not one of the valid types, the operation SHALL be rejected.

**Validates: Requirements 9.1, 9.2**

### Property 18: Role-Based Permission Enforcement

*For any* user action on vendors, the system SHALL enforce permissions based on user role:
- View: allowed for owner, admin, manager, finance, ops, sales, viewer
- Create: allowed only for owner, admin, ops
- Edit: allowed only for owner, admin, manager
- Delete: allowed only for owner, admin
- Verify: allowed only for owner, admin
- Set preferred: allowed only for owner, admin, manager
- Add equipment: allowed only for owner, admin, manager, ops
- Rate vendor: allowed only for owner, admin, manager, finance, ops
- View bank details: allowed only for owner, admin, manager, finance

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9**

### Property 19: Navigation Visibility by Role

*For any* user with role owner, admin, manager, finance, ops, or sales, the Vendors menu item SHALL be visible in the sidebar. For users with role viewer, the Vendors menu item SHALL NOT be visible.

**Validates: Requirements 11.2, 11.3**

## Error Handling

### Validation Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Missing vendor_name | "Vendor name is required" | 400 |
| Missing vendor_type | "Vendor type is required" | 400 |
| Invalid vendor_type | "Invalid vendor type" | 400 |
| Missing equipment_type | "Equipment type is required" | 400 |
| Invalid equipment_type | "Invalid equipment type" | 400 |
| Invalid rating value | "Rating must be between 1 and 5" | 400 |
| Missing document_type | "Document type is required" | 400 |
| Invalid document_type | "Invalid document type" | 400 |
| Duplicate vendor_code | "Vendor code already exists" | 409 |

### Permission Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Unauthorized view | "You don't have permission to view vendors" | 403 |
| Unauthorized create | "You don't have permission to create vendors" | 403 |
| Unauthorized edit | "You don't have permission to edit vendors" | 403 |
| Unauthorized delete | "You don't have permission to delete vendors" | 403 |
| Unauthorized verify | "You don't have permission to verify vendors" | 403 |

### Database Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Vendor not found | "Vendor not found" | 404 |
| Equipment not found | "Equipment not found" | 404 |
| Document not found | "Document not found" | 404 |
| Foreign key violation | "Cannot delete vendor with linked records" | 409 |
| Database connection error | "Database error. Please try again." | 500 |

### File Upload Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| File too large | "File size exceeds maximum limit (10MB)" | 413 |
| Invalid file type | "Invalid file type. Allowed: PDF, JPG, PNG" | 400 |
| Upload failed | "Failed to upload file. Please try again." | 500 |

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Vendor Code Generation**
   - Test that first vendor gets VND-001
   - Test sequential generation (VND-001, VND-002, VND-003)
   - Test padding for numbers < 100

2. **Validation Functions**
   - Test isDocumentExpired with past, present, future dates
   - Test isDocumentExpiringSoon with various date ranges
   - Test calculateAverageRating with empty array, single rating, multiple ratings
   - Test calculateOnTimeRate with various combinations

3. **Type Mappings**
   - Test mapCostCategoryToVendorType for all cost categories
   - Test getVendorTypeLabel for all vendor types
   - Test getEquipmentTypeLabel for all equipment types

4. **Permission Checks**
   - Test each permission function for each role
   - Test edge cases (undefined role, invalid role)

### Property-Based Tests

Property-based tests will use **fast-check** library with minimum 100 iterations per test.

1. **Property 1: Vendor Code Uniqueness**
   - Generate random vendor counts, verify code format and uniqueness
   - Tag: **Feature: vendor-management, Property 1: Vendor Code Uniqueness and Format**

2. **Property 2: Mandatory Field Validation**
   - Generate random vendor data with missing/invalid fields
   - Tag: **Feature: vendor-management, Property 2: Vendor Mandatory Field Validation**

3. **Property 4: Search and Filter Correctness**
   - Generate random vendor lists and filter criteria
   - Tag: **Feature: vendor-management, Property 4: Vendor Search and Filter Correctness**

4. **Property 5: Summary Statistics**
   - Generate random vendor lists, verify counts
   - Tag: **Feature: vendor-management, Property 5: Vendor Summary Statistics Accuracy**

5. **Property 8: Document Expiry Detection**
   - Generate random dates, verify expiry classification
   - Tag: **Feature: vendor-management, Property 8: Document Expiry Detection**

6. **Property 11: Rating Value Constraints**
   - Generate random ratings, verify constraint enforcement
   - Tag: **Feature: vendor-management, Property 11: Rating Value Constraints**

7. **Property 12: Average Rating Calculation**
   - Generate random rating sets, verify average calculation
   - Tag: **Feature: vendor-management, Property 12: Average Rating Calculation**

8. **Property 13: On-Time Rate Calculation**
   - Generate random rating sets with was_on_time values
   - Tag: **Feature: vendor-management, Property 13: On-Time Rate Calculation**

9. **Property 14: Vendor Dropdown Sort Order**
   - Generate random vendor lists with preferred/rating values
   - Tag: **Feature: vendor-management, Property 14: Vendor Dropdown Sort Order**

10. **Property 18: Role-Based Permissions**
    - Generate random role/action combinations
    - Tag: **Feature: vendor-management, Property 18: Role-Based Permission Enforcement**

### Integration Tests

1. **Vendor CRUD Flow**
   - Create vendor → Read → Update → Deactivate
   - Verify data persistence at each step

2. **Equipment Management Flow**
   - Create vendor → Add equipment → Update equipment → Delete equipment

3. **Rating Flow**
   - Create vendor → Create JO → Rate vendor → Verify metrics update

4. **PJO Integration**
   - Create vendor → Create PJO cost item with vendor → Verify vendor appears in dropdown

5. **BKK Integration**
   - Create vendor with bank details → Create BKK → Verify pre-fill → Settle → Verify metrics

### Test Configuration

```typescript
// vitest.config.ts additions
export default defineConfig({
  test: {
    // ... existing config
    testTimeout: 30000, // Allow time for property tests
  },
});
```

Property tests should be configured with:
- Minimum 100 iterations
- Seed logging for reproducibility
- Shrinking enabled for minimal failing examples
