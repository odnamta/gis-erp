// =====================================================
// v0.69: ACCOUNTING TRANSFORMER FOR ACCURATE ONLINE
// =====================================================
// Transforms Gama ERP data to Accurate Online format
// Requirements: 3.2

import { format } from 'date-fns';

// =====================================================
// GAMA ERP INPUT TYPES
// =====================================================

/**
 * Invoice line item from Gama ERP
 */
export interface GamaInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  subtotal: number | null;
}

/**
 * Invoice from Gama ERP with relations
 */
export interface GamaInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string;
  customer_id: string;
  customer_code?: string;
  jo_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
  line_items: GamaInvoiceLineItem[];
}

/**
 * Payment from Gama ERP
 */
export interface GamaPayment {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  notes: string | null;
}

/**
 * Customer from Gama ERP
 */
export interface GamaCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
}

// =====================================================
// ACCURATE ONLINE OUTPUT TYPES
// =====================================================

/**
 * Line item in Accurate Online invoice format
 */
export interface AccurateLineItem {
  itemNo: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  amount: number;
}

/**
 * Invoice in Accurate Online format
 */
export interface AccurateInvoice {
  transDate: string;
  transNo: string;
  customerNo: string;
  dueDate: string;
  detailItem: AccurateLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  description: string;
}

/**
 * Payment in Accurate Online format
 */
export interface AccuratePayment {
  transDate: string;
  transNo: string;
  invoiceNo: string;
  amount: number;
  paymentMethod: string;
  bankAccount: string;
  referenceNo: string;
  description: string;
}

/**
 * Customer in Accurate Online format
 */
