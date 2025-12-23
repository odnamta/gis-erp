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
