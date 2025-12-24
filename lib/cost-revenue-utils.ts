// =====================================================
// v0.75: AGENCY COST & REVENUE UTILITY FUNCTIONS
// =====================================================

import {
  AgencyChargeType,
  AgencyChargeTypeRow,
  ShipmentCost,
  ShipmentCostRow,
  ShipmentCostFormData,
  ShipmentRevenue,
  ShipmentRevenueRow,
  ShipmentRevenueFormData,
  AgencyVendorInvoice,
  AgencyVendorInvoiceRow,
  VendorInvoiceFormData,
  ShipmentProfitability,
  ShipmentProfitabilityRow,
  ChargeTypeFormData,
  ChargeCategory,
  ChargeTypeClass,
  CostPaymentStatus,
  RevenueBillingStatus,
  VendorInvoicePaymentStatus,
  CHARGE_CATEGORIES,
  CHARGE_TYPE_CLASSES,
  COST_PAYMENT_STATUSES,
  REVENUE_BILLING_STATUSES,
  VENDOR_INVOICE_PAYMENT_STATUSES,
} from '@/types/agency';

// =====================================================
// CONSTANTS
// =====================================================

/** Default Indonesian VAT rate (11%) */
export const DEFAULT_TAX_RATE = 11;

/** Default profit margin target (20%) */
export const DEFAULT_MARGIN_TARGET = 20;

/** Margin indicator thresholds */
export type MarginIndicator = 'green' | 'yellow' | 'red';

// =====================================================
// CURRENCY CONVERSION FUNCTIONS
// =====================================================

/**
 * Convert an amount to IDR using the provided exchange rate.
 * 
 * Property 1: Currency Conversion Consistency
 * For any amount and exchange rate, amount_idr = amount * exchange_rate
 * 
 * @param amount - The original amount in foreign currency
 * @param currency - The currency code (e.g., 'USD', 'IDR')
 * @param exchangeRate - The exchange rate to IDR (1 for IDR)
 * @returns The amount converted to IDR
 */
export function convertToIdr(amount: number, currency: string, exchangeRate: number): number {
  // If already IDR, return as-is
  if (currency === 'IDR') {
    return amount;
  }
  
  // Ensure exchange rate is positive
  if (exchangeRate <= 0) {
    throw new Error('Exchange rate must be greater than 0');
  }
  
  // Convert to IDR: amount * exchange_rate
  return amount * exchangeRate;
}

// =====================================================
// TAX CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate tax amount based on the amount, tax rate, and taxable flag.
 * 
 * Property 2: Tax Calculation Accuracy
 * When is_taxable is true: tax_amount = amount * (tax_rate / 100)
 * When is_taxable is false: tax_amount = 0
 * 
 * @param amount - The base amount
 * @param taxRate - The tax rate as a percentage (e.g., 11 for 11%)
 * @param isTaxable - Whether the item is taxable
 * @returns The calculated tax amount
 */
export function calculateTax(amount: number, taxRate: number, isTaxable: boolean): number {
  if (!isTaxable) {
    return 0;
  }
  
  // Ensure tax rate is non-negative
  if (taxRate < 0) {
    throw new Error('Tax rate cannot be negative');
  }
  
  return amount * (taxRate / 100);
}

/**
 * Calculate total amount with tax.
 * 
 * Property 2: Tax Calculation Accuracy
 * total_amount = amount + tax_amount
 * 
 * @param amount - The base amount
 * @param taxRate - The tax rate as a percentage
 * @param isTaxable - Whether the item is taxable
 * @returns Object containing amount, tax, and total
 */
export function calculateTotalWithTax(
  amount: number,
  taxRate: number,
  isTaxable: boolean
): { amount: number; tax: number; total: number } {
  const tax = calculateTax(amount, taxRate, isTaxable);
  return {
    amount,
    tax,
    total: amount + tax,
  };
}

// =====================================================
// PROFITABILITY CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate profit margin percentage.
 * 
 * Property 3: Profitability Calculation Correctness
 * profit_margin_pct = (gross_profit / total_revenue) * 100 when total_revenue > 0
 * profit_margin_pct = 0 when total_revenue = 0
 * 
 * @param revenue - Total revenue amount
 * @param cost - Total cost amount
 * @returns Profit margin as a percentage
 */
export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue <= 0) {
    return 0;
  }
  
  const grossProfit = revenue - cost;
  return (grossProfit / revenue) * 100;
}

