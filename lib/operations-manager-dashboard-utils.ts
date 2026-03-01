import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import { startOfMonth } from 'date-fns'

// =====================================================
// Types for Operations Manager Dashboard
// CRITICAL: NO REVENUE DATA - Operations Manager cannot see revenue/profit
// =====================================================

export interface JobMetrics {
  activeJobs: number
  pendingHandover: number
  completedMTD: number
  statusBreakdown: Record<string, number>
}

export interface AssetMetrics {
  totalAssets: number
  assignedAssets: number
  availableAssets: number
  utilizationRate: number
  maintenanceDue: number
  statusBreakdown: Record<string, number>
}

export interface TeamMetrics {
  totalActiveEmployees: number
  assignedToJobs: number
  utilizationRate: number
}

export interface CostMetrics {
  totalBudget: number
  totalSpent: number
  budgetUtilization: number
  overBudgetJobs: number
}

export interface KPIMetrics {
  onTimeDelivery: number
  safetyScore: number
  costEfficiency: number
  equipmentUptime: number
}

export interface RecentJob {
  id: string
  joNumber: string
  customerName: string
  status: string
  updatedAt: string
}

export interface RecentBKK {
  id: string
  bkkNumber: string
  description: string
  amount: number
  createdAt: string
}

export interface OperationsManagerDashboardData {
  jobMetrics: JobMetrics
  assetMetrics: AssetMetrics
  teamMetrics: TeamMetrics
  costMetrics: CostMetrics
  kpiMetrics: KPIMetrics
  recentJobs: RecentJob[]
  recentBKK: RecentBKK[]
}

// =====================================================
// Job Metrics - Task 1.2
// =====================================================

