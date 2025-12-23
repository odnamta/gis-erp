// =====================================================
// v0.71: AGENCY - SHIPPING LINE & AGENT MANAGEMENT TYPES
// =====================================================

// Service types for shipping lines
export type ServiceType = 'fcl' | 'lcl' | 'breakbulk' | 'project_cargo' | 'reefer';

export const SERVICE_TYPES: ServiceType[] = ['fcl', 'lcl', 'breakbulk', 'project_cargo', 'reefer'];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  fcl: 'FCL',
  lcl: 'LCL',
  breakbulk: 'Breakbulk',
  project_cargo: 'Project Cargo',
  reefer: 'Reefer',
};

// Port agent services
export type PortAgentService =
  | 'customs_clearance'
  | 'stevedoring'
  | 'warehousing'
  | 'trucking'
  | 'documentation'
  | 'port_charges'
  | 'container_handling';

export const PORT_AGENT_SERVICES: PortAgentService[] = [
  'customs_clearance',
  'stevedoring',
  'warehousing',
  'trucking',
  'documentation',
  'port_charges',
  'container_handling',
];

export const PORT_AGENT_SERVICE_LABELS: Record<PortAgentService, string> = {
  customs_clearance: 'Customs Clearance',
  stevedoring: 'Stevedoring',
  warehousing: 'Warehousing',
  trucking: 'Trucking',
  documentation: 'Documentation',
  port_charges: 'Port Charges',
  container_handling: 'Container Handling',
};

// Provider types
export type ProviderType =
  | 'trucking'
  | 'warehousing'
  | 'surveyor'
  | 'insurance'
  | 'fumigation'
  | 'lashing'
  | 'crane_rental'
  | 'escort';

export const PROVIDER_TYPES: ProviderType[] = [
  'trucking',
  'warehousing',
  'surveyor',
  'insurance',
  'fumigation',
  'lashing',
  'crane_rental',
  'escort',
];

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  trucking: 'Trucking',
  warehousing: 'Warehousing',
  surveyor: 'Surveyor',
  insurance: 'Insurance',
  fumigation: 'Fumigation',
  lashing: 'Lashing',
  crane_rental: 'Crane Rental',
  escort: 'Escort',
};

// Port types
export type PortType = 'seaport' | 'airport' | 'inland' | 'multimodal';

export const PORT_TYPES: PortType[] = ['seaport', 'airport', 'inland', 'multimodal'];

export const PORT_TYPE_LABELS: Record<PortType, string> = {
  seaport: 'Seaport',
  airport: 'Airport',
  inland: 'Inland',
  multimodal: 'Multimodal',
};

// Container types
export type ContainerType = '20GP' | '40GP' | '40HC' | '20OT' | '40OT' | '20FR' | '40FR' | 'BREAKBULK';

export const CONTAINER_TYPES: ContainerType[] = ['20GP', '40GP', '40HC', '20OT', '40OT', '20FR', '40FR', 'BREAKBULK'];

// Shipping terms
export type ShippingTerms = 'CY-CY' | 'CY-Door' | 'Door-CY' | 'Door-Door';

export const SHIPPING_TERMS: ShippingTerms[] = ['CY-CY', 'CY-Door', 'Door-CY', 'Door-Door'];


// Contact interfaces
export interface ShippingLineContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface AgentContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface ProviderContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// Route info for shipping lines
export interface RouteInfo {
  originPort: string;
  destinationPort: string;
  frequency?: string;
  transitDays?: number;
}

// Service detail for providers
export interface ServiceDetail {
  service: string;
  unit: string;
  rate: number;
  currency: string;
  notes?: string;
}

// Coverage area for providers
export interface CoverageArea {
  city: string;
  province: string;
  notes?: string;
}

// Provider document
export interface ProviderDocument {
  name: string;
  number?: string;
  expiryDate?: string;
}

// Surcharge item
export interface SurchargeItem {
  name: string;
  amount: number;
  currency: string;
}