/**
 * Calculate gross profit from revenue and cost.
 * 
 * @param revenue - Total revenue amount
 * @param cost - Total cost amount
 * @returns Gross profit (revenue - cost)
 */
export function calculateGrossProfit(revenue: number, cost: number): number {
  return revenue - cost;
}

/**
 * Aggregate costs to get total cost in IDR.
 * 
 * Property 3: Profitability Calculation Correctness
 * total_cost = sum of all cost line amounts_idr
 * 
 * @param costs - Array of shipment costs
 * @returns Total cost in IDR
 */
export function aggregateCosts(costs: ShipmentCost[]): number {
  return costs.reduce((sum, cost) => sum + (cost.amountIdr || 0), 0);
}

/**
 * Aggregate revenue to get total revenue in IDR.
 * 
 * Property 3: Profitability Calculation Correctness
 * total_revenue = sum of all revenue line amounts_idr
 * 
 * @param revenue - Array of shipment revenue items
 * @returns Total revenue in IDR
 */
export function aggregateRevenue(revenue: ShipmentRevenue[]): number {
  return revenue.reduce((sum, rev) => sum + (rev.amountIdr || 0), 0);
}

// =====================================================
// DUE DATE CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate days until due date or days overdue.
 * 
 * Property 8: Vendor Invoice Due Date Calculation
 * Positive value = days until due
 * Negative value = days overdue
 * 
 * @param dueDate - The due date string (ISO format)
 * @returns Number of days (positive = until due, negative = overdue)
 */
