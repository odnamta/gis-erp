// =====================================================
// v0.72: AGENCY - BOOKING MANAGEMENT UTILITIES
// =====================================================

import {
  BookingStatus,
  BookingContainer,
  FreightBooking,
  BookingAmendment,
  DangerousGoodsInfo,
  CutoffWarningLevel,
  ValidationResult,
  ValidationError,
  ContainerType,
  CONTAINER_TYPES,
  CommodityType,
  FreightCalculation,
  ContainerFreight,
  ShippingRate,
  BookingFilters,
} from '@/types/agency';

// =====================================================
// STATUS TRANSITION VALIDATION
// =====================================================

/**
 * Valid status transitions for bookings
 * Key: current status, Value: array of valid next statuses
 */
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ['requested', 'cancelled'],
  requested: ['confirmed', 'cancelled'],
  confirmed: ['amended', 'shipped', 'cancelled'],
  amended: ['shipped', 'cancelled'],
  cancelled: [], // Terminal state
  shipped: ['completed'],
  completed: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(from: BookingStatus, to: BookingStatus): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[from];
  return validTransitions.includes(to);
}

/**
 * Get the next valid statuses from current status
 */
export function getNextValidStatuses(current: BookingStatus): BookingStatus[] {
  return VALID_STATUS_TRANSITIONS[current] || [];
}

/**
 * Check if a status is a terminal state
 */
export function isTerminalStatus(status: BookingStatus): boolean {
  return status === 'cancelled' || status === 'completed';
}

// =====================================================
// CONTAINER CALCULATIONS
// =====================================================

/**
 * Calculate total weight from containers
 */
export function calculateTotalWeight(containers: BookingContainer[]): number {
  return containers.reduce((sum, container) => sum + (container.grossWeightKg || 0), 0);
}

/**
 * Calculate total container count
 */
export function calculateTotalContainers(containers: BookingContainer[]): number {
  return containers.length;
}

/**
 * Get container count by type
 */
export function getContainerCountByType(containers: BookingContainer[]): Record<ContainerType, number> {
  const counts: Record<string, number> = {};
  
  for (const container of containers) {
    const type = container.containerType;
    counts[type] = (counts[type] || 0) + 1;
  }
  
  return counts as Record<ContainerType, number>;
}

/**
 * Format container summary string
 */
export function formatContainerSummary(containers: BookingContainer[]): string {
  if (containers.length === 0) return 'No containers';
  
  const countByType = getContainerCountByType(containers);
  const parts: string[] = [];
  
  for (const [type, count] of Object.entries(countByType)) {
    parts.push(`${count}x ${type}`);
  }
  
  const totalWeight = calculateTotalWeight(containers);
  const weightStr = totalWeight > 0 ? ` • ${formatWeight(totalWeight)}` : '';
  
  return `${parts.join(', ')}${weightStr}`;
}

/**
 * Format weight in kg with thousands separator
 */
export function formatWeight(weightKg: number): string {
  return `${weightKg.toLocaleString()} kg`;
}

// =====================================================
// FREIGHT CALCULATIONS
// =====================================================

/**
 * Calculate freight total from containers and rates
 */
export function calculateFreightTotal(
  containers: BookingContainer[],
  rates: Map<ContainerType, number>
): number {
  let total = 0;
  
  for (const container of containers) {
    const rate = rates.get(container.containerType) || 0;
    total += rate;
  }
  
  return total;
}

/**
 * Calculate detailed freight breakdown
 */
export function calculateFreightBreakdown(
  containers: BookingContainer[],
  rates: ShippingRate[]
): FreightCalculation {
  const containersByType = getContainerCountByType(containers);
  const containerFreights: ContainerFreight[] = [];
  let totalFreight = 0;
  let currency = 'USD';
  
  for (const [type, quantity] of Object.entries(containersByType)) {
    const rate = rates.find(r => r.containerType === type);
    if (rate) {
      const subtotal = rate.totalRate * quantity;
      containerFreights.push({
        containerType: type as ContainerType,
        quantity,
        ratePerUnit: rate.totalRate,
        subtotal,
      });
      totalFreight += subtotal;
      currency = rate.currency;
    }
  }
  
  return {
    containers: containerFreights,
    totalFreight,
    currency,
  };
}

