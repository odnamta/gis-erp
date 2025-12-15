/**
 * Administration Dashboard Utility Functions
 * For Administration Division (role: 'admin') - handles PJO/JO/Invoice workflow
 * NOT for system administrators (role: 'super_admin')
 */

// Types
export type AdminPeriodType = 'this_week' | 'this_month' | 'this_quarter'
export type WorkItemType = 'pjo' | 'jo' | 'invoice'
export type ActionType = 'create_jo' | 'create_invoice' | 'send_invoice' | 'follow_up_payment'

export interface AdminPeriodFilter {
  type: AdminPeriodType
  startDate: Date
  endDate: Date
}

export interface AdminKPIs {
  pjosPendingApproval: number
  pjosReadyForJO: number
  josInProgress: number
  invoicesUnpaid: number
  revenueThisPeriod: number
  documentsCreated: number
}

export interface PipelineStage {
  status: string
  label: string
  count: number
  percentage: number
}

export interface PendingWorkItem {
  id: string
  type: WorkItemType
  number: string
  customerName: string
  actionNeeded: ActionType
  actionLabel: string
  daysPending: number
  linkUrl: string
}

export interface RecentDocument {
  id: string
  type: WorkItemType
  number: string
  customerName: string
  status: string
  createdAt: string
  updatedAt: string
  linkUrl: string
}

export interface AgingBucket {
  label: string
  minDays: number
  maxDays: number | null
  count: number
  totalAmount: number
  isOverdue: boolean
}

// Input types
export interface PJOInput {
  id: string
  pjo_number: string
  status: string
  converted_to_jo?: boolean | null
  all_costs_confirmed?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  customer_name?: string
  project_name?: string
}

export interface JOInput {
  id: string
  jo_number: string
  status: string
  created_at?: string | null
  updated_at?: string | null
  customer_name?: string
  pjo_number?: string
}

export interface InvoiceInput {
  id: string
  invoice_number: string
  status: string
  amount?: number | null
  due_date?: string | null
  paid_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  customer_name?: string
  jo_number?: string
}


// Period Filter Functions

/**
 * Get start and end dates for admin period type
 */
export function getAdminPeriodDates(
  periodType: AdminPeriodType,
  currentDate: Date
): AdminPeriodFilter {
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)

  let startDate: Date
  let endDate: Date

  switch (periodType) {
    case 'this_week': {
      const dayOfWeek = current.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startDate = new Date(current)
      startDate.setDate(current.getDate() + mondayOffset)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      break
    }
    case 'this_month': {
      startDate = new Date(current.getFullYear(), current.getMonth(), 1)
      endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0)
      break
    }
    case 'this_quarter': {
      const quarter = Math.floor(current.getMonth() / 3)
      startDate = new Date(current.getFullYear(), quarter * 3, 1)
      endDate = new Date(current.getFullYear(), quarter * 3 + 3, 0)
      break
    }
    default:
      startDate = new Date(current.getFullYear(), current.getMonth(), 1)
      endDate = new Date(current.getFullYear(), current.getMonth() + 1, 0)
  }

  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)

  return { type: periodType, startDate, endDate }
}

/**
 * Get previous period dates for comparison
 */
export function getAdminPreviousPeriodDates(period: AdminPeriodFilter): AdminPeriodFilter {
  const { type, startDate } = period

  let previousStart: Date
  let previousEnd: Date

  switch (type) {
    case 'this_week': {
      previousStart = new Date(startDate)
      previousStart.setDate(startDate.getDate() - 7)
      previousEnd = new Date(previousStart)
      previousEnd.setDate(previousStart.getDate() + 6)
      break
    }
    case 'this_month': {
      previousStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
      previousEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0)
      break
    }
    case 'this_quarter': {
      const quarter = Math.floor(startDate.getMonth() / 3)
      previousStart = new Date(startDate.getFullYear(), (quarter - 1) * 3, 1)
      previousEnd = new Date(startDate.getFullYear(), quarter * 3, 0)
      break
    }
    default: {
      previousStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
      previousEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0)
    }
  }

  previousStart.setHours(0, 0, 0, 0)
  previousEnd.setHours(23, 59, 59, 999)

  return { type, startDate: previousStart, endDate: previousEnd }
}