// Main entity interfaces
export interface ShippingLine {
  id: string;
  lineCode: string;
  lineName: string;
  headOfficeAddress?: string;
  headOfficeCountry?: string;
  website?: string;
  bookingPortalUrl?: string;
  trackingUrl?: string;
  localAgentName?: string;
  localAgentAddress?: string;
  localAgentPhone?: string;
  localAgentEmail?: string;
  contacts: ShippingLineContact[];
  servicesOffered: ServiceType[];
  routesServed: RouteInfo[];
  paymentTerms?: string;
  creditLimit?: number;
  creditDays?: number;
  serviceRating?: number;
  reliabilityScore?: number;
  isPreferred: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortAgent {
  id: string;
  agentCode: string;
  agentName: string;
  portId?: string;
  portName: string;
  portCountry: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  contacts: AgentContact[];
  services: PortAgentService[];
  customsLicense?: string;
  ppjkLicense?: string;
  otherLicenses: string[];
  paymentTerms?: string;
  currency: string;
  bankName?: string;
  bankAccount?: string;
  bankSwift?: string;
  serviceRating?: number;
  responseTimeHours?: number;
  ratingCount?: number;
  isPreferred: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProvider {
  id: string;
  providerCode: string;
  providerName: string;
  providerType: ProviderType;
  city?: string;
  province?: string;
  country: string;
  address?: string;
  phone?: string;
  email?: string;
  contacts: ProviderContact[];
  servicesDetail: ServiceDetail[];
  coverageAreas: CoverageArea[];
  paymentTerms?: string;
  npwp?: string;
  siup?: string;
  documents: ProviderDocument[];
  serviceRating?: number;
  isPreferred: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Port {
  id: string;
  portCode: string;
  portName: string;
  countryCode: string;
  countryName: string;
  portType: PortType;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  hasContainerTerminal: boolean;
  hasBreakbulkFacility: boolean;
  hasRoRo: boolean;
  maxDraftM?: number;
  maxVesselLoaM?: number;
  primaryAgentId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ShippingRate {
  id: string;
  shippingLineId: string;
  originPortId: string;
  destinationPortId: string;
  containerType: ContainerType;
  oceanFreight: number;
  currency: string;
  baf: number;
  caf: number;
  pss: number;
  ens: number;
  otherSurcharges: SurchargeItem[];
  totalRate: number;
  transitDays?: number;
  frequency?: string;
  validFrom: string;
  validTo: string;
  terms: ShippingTerms;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  // Joined fields from database query
  shippingLine?: Partial<ShippingLine>;
  originPort?: Port;
  destinationPort?: Port;
}

export interface AgentFeedback {
  id: string;
  agentId: string;
  rating: number;
  feedback?: string;
  createdBy?: string;
  createdAt: string;
}


// Statistics types
export interface ShippingLineStats {
  totalLines: number;
  preferredCount: number;
  averageRating: number;
  totalCreditLimit: number;
}

export interface PortAgentStats {
  totalAgents: number;
  preferredCount: number;
  averageRating: number;
  countriesCount: number;
}

// Form data types
export interface ShippingLineFormData {
  lineCode?: string;
  lineName: string;
  headOfficeAddress?: string;
  headOfficeCountry?: string;
  website?: string;
  bookingPortalUrl?: string;
  trackingUrl?: string;
  localAgentName?: string;
  localAgentAddress?: string;
  localAgentPhone?: string;
  localAgentEmail?: string;
  contacts: ShippingLineContact[];
  servicesOffered: ServiceType[];
  routesServed: RouteInfo[];
  paymentTerms?: string;
  creditLimit?: number;
  creditDays?: number;
  serviceRating?: number;
  isPreferred: boolean;
  notes?: string;
}

export interface PortAgentFormData {
  agentCode?: string;
  agentName: string;
  portId?: string;
  portName: string;
  portCountry: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  contacts: AgentContact[];
  services: PortAgentService[];
  customsLicense?: string;
  ppjkLicense?: string;
  otherLicenses: string[];
  paymentTerms?: string;
  currency: string;
  bankName?: string;
  bankAccount?: string;
  bankSwift?: string;
  serviceRating?: number;
  isPreferred: boolean;
  notes?: string;
}

export interface ServiceProviderFormData {
  providerCode?: string;
  providerName: string;
  providerType: ProviderType;
  city?: string;
  province?: string;
  country: string;
  address?: string;
  phone?: string;
  email?: string;
  contacts: ProviderContact[];
  servicesDetail: ServiceDetail[];
  coverageAreas: CoverageArea[];
  paymentTerms?: string;
  npwp?: string;
  siup?: string;
  documents: ProviderDocument[];
  serviceRating?: number;
  isPreferred: boolean;
  notes?: string;
}

export interface ShippingRateFormData {
  shippingLineId: string;
  originPortId: string;
  destinationPortId: string;
  containerType: ContainerType;
  oceanFreight: number;
  currency: string;
  baf?: number;
  caf?: number;
  pss?: number;
  ens?: number;
  otherSurcharges?: SurchargeItem[];
  transitDays?: number;
  frequency?: string;
  validFrom: string;
  validTo: string;
  terms: ShippingTerms;
  notes?: string;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// Freight cost calculation result
export interface FreightCostResult {
  oceanFreight: number;
  surcharges: number;
  total: number;
  currency: string;
}

// Best rate result
export interface BestRateResult {
  rate: ShippingRate;
  alternatives: ShippingRate[];
}

// Rate search params
export interface RateSearchParams {
  originPort: string;
  destinationPort: string;
  containerType?: string;
  shippingLineId?: string;
}

// Database row types (snake_case for Supabase)
export interface ShippingLineRow {
  id: string;
  line_code: string;
  line_name: string;
  head_office_address?: string;
  head_office_country?: string;
  website?: string;
  booking_portal_url?: string;
  tracking_url?: string;
  local_agent_name?: string;
  local_agent_address?: string;
  local_agent_phone?: string;
  local_agent_email?: string;
  contacts: ShippingLineContact[];
  services_offered: ServiceType[];
  routes_served: RouteInfo[];
  payment_terms?: string;
  credit_limit?: number;
  credit_days?: number;
  service_rating?: number;
  reliability_score?: number;
  is_preferred: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PortAgentRow {
  id: string;
  agent_code: string;
  agent_name: string;
  port_id?: string;
  port_name: string;
  port_country: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  contacts: AgentContact[];
  services: PortAgentService[];
  customs_license?: string;
  ppjk_license?: string;
  other_licenses: string[];
  payment_terms?: string;
  currency: string;
  bank_name?: string;
  bank_account?: string;
  bank_swift?: string;
  service_rating?: number;
  response_time_hours?: number;
  rating_count?: number;
  is_preferred: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceProviderRow {
  id: string;
  provider_code: string;
  provider_name: string;
  provider_type: ProviderType;
  city?: string;
  province?: string;
  country: string;
  address?: string;
  phone?: string;
  email?: string;
  contacts: ProviderContact[];
  services_detail: ServiceDetail[];
  coverage_areas: CoverageArea[];
  payment_terms?: string;
  npwp?: string;
  siup?: string;
  documents: ProviderDocument[];
  service_rating?: number;
  is_preferred: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PortRow {
  id: string;
  port_code: string;
  port_name: string;
  country_code: string;
  country_name: string;
  port_type: PortType;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  has_container_terminal: boolean;
  has_breakbulk_facility: boolean;
  has_ro_ro: boolean;
  max_draft_m?: number;
  max_vessel_loa_m?: number;
  primary_agent_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface ShippingRateRow {
  id: string;
  shipping_line_id: string;
  origin_port_id: string;
  destination_port_id: string;
  container_type: ContainerType;
  ocean_freight: number;
  currency: string;
  baf: number;
  caf: number;
  pss: number;
  ens: number;
  other_surcharges: SurchargeItem[];
  total_rate: number;
  transit_days?: number;
  frequency?: string;
  valid_from: string;
  valid_to: string;
  terms: ShippingTerms;
  notes?: string;
  is_active: boolean;
  created_at: string;
}


// =====================================================
// v0.72: AGENCY - BOOKING MANAGEMENT TYPES
// =====================================================

// Booking status types
export type BookingStatus = 'draft' | 'requested' | 'confirmed' | 'amended' | 'cancelled' | 'shipped' | 'completed';

export const BOOKING_STATUSES: BookingStatus[] = ['draft', 'requested', 'confirmed', 'amended', 'cancelled', 'shipped', 'completed'];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft: 'Draft',
  requested: 'Requested',
  confirmed: 'Confirmed',
  amended: 'Amended',
  cancelled: 'Cancelled',
  shipped: 'Shipped',
  completed: 'Completed',
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  requested: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  amended: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  shipped: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
};

// Commodity types
export type CommodityType = 'general' | 'dangerous' | 'reefer' | 'oversized' | 'project';

export const COMMODITY_TYPES: CommodityType[] = ['general', 'dangerous', 'reefer', 'oversized', 'project'];

export const COMMODITY_TYPE_LABELS: Record<CommodityType, string> = {
  general: 'General',
  dangerous: 'Dangerous Goods',
  reefer: 'Reefer',
  oversized: 'Oversized',
  project: 'Project Cargo',
};

// Amendment types
export type AmendmentType = 'schedule_change' | 'quantity_change' | 'vessel_change' | 'rate_change' | 'consignee_change' | 'other';

export const AMENDMENT_TYPES: AmendmentType[] = ['schedule_change', 'quantity_change', 'vessel_change', 'rate_change', 'consignee_change', 'other'];

export const AMENDMENT_TYPE_LABELS: Record<AmendmentType, string> = {
  schedule_change: 'Schedule Change',
  quantity_change: 'Quantity Change',
  vessel_change: 'Vessel Change',
  rate_change: 'Rate Change',
  consignee_change: 'Consignee Change',
  other: 'Other',
};

// Amendment status
export type AmendmentStatus = 'requested' | 'approved' | 'rejected';

export const AMENDMENT_STATUSES: AmendmentStatus[] = ['requested', 'approved', 'rejected'];

export const AMENDMENT_STATUS_LABELS: Record<AmendmentStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
};

// Container status
export type ContainerStatus = 'empty' | 'stuffing' | 'full' | 'shipped' | 'delivered';

export const CONTAINER_STATUSES: ContainerStatus[] = ['empty', 'stuffing', 'full', 'shipped', 'delivered'];

export const CONTAINER_STATUS_LABELS: Record<ContainerStatus, string> = {
  empty: 'Empty',
  stuffing: 'Stuffing',
  full: 'Full',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

// Incoterms
export type Incoterm = 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'DDP' | 'DAP' | 'FCA';

export const INCOTERMS: Incoterm[] = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP', 'FCA'];

// Freight terms
export type FreightTerms = 'prepaid' | 'collect';

export const FREIGHT_TERMS: FreightTerms[] = ['prepaid', 'collect'];

export const FREIGHT_TERMS_LABELS: Record<FreightTerms, string> = {
  prepaid: 'Prepaid',
  collect: 'Collect',
};

// Dangerous goods info
export interface DangerousGoodsInfo {
  unNumber: string;
  class: string;
  packingGroup?: string;
  properShippingName: string;
}

// Booking document
export interface BookingDocument {
  name: string;
  url: string;
  uploadedAt: string;
}

// Cargo dimensions
export interface CargoDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
}

// Freight booking interface
export interface FreightBooking {
  id: string;
  bookingNumber: string;
  // Relations
  jobOrderId?: string;
  quotationId?: string;
  customerId?: string;
  shippingLineId: string;
  carrierBookingNumber?: string;
  // Route
  originPortId: string;
  destinationPortId: string;
  // Vessel
  vesselName?: string;
  voyageNumber?: string;
  // Schedule
  etd?: string;
  eta?: string;
  cutoffDate?: string;
  cutoffTime?: string;
  siCutoff?: string;
  // Cargo
  cargoDescription: string;
  hsCode?: string;
  commodityType: CommodityType;
  containerType?: ContainerType;
  containerQuantity?: number;
  packagesCount?: number;
  grossWeightKg?: number;
  volumeCbm?: number;
  cargoLengthM?: number;
  cargoWidthM?: number;
  cargoHeightM?: number;
  // Parties
  shipperName?: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  notifyParty?: string;
  notifyAddress?: string;
  // Terms
  incoterm?: Incoterm;
  freightTerms: FreightTerms;
  // Rates
  freightRate?: number;
  freightCurrency: string;
  totalFreight?: number;
  // Status
  status: BookingStatus;
  confirmedAt?: string;
  // Additional
  specialRequirements?: string;
  dangerousGoods?: DangerousGoodsInfo;
  documents?: BookingDocument[];
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  shippingLine?: Partial<ShippingLine>;
  originPort?: Port;
  destinationPort?: Port;
  customer?: { id: string; name: string };
  jobOrder?: { id: string; joNumber: string };
  containerCount?: number;
  totalWeightKg?: number;
}

// Booking container interface
export interface BookingContainer {
  id: string;
  bookingId: string;
  containerNumber?: string;
  containerType: ContainerType;
  sealNumber?: string;
  packagesCount?: number;
  packageType?: string;
  grossWeightKg?: number;
  cargoDescription?: string;
  cargoDimensions?: CargoDimensions;
  status: ContainerStatus;
  currentLocation?: string;
  createdAt: string;
}

// Booking amendment interface
export interface BookingAmendment {
  id: string;
  bookingId: string;
  amendmentNumber: number;
  amendmentType: AmendmentType;
  description: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  status: AmendmentStatus;
  requestedBy?: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

// Booking status history interface
export interface BookingStatusHistory {
  id: string;
  bookingId: string;
  oldStatus?: BookingStatus;
  newStatus: BookingStatus;
  changedBy?: string;
  changedAt: string;
  notes?: string;
}

// Freight calculation result
export interface FreightCalculation {
  containers: ContainerFreight[];
  totalFreight: number;
  currency: string;
}

export interface ContainerFreight {
  containerType: ContainerType;
  quantity: number;
  ratePerUnit: number;
  subtotal: number;
}

// Form data types
export interface BookingFormData {
  jobOrderId?: string;
  quotationId?: string;
  customerId?: string;
  shippingLineId: string;
  carrierBookingNumber?: string;
  originPortId: string;
  destinationPortId: string;
  vesselName?: string;
  voyageNumber?: string;
  etd?: string;
  eta?: string;
  cutoffDate?: string;
  cutoffTime?: string;
  siCutoff?: string;
  cargoDescription: string;
  hsCode?: string;
  commodityType: CommodityType;
  containerType?: ContainerType;
  containerQuantity?: number;
  packagesCount?: number;
  grossWeightKg?: number;
  volumeCbm?: number;
  cargoLengthM?: number;
  cargoWidthM?: number;
  cargoHeightM?: number;
  shipperName?: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  notifyParty?: string;
  notifyAddress?: string;
  incoterm?: Incoterm;
  freightTerms?: FreightTerms;
  freightRate?: number;
  freightCurrency?: string;
  totalFreight?: number;
  specialRequirements?: string;
  dangerousGoods?: DangerousGoodsInfo;
  documents?: BookingDocument[];
  notes?: string;
}

export interface ContainerFormData {
  containerNumber?: string;
  containerType: ContainerType;
  sealNumber?: string;
  packagesCount?: number;
  packageType?: string;
  grossWeightKg?: number;
  cargoDescription?: string;
  cargoDimensions?: CargoDimensions;
}

export interface AmendmentFormData {
  amendmentType: AmendmentType;
  description: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  notes?: string;
}

// Database row types (snake_case for Supabase)
export interface FreightBookingRow {
  id: string;
  booking_number: string;
  job_order_id?: string;
  quotation_id?: string;
  customer_id?: string;
  shipping_line_id: string;
  carrier_booking_number?: string;
  origin_port_id: string;
  destination_port_id: string;
  vessel_name?: string;
  voyage_number?: string;
  etd?: string;
  eta?: string;
  cutoff_date?: string;
  cutoff_time?: string;
  si_cutoff?: string;
  cargo_description: string;
  hs_code?: string;
  commodity_type: string;
  container_type?: string;
  container_quantity?: number;
  packages_count?: number;
  gross_weight_kg?: number;
  volume_cbm?: number;
  cargo_length_m?: number;
  cargo_width_m?: number;
  cargo_height_m?: number;
  shipper_name?: string;
  shipper_address?: string;
  consignee_name?: string;
  consignee_address?: string;
  notify_party?: string;
  notify_address?: string;
  incoterm?: string;
  freight_terms: string;
  freight_rate?: number;
  freight_currency: string;
  total_freight?: number;
  status: string;
  confirmed_at?: string;
  special_requirements?: string;
  dangerous_goods?: DangerousGoodsInfo;
  documents?: BookingDocument[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingContainerRow {
  id: string;
  booking_id: string;
  container_number?: string;
  container_type: string;
  seal_number?: string;
  packages_count?: number;
  package_type?: string;
  gross_weight_kg?: number;
  cargo_description?: string;
  cargo_dimensions?: CargoDimensions;
  status: string;
  current_location?: string;
  created_at: string;
}

export interface BookingAmendmentRow {
  id: string;
  booking_id: string;
  amendment_number: number;
  amendment_type: string;
  description: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  status: string;
  requested_by?: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface BookingStatusHistoryRow {
  id: string;
  booking_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  changed_at: string;
  notes?: string;
}

// Booking filters
export interface BookingFilters {
  search?: string;
  status?: BookingStatus;
  shippingLineId?: string;
  originPortId?: string;
  destinationPortId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeInactive?: boolean;
}

// Booking statistics
export interface BookingStats {
  totalBookings: number;
  draftCount: number;
  requestedCount: number;
  confirmedCount: number;
  shippedCount: number;
  completedCount: number;
  cancelledCount: number;
}

// Rate lookup params
export interface RateLookupParams {
  originPortId: string;
  destinationPortId: string;
  containerTypes?: ContainerType[];
  shippingLineId?: string;
}

// Cutoff warning level
export type CutoffWarningLevel = 'none' | 'warning' | 'alert';


// =====================================================
// v0.73: AGENCY - BILL OF LADING & DOCUMENTATION TYPES
// =====================================================

// B/L Status Types
export type BLStatus = 'draft' | 'submitted' | 'issued' | 'released' | 'surrendered' | 'amended';

export const BL_STATUSES: BLStatus[] = ['draft', 'submitted', 'issued', 'released', 'surrendered', 'amended'];

export const BL_STATUS_LABELS: Record<BLStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  issued: 'Issued',
  released: 'Released',
  surrendered: 'Surrendered',
  amended: 'Amended',
};

export const BL_STATUS_COLORS: Record<BLStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  issued: 'bg-green-100 text-green-800',
  released: 'bg-purple-100 text-purple-800',
  surrendered: 'bg-orange-100 text-orange-800',
  amended: 'bg-yellow-100 text-yellow-800',
};

// B/L Type
export type BLType = 'original' | 'seaway_bill' | 'telex_release' | 'surrender';

export const BL_TYPES: BLType[] = ['original', 'seaway_bill', 'telex_release', 'surrender'];

export const BL_TYPE_LABELS: Record<BLType, string> = {
  original: 'Original B/L',
  seaway_bill: 'Seaway Bill',
  telex_release: 'Telex Release',
  surrender: 'Surrender',
};

// Shipping Instruction Status
export type SIStatus = 'draft' | 'submitted' | 'confirmed' | 'amended';

export const SI_STATUSES: SIStatus[] = ['draft', 'submitted', 'confirmed', 'amended'];

export const SI_STATUS_LABELS: Record<SIStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  amended: 'Amended',
};

export const SI_STATUS_COLORS: Record<SIStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  amended: 'bg-yellow-100 text-yellow-800',
};

// Arrival Notice Status
export type ArrivalNoticeStatus = 'pending' | 'notified' | 'cleared' | 'delivered';

export const ARRIVAL_NOTICE_STATUSES: ArrivalNoticeStatus[] = ['pending', 'notified', 'cleared', 'delivered'];

export const ARRIVAL_NOTICE_STATUS_LABELS: Record<ArrivalNoticeStatus, string> = {
  pending: 'Pending',
  notified: 'Notified',
  cleared: 'Cleared',
  delivered: 'Delivered',
};

export const ARRIVAL_NOTICE_STATUS_COLORS: Record<ArrivalNoticeStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  notified: 'bg-blue-100 text-blue-800',
  cleared: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
};

// Manifest Status
export type ManifestStatus = 'draft' | 'submitted' | 'approved';

export const MANIFEST_STATUSES: ManifestStatus[] = ['draft', 'submitted', 'approved'];

export const MANIFEST_STATUS_LABELS: Record<ManifestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
};

export const MANIFEST_STATUS_COLORS: Record<ManifestStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
};

// Manifest Type
export type ManifestType = 'inward' | 'outward';

export const MANIFEST_TYPES: ManifestType[] = ['inward', 'outward'];

export const MANIFEST_TYPE_LABELS: Record<ManifestType, string> = {
  inward: 'Inward',
  outward: 'Outward',
};

// B/L Container Detail
export interface BLContainer {
  containerNo: string;
  sealNo: string;
  type: ContainerType;
  packages: number;
  weightKg: number;
}

// Estimated Charge
export interface EstimatedCharge {
  chargeType: string;
  amount: number;
  currency: string;
}

// Bill of Lading
export interface BillOfLading {
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
export interface ShippingInstruction {
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
export interface ArrivalNotice {
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
export interface CargoManifest {
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
export interface BLTotals {
  totalContainers: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
}

// Manifest Totals
export interface ManifestTotals {
  totalBls: number;
  totalContainers: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
}

// Form Data Types
export interface BLFormData {
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

export interface SIFormData {
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

export interface ArrivalNoticeFormData {
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

export interface ManifestFormData {
  manifestType: ManifestType;
  vesselName: string;
  voyageNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  departureDate?: string;
  arrivalDate?: string;
  blIds?: string[];
}

// Database Row Types (snake_case for Supabase)
export interface BillOfLadingRow {
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

export interface ShippingInstructionRow {
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

export interface ArrivalNoticeRow {
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

export interface CargoManifestRow {
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

// Filter Types
export interface BLFilters {
  search?: string;
  status?: BLStatus;
  bookingId?: string;
  shippingLineId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SIFilters {
  search?: string;
  status?: SIStatus;
  bookingId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ManifestFilters {
  search?: string;
  status?: ManifestStatus;
  manifestType?: ManifestType;
  dateFrom?: string;
  dateTo?: string;
}
