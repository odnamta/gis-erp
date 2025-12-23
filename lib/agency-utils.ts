// =====================================================
// v0.71: AGENCY MANAGEMENT UTILITY FUNCTIONS
// =====================================================

import {
  ShippingLine,
  ShippingLineFormData,
  PortAgent,
  PortAgentFormData,
  ServiceProvider,
  ServiceProviderFormData,
  ShippingRateFormData,
  ValidationResult,
  ValidationError,
  ShippingLineStats,
  PortAgentStats,
  SERVICE_TYPES,
  PORT_AGENT_SERVICES,
  PROVIDER_TYPES,
  PORT_TYPES,
  CONTAINER_TYPES,
  SHIPPING_TERMS,
  ServiceType,
  PortAgentService,
  ProviderType,
  PortType,
  ContainerType,
  ShippingTerms,
} from '@/types/agency';

// =====================================================
// CODE GENERATION FUNCTIONS
// =====================================================

/**
 * Generate a unique shipping line code from the line name
 * Format: First 3-4 letters uppercase + random suffix
 */
export function generateShippingLineCode(lineName: string, existingCodes: string[] = []): string {
  // Extract first letters of each word, max 4 chars
  const words = lineName.trim().split(/\s+/);
  let baseCode = words
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 4);
  
  // If too short, pad with first word letters
  if (baseCode.length < 3 && words[0]) {
    baseCode = words[0].slice(0, 4).toUpperCase();
  }
  
  // Ensure minimum 3 chars
  baseCode = baseCode.padEnd(3, 'X');
  
  // Check if base code exists, add suffix if needed
  let code = baseCode;
  let suffix = 1;
  while (existingCodes.includes(code)) {
    code = `${baseCode}${suffix}`;
    suffix++;
  }
  
  return code;
}

/**
 * Generate a unique port agent code
 * Format: PORT_CODE + first 3 letters of agent name + suffix
 */
export function generateAgentCode(agentName: string, portCode: string, existingCodes: string[] = []): string {
  const agentPrefix = agentName
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3)
    .padEnd(3, 'X');
  
  const baseCode = `${portCode}-${agentPrefix}`;
  
  let code = baseCode;
  let suffix = 1;
  while (existingCodes.includes(code)) {
    code = `${baseCode}${suffix}`;
    suffix++;
  }
  
  return code;
}

/**
 * Generate a unique service provider code
 * Format: TYPE_PREFIX + first 3 letters of name + suffix
 */
export function generateProviderCode(providerName: string, providerType: ProviderType, existingCodes: string[] = []): string {
  const typePrefix = providerType.slice(0, 3).toUpperCase();
  const namePrefix = providerName
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3)
    .padEnd(3, 'X');
  
  const baseCode = `${typePrefix}-${namePrefix}`;
  
  let code = baseCode;
  let suffix = 1;
  while (existingCodes.includes(code)) {
    code = `${baseCode}${suffix}`;
    suffix++;
  }
  
  return code;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Check if a value is a valid service type
 */
export function isValidServiceType(value: string): value is ServiceType {
  return SERVICE_TYPES.includes(value as ServiceType);
}

/**
 * Check if a value is a valid port agent service
 */
export function isValidPortAgentService(value: string): value is PortAgentService {
  return PORT_AGENT_SERVICES.includes(value as PortAgentService);
}

/**
 * Check if a value is a valid provider type
 */
export function isValidProviderType(value: string): value is ProviderType {
  return PROVIDER_TYPES.includes(value as ProviderType);
}

/**
 * Check if a value is a valid port type
 */
export function isValidPortType(value: string): value is PortType {
  return PORT_TYPES.includes(value as PortType);
}

/**
 * Check if a value is a valid container type
 */
export function isValidContainerType(value: string): value is ContainerType {
  return CONTAINER_TYPES.includes(value as ContainerType);
}

/**
 * Check if a value is a valid shipping terms
 */
export function isValidShippingTerms(value: string): value is ShippingTerms {
  return SHIPPING_TERMS.includes(value as ShippingTerms);
}


/**
 * Validate shipping line form data
 */
