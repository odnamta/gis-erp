# Design Document: Agency Bill of Lading & Documentation

## Overview

This design implements a comprehensive Bill of Lading (B/L) and shipping documentation management system for the Agency module. The system manages four core document types: Bills of Lading, Shipping Instructions, Arrival Notices, and Cargo Manifests. It integrates with the existing freight booking system (v0.72) and shipping line management (v0.71) to provide end-to-end documentation workflow.

The architecture follows the established patterns in the Gama ERP system, using Supabase for data persistence, server actions for mutations, and React components with shadcn/ui for the user interface.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UI Layer                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ B/L Pages   │  │ SI Pages    │  │ Arrival     │  │ Manifest Pages      │ │
│  │ /agency/bl  │  │ /agency/si  │  │ Notice Pages│  │ /agency/manifests   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │            │
│  ┌──────┴────────────────┴────────────────┴─────────────────────┴──────────┐│
│  │                        Shared Components                                 ││
│  │  BLForm, SIForm, ArrivalNoticeForm, ManifestForm, DocumentPrintView     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Business Logic Layer                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    lib/bl-documentation-utils.ts                         ││
│  │  - generateBLNumber()        - validateContainerNumber()                 ││
│  │  - generateSINumber()        - calculateTotals()                         ││
│  │  - generateNoticeNumber()    - calculateFreeTimeExpiry()                 ││
│  │  - generateManifestNumber()  - validateBLData()                          ││
│  │  - mapBLRowToModel()         - mapSIRowToModel()                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    app/actions/bl-documentation-actions.ts               ││
│  │  - createBillOfLading()      - createShippingInstruction()               ││
│  │  - updateBillOfLading()      - updateShippingInstruction()               ││
│  │  - createArrivalNotice()     - createCargoManifest()                     ││
│  │  - updateBLStatus()          - linkBLsToManifest()                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         Supabase Tables                                  ││
│  │  bills_of_lading │ shipping_instructions │ arrival_notices │ cargo_manifests││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         Related Tables                                   ││
│  │  freight_bookings │ shipping_lines │ job_orders │ customers              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### UI Components

```typescript
// Bill of Lading Form Component
interface BLFormProps {
  booking?: FreightBooking;
  initialData?: BillOfLading;
  onSubmit: (data: BLFormData) => Promise<void>;
  onCancel: () => void;
}

// Shipping Instruction Form Component
interface SIFormProps {
  booking?: FreightBooking;
  initialData?: ShippingInstruction;
  onSubmit: (data: SIFormData) => Promise<void>;
  onCancel: () => void;
}

// Arrival Notice Form Component
interface ArrivalNoticeFormProps {
  bl: BillOfLading;
  initialData?: ArrivalNotice;
  onSubmit: (data: ArrivalNoticeFormData) => Promise<void>;
  onCancel: () => void;
}

// Cargo Manifest Form Component
interface ManifestFormProps {
  availableBLs: BillOfLading[];
  initialData?: CargoManifest;
  onSubmit: (data: ManifestFormData) => Promise<void>;
  onCancel: () => void;
}

// Document Print View Component
interface DocumentPrintViewProps {
  documentType: 'bl' | 'si' | 'arrival_notice' | 'manifest';
  documentId: string;
}

// Container Details Editor Component
interface ContainerDetailsEditorProps {
  containers: BLContainer[];
  onChange: (containers: BLContainer[]) => void;
  readOnly?: boolean;
}

// B/L Status Badge Component
interface BLStatusBadgeProps {
  status: BLStatus;
}
```

### Server Actions

