// Field Mask Utility - Hide sensitive fields based on user role

import { UserRole } from '@/types/permissions'

/**
 * Fields to hide from specific roles
 * '*' means entire module is hidden
 */
export const HIDDEN_FIELDS: Record<UserRole, Record<string, string[]>> = {
  ops: {
    job_orders: [
      'total_revenue',
      'revenue_items',
      'profit',
      'profit_margin',
      'invoice_amount',
      'quoted_price',
      'final_revenue',
    ],
    proforma_job_orders: [
      'total_revenue',
      'revenue_items',
      'profit_margin',
      'expected_profit',
    ],
    invoices: ['*'],  // Entire module hidden
    payments: ['*'],  // Entire module hidden
    quotations: [
      'profit_margin',
      'expected_profit',
    ],
  },
  marketing: {
    job_orders: [
      'job_cost_details',
      'vendor_pricing',
      'actual_expenses',
      'profit_margin',
      'final_cost',
    ],
    proforma_job_orders: [
      'actual_costs',
      'vendor_pricing',
    ],
    customers: [],  // Limited financial history handled separately
  },
  finance: {
    employees: [
      'personal_details',  // Only payroll-relevant fields visible
    ],
  },
  engineer: {
    job_orders: [
      'total_revenue',
      'profit',
      'profit_margin',
      'invoice_amount',
    ],
    invoices: ['*'],
    payments: ['*'],
  },
  hr: {
    job_orders: ['*'],
    proforma_job_orders: ['*'],
    invoices: ['*'],
    payments: ['*'],
    quotations: ['*'],
  },
  hse: {
    job_orders: [
      'total_revenue',
      'profit',
      'profit_margin',
      'invoice_amount',
    ],
    invoices: ['*'],
    payments: ['*'],
    quotations: ['*'],
  },
  sysadmin: {
    job_orders: ['*'],
    proforma_job_orders: ['*'],
    invoices: ['*'],
    payments: ['*'],
    quotations: ['*'],
  },
  // Roles with full access
  owner: {},
  director: {},
  marketing_manager: {},
  finance_manager: {},
  operations_manager: {},
  administration: {},
}

/**
 * Check if a field should be hidden for a role
 */
export function isFieldHidden(
  role: UserRole,
  module: string,
  field: string
): boolean {
  const roleHiddenFields = HIDDEN_FIELDS[role]
  if (!roleHiddenFields) return false
  
  const moduleFields = roleHiddenFields[module]
  if (!moduleFields) return false
  
  // Check for wildcard (entire module hidden)
  if (moduleFields.includes('*')) return true
  
  // Check for specific field
  return moduleFields.includes(field)
}

/**
 * Check if an entire module is hidden for a role
 */
export function isModuleHidden(role: UserRole, module: string): boolean {
  const roleHiddenFields = HIDDEN_FIELDS[role]
  if (!roleHiddenFields) return false
  
  const moduleFields = roleHiddenFields[module]
  return moduleFields?.includes('*') ?? false
}

/**
 * Filter object fields based on role
 * Returns a new object with hidden fields removed
 */
export function maskFields<T extends Record<string, unknown>>(
  data: T,
  role: UserRole,
  module: string
): Partial<T> {
  // If entire module is hidden, return empty object
  if (isModuleHidden(role, module)) {
    return {}
  }
  
  const result: Partial<T> = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (!isFieldHidden(role, module, key)) {
      result[key as keyof T] = value as T[keyof T]
    }
  }
  
  return result
}

/**
 * Filter an array of objects based on role
 */
export function maskFieldsArray<T extends Record<string, unknown>>(
  data: T[],
  role: UserRole,
  module: string
): Partial<T>[] {
  return data.map(item => maskFields(item, role, module))
}

/**
 * Get list of hidden fields for a role and module
 */
export function getHiddenFields(role: UserRole, module: string): string[] {
  const roleHiddenFields = HIDDEN_FIELDS[role]
  if (!roleHiddenFields) return []
  
  return roleHiddenFields[module] || []
}

/**
 * Get list of visible fields for a role and module
 * Requires knowing all possible fields
 */
export function getVisibleFields(
  role: UserRole,
  module: string,
  allFields: string[]
): string[] {
  const hiddenFields = getHiddenFields(role, module)
  
  // If entire module is hidden, return empty
  if (hiddenFields.includes('*')) return []
  
  return allFields.filter(field => !hiddenFields.includes(field))
}

/**
 * Create a field mask function for a specific role and module
 * Useful for repeated masking operations
 */
export function createFieldMask<T extends Record<string, unknown>>(
  role: UserRole,
  module: string
): (data: T) => Partial<T> {
  return (data: T) => maskFields(data, role, module)
}