export function validateShippingLine(data: ShippingLineFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!data.lineName?.trim()) {
    errors.push({ field: 'lineName', message: 'Line name is required' });
  }
  
  // Validate services offered
  if (data.servicesOffered && data.servicesOffered.length > 0) {
    const invalidServices = data.servicesOffered.filter(s => !isValidServiceType(s));
    if (invalidServices.length > 0) {
      errors.push({
        field: 'servicesOffered',
        message: `Invalid service types: ${invalidServices.join(', ')}. Valid values: ${SERVICE_TYPES.join(', ')}`,
      });
    }
  }
  
  // Validate credit limit
  if (data.creditLimit !== undefined && data.creditLimit < 0) {
    errors.push({ field: 'creditLimit', message: 'Credit limit cannot be negative' });
  }
  
  // Validate credit days
  if (data.creditDays !== undefined && data.creditDays < 0) {
    errors.push({ field: 'creditDays', message: 'Credit days cannot be negative' });
  }
  
  // Validate service rating
  if (data.serviceRating !== undefined && (data.serviceRating < 1 || data.serviceRating > 5)) {
    errors.push({ field: 'serviceRating', message: 'Service rating must be between 1.0 and 5.0' });
  }
  
  // Validate email format if provided
  if (data.localAgentEmail && !isValidEmail(data.localAgentEmail)) {
    errors.push({ field: 'localAgentEmail', message: 'Invalid email format' });
  }
  
  // Validate website URL if provided
  if (data.website && !isValidUrl(data.website)) {
    errors.push({ field: 'website', message: 'Invalid website URL' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate port agent form data
 */
export function validatePortAgent(data: PortAgentFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!data.agentName?.trim()) {
    errors.push({ field: 'agentName', message: 'Agent name is required' });
  }
  
  if (!data.portName?.trim()) {
    errors.push({ field: 'portName', message: 'Port name is required' });
  }
  
  if (!data.portCountry?.trim()) {
    errors.push({ field: 'portCountry', message: 'Port country is required' });
  }
  
  // Validate services
  if (data.services && data.services.length > 0) {
    const invalidServices = data.services.filter(s => !isValidPortAgentService(s));
    if (invalidServices.length > 0) {
      errors.push({
        field: 'services',
        message: `Invalid services: ${invalidServices.join(', ')}. Valid values: ${PORT_AGENT_SERVICES.join(', ')}`,
      });
    }
  }
  
  // Validate service rating
  if (data.serviceRating !== undefined && (data.serviceRating < 1 || data.serviceRating > 5)) {
    errors.push({ field: 'serviceRating', message: 'Service rating must be between 1.0 and 5.0' });
  }
  
  // Validate email format if provided
  if (data.email && !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate service provider form data
 */
export function validateServiceProvider(data: ServiceProviderFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!data.providerName?.trim()) {
    errors.push({ field: 'providerName', message: 'Provider name is required' });
  }
  
  if (!data.providerType) {
    errors.push({ field: 'providerType', message: 'Provider type is required' });
  } else if (!isValidProviderType(data.providerType)) {
    errors.push({
      field: 'providerType',
      message: `Invalid provider type. Valid values: ${PROVIDER_TYPES.join(', ')}`,
    });
  }
  
  // Validate service rating
  if (data.serviceRating !== undefined && (data.serviceRating < 1 || data.serviceRating > 5)) {
    errors.push({ field: 'serviceRating', message: 'Service rating must be between 1.0 and 5.0' });
  }
  
  // Validate email format if provided
  if (data.email && !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate shipping rate form data
 */
export function validateShippingRate(data: ShippingRateFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!data.shippingLineId) {
    errors.push({ field: 'shippingLineId', message: 'Shipping line is required' });
  }
  
  if (!data.originPortId) {
    errors.push({ field: 'originPortId', message: 'Origin port is required' });
  }
  
  if (!data.destinationPortId) {
    errors.push({ field: 'destinationPortId', message: 'Destination port is required' });
  }
  
  if (!data.containerType) {
    errors.push({ field: 'containerType', message: 'Container type is required' });
  } else if (!isValidContainerType(data.containerType)) {
    errors.push({
      field: 'containerType',
      message: `Invalid container type. Valid values: ${CONTAINER_TYPES.join(', ')}`,
    });
  }
  
  if (data.oceanFreight === undefined || data.oceanFreight < 0) {
    errors.push({ field: 'oceanFreight', message: 'Ocean freight must be a non-negative number' });
  }
  
  if (!data.validFrom) {
    errors.push({ field: 'validFrom', message: 'Valid from date is required' });
  }
  
  if (!data.validTo) {
    errors.push({ field: 'validTo', message: 'Valid to date is required' });
  }
  
  // Validate date range
  if (data.validFrom && data.validTo) {
    const fromDate = new Date(data.validFrom);
    const toDate = new Date(data.validTo);
    if (fromDate > toDate) {
      errors.push({ field: 'validTo', message: 'Valid to date must be after valid from date' });
    }
  }
  
  // Validate terms
  if (data.terms && !isValidShippingTerms(data.terms)) {
    errors.push({
      field: 'terms',
      message: `Invalid shipping terms. Valid values: ${SHIPPING_TERMS.join(', ')}`,
    });
  }
  
  // Validate surcharges are non-negative
  if (data.baf !== undefined && data.baf < 0) {
    errors.push({ field: 'baf', message: 'BAF cannot be negative' });
  }
  if (data.caf !== undefined && data.caf < 0) {
    errors.push({ field: 'caf', message: 'CAF cannot be negative' });
  }
  if (data.pss !== undefined && data.pss < 0) {
    errors.push({ field: 'pss', message: 'PSS cannot be negative' });
  }
  if (data.ens !== undefined && data.ens < 0) {
    errors.push({ field: 'ens', message: 'ENS cannot be negative' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}


// =====================================================
// STATISTICS FUNCTIONS
// =====================================================

/**
 * Calculate statistics for shipping lines
 */
export function calculateShippingLineStats(lines: ShippingLine[]): ShippingLineStats {
  const activeLines = lines.filter(l => l.isActive);
  
  const totalLines = activeLines.length;
  const preferredCount = activeLines.filter(l => l.isPreferred).length;
  
  // Calculate average rating (only for lines with ratings)
  const linesWithRating = activeLines.filter(l => l.serviceRating !== undefined && l.serviceRating !== null);
  const averageRating = linesWithRating.length > 0
    ? Math.round((linesWithRating.reduce((sum, l) => sum + (l.serviceRating || 0), 0) / linesWithRating.length) * 100) / 100
    : 0;
  
  // Calculate total credit limit
  const totalCreditLimit = activeLines.reduce((sum, l) => sum + (l.creditLimit || 0), 0);
  
  return {
    totalLines,
    preferredCount,
    averageRating,
    totalCreditLimit,
  };
}

/**
 * Calculate statistics for port agents
 */
export function calculatePortAgentStats(agents: PortAgent[]): PortAgentStats {
  const activeAgents = agents.filter(a => a.isActive);
  
  const totalAgents = activeAgents.length;
  const preferredCount = activeAgents.filter(a => a.isPreferred).length;
  
  // Calculate average rating (only for agents with ratings)
  const agentsWithRating = activeAgents.filter(a => a.serviceRating !== undefined && a.serviceRating !== null);
  const averageRating = agentsWithRating.length > 0
    ? Math.round((agentsWithRating.reduce((sum, a) => sum + (a.serviceRating || 0), 0) / agentsWithRating.length) * 100) / 100
    : 0;
  
  // Count unique countries
  const countries = new Set(activeAgents.map(a => a.portCountry));
  const countriesCount = countries.size;
  
  return {
    totalAgents,
    preferredCount,
    averageRating,
    countriesCount,
  };
}

// =====================================================
// DATA TRANSFORMATION FUNCTIONS
// =====================================================

/**
 * Transform database row to ShippingLine object
 */
export function transformShippingLineRow(row: Record<string, unknown>): ShippingLine {
  return {
    id: row.id as string,
    lineCode: row.line_code as string,
    lineName: row.line_name as string,
    headOfficeAddress: row.head_office_address as string | undefined,
    headOfficeCountry: row.head_office_country as string | undefined,
    website: row.website as string | undefined,
    bookingPortalUrl: row.booking_portal_url as string | undefined,
    trackingUrl: row.tracking_url as string | undefined,
    localAgentName: row.local_agent_name as string | undefined,
    localAgentAddress: row.local_agent_address as string | undefined,
    localAgentPhone: row.local_agent_phone as string | undefined,
    localAgentEmail: row.local_agent_email as string | undefined,
    contacts: (row.contacts as ShippingLine['contacts']) || [],
    servicesOffered: (row.services_offered as ShippingLine['servicesOffered']) || [],
    routesServed: (row.routes_served as ShippingLine['routesServed']) || [],
    paymentTerms: row.payment_terms as string | undefined,
    creditLimit: row.credit_limit as number | undefined,
    creditDays: row.credit_days as number | undefined,
    serviceRating: row.service_rating as number | undefined,
    reliabilityScore: row.reliability_score as number | undefined,
    isPreferred: row.is_preferred as boolean,
    isActive: row.is_active as boolean,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform database row to PortAgent object
 */
export function transformPortAgentRow(row: Record<string, unknown>): PortAgent {
  return {
    id: row.id as string,
    agentCode: row.agent_code as string,
    agentName: row.agent_name as string,
    portId: row.port_id as string | undefined,
    portName: row.port_name as string,
    portCountry: row.port_country as string,
    address: row.address as string | undefined,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    website: row.website as string | undefined,
    contacts: (row.contacts as PortAgent['contacts']) || [],
    services: (row.services as PortAgent['services']) || [],
    customsLicense: row.customs_license as string | undefined,
    ppjkLicense: row.ppjk_license as string | undefined,
    otherLicenses: (row.other_licenses as string[]) || [],
    paymentTerms: row.payment_terms as string | undefined,
    currency: row.currency as string,
    bankName: row.bank_name as string | undefined,
    bankAccount: row.bank_account as string | undefined,
    bankSwift: row.bank_swift as string | undefined,
    serviceRating: row.service_rating as number | undefined,
    responseTimeHours: row.response_time_hours as number | undefined,
    ratingCount: row.rating_count as number | undefined,
    isPreferred: row.is_preferred as boolean,
    isActive: row.is_active as boolean,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform database row to ServiceProvider object
 */
export function transformServiceProviderRow(row: Record<string, unknown>): ServiceProvider {
  return {
    id: row.id as string,
    providerCode: row.provider_code as string,
    providerName: row.provider_name as string,
    providerType: row.provider_type as ProviderType,
    city: row.city as string | undefined,
    province: row.province as string | undefined,
    country: row.country as string,
    address: row.address as string | undefined,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    contacts: (row.contacts as ServiceProvider['contacts']) || [],
    servicesDetail: (row.services_detail as ServiceProvider['servicesDetail']) || [],
    coverageAreas: (row.coverage_areas as ServiceProvider['coverageAreas']) || [],
    paymentTerms: row.payment_terms as string | undefined,
    npwp: row.npwp as string | undefined,
    siup: row.siup as string | undefined,
    documents: (row.documents as ServiceProvider['documents']) || [],
    serviceRating: row.service_rating as number | undefined,
    isPreferred: row.is_preferred as boolean,
    isActive: row.is_active as boolean,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform database row to Port object
 */
export function transformPortRow(row: Record<string, unknown>): import('@/types/agency').Port {
  return {
    id: row.id as string,
    portCode: row.port_code as string,
    portName: row.port_name as string,
    countryCode: row.country_code as string,
    countryName: row.country_name as string,
    portType: row.port_type as PortType,
    city: row.city as string | undefined,
    latitude: row.latitude as number | undefined,
    longitude: row.longitude as number | undefined,
    timezone: row.timezone as string | undefined,
    hasContainerTerminal: row.has_container_terminal as boolean,
    hasBreakbulkFacility: row.has_breakbulk_facility as boolean,
    hasRoRo: row.has_ro_ro as boolean,
    maxDraftM: row.max_draft_m as number | undefined,
    maxVesselLoaM: row.max_vessel_loa_m as number | undefined,
    primaryAgentId: row.primary_agent_id as string | undefined,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

/**
 * Transform database row to ShippingRate object
 */
export function transformShippingRateRow(row: Record<string, unknown>): import('@/types/agency').ShippingRate {
  return {
    id: row.id as string,
    shippingLineId: row.shipping_line_id as string,
    originPortId: row.origin_port_id as string,
    destinationPortId: row.destination_port_id as string,
    containerType: row.container_type as import('@/types/agency').ContainerType,
    oceanFreight: row.ocean_freight as number,
    currency: row.currency as string,
    baf: row.baf as number,
    caf: row.caf as number,
    pss: row.pss as number,
    ens: row.ens as number,
    otherSurcharges: (row.other_surcharges as import('@/types/agency').SurchargeItem[]) || [],
    totalRate: row.total_rate as number,
    transitDays: row.transit_days as number | undefined,
    frequency: row.frequency as string | undefined,
    validFrom: row.valid_from as string,
    validTo: row.valid_to as string,
    terms: row.terms as import('@/types/agency').ShippingTerms,
    notes: row.notes as string | undefined,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    // View fields
    lineName: row.line_name as string | undefined,
    lineCode: row.line_code as string | undefined,
    originPort: row.origin_port as string | undefined,
    originCode: row.origin_code as string | undefined,
    destinationPort: row.destination_port as string | undefined,
    destinationCode: row.destination_code as string | undefined,
  };
}