export function calculateDaysUntilDue(dueDate: string | undefined | null): number {
  if (!dueDate) {
    return 0;
  }
  
  const due = new Date(dueDate);
  const today = new Date();
  
  // Reset time to midnight for accurate day calculation
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a vendor invoice is overdue.
 * 
 * @param dueDate - The due date string
 * @returns True if overdue, false otherwise
 */
export function isOverdue(dueDate: string | undefined | null): boolean {
  return calculateDaysUntilDue(dueDate) < 0;
}

// =====================================================
// MARGIN INDICATOR FUNCTIONS
// =====================================================

/**
 * Get margin indicator color based on margin vs target.
 * 
 * Property 11: Margin Target Indicator Logic
 * Green when margin >= target
 * Yellow when margin >= target * 0.5 and < target
 * Red when margin < target * 0.5
 * 
 * @param margin - The actual profit margin percentage
 * @param target - The target margin percentage (default 20%)
 * @returns Margin indicator color
 */
export function getMarginIndicator(margin: number, target: number = DEFAULT_MARGIN_TARGET): MarginIndicator {
  if (margin >= target) {
    return 'green';
  }
  
  if (margin >= target * 0.5) {
    return 'yellow';
  }
  
  return 'red';
}

/**
 * Check if margin target is met.
 * 
 * @param margin - The actual profit margin percentage
 * @param target - The target margin percentage
 * @returns True if target is met
 */
export function isMarginTargetMet(margin: number, target: number = DEFAULT_MARGIN_TARGET): boolean {
  return margin >= target;
}

// =====================================================
// ROW-TO-ENTITY TRANSFORMATION FUNCTIONS
// =====================================================

/**
 * Transform database row to AgencyChargeType entity.
 * 
 * @param row - Database row in snake_case
 * @returns AgencyChargeType entity in camelCase
 */
export function transformChargeTypeRow(row: AgencyChargeTypeRow): AgencyChargeType {
  return {
    id: row.id,
    chargeCode: row.charge_code,
    chargeName: row.charge_name,
    chargeCategory: row.charge_category as ChargeCategory,
    chargeType: row.charge_type as ChargeTypeClass,
    defaultCurrency: row.default_currency,
    isTaxable: row.is_taxable,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Transform database row to ShipmentCost entity.
 * 
 * @param row - Database row in snake_case
 * @returns ShipmentCost entity in camelCase
 */
export function transformCostRow(row: ShipmentCostRow): ShipmentCost {
  return {
    id: row.id,
    bookingId: row.booking_id,
    blId: row.bl_id,
    jobOrderId: row.job_order_id,
    chargeTypeId: row.charge_type_id,
    description: row.description,
    currency: row.currency,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    amount: row.amount,
    exchangeRate: row.exchange_rate,
    amountIdr: row.amount_idr,
    isTaxable: row.is_taxable,
    taxRate: row.tax_rate,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    vendorInvoiceNumber: row.vendor_invoice_number,
    vendorInvoiceDate: row.vendor_invoice_date,
    paymentStatus: row.payment_status as CostPaymentStatus,
    paidAmount: row.paid_amount,
    paidDate: row.paid_date,
    paymentReference: row.payment_reference,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * Transform database row to ShipmentRevenue entity.
 * 
 * @param row - Database row in snake_case
 * @returns ShipmentRevenue entity in camelCase
 */
export function transformRevenueRow(row: ShipmentRevenueRow): ShipmentRevenue {
  return {
    id: row.id,
    bookingId: row.booking_id,
    blId: row.bl_id,
    jobOrderId: row.job_order_id,
    invoiceId: row.invoice_id,
    chargeTypeId: row.charge_type_id,
    description: row.description,
    currency: row.currency,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    amount: row.amount,
    exchangeRate: row.exchange_rate,
    amountIdr: row.amount_idr,
    isTaxable: row.is_taxable,
    taxRate: row.tax_rate,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    billingStatus: row.billing_status as RevenueBillingStatus,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * Transform database row to AgencyVendorInvoice entity.
 * 
 * @param row - Database row in snake_case
 * @returns AgencyVendorInvoice entity in camelCase
 */
export function transformVendorInvoiceRow(row: AgencyVendorInvoiceRow): AgencyVendorInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    currency: row.currency,
    subtotal: row.subtotal,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    paymentStatus: row.payment_status as VendorInvoicePaymentStatus,
    paidAmount: row.paid_amount,
    costIds: row.cost_ids || [],
    documentUrl: row.document_url,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/**
 * Transform database row to ShipmentProfitability entity.
 * 
 * @param row - Database row in snake_case
 * @returns ShipmentProfitability entity in camelCase
 */
export function transformProfitabilityRow(row: ShipmentProfitabilityRow): ShipmentProfitability {
  return {
    bookingId: row.booking_id,
    bookingNumber: row.booking_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    jobOrderId: row.job_order_id,
    joNumber: row.jo_number,
    totalRevenue: row.total_revenue,
    revenueTax: row.revenue_tax,
    totalCost: row.total_cost,
    costTax: row.cost_tax,
    grossProfit: row.gross_profit,
    profitMarginPct: row.profit_margin_pct,
    status: row.status,
  };
}


// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/** Validation result interface */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/** Validation error interface */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Check if a value is a valid charge category.
 */
export function isValidChargeCategory(value: string): value is ChargeCategory {
  return CHARGE_CATEGORIES.includes(value as ChargeCategory);
}

/**
 * Check if a value is a valid charge type class.
 */
export function isValidChargeTypeClass(value: string): value is ChargeTypeClass {
  return CHARGE_TYPE_CLASSES.includes(value as ChargeTypeClass);
}

/**
 * Check if a value is a valid cost payment status.
 */
export function isValidCostPaymentStatus(value: string): value is CostPaymentStatus {
  return COST_PAYMENT_STATUSES.includes(value as CostPaymentStatus);
}

/**
 * Check if a value is a valid revenue billing status.
 */
export function isValidRevenueBillingStatus(value: string): value is RevenueBillingStatus {
  return REVENUE_BILLING_STATUSES.includes(value as RevenueBillingStatus);
}

/**
 * Check if a value is a valid vendor invoice payment status.
 */
export function isValidVendorInvoicePaymentStatus(value: string): value is VendorInvoicePaymentStatus {
  return VENDOR_INVOICE_PAYMENT_STATUSES.includes(value as VendorInvoicePaymentStatus);
}

/**
 * Validate charge type form data.
 * 
 * @param data - Charge type form data
 * @returns Validation result
 */
export function validateChargeTypeData(data: ChargeTypeFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!data.chargeCode?.trim()) {
    errors.push({ field: 'chargeCode', message: 'Charge code is required' });
  }
  
  if (!data.chargeName?.trim()) {
    errors.push({ field: 'chargeName', message: 'Charge name is required' });
  }
  
  if (!data.chargeCategory) {
    errors.push({ field: 'chargeCategory', message: 'Charge category is required' });
  } else if (!isValidChargeCategory(data.chargeCategory)) {
    errors.push({
      field: 'chargeCategory',
      message: `Invalid charge category. Valid values: ${CHARGE_CATEGORIES.join(', ')}`,
    });
  }
  
  if (!data.chargeType) {
    errors.push({ field: 'chargeType', message: 'Charge type is required' });
  } else if (!isValidChargeTypeClass(data.chargeType)) {
    errors.push({
      field: 'chargeType',
      message: `Invalid charge type. Valid values: ${CHARGE_TYPE_CLASSES.join(', ')}`,
    });
  }
  
  // Optional field validation
  if (data.displayOrder !== undefined && data.displayOrder < 0) {
    errors.push({ field: 'displayOrder', message: 'Display order cannot be negative' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate shipment cost form data.
 * 
 * @param data - Shipment cost form data
 * @returns Validation result
 */
export function validateCostData(data: ShipmentCostFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Must have at least one reference
  if (!data.bookingId && !data.blId && !data.jobOrderId) {
    errors.push({ field: 'bookingId', message: 'Cost must be linked to a booking, B/L, or job order' });
  }
  
  // Required fields
  if (!data.chargeTypeId) {
    errors.push({ field: 'chargeTypeId', message: 'Charge type is required' });
  }
  
  if (!data.currency?.trim()) {
    errors.push({ field: 'currency', message: 'Currency is required' });
  }
  
  if (data.unitPrice === undefined || data.unitPrice < 0) {
    errors.push({ field: 'unitPrice', message: 'Unit price must be a non-negative number' });
  }
  
  if (data.quantity === undefined || data.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
  }
  
  // Exchange rate validation for non-IDR currencies
  if (data.currency && data.currency !== 'IDR') {
    if (!data.exchangeRate || data.exchangeRate <= 0) {
      errors.push({ field: 'exchangeRate', message: 'Exchange rate is required for non-IDR currencies and must be greater than 0' });
    }
  }
  
  // Tax rate validation
  if (data.taxRate !== undefined && data.taxRate < 0) {
    errors.push({ field: 'taxRate', message: 'Tax rate cannot be negative' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate shipment revenue form data.
 * 
 * @param data - Shipment revenue form data
 * @returns Validation result
 */
export function validateRevenueData(data: ShipmentRevenueFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Must have at least one reference
  if (!data.bookingId && !data.blId && !data.jobOrderId) {
    errors.push({ field: 'bookingId', message: 'Revenue must be linked to a booking, B/L, or job order' });
  }
  
  // Required fields
  if (!data.chargeTypeId) {
    errors.push({ field: 'chargeTypeId', message: 'Charge type is required' });
  }
  
  if (!data.currency?.trim()) {
    errors.push({ field: 'currency', message: 'Currency is required' });
  }
  
  if (data.unitPrice === undefined || data.unitPrice < 0) {
    errors.push({ field: 'unitPrice', message: 'Unit price must be a non-negative number' });
  }
  
  if (data.quantity === undefined || data.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
  }
  
  // Exchange rate validation for non-IDR currencies
  if (data.currency && data.currency !== 'IDR') {
    if (!data.exchangeRate || data.exchangeRate <= 0) {
      errors.push({ field: 'exchangeRate', message: 'Exchange rate is required for non-IDR currencies and must be greater than 0' });
    }
  }
  
  // Tax rate validation
  if (data.taxRate !== undefined && data.taxRate < 0) {
    errors.push({ field: 'taxRate', message: 'Tax rate cannot be negative' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate vendor invoice form data.
 * 
 * @param data - Vendor invoice form data
 * @returns Validation result
 */
export function validateVendorInvoiceData(data: VendorInvoiceFormData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!data.invoiceNumber?.trim()) {
    errors.push({ field: 'invoiceNumber', message: 'Invoice number is required' });
  }
  
  if (!data.vendorId) {
    errors.push({ field: 'vendorId', message: 'Vendor is required' });
  }
  
  if (!data.invoiceDate) {
    errors.push({ field: 'invoiceDate', message: 'Invoice date is required' });
  }
  
  // Amount validation
  if (data.totalAmount !== undefined && data.totalAmount < 0) {
    errors.push({ field: 'totalAmount', message: 'Total amount cannot be negative' });
  }
  
  if (data.subtotal !== undefined && data.subtotal < 0) {
    errors.push({ field: 'subtotal', message: 'Subtotal cannot be negative' });
  }
  
  if (data.taxAmount !== undefined && data.taxAmount < 0) {
    errors.push({ field: 'taxAmount', message: 'Tax amount cannot be negative' });
  }
  
  // Date validation
  if (data.invoiceDate && data.dueDate) {
    const invoiceDate = new Date(data.invoiceDate);
    const dueDate = new Date(data.dueDate);
    if (dueDate < invoiceDate) {
      errors.push({ field: 'dueDate', message: 'Due date cannot be before invoice date' });
    }
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
 * Calculate line item amount from unit price and quantity.
 * 
 * @param unitPrice - Price per unit
 * @param quantity - Number of units
 * @returns Total amount
 */
export function calculateLineAmount(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

/**
 * Prepare cost data for database insertion with calculated fields.
 * 
 * @param data - Cost form data
 * @returns Cost data with calculated fields
 */
export function prepareCostForInsert(data: ShipmentCostFormData): Record<string, unknown> {
  const amount = calculateLineAmount(data.unitPrice, data.quantity);
  const exchangeRate = data.currency === 'IDR' ? 1 : (data.exchangeRate || 1);
  const amountIdr = convertToIdr(amount, data.currency, exchangeRate);
  const taxRate = data.taxRate ?? DEFAULT_TAX_RATE;
  const isTaxable = data.isTaxable ?? true;
  const { tax, total } = calculateTotalWithTax(amountIdr, taxRate, isTaxable);
  
  return {
    booking_id: data.bookingId || null,
    bl_id: data.blId || null,
    job_order_id: data.jobOrderId || null,
    charge_type_id: data.chargeTypeId,
    description: data.description || null,
    currency: data.currency,
    unit_price: data.unitPrice,
    quantity: data.quantity,
    amount,
    exchange_rate: exchangeRate,
    amount_idr: amountIdr,
    is_taxable: isTaxable,
    tax_rate: taxRate,
    tax_amount: tax,
    total_amount: total,
    vendor_id: data.vendorId || null,
    vendor_name: data.vendorName || null,
    vendor_invoice_number: data.vendorInvoiceNumber || null,
    vendor_invoice_date: data.vendorInvoiceDate || null,
    notes: data.notes || null,
    payment_status: 'unpaid',
    paid_amount: 0,
  };
}

/**
 * Prepare revenue data for database insertion with calculated fields.
 * 
 * @param data - Revenue form data
 * @returns Revenue data with calculated fields
 */
export function prepareRevenueForInsert(data: ShipmentRevenueFormData): Record<string, unknown> {
  const amount = calculateLineAmount(data.unitPrice, data.quantity);
  const exchangeRate = data.currency === 'IDR' ? 1 : (data.exchangeRate || 1);
  const amountIdr = convertToIdr(amount, data.currency, exchangeRate);
  const taxRate = data.taxRate ?? DEFAULT_TAX_RATE;
  const isTaxable = data.isTaxable ?? true;
  const { tax, total } = calculateTotalWithTax(amountIdr, taxRate, isTaxable);
  
  return {
    booking_id: data.bookingId || null,
    bl_id: data.blId || null,
    job_order_id: data.jobOrderId || null,
    invoice_id: data.invoiceId || null,
    charge_type_id: data.chargeTypeId,
    description: data.description || null,
    currency: data.currency,
    unit_price: data.unitPrice,
    quantity: data.quantity,
    amount,
    exchange_rate: exchangeRate,
    amount_idr: amountIdr,
    is_taxable: isTaxable,
    tax_rate: taxRate,
    tax_amount: tax,
    total_amount: total,
    notes: data.notes || null,
    billing_status: 'unbilled',
  };
}

/**
 * Get unbilled revenue items from a list.
 * 
 * Property 12: Unbilled Revenue Identification
 * Returns only items where billing_status = 'unbilled'
 * 
 * @param revenue - Array of revenue items
 * @returns Array of unbilled revenue items
 */
export function getUnbilledRevenue(revenue: ShipmentRevenue[]): ShipmentRevenue[] {
  return revenue.filter(r => r.billingStatus === 'unbilled');
}

/**
 * Get unpaid costs from a list.
 * 
 * @param costs - Array of cost items
 * @returns Array of unpaid cost items
 */
export function getUnpaidCosts(costs: ShipmentCost[]): ShipmentCost[] {
  return costs.filter(c => c.paymentStatus === 'unpaid' || c.paymentStatus === 'partial');
}

/**
 * Calculate total unbilled revenue amount.
 * 
 * @param revenue - Array of revenue items
 * @returns Total unbilled amount in IDR
 */
export function calculateUnbilledTotal(revenue: ShipmentRevenue[]): number {
  return getUnbilledRevenue(revenue).reduce((sum, r) => sum + (r.amountIdr || 0), 0);
}

/**
 * Calculate total unpaid costs amount.
 * 
 * @param costs - Array of cost items
 * @returns Total unpaid amount in IDR
 */
export function calculateUnpaidTotal(costs: ShipmentCost[]): number {
  return getUnpaidCosts(costs).reduce((sum, c) => sum + (c.totalAmount || 0) - (c.paidAmount || 0), 0);
}
