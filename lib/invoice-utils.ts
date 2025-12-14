import { InvoiceStatus, InvoiceLineItemInput } from '@/types'

// VAT rate constant (11% PPN)
export const VAT_RATE = 0.11

/**
 * Calculate line item subtotal
 */
export function calculateLineItemSubtotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

/**
 * Calculate invoice totals from line items
 */
export function calculateInvoiceTotals(lineItems: InvoiceLineItemInput[]): {
  subtotal: number
  vatAmount: number
  grandTotal: number
} {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + calculateLineItemSubtotal(item.quantity, item.unit_price)
  }, 0)
  
  const vatAmount = subtotal * VAT_RATE
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
 * Get default due date (30 days from now)
 */
export function getDefaultDueDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date
}

/**
 * Check if an invoice is overdue
 */
export function isInvoiceOverdue(dueDate: string, status: InvoiceStatus): boolean {
  if (status !== 'sent') return false
  
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  return due < today
}

/**
 * Valid status transitions for invoices
 */
export const VALID_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
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
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
}
