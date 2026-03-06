'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'

// =====================================================
// Types for Project Recap Report
// =====================================================

export interface ProjectRecapProject {
  id: string
  name: string
  status: string
  description: string | null
  contract_value: number | null
  created_at: string | null
  customer: {
    id: string
    name: string
  } | null
}

export interface ProjectRecapJO {
  id: string
  jo_number: string
  status: string
  final_revenue: number | null
  final_cost: number | null
  pjo_number: string | null
  pjo_id: string | null
  created_at: string | null
}

export interface ProjectRecapInvoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number | null
  amount_paid: number | null
  invoice_date: string | null
  due_date: string | null
  jo_number: string | null
}

export interface ProjectRecapBKK {
  id: string
  bkk_number: string
  status: string
  amount_requested: number
  amount_spent: number | null
  amount_returned: number | null
  purpose: string
  jo_number: string | null
  created_at: string | null
}

export interface ProjectRecapSummary {
  project: ProjectRecapProject
  jobOrders: ProjectRecapJO[]
  invoices: ProjectRecapInvoice[]
  bkks: ProjectRecapBKK[]
  financials: {
    totalRevenue: number
    totalCost: number
    grossProfit: number
    grossMargin: number
    totalInvoiced: number
    totalPaid: number
    outstandingInvoices: number
    totalDisbursed: number
    totalSettled: number
    pendingDisbursement: number
    netCashPosition: number
  }
}

// =====================================================
// Server Actions
// =====================================================

/**
 * Get list of all active projects for the selector dropdown
 */
export async function getProjectList(): Promise<ProjectRecapProject[]> {
  // Only roles that can see revenue should access project recaps
  const profile = await getUserProfile()
  if (!profile || !profile.can_see_revenue) {
    return []
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      status,
      description,
      created_at,
      customers (
        id,
        name
      )
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    return []
  }

  type ProjectRow = {
    id: string
    name: string
    status: string
    description: string | null
    created_at: string | null
    customers: { id: string; name: string } | null
  }

  return ((data ?? []) as ProjectRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    description: p.description,
    contract_value: null, // contract_value may not be in generated types
    created_at: p.created_at,
    customer: p.customers,
  }))
}

/**
 * Get full project recap data for a specific project
 */