export interface AccurateCustomer {
  customerNo: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

// =====================================================
// TRANSFORMATION FUNCTIONS
// =====================================================

/**
 * Formats a date string to Accurate Online format (yyyy-MM-dd)
 * @param dateString - ISO date string or null
 * @returns Formatted date string
 */
export function formatDateForAccurate(dateString: string | null): string {
  if (!dateString) {
    return format(new Date(), 'yyyy-MM-dd');
  }
  try {
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
}

/**
 * Generates a customer code from customer ID
 * Uses first 8 characters of UUID for brevity
 * @param customerId - Customer UUID
 * @returns Customer code for Accurate
 */
export function generateCustomerCode(customerId: string): string {
  // Use first 8 chars of UUID, uppercase
  return `CUST-${customerId.substring(0, 8).toUpperCase()}`;
}

/**
 * Generates an item code from line item description
 * @param description - Item description
 * @param index - Line item index
 * @returns Item code for Accurate
 */
export function generateItemCode(description: string, index: number): string {
  // Create a simple item code from description
  const prefix = description
    .substring(0, 10)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return `ITEM-${prefix || 'SVC'}-${(index + 1).toString().padStart(3, '0')}`;
}

/**
 * Maps Gama payment method to Accurate payment method
 * @param paymentMethod - Gama payment method
 * @returns Accurate payment method
 */
export function mapPaymentMethod(paymentMethod: string): string {
  const methodMap: Record<string, string> = {
    'cash': 'CASH',
    'bank_transfer': 'BANK_TRANSFER',
    'transfer': 'BANK_TRANSFER',
    'check': 'CHECK',
    'cheque': 'CHECK',
    'credit_card': 'CREDIT_CARD',
    'debit_card': 'DEBIT_CARD',
    'giro': 'GIRO',
    'other': 'OTHER',
  };
  return methodMap[paymentMethod.toLowerCase()] || 'OTHER';
}

/**
 * Transforms a Gama ERP invoice to Accurate Online format.
 * Requirements: 3.2
 * 
 * @param invoice - Gama ERP invoice with line items
 * @returns Accurate Online invoice format
 */
export function transformInvoiceToAccurate(invoice: GamaInvoice): AccurateInvoice {
  // Transform line items
  const detailItem: AccurateLineItem[] = invoice.line_items.map((item, index) => ({
    itemNo: generateItemCode(item.description, index),
    itemName: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    unit: item.unit || 'UNIT',
    amount: item.subtotal ?? (item.quantity * item.unit_price),
  }));

  // Generate customer code if not provided
  const customerNo = invoice.customer_code || generateCustomerCode(invoice.customer_id);

  return {
    transDate: formatDateForAccurate(invoice.invoice_date),
    transNo: invoice.invoice_number,
    customerNo,
    dueDate: formatDateForAccurate(invoice.due_date),
    detailItem,
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    totalAmount: invoice.total_amount,
    description: invoice.notes || `Invoice ${invoice.invoice_number}`,
  };
}

/**
 * Transforms a Gama ERP payment to Accurate Online format.
 * Requirements: 3.3
 * 
 * @param payment - Gama ERP payment
 * @returns Accurate Online payment format
 */
export function transformPaymentToAccurate(payment: GamaPayment): AccuratePayment {
  // Generate payment transaction number
  const transNo = `PAY-${payment.id.substring(0, 8).toUpperCase()}`;
  
  // Build bank account string
  const bankAccount = payment.bank_name && payment.bank_account
    ? `${payment.bank_name} - ${payment.bank_account}`
    : payment.bank_name || payment.bank_account || '';

  return {
    transDate: formatDateForAccurate(payment.payment_date),
    transNo,
    invoiceNo: payment.invoice_number || payment.invoice_id,
    amount: payment.amount,
    paymentMethod: mapPaymentMethod(payment.payment_method),
    bankAccount,
    referenceNo: payment.reference_number || '',
    description: payment.notes || `Payment for ${payment.invoice_number || payment.invoice_id}`,
  };
}

/**
 * Transforms a Gama ERP customer to Accurate Online format.
 * Requirements: 3.4
 * 
 * @param customer - Gama ERP customer
 * @returns Accurate Online customer format
 */
export function transformCustomerToAccurate(customer: GamaCustomer): AccurateCustomer {
  return {
    customerNo: generateCustomerCode(customer.id),
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    address: customer.address || '',
    isActive: customer.is_active,
  };
}

// =====================================================
// REVERSE TRANSFORMATION (for pull sync)
// =====================================================

/**
 * Transforms an Accurate Online invoice back to Gama format.
 * Used for pull sync operations.
 * 
 * @param accurateInvoice - Accurate Online invoice
 * @param customerId - Gama customer ID
 * @param joId - Gama job order ID
 * @returns Partial Gama invoice data
 */
export function transformInvoiceFromAccurate(
  accurateInvoice: AccurateInvoice,
  customerId: string,
  joId: string
): Partial<GamaInvoice> {
  const lineItems: GamaInvoiceLineItem[] = accurateInvoice.detailItem.map((item, _index) => ({
    id: '', // Will be generated on insert
    description: item.itemName,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    subtotal: item.amount,
  }));

  return {
    invoice_number: accurateInvoice.transNo,
    invoice_date: accurateInvoice.transDate,
    due_date: accurateInvoice.dueDate,
    customer_id: customerId,
    jo_id: joId,
    subtotal: accurateInvoice.subtotal,
    tax_amount: accurateInvoice.taxAmount,
    total_amount: accurateInvoice.totalAmount,
    notes: accurateInvoice.description,
    line_items: lineItems,
  };
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validates that a Gama invoice has all required fields for transformation.
 * @param invoice - Gama invoice to validate
 * @returns Validation result with errors if any
 */
export function validateInvoiceForTransformation(invoice: GamaInvoice): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!invoice.invoice_number) {
    errors.push('invoice_number is required');
  }
  if (!invoice.customer_id) {
    errors.push('customer_id is required');
  }
  if (!invoice.due_date) {
    errors.push('due_date is required');
  }
  if (!invoice.line_items || invoice.line_items.length === 0) {
    errors.push('At least one line item is required');
  }
  if (invoice.total_amount <= 0) {
    errors.push('total_amount must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that a Gama payment has all required fields for transformation.
 * @param payment - Gama payment to validate
 * @returns Validation result with errors if any
 */
export function validatePaymentForTransformation(payment: GamaPayment): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payment.invoice_id) {
    errors.push('invoice_id is required');
  }
  if (payment.amount <= 0) {
    errors.push('amount must be greater than 0');
  }
  if (!payment.payment_date) {
    errors.push('payment_date is required');
  }
  if (!payment.payment_method) {
    errors.push('payment_method is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that a Gama customer has all required fields for transformation.
 * @param customer - Gama customer to validate
 * @returns Validation result with errors if any
 */
export function validateCustomerForTransformation(customer: GamaCustomer): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!customer.id) {
    errors.push('id is required');
  }
  if (!customer.name || customer.name.trim().length === 0) {
    errors.push('name is required');
  }
  if (!customer.email || customer.email.trim().length === 0) {
    errors.push('email is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