// =====================================================
// CUTOFF WARNING LEVELS
// =====================================================

/**
 * Get days until cutoff date
 */
export function getDaysUntilCutoff(cutoffDate: string): number {
  const cutoff = new Date(cutoffDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  cutoff.setHours(0, 0, 0, 0);
  
  const diffTime = cutoff.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get cutoff warning level based on date
 */
export function getCutoffWarningLevel(cutoffDate: string): CutoffWarningLevel {
  const daysUntil = getDaysUntilCutoff(cutoffDate);
  
  if (daysUntil < 0) {
    return 'alert'; // Cutoff has passed
  } else if (daysUntil <= 3) {
    return 'warning'; // Within 3 days
  }
  
  return 'none';
}

/**
 * Get cutoff warning message
 */
export function getCutoffWarningMessage(cutoffDate: string): string | null {
  const level = getCutoffWarningLevel(cutoffDate);
  const daysUntil = getDaysUntilCutoff(cutoffDate);
  
  if (level === 'alert') {
    return `Cutoff date has passed (${Math.abs(daysUntil)} days ago)`;
  } else if (level === 'warning') {
    return `Cutoff in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
  }
  
  return null;
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Validate booking for submission (status change to 'requested')
 */
export function validateBookingForSubmission(booking: Partial<FreightBooking>): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!booking.shippingLineId) {
    errors.push({ field: 'shippingLineId', message: 'Shipping line is required' });
  }
  
  if (!booking.originPortId) {
    errors.push({ field: 'originPortId', message: 'Origin port is required' });
  }
  
  if (!booking.destinationPortId) {
    errors.push({ field: 'destinationPortId', message: 'Destination port is required' });
  }
  
  if (!booking.cargoDescription?.trim()) {
    errors.push({ field: 'cargoDescription', message: 'Cargo description is required' });
  }
  
  if (!booking.commodityType) {
    errors.push({ field: 'commodityType', message: 'Commodity type is required' });
  }
  
  // Shipper and consignee required for submission
  if (!booking.shipperName?.trim()) {
    errors.push({ field: 'shipperName', message: 'Shipper name is required' });
  }
  
  if (!booking.consigneeName?.trim()) {
    errors.push({ field: 'consigneeName', message: 'Consignee name is required' });
  }
  
  // Dangerous goods validation
  if (booking.commodityType === 'dangerous') {
    if (!booking.dangerousGoods) {
      errors.push({ field: 'dangerousGoods', message: 'Dangerous goods details are required for hazardous cargo' });
    } else {
      const dgErrors = validateDangerousGoods(booking.dangerousGoods);
      errors.push(...dgErrors.errors);
    }
  }
  
  // Date validation
  if (booking.etd && booking.cutoffDate) {
    const etd = new Date(booking.etd);
    const cutoff = new Date(booking.cutoffDate);
    if (etd < cutoff) {
      errors.push({ field: 'etd', message: 'ETD must be after cutoff date' });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate container data
 */
export function validateContainerData(container: Partial<BookingContainer>): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!container.containerType) {
    errors.push({ field: 'containerType', message: 'Container type is required' });
  } else if (!CONTAINER_TYPES.includes(container.containerType)) {
    errors.push({ field: 'containerType', message: 'Invalid container type' });
  }
  
  if (container.grossWeightKg !== undefined && container.grossWeightKg < 0) {
    errors.push({ field: 'grossWeightKg', message: 'Weight cannot be negative' });
  }
  
  if (container.packagesCount !== undefined && container.packagesCount < 0) {
    errors.push({ field: 'packagesCount', message: 'Package count cannot be negative' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate dangerous goods information
 */
export function validateDangerousGoods(dg: DangerousGoodsInfo): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!dg.unNumber?.trim()) {
    errors.push({ field: 'dangerousGoods.unNumber', message: 'UN number is required' });
  }
  
  if (!dg.class?.trim()) {
    errors.push({ field: 'dangerousGoods.class', message: 'DG class is required' });
  }
  
  if (!dg.properShippingName?.trim()) {
    errors.push({ field: 'dangerousGoods.properShippingName', message: 'Proper shipping name is required' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate booking has containers (for containerized cargo)
 */
export function validateBookingHasContainers(
  booking: Partial<FreightBooking>,
  containers: BookingContainer[]
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // For containerized cargo types, at least one container is required
  const containerizedTypes: CommodityType[] = ['general', 'reefer'];
  
  if (booking.commodityType && containerizedTypes.includes(booking.commodityType)) {
    if (containers.length === 0) {
      errors.push({ field: 'containers', message: 'At least one container is required for containerized cargo' });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =====================================================
// AMENDMENT HELPERS
// =====================================================

/**
 * Get next amendment number for a booking
 */
export function getNextAmendmentNumber(amendments: BookingAmendment[]): number {
  if (amendments.length === 0) return 1;
  
  const maxNumber = Math.max(...amendments.map(a => a.amendmentNumber));
  return maxNumber + 1;
}

/**
 * Extract changed fields from old and new values
 */
export function extractChangedFields(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): string[] {
  const changedFields: string[] = [];
  
  for (const key of Object.keys(newValues)) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changedFields.push(key);
    }
  }
  
  return changedFields;
}

// =====================================================
// FORMATTING
// =====================================================

/**
 * Format booking number for display
 */
export function formatBookingNumber(number: string): string {
  return number; // Already formatted as BKG-YYYY-NNNNN
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatBookingDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format route string
 */
export function formatRoute(originCode: string, destinationCode: string): string {
  return `${originCode} → ${destinationCode}`;
}

// =====================================================
// FILTERING
// =====================================================

/**
 * Filter bookings based on criteria
 */
export function filterBookings(
  bookings: FreightBooking[],
  filters: BookingFilters
): FreightBooking[] {
  return bookings.filter(booking => {
    // Search filter (booking number, customer name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        booking.bookingNumber.toLowerCase().includes(searchLower) ||
        booking.customer?.name?.toLowerCase().includes(searchLower) ||
        booking.cargoDescription?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (filters.status && booking.status !== filters.status) {
      return false;
    }
    
    // Shipping line filter
    if (filters.shippingLineId && booking.shippingLineId !== filters.shippingLineId) {
      return false;
    }
    
    // Origin port filter
    if (filters.originPortId && booking.originPortId !== filters.originPortId) {
      return false;
    }
    
    // Destination port filter
    if (filters.destinationPortId && booking.destinationPortId !== filters.destinationPortId) {
      return false;
    }
    
    // Customer filter
    if (filters.customerId && booking.customerId !== filters.customerId) {
      return false;
    }
    
    // Date range filter (ETD)
    if (filters.dateFrom && booking.etd) {
      if (new Date(booking.etd) < new Date(filters.dateFrom)) {
        return false;
      }
    }
    
    if (filters.dateTo && booking.etd) {
      if (new Date(booking.etd) > new Date(filters.dateTo)) {
        return false;
      }
    }
    
    // Include inactive filter (cancelled/completed)
    if (!filters.includeInactive) {
      if (booking.status === 'cancelled' || booking.status === 'completed') {
        return false;
      }
    }
    
    return true;
  });
}

// =====================================================
// BOOKING NUMBER VALIDATION
// =====================================================

/**
 * Validate booking number format (BKG-YYYY-NNNNN)
 */
export function isValidBookingNumberFormat(bookingNumber: string): boolean {
  const pattern = /^BKG-\d{4}-\d{5}$/;
  return pattern.test(bookingNumber);
}

/**
 * Parse booking number components
 */
export function parseBookingNumber(bookingNumber: string): { year: number; sequence: number } | null {
  const match = bookingNumber.match(/^BKG-(\d{4})-(\d{5})$/);
  if (!match) return null;
  
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}