```typescript
// Bill of Lading Actions
async function createBillOfLading(data: BLFormData): Promise<ActionResult<BillOfLading>>;
async function updateBillOfLading(id: string, data: Partial<BLFormData>): Promise<ActionResult<BillOfLading>>;
async function updateBLStatus(id: string, status: BLStatus): Promise<ActionResult<BillOfLading>>;
async function deleteBillOfLading(id: string): Promise<ActionResult<void>>;
async function getBillOfLading(id: string): Promise<BillOfLading | null>;
async function getBillsOfLading(filters?: BLFilters): Promise<BillOfLading[]>;

// Shipping Instruction Actions
async function createShippingInstruction(data: SIFormData): Promise<ActionResult<ShippingInstruction>>;
async function updateShippingInstruction(id: string, data: Partial<SIFormData>): Promise<ActionResult<ShippingInstruction>>;
async function submitShippingInstruction(id: string): Promise<ActionResult<ShippingInstruction>>;
async function confirmShippingInstruction(id: string, blId: string): Promise<ActionResult<ShippingInstruction>>;
async function getShippingInstruction(id: string): Promise<ShippingInstruction | null>;
async function getShippingInstructions(filters?: SIFilters): Promise<ShippingInstruction[]>;

// Arrival Notice Actions
async function createArrivalNotice(data: ArrivalNoticeFormData): Promise<ActionResult<ArrivalNotice>>;
async function updateArrivalNotice(id: string, data: Partial<ArrivalNoticeFormData>): Promise<ActionResult<ArrivalNotice>>;
async function markConsigneeNotified(id: string, notifiedBy: string): Promise<ActionResult<ArrivalNotice>>;
async function markCargoCleared(id: string): Promise<ActionResult<ArrivalNotice>>;
async function markCargoDelivered(id: string): Promise<ActionResult<ArrivalNotice>>;
async function getArrivalNotice(id: string): Promise<ArrivalNotice | null>;
async function getPendingArrivals(): Promise<ArrivalNotice[]>;

// Cargo Manifest Actions
async function createCargoManifest(data: ManifestFormData): Promise<ActionResult<CargoManifest>>;
async function updateCargoManifest(id: string, data: Partial<ManifestFormData>): Promise<ActionResult<CargoManifest>>;
async function linkBLsToManifest(manifestId: string, blIds: string[]): Promise<ActionResult<CargoManifest>>;
async function submitManifest(id: string, submittedTo: string): Promise<ActionResult<CargoManifest>>;
async function approveManifest(id: string): Promise<ActionResult<CargoManifest>>;
async function getCargoManifest(id: string): Promise<CargoManifest | null>;
async function getCargoManifests(filters?: ManifestFilters): Promise<CargoManifest[]>;
```

### Utility Functions

```typescript
// Number Generation
function generateBLNumber(): string; // Uses carrier format or custom
function generateSINumber(sequence: number): string; // SI-YYYY-NNNNN
function generateNoticeNumber(sequence: number): string; // AN-YYYY-NNNNN
function generateManifestNumber(sequence: number): string; // MF-YYYY-NNNNN

// Validation
function validateContainerNumber(containerNo: string): boolean; // 4 letters + 7 digits
function validateBLData(data: BLFormData): ValidationResult;
function validateSIData(data: SIFormData): ValidationResult;
function validateArrivalNoticeData(data: ArrivalNoticeFormData): ValidationResult;

// Calculations
function calculateBLTotals(containers: BLContainer[]): BLTotals;
function calculateFreeTimeExpiry(eta: Date, freeTimeDays: number): Date;
function calculateManifestTotals(bls: BillOfLading[]): ManifestTotals;

// Data Mapping
function mapBLRowToModel(row: BillOfLadingRow): BillOfLading;
function mapSIRowToModel(row: ShippingInstructionRow): ShippingInstruction;
function mapArrivalNoticeRowToModel(row: ArrivalNoticeRow): ArrivalNotice;
function mapManifestRowToModel(row: CargoManifestRow): CargoManifest;
```

## Data Models

### TypeScript Interfaces

