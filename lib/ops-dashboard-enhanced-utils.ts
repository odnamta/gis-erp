import { createClient } from '@/lib/supabase/server'
import { startOfMonth, format } from 'date-fns'

// =====================================================
// v0.9.10: ENHANCED OPERATIONS DASHBOARD TYPES & FUNCTIONS
// =====================================================

// Types for Enhanced Ops Dashboard
export interface EnhancedOpsSummary {
  jobsInProgress: number
  jobsPending: number
  jobsCompletedMTD: number
  deliveriesToday: number
  deliveriesInTransit: number
  deliveriesMTD: number
  handoversPending: number
}

export interface OperationsJobItem {
  id: string
  joNumber: string
  customerName: string
  pjoNumber: string
  commodity: string | null
  origin: string | null
  destination: string | null
  status: string
  budget: number
  actualSpent: number
  totalDeliveries: number
  completedDeliveries: number
  isOverBudget: boolean
  overBudgetAmount: number
  overBudgetPercent: number
}

export interface DeliveryItem {
  id: string
  sjNumber: string
  joNumber: string
  customerName: string
  commodity: string | null
  origin: string | null
  destination: string | null
  vehicleNumber: string | null
  driverName: string | null
  status: string
  departureDate: string
  actualArrival: string | null
  createdAt: string
}

export interface CostSummary {
  totalBudget: number
  totalSpent: number
  remaining: number
  percentUsed: number
  bkkPending: number
  bkkPendingAmount: number
}

export interface PendingAction {
  type: 'berita_acara' | 'surat_jalan' | 'bkk'
  count: number
  message: string
  jobs?: string[]
}

export interface ManpowerMember {
  id: string
  fullName: string
  role: string
  isActive: boolean
  currentAssignment: string | null
}

export interface EnhancedOpsDashboardData {
  summary: EnhancedOpsSummary
  activeJobs: OperationsJobItem[]
  deliverySchedule: DeliveryItem[]
  costSummary: CostSummary
  pendingActions: PendingAction[]
  manpower: ManpowerMember[]
}

/**
 * Get enhanced operations dashboard summary
 * IMPORTANT: This does NOT include revenue or profit data
 */
export async function getEnhancedOpsSummary(): Promise<EnhancedOpsSummary> {
  const supabase = await createClient()
  const monthStart = startOfMonth(new Date())
  const today = format(new Date(), 'yyyy-MM-dd')

  // Get job counts
  const [
    { count: jobsInProgress },
    { count: jobsPending },
    { count: jobsCompletedMTD },
  ] = await Promise.all([
    supabase
      .from('job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress'),
    supabase
      .from('job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', monthStart.toISOString()),
  ])

  // Get delivery counts
  const [
    { count: deliveriesToday },
    { count: deliveriesInTransit },
    { count: deliveriesMTD },
  ] = await Promise.all([
    supabase
      .from('surat_jalan')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_date', today),
    supabase
      .from('surat_jalan')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_transit'),
    supabase
      .from('surat_jalan')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .gte('delivered_at', monthStart.toISOString()),
  ])

  // Get pending handovers (Berita Acara)
  const { count: handoversPending } = await supabase
    .from('berita_acara')
    .select('*', { count: 'exact', head: true })
    .in('status', ['draft', 'pending'])

  return {
    jobsInProgress: jobsInProgress || 0,
    jobsPending: jobsPending || 0,
    jobsCompletedMTD: jobsCompletedMTD || 0,
    deliveriesToday: deliveriesToday || 0,
    deliveriesInTransit: deliveriesInTransit || 0,
    deliveriesMTD: deliveriesMTD || 0,
    handoversPending: handoversPending || 0,
  }
}


/**
 * Get active jobs list for operations (NO REVENUE!)
 * Only shows budget and actual spent amounts
 */
export async function getOperationsJobList(): Promise<OperationsJobItem[]> {
  const supabase = await createClient()

  const { data: jobs, error } = await supabase
    .from('operations_job_list')
    .select('*')
    .limit(10)

  if (error) {
    return []
  }

  return (jobs || []).map((job) => {
    const budget = Number(job.budget) || 0
    const actualSpent = Number(job.actual_spent) || 0
    const isOverBudget = actualSpent > budget && budget > 0
    const overBudgetAmount = isOverBudget ? actualSpent - budget : 0
    const overBudgetPercent = budget > 0 ? (overBudgetAmount / budget) * 100 : 0

    return {
      id: job.id || '',
      joNumber: job.jo_number || '',
      customerName: job.customer_name || '',
      pjoNumber: job.pjo_number || '',
      commodity: job.commodity,
      origin: job.origin_location,
      destination: job.destination_location,
      status: job.status || '',
      budget,
      actualSpent,
      totalDeliveries: job.total_deliveries || 0,
      completedDeliveries: job.completed_deliveries || 0,
      isOverBudget,
      overBudgetAmount,
      overBudgetPercent,
    }
  })
}

/**
 * Get delivery schedule for operations
 */
