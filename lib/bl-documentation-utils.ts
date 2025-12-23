// =====================================================
// v0.73: AGENCY - BILL OF LADING & DOCUMENTATION UTILITIES
// =====================================================

import {
  BLContainer,
  BLTotals,
  ManifestTotals,
  BillOfLading,
  ShippingInstruction,
  ArrivalNotice,
  CargoManifest,
  BillOfLadingRow,
  ShippingInstructionRow,
  ArrivalNoticeRow,
  CargoManifestRow,
  BLFormData,
  ArrivalNoticeFormData,
  BLStatus,
  BLType,
  SIStatus,
  ArrivalNoticeStatus,
  ManifestStatus,
  ManifestType,
  FreightTerms,
  ValidationResult,
  ValidationError,
} from '@/types/agency';

// =====================================================
// NUMBER GENERATION FUNCTIONS
// =====================================================

/**
 * Generate SI number in format SI-YYYY-NNNNN
 * @param sequence - The sequence number from database
 * @returns Formatted SI number
 */
export function generateSINumber(sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `SI-${year}-${paddedSequence}`;
}

/**
 * Generate Arrival Notice number in format AN-YYYY-NNNNN
 * @param sequence - The sequence number from database
 * @returns Formatted notice number
 */
export function generateNoticeNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `AN-${year}-${paddedSequence}`;
}

/**
 * Generate Manifest number in format MF-YYYY-NNNNN
 * @param sequence - The sequence number from database
 * @returns Formatted manifest number
 */
export function generateManifestNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `MF-${year}-${paddedSequence}`;
}

// =====================================================
// CONTAINER NUMBER VALIDATION
// =====================================================

/**
 * Validate container number format according to ISO 6346
 * Format: 4 uppercase letters followed by 7 digits (e.g., MSCU1234567)
 * @param containerNo - Container number to validate
 * @returns true if valid, false otherwise
 */
export function validateContainerNumber(containerNo: string): boolean {
  if (!containerNo || typeof containerNo !== 'string') {
    return false;
  }
  // ISO 6346: 4 uppercase letters + 7 digits
  const pattern = /^[A-Z]{4}\d{7}$/;
  return pattern.test(containerNo);
}

// =====================================================
// TOTALS CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate B/L totals from container details
 * @param containers - Array of container details
 * @returns BLTotals with calculated sums
 */
export function calculateBLTotals(containers: BLContainer[]): BLTotals {
  if (!containers || !Array.isArray(containers)) {
    return {
      totalContainers: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      totalCbm: 0,
    };
  }

  return {
    totalContainers: containers.length,
    totalPackages: containers.reduce((sum, c) => sum + (c.packages || 0), 0),
    totalWeightKg: containers.reduce((sum, c) => sum + (c.weightKg || 0), 0),
    totalCbm: 0, // CBM is typically calculated separately or stored per container
  };
}

/**
 * Calculate manifest totals from linked Bills of Lading
 * @param bls - Array of linked Bills of Lading
 * @returns ManifestTotals with calculated sums
 */
export function calculateManifestTotals(bls: BillOfLading[]): ManifestTotals {
  if (!bls || !Array.isArray(bls)) {
    return {
      totalBls: 0,
      totalContainers: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      totalCbm: 0,
    };
  }

  return {
    totalBls: bls.length,
    totalContainers: bls.reduce((sum, bl) => sum + (bl.containers?.length || 0), 0),
    totalPackages: bls.reduce((sum, bl) => sum + (bl.numberOfPackages || 0), 0),
    totalWeightKg: bls.reduce((sum, bl) => sum + (bl.grossWeightKg || 0), 0),
    totalCbm: bls.reduce((sum, bl) => sum + (bl.measurementCbm || 0), 0),
  };
}

// =====================================================
// FREE TIME CALCULATION
// =====================================================

/**
 * Calculate free time expiry date
 * @param eta - Estimated Time of Arrival (ISO date string)
 * @param freeTimeDays - Number of free time days
 * @returns ISO date string for expiry date
 */