// KPI Calculation Functions

/**
 * Count PJOs with status 'pending_approval'
 */
export function countPJOsPendingApproval(pjos: PJOInput[]): number {
  return pjos.filter(p => p.status === 'pending_approval').length
}

/**
 * Count PJOs that are approved, have all costs confirmed, and not yet converted to JO
 */
export function countPJOsReadyForJO(pjos: PJOInput[]): number {
  return pjos.filter(p => 
    p.status === 'approved' && 
    p.all_costs_confirmed === true && 
    p.converted_to_jo !== true
  ).length
}

/**
 * Count JOs with status 'active'
 */
export function countJOsInProgress(jos: JOInput[]): number {
  return jos.filter(j => j.status === 'active').length
}

/**
 * Count invoices with status 'sent' or 'overdue'
 */
export function countInvoicesUnpaid(invoices: InvoiceInput[]): number {
  return invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length
}

/**
 * Calculate total revenue from paid invoices in period
 */
export function calculatePeriodRevenue(
  invoices: InvoiceInput[],
  period: AdminPeriodFilter
): number {
  return invoices
    .filter(i => {
      if (i.status !== 'paid' || !i.paid_at) return false
      const paidDate = new Date(i.paid_at)
      return paidDate >= period.startDate && paidDate <= period.endDate
    })
    .reduce((sum, i) => sum + (i.amount ?? 0), 0)
}

/**
 * Count documents (PJOs + JOs + Invoices) created in period
 */
export function countDocumentsCreated(
  pjos: PJOInput[],
  jos: JOInput[],
  invoices: InvoiceInput[],
  period: AdminPeriodFilter
): number {
  const inPeriod = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    return date >= period.startDate && date <= period.endDate
  }

  const pjoCount = pjos.filter(p => inPeriod(p.created_at)).length
  const joCount = jos.filter(j => inPeriod(j.created_at)).length
  const invCount = invoices.filter(i => inPeriod(i.created_at)).length

  return pjoCount + joCount + invCount
}

/**
 * Calculate all admin KPIs
 */
export function calculateAdminKPIs(
  pjos: PJOInput[],
  jos: JOInput[],
  invoices: InvoiceInput[],
  period: AdminPeriodFilter
): AdminKPIs {
  return {
    pjosPendingApproval: countPJOsPendingApproval(pjos),
    pjosReadyForJO: countPJOsReadyForJO(pjos),
    josInProgress: countJOsInProgress(jos),
    invoicesUnpaid: countInvoicesUnpaid(invoices),
    revenueThisPeriod: calculatePeriodRevenue(invoices, period),
    documentsCreated: countDocumentsCreated(pjos, jos, invoices, period)
  }
}


// Pipeline Calculation Functions

const PIPELINE_STAGES = [
  { status: 'draft', label: 'Draft' },
  { status: 'pending_approval', label: 'Pending Approval' },
  { status: 'approved', label: 'Approved' },
  { status: 'converted', label: 'Converted to JO' }
]

/**
 * Calculate PJO pipeline stages with counts and percentages
 */
export function calculatePipelineStages(pjos: PJOInput[]): PipelineStage[] {
  const total = pjos.length

  return PIPELINE_STAGES.map(stage => {
    let count: number
    if (stage.status === 'converted') {
      count = pjos.filter(p => p.converted_to_jo === true).length
    } else {
      count = pjos.filter(p => p.status === stage.status && p.converted_to_jo !== true).length
    }

    return {
      status: stage.status,
      label: stage.label,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }
  })
}


// Pending Work Queue Functions