```typescript
// B/L Status Types
type BLStatus = 'draft' | 'submitted' | 'issued' | 'released' | 'surrendered' | 'amended';
type BLType = 'original' | 'seaway_bill' | 'telex_release' | 'surrender';
type SIStatus = 'draft' | 'submitted' | 'confirmed' | 'amended';
type ArrivalNoticeStatus = 'pending' | 'notified' | 'cleared' | 'delivered';
type ManifestStatus = 'draft' | 'submitted' | 'approved';
type ManifestType = 'inward' | 'outward';

// B/L Container Detail
interface BLContainer {
  containerNo: string;
  sealNo: string;
  type: ContainerType;
  packages: number;
  weightKg: number;
}

// Estimated Charge
interface EstimatedCharge {
  chargeType: string;
  amount: number;
  currency: string;
}

// Bill of Lading
interface BillOfLading {
  id: string;
  blNumber: string;
  bookingId: string;
  jobOrderId?: string;
  blType: BLType;
  originalCount: number;
  shippingLineId?: string;
  carrierBlNumber?: string;
  vesselName: string;
  voyageNumber?: string;
  flag?: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt?: string;
  placeOfDelivery?: string;
  shippedOnBoardDate?: string;
  blDate?: string;
  shipperName: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeToOrder: boolean;
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  cargoDescription: string;
  marksAndNumbers?: string;
  numberOfPackages?: number;
  packageType?: string;
  grossWeightKg?: number;
  measurementCbm?: number;
  containers: BLContainer[];
  freightTerms: FreightTerms;
  freightAmount?: number;
  freightCurrency?: string;
  status: BLStatus;
  issuedAt?: string;
  releasedAt?: string;
  draftBlUrl?: string;
  finalBlUrl?: string;
  remarks?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  booking?: FreightBooking;
  shippingLine?: ShippingLine;
}

// Shipping Instruction
interface ShippingInstruction {
  id: string;
  siNumber: string;
  bookingId: string;
  blId?: string;
  status: SIStatus;
  submittedAt?: string;
  confirmedAt?: string;
  shipperName: string;
  shipperAddress: string;
  shipperContact?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeToOrder: boolean;
  toOrderText?: string;
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  secondNotifyName?: string;
  secondNotifyAddress?: string;
  cargoDescription: string;
  marksAndNumbers?: string;
  hsCode?: string;
  numberOfPackages?: number;
  packageType?: string;
  grossWeightKg?: number;
  netWeightKg?: number;
  measurementCbm?: number;
  blTypeRequested?: BLType;
  originalsRequired: number;
  copiesRequired: number;
  freightTerms: FreightTerms;
  specialInstructions?: string;
  lcNumber?: string;
  lcIssuingBank?: string;
  lcTerms?: string;
  documentsRequired: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  booking?: FreightBooking;
  bl?: BillOfLading;
}

// Arrival Notice
interface ArrivalNotice {
  id: string;
  noticeNumber: string;
  blId: string;
  bookingId?: string;
  vesselName: string;
  voyageNumber?: string;
  eta: string;
  ata?: string;
  portOfDischarge: string;
  terminal?: string;
  berth?: string;
  containerNumbers: string[];
  cargoDescription?: string;
  freeTimeDays: number;
  freeTimeExpires?: string;
  estimatedCharges: EstimatedCharge[];
  deliveryInstructions?: string;
  deliveryAddress?: string;
  consigneeNotified: boolean;
  notifiedAt?: string;
  notifiedBy?: string;
  status: ArrivalNoticeStatus;
  clearedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  // Joined fields
  bl?: BillOfLading;
  booking?: FreightBooking;
}

// Cargo Manifest
interface CargoManifest {
  id: string;
  manifestNumber: string;
  manifestType: ManifestType;
  vesselName: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  departureDate?: string;
  arrivalDate?: string;
  totalBls: number;
  totalContainers: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
  blIds: string[];
  status: ManifestStatus;
  submittedTo?: string;
  submittedAt?: string;
  documentUrl?: string;
  createdAt: string;
  // Joined fields
  bls?: BillOfLading[];
}

// B/L Totals
interface BLTotals {
  totalContainers: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
}

// Manifest Totals
interface ManifestTotals {
  totalBls: number;
  totalContainers: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
}

// Form Data Types
interface BLFormData {
  bookingId: string;
  jobOrderId?: string;
  blType: BLType;
  originalCount?: number;
  shippingLineId?: string;
  carrierBlNumber?: string;
  vesselName: string;
  voyageNumber?: string;
  flag?: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt?: string;
  placeOfDelivery?: string;
  shippedOnBoardDate?: string;
  blDate?: string;
  shipperName: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeToOrder?: boolean;
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  cargoDescription: string;
  marksAndNumbers?: string;
  numberOfPackages?: number;
  packageType?: string;
  grossWeightKg?: number;
  measurementCbm?: number;
  containers?: BLContainer[];
  freightTerms?: FreightTerms;
  freightAmount?: number;
  freightCurrency?: string;
  remarks?: string;
}

interface SIFormData {
  bookingId: string;
  shipperName: string;
  shipperAddress: string;
  shipperContact?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeToOrder?: boolean;
  toOrderText?: string;
  notifyPartyName?: string;
  notifyPartyAddress?: string;
  secondNotifyName?: string;
  secondNotifyAddress?: string;
  cargoDescription: string;
  marksAndNumbers?: string;
  hsCode?: string;
  numberOfPackages?: number;
  packageType?: string;
  grossWeightKg?: number;
  netWeightKg?: number;
  measurementCbm?: number;
  blTypeRequested?: BLType;
  originalsRequired?: number;
  copiesRequired?: number;
  freightTerms?: FreightTerms;
  specialInstructions?: string;
  lcNumber?: string;
  lcIssuingBank?: string;
  lcTerms?: string;
  documentsRequired?: string[];
}

interface ArrivalNoticeFormData {
  blId: string;
  bookingId?: string;
  vesselName: string;
  voyageNumber?: string;
  eta: string;
  ata?: string;
  portOfDischarge: string;
  terminal?: string;
  berth?: string;
  containerNumbers?: string[];
  cargoDescription?: string;
  freeTimeDays?: number;
  estimatedCharges?: EstimatedCharge[];
  deliveryInstructions?: string;
  deliveryAddress?: string;
  notes?: string;
}

interface ManifestFormData {
  manifestType: ManifestType;
  vesselName: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  departureDate?: string;
  arrivalDate?: string;
  blIds?: string[];
}

// Filter Types
interface BLFilters {
  search?: string;
  status?: BLStatus;
  bookingId?: string;
  shippingLineId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface SIFilters {
  search?: string;
  status?: SIStatus;
  bookingId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ManifestFilters {
  search?: string;
  status?: ManifestStatus;
  manifestType?: ManifestType;
  dateFrom?: string;
  dateTo?: string;
}
```

