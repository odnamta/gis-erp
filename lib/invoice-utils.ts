import { InvoiceStatus, InvoiceLineItemInput } from '@/types'

// Default VAT rate constant (11% PPN) - used as fallback
export const VAT_RATE = 0.11

// Default payment terms (30 days) - used as fallback
export const DEFAULT_PAYMENT_TERMS = 30

/**
 * Calculate line item subtotal
 */
export function calculateLineItemSubtotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

/**
 * Calculate invoice totals from line items
 * @param lineItems - Array of line items
 * @param vatRate - VAT rate as decimal (e.g., 0.11 for 11%). Defaults to VAT_RATE constant.
 */
export function calculateInvoiceTotals(
  lineItems: InvoiceLineItemInput[],
  vatRate: number = VAT_RATE
): {
  subtotal: number
  vatAmount: number
  grandTotal: number
} {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + calculateLineItemSubtotal(item.quantity, item.unit_price)
  }, 0)
  
  const vatAmount = subtotal * vatRate
  const grandTotal = subtotal + vatAmount
  
  return {
    subtotal,
    vatAmount,
    grandTotal,
  }
}

/**
 * Format invoice number from year and sequence
 * Format: INV-YYYY-NNNN (e.g., INV-2025-0001)
 */
export function formatInvoiceNumber(year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, '0')
  return `INV-${year}-${paddedSequence}`
}

/**
 * Parse invoice number to extract year and sequence
 */
export function parseInvoiceNumber(invoiceNumber: string): { year: number; sequence: number } | null {
  const match = invoiceNumber.match(/^INV-(\d{4})-(\d{4})$/)
  if (!match) return null
  
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  }
}

/**
 * Get default due date based on payment terms
 * @param paymentTerms - Number of days until due. Defaults to DEFAULT_PAYMENT_TERMS.
 */
export function getDefaultDueDate(paymentTerms: number = DEFAULT_PAYMENT_TERMS): Date {
  const date = new Date()
  date.setDate(date.getDate() + paymentTerms)
  return date
}

/**
 * Check if an invoice is overdue
 */
export function isInvoiceOverdue(dueDate: string, status: InvoiceStatus): boolean {
  if (status !== 'sent' && status !== 'received') return false

  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  return due < today
}

/**
 * Valid status transitions for invoices
 * Note: 'partial' status is set automatically by payment recording, not manual transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['received', 'partial', 'paid', 'overdue', 'cancelled'],
  received: ['partial', 'paid', 'overdue', 'cancelled'],
  partial: ['paid', 'overdue', 'cancelled'],
  overdue: ['partial', 'paid', 'cancelled'],
  paid: [],
  cancelled: [],
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: InvoiceStatus,
  targetStatus: InvoiceStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(targetStatus)
}

/**
 * Invoice status labels for display
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  received: 'Diterima',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

/**
 * Invoice status colors for badges
 */
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'gray',
  sent: 'blue',
  received: 'indigo',
  partial: 'amber',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
}