export async function getDeliverySchedule(): Promise<DeliveryItem[]> {
  const supabase = await createClient()

  const { data: deliveries, error } = await supabase
    .from('delivery_schedule')
    .select('*')
    .limit(10)

  if (error) {
    return []
  }

  return (deliveries || []).map((d) => ({
    id: d.id || '',
    sjNumber: d.sj_number || '',
    joNumber: d.jo_number || '',
    customerName: d.customer_name || '',
    commodity: d.commodity,
    origin: d.origin_location,
    destination: d.destination_location,
    vehicleNumber: d.vehicle_number,
    driverName: d.driver_name,
    status: d.status || 'pending',
    departureDate: d.departure_date || '',
    actualArrival: d.actual_arrival,
    createdAt: d.created_at || '',
  }))
}

/**
 * Calculate cost summary from active jobs (NO REVENUE!)
 */
export async function getCostSummary(activeJobs: OperationsJobItem[]): Promise<CostSummary> {
  const supabase = await createClient()

  const totalBudget = activeJobs.reduce((sum, j) => sum + j.budget, 0)
  const totalSpent = activeJobs.reduce((sum, j) => sum + j.actualSpent, 0)

  // Get pending BKK
  const { data: pendingBKK } = await supabase
    .from('bukti_kas_keluar')
    .select('amount_requested')
    .in('status', ['pending', 'approved'])
    .limit(1000)

  const bkkPendingAmount = pendingBKK?.reduce(
    (sum, b) => sum + Number(b.amount_requested),
    0
  ) || 0

  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    percentUsed: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    bkkPending: pendingBKK?.length || 0,
    bkkPendingAmount,
  }
}

/**
 * Get pending actions for operations
 */
export async function getPendingOperationsActions(): Promise<PendingAction[]> {
  const supabase = await createClient()
  const actions: PendingAction[] = []

  // Pending Berita Acara
  const { data: pendingBA } = await supabase
    .from('berita_acara')
    .select('jo_id, job_orders(jo_number)')
    .in('status', ['draft', 'pending'])
    .limit(1000)

  if (pendingBA?.length) {
    const joNumbers = pendingBA
      .map((ba) => {
        const jo = ba.job_orders as { jo_number: string } | null
        return jo?.jo_number
      })
      .filter((n): n is string => Boolean(n))

    actions.push({
      type: 'berita_acara',
      count: pendingBA.length,
      message: `${pendingBA.length} Berita Acara awaiting completion`,
      jobs: joNumbers,
    })
  }

  // Surat Jalan ready to dispatch
  const { count: pendingSJ } = await supabase
    .from('surat_jalan')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'issued')

  if (pendingSJ) {
    actions.push({
      type: 'surat_jalan',
      count: pendingSJ,
      message: `${pendingSJ} Surat Jalan ready to dispatch`,
    })
  }

  // BKK needing request
  const { count: pendingBKK } = await supabase
    .from('bukti_kas_keluar')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (pendingBKK) {
    actions.push({
      type: 'bkk',
      count: pendingBKK,
      message: `${pendingBKK} BKK requests pending approval`,
    })
  }

  return actions
}

/**
 * Get operations team members (ops, operations_manager roles)
 * Does NOT expose revenue or salary information
 */
export async function getOperationsManpower(): Promise<ManpowerMember[]> {
  const supabase = await createClient()

  const { data: members, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, is_active')
    .in('role', ['ops', 'operations_manager', 'engineer'])
    .order('full_name', { ascending: true })

  if (error) {
    return []
  }

  // For each active member, try to find their current JO assignment
  const result: ManpowerMember[] = []

  for (const member of members || []) {
    let currentAssignment: string | null = null

    // Check if user has recent activity on any active JO
    if (member.is_active) {
      const { data: recentActivity } = await supabase
        .from('activity_log')
        .select('document_number')
        .eq('user_id', member.id)
        .eq('document_type', 'jo')
        .order('created_at', { ascending: false })
        .limit(1)

      if (recentActivity && recentActivity.length > 0) {
        currentAssignment = recentActivity[0].document_number || null
      }
    }

    result.push({
      id: member.id,
      fullName: member.full_name || 'Unnamed',
      role: member.role,
      isActive: member.is_active,
      currentAssignment,
    })
  }

  return result
}

/**
 * Get all enhanced ops dashboard data in one call
 * IMPORTANT: This does NOT include revenue or profit data
 */
export async function getEnhancedOpsDashboardData(): Promise<EnhancedOpsDashboardData> {
  const [summary, activeJobs, deliverySchedule, pendingActions, manpower] = await Promise.all([
    getEnhancedOpsSummary(),
    getOperationsJobList(),
    getDeliverySchedule(),
    getPendingOperationsActions(),
    getOperationsManpower(),
  ])

  const costSummary = await getCostSummary(activeJobs)

  return {
    summary,
    activeJobs,
    deliverySchedule,
    costSummary,
    pendingActions,
    manpower,
  }
}