### Database Row Types

```typescript
interface BillOfLadingRow {
  id: string;
  bl_number: string;
  booking_id: string;
  job_order_id?: string;
  bl_type: string;
  original_count: number;
  shipping_line_id?: string;
  carrier_bl_number?: string;
  vessel_name: string;
  voyage_number?: string;
  flag?: string;
  port_of_loading: string;
  port_of_discharge: string;
  place_of_receipt?: string;
  place_of_delivery?: string;
  shipped_on_board_date?: string;
  bl_date?: string;
  shipper_name: string;
  shipper_address?: string;
  consignee_name?: string;
  consignee_address?: string;
  consignee_to_order: boolean;
  notify_party_name?: string;
  notify_party_address?: string;
  cargo_description: string;
  marks_and_numbers?: string;
  number_of_packages?: number;
  package_type?: string;
  gross_weight_kg?: number;
  measurement_cbm?: number;
  containers: BLContainer[];
  freight_terms: string;
  freight_amount?: number;
  freight_currency?: string;
  status: string;
  issued_at?: string;
  released_at?: string;
  draft_bl_url?: string;
  final_bl_url?: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface ShippingInstructionRow {
  id: string;
  si_number: string;
  booking_id: string;
  bl_id?: string;
  status: string;
  submitted_at?: string;
  confirmed_at?: string;
  shipper_name: string;
  shipper_address: string;
  shipper_contact?: string;
  consignee_name?: string;
  consignee_address?: string;
  consignee_to_order: boolean;
  to_order_text?: string;
  notify_party_name?: string;
  notify_party_address?: string;
  second_notify_name?: string;
  second_notify_address?: string;
  cargo_description: string;
  marks_and_numbers?: string;
  hs_code?: string;
  number_of_packages?: number;
  package_type?: string;
  gross_weight_kg?: number;
  net_weight_kg?: number;
  measurement_cbm?: number;
  bl_type_requested?: string;
  originals_required: number;
  copies_required: number;
  freight_terms: string;
  special_instructions?: string;
  lc_number?: string;
  lc_issuing_bank?: string;
  lc_terms?: string;
  documents_required: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface ArrivalNoticeRow {
  id: string;
  notice_number: string;
  bl_id: string;
  booking_id?: string;
  vessel_name: string;
  voyage_number?: string;
  eta: string;
  ata?: string;
  port_of_discharge: string;
  terminal?: string;
  berth?: string;
  container_numbers: string[];
  cargo_description?: string;
  free_time_days: number;
  free_time_expires?: string;
  estimated_charges: EstimatedCharge[];
  delivery_instructions?: string;
  delivery_address?: string;
  consignee_notified: boolean;
  notified_at?: string;
  notified_by?: string;
  status: string;
  cleared_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
}

interface CargoManifestRow {
  id: string;
  manifest_number: string;
  manifest_type: string;
  vessel_name: string;
  voyage_number?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  departure_date?: string;
  arrival_date?: string;
  total_bls: number;
  total_containers: number;
  total_packages: number;
  total_weight_kg: number;
  total_cbm: number;
  bl_ids: string[];
  status: string;
  submitted_to?: string;
  submitted_at?: string;
  document_url?: string;
  created_at: string;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Document Number Generation Format and Uniqueness

*For any* document type (B/L, SI, Arrival Notice, Manifest), when a new document is created, the generated number SHALL match the expected format and be unique across all documents of that type.

- SI numbers: `SI-YYYY-NNNNN` (e.g., SI-2025-00001)
- Arrival Notice numbers: `AN-YYYY-NNNNN` (e.g., AN-2025-00001)
- Manifest numbers: `MF-YYYY-NNNNN` (e.g., MF-2025-00001)

**Validates: Requirements 1.1, 2.1, 3.1, 4.1**

### Property 2: Initial Status Assignment

*For any* newly created document, the system SHALL assign the correct initial status based on document type:
- Bill of Lading: 'draft'
- Shipping Instruction: 'draft'
- Arrival Notice: 'pending'
- Cargo Manifest: 'draft'

**Validates: Requirements 7.1, 7.5, 7.6, 7.7**

### Property 3: B/L Container Totals Calculation

*For any* Bill of Lading with container details, the calculated totals SHALL equal the sum of individual container values:
- `totalPackages = sum(container.packages for all containers)`
- `totalWeightKg = sum(container.weightKg for all containers)`

**Validates: Requirements 1.6**

### Property 4: Manifest Totals Calculation from Linked B/Ls

*For any* Cargo Manifest with linked Bills of Lading, the calculated totals SHALL equal the sum of values from all linked B/Ls:
- `totalBls = count(linked B/Ls)`
- `totalContainers = sum(bl.containers.length for all linked B/Ls)`
- `totalPackages = sum(bl.numberOfPackages for all linked B/Ls)`
- `totalWeightKg = sum(bl.grossWeightKg for all linked B/Ls)`
- `totalCbm = sum(bl.measurementCbm for all linked B/Ls)`

**Validates: Requirements 4.3**

### Property 5: Free Time Expiry Calculation

*For any* Arrival Notice with an ETA date and free time days configured, the free time expiry date SHALL equal `ETA + freeTimeDays`.

**Validates: Requirements 3.2**

### Property 6: Container Number Format Validation

*For any* container number input, the validation function SHALL return true only if the number matches the ISO 6346 format: exactly 4 uppercase letters followed by exactly 7 digits (e.g., MSCU1234567).

**Validates: Requirements 6.4**

### Property 7: B/L Required Field Validation

*For any* Bill of Lading form data, validation SHALL fail if any of these required fields are missing or empty:
- bookingId
- vesselName
- portOfLoading
- portOfDischarge
- shipperName
- cargoDescription

**Validates: Requirements 6.1, 6.2, 1.3**

### Property 8: Arrival Notice Required Field Validation

*For any* Arrival Notice form data, validation SHALL fail if the blId field is missing or empty.

**Validates: Requirements 6.3**

### Property 9: Status Transitions Record Timestamps

*For any* document status transition, the appropriate timestamp field SHALL be set:
- B/L to 'issued': `issuedAt` is set
- B/L to 'released' or 'surrendered': `releasedAt` is set
- SI to 'submitted': `submittedAt` is set
- SI to 'confirmed': `confirmedAt` is set
- Arrival Notice marked notified: `notifiedAt` is set
- Arrival Notice to 'cleared': `clearedAt` is set
- Arrival Notice to 'delivered': `deliveredAt` is set
- Manifest to 'submitted': `submittedAt` is set

**Validates: Requirements 1.7, 2.2, 3.4, 3.5, 3.6, 4.4, 7.3, 7.4**

### Property 10: Issued B/L Deletion Prevention

*For any* Bill of Lading with status 'issued', 'released', or 'surrendered', the delete operation SHALL be rejected and return an error.

**Validates: Requirements 6.6**

### Property 11: Pending Arrivals Filter and Ordering

*For any* query for pending arrivals, the result set SHALL:
1. Include only arrival notices with status 'pending' or 'notified'
2. Be ordered by ETA in ascending order (earliest first)

**Validates: Requirements 3.7**

## Error Handling

### Validation Errors

| Error Code | Condition | User Message |
|------------|-----------|--------------|
| `BL_BOOKING_REQUIRED` | B/L created without booking reference | "A freight booking must be selected" |
| `BL_VESSEL_REQUIRED` | B/L missing vessel name | "Vessel name is required" |
| `BL_PORTS_REQUIRED` | B/L missing port of loading or discharge | "Port of loading and discharge are required" |
| `BL_SHIPPER_REQUIRED` | B/L missing shipper name | "Shipper name is required" |
| `BL_CARGO_REQUIRED` | B/L missing cargo description | "Cargo description is required" |
| `BL_DELETE_ISSUED` | Attempt to delete issued B/L | "Cannot delete an issued Bill of Lading. Use amendment workflow instead" |
| `CONTAINER_INVALID_FORMAT` | Container number doesn't match format | "Container number must be 4 letters followed by 7 digits (e.g., MSCU1234567)" |
| `WEIGHT_INVALID` | Weight is not a positive number | "Weight must be a positive number" |
| `AN_BL_REQUIRED` | Arrival notice without B/L reference | "A Bill of Lading must be selected" |
| `SI_SHIPPER_REQUIRED` | SI missing shipper details | "Shipper name and address are required" |

### Database Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Unique constraint violation | Return user-friendly message about duplicate number |
| Foreign key violation | Return message about missing referenced record |
| Connection timeout | Retry once, then show connection error message |
| RLS policy violation | Return "Access denied" message |

### Status Transition Errors

| Current Status | Invalid Transition | Error Message |
|----------------|-------------------|---------------|
| B/L 'issued' | 'draft' | "Cannot revert issued B/L to draft" |
| B/L 'released' | 'draft', 'submitted' | "Cannot revert released B/L" |
| SI 'confirmed' | 'draft' | "Cannot revert confirmed SI to draft" |
| AN 'delivered' | 'pending', 'notified' | "Cannot revert delivered cargo status" |

## Testing Strategy

### Property-Based Testing

The system will use **fast-check** for property-based testing in TypeScript. Each correctness property will be implemented as a property test with minimum 100 iterations.

**Test File**: `__tests__/bl-documentation-utils.property.test.ts`

**Property Test Configuration**:
```typescript
import fc from 'fast-check';