const ACTION_LABELS: Record<ActionType, string> = {
  create_jo: 'Create JO',
  create_invoice: 'Create Invoice',
  send_invoice: 'Send Invoice',
  follow_up_payment: 'Follow Up Payment'
}

/**
 * Calculate days since a date
 */
export function calculateDaysPending(dateStr: string, currentDate: Date): number {
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)

  const diffTime = current.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Get pending work items from PJOs (ready for JO conversion)
 */
export function getPendingPJOWorkItems(pjos: PJOInput[], currentDate: Date): PendingWorkItem[] {
  return pjos
    .filter(p => p.status === 'approved' && p.all_costs_confirmed === true && p.converted_to_jo !== true)
    .map(p => ({
      id: p.id,
      type: 'pjo' as WorkItemType,
      number: p.pjo_number,
      customerName: p.customer_name ?? 'Unknown',
      actionNeeded: 'create_jo' as ActionType,
      actionLabel: ACTION_LABELS.create_jo,
      daysPending: calculateDaysPending(p.updated_at ?? p.created_at ?? new Date().toISOString(), currentDate),
      linkUrl: `/pjo/${p.id}`
    }))
}

/**
 * Get pending work items from JOs (completed, need invoice)
 */
export function getPendingJOWorkItems(jos: JOInput[], currentDate: Date): PendingWorkItem[] {
  return jos
    .filter(j => j.status === 'completed' || j.status === 'submitted_to_finance')
    .map(j => ({
      id: j.id,
      type: 'jo' as WorkItemType,
      number: j.jo_number,
      customerName: j.customer_name ?? 'Unknown',
      actionNeeded: 'create_invoice' as ActionType,
      actionLabel: ACTION_LABELS.create_invoice,
      daysPending: calculateDaysPending(j.updated_at ?? j.created_at ?? new Date().toISOString(), currentDate),
      linkUrl: `/jo/${j.id}`
    }))
}

/**
 * Get pending work items from Invoices (draft or overdue)
 */
export function getPendingInvoiceWorkItems(invoices: InvoiceInput[], currentDate: Date): PendingWorkItem[] {
  return invoices
    .filter(i => i.status === 'draft' || i.status === 'overdue')
    .map(i => ({
      id: i.id,
      type: 'invoice' as WorkItemType,
      number: i.invoice_number,
      customerName: i.customer_name ?? 'Unknown',
      actionNeeded: i.status === 'draft' ? 'send_invoice' as ActionType : 'follow_up_payment' as ActionType,
      actionLabel: i.status === 'draft' ? ACTION_LABELS.send_invoice : ACTION_LABELS.follow_up_payment,
      daysPending: calculateDaysPending(i.updated_at ?? i.created_at ?? new Date().toISOString(), currentDate),
      linkUrl: `/invoices/${i.id}`
    }))
}

/**
 * Sort pending work items by days pending descending (oldest first)
 */
export function sortByDaysPendingDesc(items: PendingWorkItem[]): PendingWorkItem[] {
  return [...items].sort((a, b) => b.daysPending - a.daysPending)
}

/**
 * Get all pending work items sorted by days pending
 */
export function getPendingWorkItems(
  pjos: PJOInput[],
  jos: JOInput[],
  invoices: InvoiceInput[],
  currentDate: Date
): PendingWorkItem[] {
  const pjoItems = getPendingPJOWorkItems(pjos, currentDate)
  const joItems = getPendingJOWorkItems(jos, currentDate)
  const invoiceItems = getPendingInvoiceWorkItems(invoices, currentDate)

  return sortByDaysPendingDesc([...pjoItems, ...joItems, ...invoiceItems])
}


// Invoice Aging Functions

const AGING_BUCKETS_CONFIG = [
  { label: 'Current', minDays: -Infinity, maxDays: 0, isOverdue: false },
  { label: '1-30 days', minDays: 1, maxDays: 30, isOverdue: true },
  { label: '31-60 days', minDays: 31, maxDays: 60, isOverdue: true },
  { label: '61-90 days', minDays: 61, maxDays: 90, isOverdue: true },
  { label: '90+ days', minDays: 91, maxDays: Infinity, isOverdue: true }
]

