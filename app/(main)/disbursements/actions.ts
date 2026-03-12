'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { canAccessFeature } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-logger'
import {
  checkAdvanceEligibility,
  buildAdvanceBlockMessage,
  type AdvanceEligibility,
} from '@/lib/advance-guard'

interface CreateDisbursementInput {
  jo_id: string
  purpose: string
  amount_requested: number
  budget_category?: string
  budget_amount?: number
  vendor_id?: string
  release_method?: string
  release_reference?: string
  notes?: string
  advance_recipient_name?: string
  return_deadline?: string
}

/**
 * Server action for client-side real-time advance eligibility check.
 * Called when user types/selects an advance recipient name.
 */
export async function checkRecipientEligibility(
  recipientName: string
): Promise<AdvanceEligibility> {
  return checkAdvanceEligibility(recipientName)
}

export async function generateBKKNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const prefix = `BKK-${year}-`

  // Get the latest BKK number for this year
  const { data } = await (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('bkk_number')
    .like('bkk_number', `${prefix}%`)
    .order('bkk_number', { ascending: false })
    .limit(1) as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  let sequence = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].bkk_number
    const lastSeq = parseInt(lastNumber.split('-')[2], 10)
    if (!isNaN(lastSeq)) sequence = lastSeq + 1
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`
}

export async function createDisbursement(input: CreateDisbursementInput) {
  const supabase = await createClient()

  try {
    // Generate BKK number
    const bkkNumber = await generateBKKNumber()

    // Determine entity_type and requested_by from server-side profile
    const profile = await getUserProfile()
    if (!profile) {
      return { data: null, error: 'Not authenticated' }
    }
    if (!canAccessFeature(profile, 'bkk.create')) {
      return { data: null, error: 'Tidak memiliki akses' }
    }
    const entityType = profile.role === 'agency' ? 'gama_agency' : 'gama_main'
    const requestedBy = profile.id

    // HARD BLOCK: check advance eligibility if this is an advance BKK
    if (input.advance_recipient_name && input.advance_recipient_name.trim()) {
      const eligibility = await checkAdvanceEligibility(input.advance_recipient_name)
      if (!eligibility.eligible) {
        const blockMessage = buildAdvanceBlockMessage(
          input.advance_recipient_name,
          eligibility.overdueAdvances
        )
        return { data: null, error: blockMessage }
      }
    }

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .insert({
        bkk_number: bkkNumber,
        jo_id: input.jo_id,
        purpose: input.purpose,
        amount_requested: input.amount_requested,
        budget_category: input.budget_category || null,
        budget_amount: input.budget_amount || null,
        vendor_id: input.vendor_id || null,
        release_method: input.release_method || null,
        release_reference: input.release_reference || null,
        notes: input.notes || null,
        advance_recipient_name: input.advance_recipient_name || null,
        return_deadline: input.return_deadline || null,
        status: 'draft',
        requested_by: requestedBy,
        entity_type: entityType,
      })
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    // Log activity
    if (data) {
      logActivity(requestedBy, 'create', 'disbursement', data.id, { bkk_number: bkkNumber })
    }

    revalidatePath('/disbursements')
    return { data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat disbursement'
    return { data: null, error: message }
  }
}

export async function updateDisbursement(
  id: string,
  input: Partial<CreateDisbursementInput>
) {
  const supabase = await createClient()

  try {
    const profile = await getUserProfile()
    if (!profile) {
      return { data: null, error: 'Not authenticated' }
    }
    if (!canAccessFeature(profile, 'bkk.create')) {
      return { data: null, error: 'Tidak memiliki akses' }
    }

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Gagal mengupdate disbursement' }
  }
}

export async function submitForApproval(id: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Gagal submit untuk approval' }
  }
}

export async function approveDisbursement(id: string, _userId?: string) {
  const supabase = await createClient()

  try {
    // Use server-side profile instead of client-provided userId
    const profile = await getUserProfile()
    if (!profile) {
      return { data: null, error: 'Not authenticated' }
    }
    if (!canAccessFeature(profile, 'bkk.approve')) {
      return { data: null, error: 'Tidak memiliki akses' }
    }
    const approvedBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    // Log activity
    if (data) {
      logActivity(approvedBy, 'approve', 'disbursement', id, { bkk_number: data.bkk_number })
    }

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Gagal meng-approve disbursement' }
  }
}

export async function rejectDisbursement(id: string, _userId?: string, reason?: string) {
  const supabase = await createClient()

  try {
    // Use server-side profile instead of client-provided userId
    const profile = await getUserProfile()
    if (!profile) {
      return { data: null, error: 'Not authenticated' }
    }
    if (!canAccessFeature(profile, 'bkk.approve')) {
      return { data: null, error: 'Tidak memiliki akses' }
    }

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Gagal menolak disbursement' }
  }
}

export async function releaseDisbursement(id: string, _userId?: string) {
  const supabase = await createClient()

  try {
    // Use server-side profile instead of client-provided userId
    const profile = await getUserProfile()
    if (!profile) {
      return { data: null, error: 'Not authenticated' }
    }
    if (!canAccessFeature(profile, 'bkk.approve')) {
      return { data: null, error: 'Tidak memiliki akses' }
    }
    const releasedBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        status: 'released',
        released_by: releasedBy,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'approved')
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    // Log activity
    if (data) {
      logActivity(releasedBy, 'update', 'disbursement', id, { bkk_number: data.bkk_number, status: 'released' })
    }

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Gagal melepas dana disbursement' }
  }
}

export async function settleDisbursement(id: string, _userId?: string) {
  const supabase = await createClient()

  try {
    // Use server-side profile instead of client-provided userId
    const profile = await getUserProfile()
    if (!profile) {
      return { data: null, error: 'Not authenticated' }
    }
    if (!canAccessFeature(profile, 'bkk.approve')) {
      return { data: null, error: 'Tidak memiliki akses' }
    }
    const settledBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({
        status: 'settled',
        settled_by: settledBy,
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'released')
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch {
    return { data: null, error: 'Gagal menyelesaikan disbursement' }
  }
}

export async function deleteDisbursement(id: string) {
  const supabase = await createClient()

  try {
    // Set status to 'cancelled' since bukti_kas_keluar has no is_active column
    const { error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'draft') as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    revalidatePath('/disbursements')
    return { error: null }
  } catch {
    return { error: 'Gagal menghapus disbursement' }
  }
}

/**
 * Fetch vendor bank details for auto-fill in BKK creation forms
 */
export async function getVendorBankDetails(vendorId: string): Promise<{
  bank_name: string | null
  bank_branch: string | null
  bank_account: string | null
  bank_account_name: string | null
  vendor_name: string
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vendors')
    .select('vendor_name, bank_name, bank_branch, bank_account, bank_account_name')
    .eq('id', vendorId)
    .single()

  if (error || !data) return null

  return data
}

export interface BKKDashboardStats {
  totalCount: number
  totalAmount: number
  pendingCount: number
  pendingAmount: number
  approvedCount: number
  approvedAmount: number
  releasedCount: number
  releasedAmount: number
  settledCount: number
  settledAmount: number
  overdueCount: number
  overdueAmount: number
  budgetUtilization: {
    totalBudget: number
    totalDisbursed: number
    utilizationPercent: number
  }
}

/**
 * Get enhanced BKK dashboard stats including overdue settlement and budget utilization
 */
export async function getBKKDashboardStats(): Promise<BKKDashboardStats> {
  const supabase = await createClient()

  // Fetch all BKK records with status and amounts
  const { data: allBKKs } = await (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, status, amount_requested, released_at, jo_id, budget_amount') as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  const records = (allBKKs || []) as {
    id: string
    status: string
    amount_requested: number
    released_at: string | null
    jo_id: string
    budget_amount: number | null
  }[]

  const aggregate = (statuses: string[]) => {
    const filtered = records.filter((r) => statuses.includes(r.status))
    return {
      count: filtered.length,
      amount: filtered.reduce((sum, r) => sum + Number(r.amount_requested || 0), 0),
    }
  }

  const all = aggregate(['draft', 'pending', 'approved', 'released', 'settled', 'rejected', 'cancelled'])
  const pending = aggregate(['pending'])
  const approved = aggregate(['approved'])
  const released = aggregate(['released'])
  const settled = aggregate(['settled'])

  // Overdue: released but not settled for >30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const overdueRecords = records.filter(
    (r) =>
      r.status === 'released' &&
      r.released_at &&
      new Date(r.released_at) < thirtyDaysAgo
  )
  const overdueCount = overdueRecords.length
  const overdueAmount = overdueRecords.reduce(
    (sum, r) => sum + Number(r.amount_requested || 0),
    0
  )

  // Budget utilization: fetch linked JO final_cost totals for BKKs that are released/settled
  const activeJoIds = [
    ...new Set(
      records
        .filter((r) => ['released', 'settled'].includes(r.status))
        .map((r) => r.jo_id)
    ),
  ]

  let totalBudget = 0
  if (activeJoIds.length > 0) {
    const { data: joData } = await supabase
      .from('job_orders')
      .select('id, final_cost')
      .in('id', activeJoIds)

    totalBudget = (joData || []).reduce(
      (sum, jo) => sum + Number(jo.final_cost || 0),
      0
    )
  }

  const totalDisbursed = released.amount + settled.amount
  const utilizationPercent = totalBudget > 0 ? (totalDisbursed / totalBudget) * 100 : 0

  return {
    totalCount: all.count,
    totalAmount: all.amount,
    pendingCount: pending.count,
    pendingAmount: pending.amount,
    approvedCount: approved.count,
    approvedAmount: approved.amount,
    releasedCount: released.count,
    releasedAmount: released.amount,
    settledCount: settled.count,
    settledAmount: settled.amount,
    overdueCount,
    overdueAmount,
    budgetUtilization: {
      totalBudget,
      totalDisbursed,
      utilizationPercent,
    },
  }
}