// Configure minimum 100 iterations per property
const propertyConfig = { numRuns: 100 };
```

**Generators Required**:
- `blFormDataArb`: Generates valid BLFormData objects
- `siFormDataArb`: Generates valid SIFormData objects
- `arrivalNoticeFormDataArb`: Generates valid ArrivalNoticeFormData objects
- `manifestFormDataArb`: Generates valid ManifestFormData objects
- `containerArb`: Generates valid BLContainer objects
- `containerNumberArb`: Generates container numbers (both valid and invalid)
- `blStatusArb`: Generates valid BLStatus values
- `arrivalNoticeArb`: Generates ArrivalNotice objects with various statuses

### Unit Testing

Unit tests will cover:
- Edge cases for number generation (year boundaries, sequence overflow)
- Specific validation scenarios
- Data mapping functions (row to model conversions)
- Error message formatting

**Test File**: `__tests__/bl-documentation-utils.test.ts`

### Test Coverage Matrix

| Property | Test Type | Iterations |
|----------|-----------|------------|
| P1: Number Generation | Property | 100 |
| P2: Initial Status | Property | 100 |
| P3: B/L Totals | Property | 100 |
| P4: Manifest Totals | Property | 100 |
| P5: Free Time Expiry | Property | 100 |
| P6: Container Format | Property | 100 |
| P7: B/L Validation | Property | 100 |
| P8: AN Validation | Property | 100 |
| P9: Status Timestamps | Property | 100 |
| P10: Delete Prevention | Property | 100 |
| P11: Pending Arrivals | Property | 100 |

### Integration Points

- Verify B/L creation from existing freight booking
- Verify SI to B/L linking on confirmation
- Verify manifest totals update when B/Ls are linked/unlinked
- Verify arrival notice creation from B/L data