export function calculateFreeTimeExpiry(eta: string, freeTimeDays: number): string {
  const etaDate = new Date(eta);
  etaDate.setDate(etaDate.getDate() + freeTimeDays);
  return etaDate.toISOString().split('T')[0];
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate B/L form data for required fields
 * @param data - B/L form data to validate
 * @returns ValidationResult with isValid flag and errors array
 */
export function validateBLData(data: Partial<BLFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields per Requirements 6.1, 6.2
  if (!data.bookingId?.trim()) {
    errors.push({ field: 'bookingId', message: 'A freight booking must be selected' });
  }

  if (!data.vesselName?.trim()) {
    errors.push({ field: 'vesselName', message: 'Vessel name is required' });
  }

  if (!data.portOfLoading?.trim()) {
    errors.push({ field: 'portOfLoading', message: 'Port of loading is required' });
  }

  if (!data.portOfDischarge?.trim()) {
    errors.push({ field: 'portOfDischarge', message: 'Port of discharge is required' });
  }

  if (!data.shipperName?.trim()) {
    errors.push({ field: 'shipperName', message: 'Shipper name is required' });
  }

  if (!data.cargoDescription?.trim()) {
    errors.push({ field: 'cargoDescription', message: 'Cargo description is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Arrival Notice form data for required fields
 * @param data - Arrival Notice form data to validate
 * @returns ValidationResult with isValid flag and errors array
 */
export function validateArrivalNoticeData(data: Partial<ArrivalNoticeFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required field per Requirement 6.3
  if (!data.blId?.trim()) {
    errors.push({ field: 'blId', message: 'A Bill of Lading must be selected' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =====================================================
// DATA MAPPING FUNCTIONS
// =====================================================

/**
 * Map database row to BillOfLading model
 * @param row - Database row with snake_case fields
 * @returns BillOfLading object with camelCase fields
 */
export function mapBLRowToModel(row: BillOfLadingRow): BillOfLading {
  return {
    id: row.id,
    blNumber: row.bl_number,
    bookingId: row.booking_id,
    jobOrderId: row.job_order_id,
    blType: row.bl_type as BLType,
    originalCount: row.original_count,
    shippingLineId: row.shipping_line_id,
    carrierBlNumber: row.carrier_bl_number,
    vesselName: row.vessel_name,
    voyageNumber: row.voyage_number,
    flag: row.flag,
    portOfLoading: row.port_of_loading,
    portOfDischarge: row.port_of_discharge,
    placeOfReceipt: row.place_of_receipt,
    placeOfDelivery: row.place_of_delivery,
    shippedOnBoardDate: row.shipped_on_board_date,
    blDate: row.bl_date,
    shipperName: row.shipper_name,
    shipperAddress: row.shipper_address,
    consigneeName: row.consignee_name,
    consigneeAddress: row.consignee_address,
    consigneeToOrder: row.consignee_to_order,
    notifyPartyName: row.notify_party_name,
    notifyPartyAddress: row.notify_party_address,
    cargoDescription: row.cargo_description,
    marksAndNumbers: row.marks_and_numbers,
    numberOfPackages: row.number_of_packages,
    packageType: row.package_type,
    grossWeightKg: row.gross_weight_kg,
    measurementCbm: row.measurement_cbm,
    containers: row.containers || [],
    freightTerms: row.freight_terms as FreightTerms,
    freightAmount: row.freight_amount,
    freightCurrency: row.freight_currency,
    status: row.status as BLStatus,
    issuedAt: row.issued_at,
    releasedAt: row.released_at,
    draftBlUrl: row.draft_bl_url,
    finalBlUrl: row.final_bl_url,
    remarks: row.remarks,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map database row to ShippingInstruction model
 * @param row - Database row with snake_case fields
 * @returns ShippingInstruction object with camelCase fields
 */
export function mapSIRowToModel(row: ShippingInstructionRow): ShippingInstruction {
  return {
    id: row.id,
    siNumber: row.si_number,
    bookingId: row.booking_id,
    blId: row.bl_id,
    status: row.status as SIStatus,
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at,
    shipperName: row.shipper_name,
    shipperAddress: row.shipper_address,
    shipperContact: row.shipper_contact,
    consigneeName: row.consignee_name,
    consigneeAddress: row.consignee_address,
    consigneeToOrder: row.consignee_to_order,
    toOrderText: row.to_order_text,
    notifyPartyName: row.notify_party_name,
    notifyPartyAddress: row.notify_party_address,
    secondNotifyName: row.second_notify_name,
    secondNotifyAddress: row.second_notify_address,
    cargoDescription: row.cargo_description,
    marksAndNumbers: row.marks_and_numbers,
    hsCode: row.hs_code,
    numberOfPackages: row.number_of_packages,
    packageType: row.package_type,
    grossWeightKg: row.gross_weight_kg,
    netWeightKg: row.net_weight_kg,
    measurementCbm: row.measurement_cbm,
    blTypeRequested: row.bl_type_requested as BLType | undefined,
    originalsRequired: row.originals_required,
    copiesRequired: row.copies_required,
    freightTerms: row.freight_terms as FreightTerms,
    specialInstructions: row.special_instructions,
    lcNumber: row.lc_number,
    lcIssuingBank: row.lc_issuing_bank,
    lcTerms: row.lc_terms,
    documentsRequired: row.documents_required || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map database row to ArrivalNotice model
 * @param row - Database row with snake_case fields
 * @returns ArrivalNotice object with camelCase fields
 */
export function mapArrivalNoticeRowToModel(row: ArrivalNoticeRow): ArrivalNotice {
  return {
    id: row.id,
    noticeNumber: row.notice_number,
    blId: row.bl_id,
    bookingId: row.booking_id,
    vesselName: row.vessel_name,
    voyageNumber: row.voyage_number,
    eta: row.eta,
    ata: row.ata,
    portOfDischarge: row.port_of_discharge,
    terminal: row.terminal,
    berth: row.berth,
    containerNumbers: row.container_numbers || [],
    cargoDescription: row.cargo_description,
    freeTimeDays: row.free_time_days,
    freeTimeExpires: row.free_time_expires,
    estimatedCharges: row.estimated_charges || [],
    deliveryInstructions: row.delivery_instructions,
    deliveryAddress: row.delivery_address,
    consigneeNotified: row.consignee_notified,
    notifiedAt: row.notified_at,
    notifiedBy: row.notified_by,
    status: row.status as ArrivalNoticeStatus,
    clearedAt: row.cleared_at,
    deliveredAt: row.delivered_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/**
 * Map database row to CargoManifest model
 * @param row - Database row with snake_case fields
 * @returns CargoManifest object with camelCase fields
 */
export function mapManifestRowToModel(row: CargoManifestRow): CargoManifest {
  return {
    id: row.id,
    manifestNumber: row.manifest_number,
    manifestType: row.manifest_type as ManifestType,
    vesselName: row.vessel_name,
    voyageNumber: row.voyage_number,
    portOfLoading: row.port_of_loading,
    portOfDischarge: row.port_of_discharge,
    departureDate: row.departure_date,
    arrivalDate: row.arrival_date,
    totalBls: row.total_bls,
    totalContainers: row.total_containers,
    totalPackages: row.total_packages,
    totalWeightKg: row.total_weight_kg,
    totalCbm: row.total_cbm,
    blIds: row.bl_ids || [],
    status: row.status as ManifestStatus,
    submittedTo: row.submitted_to,
    submittedAt: row.submitted_at,
    documentUrl: row.document_url,
    createdAt: row.created_at,
  };
}

// =====================================================
// FORMAT VALIDATION HELPERS
// =====================================================

/**
 * Validate SI number format (SI-YYYY-NNNNN)
 * @param siNumber - SI number to validate
 * @returns true if valid format
 */
export function isValidSINumberFormat(siNumber: string): boolean {
  if (!siNumber || typeof siNumber !== 'string') {
    return false;
  }
  const pattern = /^SI-\d{4}-\d{5}$/;
  return pattern.test(siNumber);
}

/**
 * Validate Arrival Notice number format (AN-YYYY-NNNNN)
 * @param noticeNumber - Notice number to validate
 * @returns true if valid format
 */
export function isValidNoticeNumberFormat(noticeNumber: string): boolean {
  if (!noticeNumber || typeof noticeNumber !== 'string') {
    return false;
  }
  const pattern = /^AN-\d{4}-\d{5}$/;
  return pattern.test(noticeNumber);
}

/**
 * Validate Manifest number format (MF-YYYY-NNNNN)
 * @param manifestNumber - Manifest number to validate
 * @returns true if valid format
 */
export function isValidManifestNumberFormat(manifestNumber: string): boolean {
  if (!manifestNumber || typeof manifestNumber !== 'string') {
    return false;
  }
  const pattern = /^MF-\d{4}-\d{5}$/;
  return pattern.test(manifestNumber);
}


// =====================================================
// STATUS AND FILTER HELPERS
// =====================================================

/**
 * Check if a B/L can be deleted based on its status
 * B/Ls with status 'issued', 'released', or 'surrendered' cannot be deleted
 * @param status - Current B/L status
 * @returns true if B/L can be deleted
 */
export function canDeleteBillOfLading(status: BLStatus): boolean {
  const protectedStatuses: BLStatus[] = ['issued', 'released', 'surrendered'];
  return !protectedStatuses.includes(status);
}

/**
 * Filter pending arrivals from a list
 * Returns only arrivals with status 'pending' or 'notified', ordered by ETA ascending
 * @param arrivals - Array of ArrivalNotice to filter
 * @returns Filtered and sorted array of pending arrivals
 */
export function filterPendingArrivals(arrivals: ArrivalNotice[]): ArrivalNotice[] {
  return arrivals
    .filter(a => a.status === 'pending' || a.status === 'notified')
    .sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime());
}