export async function getJobMetrics(): Promise<JobMetrics> {
  const supabase = await createClient()
  const monthStart = startOfMonth(new Date())

  // Parallel queries for performance
  const [activeResult, pendingResult, completedResult, allJobsResult] = await Promise.all([
    supabase
      .from('job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('job_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('job_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'submitted_to_finance', 'invoiced', 'closed'])
      .gte('completed_at', monthStart.toISOString()),
    supabase
      .from('job_orders')
      .select('status')
      .limit(1000)
  ])

  // Calculate status breakdown
  const statusBreakdown: Record<string, number> = {}
  allJobsResult.data?.forEach(job => {
    const status = job.status || 'unknown'
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
  })

  return {
    activeJobs: activeResult.count || 0,
    pendingHandover: pendingResult.count || 0,
    completedMTD: completedResult.count || 0,
    statusBreakdown
  }
}

// =====================================================
// Asset Metrics - Task 1.3
// =====================================================

export async function getAssetMetrics(): Promise<AssetMetrics> {
  const supabase = await createClient()
  
  // Calculate 7 days from now for expiry check
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const futureDate = sevenDaysFromNow.toISOString().split('T')[0]

  const { data: assets } = await supabase
    .from('assets')
    .select('id, status, assigned_to_job_id, registration_expiry_date, kir_expiry_date, insurance_expiry_date')
    .limit(500)

  const total = assets?.length || 0
  const assigned = assets?.filter(a => a.assigned_to_job_id !== null).length || 0
  const available = total - assigned

  // Count assets with any expiring document within 7 days
  const maintenanceDue = assets?.filter(a => {
    const regExpiry = a.registration_expiry_date
    const kirExpiry = a.kir_expiry_date
    const insExpiry = a.insurance_expiry_date
    return (regExpiry && regExpiry <= futureDate) ||
           (kirExpiry && kirExpiry <= futureDate) ||
           (insExpiry && insExpiry <= futureDate)
  }).length || 0

  // Status breakdown
  const statusBreakdown: Record<string, number> = {}
  assets?.forEach(a => {
    const status = a.status || 'unknown'
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
  })

  return {
    totalAssets: total,
    assignedAssets: assigned,
    availableAssets: available,
    utilizationRate: total > 0 ? Math.round((assigned / total) * 100) : 0,
    maintenanceDue,
    statusBreakdown
  }
}

// =====================================================
// Team Metrics - Task 1.4
// =====================================================

export async function getTeamMetrics(): Promise<TeamMetrics> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Get active employees count
  const { count: totalActive } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Get employees assigned to active jobs via asset_assignments
  // Note: assigned_from/assigned_to are timestamps, not dates
  const { data: assignments } = await supabase
    .from('asset_assignments')
    .select('employee_id, job_order_id, assigned_to, job_orders!inner(status)')
    .not('employee_id', 'is', null)

  // Filter to active jobs and current assignments
  const assignedEmployeeIds = new Set<string>()
  assignments?.forEach(a => {
    const jo = a.job_orders as { status: string } | null
    if (jo?.status === 'active') {
      // assigned_to is timestamp - null means ongoing, otherwise check if still active
      if (!a.assigned_to || a.assigned_to >= now) {
        assignedEmployeeIds.add(a.employee_id as string)
      }
    }
  })

  const assignedCount = assignedEmployeeIds.size
  const total = totalActive || 0

  return {
    totalActiveEmployees: total,
    assignedToJobs: assignedCount,
    utilizationRate: total > 0 ? Math.round((assignedCount / total) * 100) : 0
  }
}

// =====================================================
// Cost Metrics - Task 1.5
// CRITICAL: NO REVENUE DATA - Only budget (amount) and actual cost (final_cost)
// =====================================================

export async function getCostMetrics(): Promise<CostMetrics> {
  const supabase = await createClient()

  // IMPORTANT: Only select cost-related columns, NEVER revenue columns
  // Forbidden: final_revenue, net_profit, net_margin, total_invoiced, invoiceable_amount
  const { data: activeJobs } = await supabase
    .from('job_orders')
    .select('amount, final_cost')
    .eq('status', 'active')

  let totalBudget = 0
  let totalSpent = 0
  let overBudgetJobs = 0

  activeJobs?.forEach(job => {
    const budget = Number(job.amount) || 0
    const spent = Number(job.final_cost) || 0
    totalBudget += budget
    totalSpent += spent
    if (budget > 0 && spent > budget) {
      overBudgetJobs++
    }
  })

  return {
    totalBudget,
    totalSpent,
    budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    overBudgetJobs
  }
}

// =====================================================
// KPI Metrics - Task 1.6
// =====================================================

export function getKPIMetrics(
  costMetrics: CostMetrics,
  assetMetrics: AssetMetrics
): KPIMetrics {
  // Cost efficiency: percentage of budget remaining (100% = on budget)
  const costEfficiency = costMetrics.totalBudget > 0
    ? Math.round(((costMetrics.totalBudget - costMetrics.totalSpent) / costMetrics.totalBudget) * 100)
    : 100

  // Equipment uptime: percentage of assets available
  const equipmentUptime = assetMetrics.totalAssets > 0
    ? Math.round((assetMetrics.availableAssets / assetMetrics.totalAssets) * 100)
    : 100

  // Placeholder values for metrics requiring additional data sources
  // TODO: Implement when delivery tracking (surat_jalan) and HSE modules are integrated
  return {
    onTimeDelivery: 0,
    safetyScore: 0,
    costEfficiency: Math.max(0, Math.min(costEfficiency, 100)),
    equipmentUptime
  }
}

// =====================================================
// Recent Jobs - Task 1.7
// =====================================================

export async function getRecentJobs(): Promise<RecentJob[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('job_orders')
    .select('id, jo_number, status, updated_at, customers(name)')
    .order('updated_at', { ascending: false })
    .limit(5)

  const jobs = result.data as {
    id: string
    jo_number: string
    status: string
    updated_at: string
    customers: { name: string } | null
  }[] | null

  return (jobs || []).map(job => ({
    id: job.id,
    joNumber: job.jo_number,
    customerName: job.customers?.name || 'Unknown',
    status: job.status,
    updatedAt: job.updated_at
  }))
}

// =====================================================
// Recent BKK - Task 1.8
// =====================================================

export async function getRecentBKK(): Promise<RecentBKK[]> {
  const supabase = await createClient()

  const result = await supabase
    .from('bukti_kas_keluar' as any)
    .select('id, bkk_number, purpose, amount_requested, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const bkkRecords = result.data as {
    id: string
    bkk_number: string
    purpose: string | null
    amount_requested: number
    created_at: string
  }[] | null

  return (bkkRecords || []).map(bkk => ({
    id: bkk.id,
    bkkNumber: bkk.bkk_number,
    description: bkk.purpose || '',
    amount: Number(bkk.amount_requested) || 0,
    createdAt: bkk.created_at
  }))
}

// =====================================================
// Main Data Fetcher with Caching - Task 1.9
// =====================================================

export async function getOperationsManagerDashboardData(): Promise<OperationsManagerDashboardData> {
  const cacheKey = await generateCacheKey('ops-manager-dashboard', 'operations_manager')

  return getOrFetch(cacheKey, async () => {
    // Fetch independent metrics in parallel
    const [jobMetrics, assetMetrics, teamMetrics, costMetrics, recentJobs, recentBKK] = await Promise.all([
      getJobMetrics(),
      getAssetMetrics(),
      getTeamMetrics(),
      getCostMetrics(),
      getRecentJobs(),
      getRecentBKK()
    ])

    // KPI metrics depend on cost and asset metrics (no async needed)
    const kpiMetrics = getKPIMetrics(costMetrics, assetMetrics)

    return {
      jobMetrics,
      assetMetrics,
      teamMetrics,
      costMetrics,
      kpiMetrics,
      recentJobs,
      recentBKK
    }
  })
}
