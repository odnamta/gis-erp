// Re-export all types from database
export * from './database'

// Status type helpers
export type CustomerStatus = 'active' | 'inactive'
export type ProjectStatus = 'active' | 'completed' | 'on_hold'
export type PJOStatus = 'draft' | 'sent' | 'approved' | 'rejected'
export type JOStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