export async function getProjectRecap(projectId: string): Promise<ProjectRecapSummary | null> {
  // Only roles that can see revenue should access project recaps
  const profile = await getUserProfile()
  if (!profile || !profile.can_see_revenue) {
    return null
  }

  const supabase = await createClient()

  // 1. Fetch project details
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      status,
      description,
      created_at,
      customers (
        id,
        name
      )
    `)
    .eq('id', projectId)
    .single()

  if (projectError || !projectData) {
    return null
  }

  type ProjectRow = {
    id: string
    name: string
    status: string
    description: string | null
    created_at: string | null
    customers: { id: string; name: string } | null
  }

  const pRow = projectData as ProjectRow

  // Try to get contract_value (may not be in generated types)
  let contractValue: number | null = null
  try {
    const { data: cvData } = await (supabase
      .from('projects')
      .select('contract_value' as any)
      .eq('id', projectId)
      .single() as any)
    contractValue = cvData?.contract_value ?? null
  } catch {
    // contract_value column may not exist
  }

  const project: ProjectRecapProject = {
    id: pRow.id,
    name: pRow.name,
    status: pRow.status,
    description: pRow.description,
    contract_value: contractValue,
    created_at: pRow.created_at,
    customer: pRow.customers,
  }

  // 2. Fetch all JOs linked to this project (through PJOs)
  const { data: joData, error: joError } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      status,
      final_revenue,
      final_cost,
      created_at,
      proforma_job_orders!job_orders_pjo_id_fkey (
        id,
        pjo_number
      )
    `)
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (joError) {
    return null
  }

  type JORow = {
    id: string
    jo_number: string
    status: string
    final_revenue: number | null
    final_cost: number | null
    created_at: string | null
    proforma_job_orders: { id: string; pjo_number: string } | null
  }

  const jobOrders: ProjectRecapJO[] = ((joData ?? []) as JORow[]).map((jo) => ({
    id: jo.id,
    jo_number: jo.jo_number,
    status: jo.status,
    final_revenue: jo.final_revenue,
    final_cost: jo.final_cost,
    pjo_number: jo.proforma_job_orders?.pjo_number ?? null,
    pjo_id: jo.proforma_job_orders?.id ?? null,
    created_at: jo.created_at,
  }))

  const joIds = jobOrders.map((jo) => jo.id)

  // 3. Fetch invoices for all JOs in this project
  let invoices: ProjectRecapInvoice[] = []
  if (joIds.length > 0) {
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        total_amount,
        amount_paid,
        invoice_date,
        due_date,
        job_orders!inner (
          jo_number
        )
      `)
      .in('jo_id', joIds)
      .order('invoice_date', { ascending: true })

    if (!invError && invData) {
      type InvRow = {
        id: string
        invoice_number: string
        status: string
        total_amount: number | null
        amount_paid: number | null
        invoice_date: string | null
        due_date: string | null
        job_orders: { jo_number: string } | null
      }

      invoices = (invData as unknown as InvRow[]).map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        total_amount: inv.total_amount,
        amount_paid: inv.amount_paid,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        jo_number: inv.job_orders?.jo_number ?? null,
      }))
    }
  }

  // 4. Fetch BKKs for all JOs in this project
  let bkks: ProjectRecapBKK[] = []
  if (joIds.length > 0) {
    const { data: bkkData, error: bkkError } = await supabase
      .from('bukti_kas_keluar')
      .select(`
        id,
        bkk_number,
        status,
        amount_requested,
        amount_spent,
        amount_returned,
        purpose,
        created_at,
        job_orders!inner (
          jo_number
        )
      `)
      .in('jo_id', joIds)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (!bkkError && bkkData) {
      type BKKRow = {
        id: string
        bkk_number: string
        status: string
        amount_requested: number
        amount_spent: number | null
        amount_returned: number | null
        purpose: string
        created_at: string | null
        job_orders: { jo_number: string } | null
      }

      bkks = (bkkData as BKKRow[]).map((bkk) => ({
        id: bkk.id,
        bkk_number: bkk.bkk_number,
        status: bkk.status,
        amount_requested: bkk.amount_requested,
        amount_spent: bkk.amount_spent,
        amount_returned: bkk.amount_returned,
        purpose: bkk.purpose,
        jo_number: bkk.job_orders?.jo_number ?? null,
        created_at: bkk.created_at,
      }))
    }
  }

  // 5. Calculate financial summary
  const totalRevenue = jobOrders.reduce((sum, jo) => sum + (jo.final_revenue ?? 0), 0)
  const totalCost = jobOrders.reduce((sum, jo) => sum + (jo.final_cost ?? 0), 0)
  const grossProfit = totalRevenue - totalCost
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const activeInvoices = invoices.filter((inv) => inv.status !== 'cancelled')
  const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0)
  const totalPaid = activeInvoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0)
  const outstandingInvoices = totalInvoiced - totalPaid

  const activeBKKs = bkks.filter((bkk) => bkk.status !== 'rejected')
  const totalDisbursed = activeBKKs
    .filter((bkk) => ['released', 'settled'].includes(bkk.status))
    .reduce((sum, bkk) => sum + bkk.amount_requested, 0)
  const totalSettled = activeBKKs
    .filter((bkk) => bkk.status === 'settled')
    .reduce((sum, bkk) => sum + (bkk.amount_spent ?? bkk.amount_requested), 0)
  const pendingDisbursement = activeBKKs
    .filter((bkk) => ['pending', 'approved'].includes(bkk.status))
    .reduce((sum, bkk) => sum + bkk.amount_requested, 0)

  // Net cash position = total collected from invoices - total disbursed via BKK
  const netCashPosition = totalPaid - totalDisbursed

  return {
    project,
    jobOrders,
    invoices,
    bkks,
    financials: {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      totalInvoiced,
      totalPaid,
      outstandingInvoices,
      totalDisbursed,
      totalSettled,
      pendingDisbursement,
      netCashPosition,
    },
  }
}