/**
 * Calculate days past due for an invoice
 */
export function calculateDaysPastDue(dueDate: string, currentDate: Date): number {
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)

  const diffTime = current.getTime() - due.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Get aging bucket index for days past due
 */
export function getAgingBucketIndex(daysPastDue: number): number {
  if (daysPastDue <= 0) return 0
  if (daysPastDue <= 30) return 1
  if (daysPastDue <= 60) return 2
  if (daysPastDue <= 90) return 3
  return 4
}

/**
 * Calculate aging buckets for unpaid invoices
 */
export function calculateAgingBuckets(invoices: InvoiceInput[], currentDate: Date): AgingBucket[] {
  const buckets: AgingBucket[] = AGING_BUCKETS_CONFIG.map(config => ({
    label: config.label,
    minDays: config.minDays === -Infinity ? 0 : config.minDays,
    maxDays: config.maxDays === Infinity ? null : config.maxDays,
    count: 0,
    totalAmount: 0,
    isOverdue: config.isOverdue
  }))

  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')

  for (const invoice of unpaidInvoices) {
    if (!invoice.due_date) continue

    const daysPastDue = calculateDaysPastDue(invoice.due_date, currentDate)
    const bucketIndex = getAgingBucketIndex(daysPastDue)

    buckets[bucketIndex].count++
    buckets[bucketIndex].totalAmount += invoice.amount ?? 0
  }

  return buckets
}


// Recent Documents Functions

/**
 * Transform PJO to RecentDocument
 */
export function pjoToRecentDocument(pjo: PJOInput): RecentDocument {
  return {
    id: pjo.id,
    type: 'pjo',
    number: pjo.pjo_number,
    customerName: pjo.customer_name ?? 'Unknown',
    status: pjo.status,
    createdAt: pjo.created_at ?? '',
    updatedAt: pjo.updated_at ?? pjo.created_at ?? '',
    linkUrl: `/pjo/${pjo.id}`
  }
}

/**
 * Transform JO to RecentDocument
 */
export function joToRecentDocument(jo: JOInput): RecentDocument {
  return {
    id: jo.id,
    type: 'jo',
    number: jo.jo_number,
    customerName: jo.customer_name ?? 'Unknown',
    status: jo.status,
    createdAt: jo.created_at ?? '',
    updatedAt: jo.updated_at ?? jo.created_at ?? '',
    linkUrl: `/jo/${jo.id}`
  }
}

/**
 * Transform Invoice to RecentDocument
 */
export function invoiceToRecentDocument(invoice: InvoiceInput): RecentDocument {
  return {
    id: invoice.id,
    type: 'invoice',
    number: invoice.invoice_number,
    customerName: invoice.customer_name ?? 'Unknown',
    status: invoice.status,
    createdAt: invoice.created_at ?? '',
    updatedAt: invoice.updated_at ?? invoice.created_at ?? '',
    linkUrl: `/invoices/${invoice.id}`
  }
}

/**
 * Get recent documents sorted by updated date descending
 */
export function getRecentDocuments(
  pjos: PJOInput[],
  jos: JOInput[],
  invoices: InvoiceInput[],
  limit: number = 10
): RecentDocument[] {
  const allDocs: RecentDocument[] = [
    ...pjos.map(pjoToRecentDocument),
    ...jos.map(joToRecentDocument),
    ...invoices.map(invoiceToRecentDocument)
  ]

  return allDocs
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt).getTime()
      return dateB - dateA
    })
    .slice(0, limit)
}

/**
 * Filter documents by type
 */
export function filterDocumentsByType(
  docs: RecentDocument[],
  type: WorkItemType | 'all'
): RecentDocument[] {
  if (type === 'all') return docs
  return docs.filter(d => d.type === type)
}
