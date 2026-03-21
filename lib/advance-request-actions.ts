'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { getCurrentProfileId } from '@/lib/auth-helpers'
import { sanitizeSearchInput } from '@/lib/utils/sanitize'
import {
  checkAdvanceEligibility,
  buildAdvanceBlockMessage,
} from '@/lib/advance-guard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdvanceRequest {
  id: string
  bkk_number: string
  advance_recipient_name: string
  amount_requested: number
  return_deadline: string | null
  status: string
  purpose: string | null
  requested_by: string | null
  requester_name: string | null
  jo_id: string | null
  created_at: string
}

export interface AdvanceRequestFilters {
  status?: string
  search?: string
}

export interface AdvanceStats {
  total: number
  pending: number
  overdue: number
}

interface CreateAdvanceRequestInput {
  recipient_name: string
  amount: number
  return_deadline: string
  purpose?: string
  jo_id?: string
}

// ---------------------------------------------------------------------------
// Allowed roles for creating advance requests
// ---------------------------------------------------------------------------

const ADVANCE_CREATE_ROLES = [
  'owner',
  'director',
  'sysadmin',
  'finance',
  'finance_manager',
  'administration',
  'ops',
  'operations_manager',
]

// ---------------------------------------------------------------------------
// BKK Number Generation (same pattern as disbursements/actions.ts)
// ---------------------------------------------------------------------------

async function generateBKKNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const prefix = `BKK-${year}-`

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

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * List advance requests — BKKs where advance_recipient_name IS NOT NULL.
 */
export async function getAdvanceRequests(
  filters?: AdvanceRequestFilters
): Promise<AdvanceRequest[]> {
  const supabase = await createClient()

  let query = (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, bkk_number, advance_recipient_name, amount_requested, return_deadline, status, purpose, requested_by, jo_id, created_at')
    .not('advance_recipient_name', 'is', null) as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  // Filter by status
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Search by recipient name or BKK number
  if (filters?.search && filters.search.trim()) {
    const sanitized = sanitizeSearchInput(filters.search.trim())
    const term = `%${sanitized}%`
    query = query.or(`advance_recipient_name.ilike.${term},bkk_number.ilike.${term}`)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error || !data) {
    console.error('getAdvanceRequests error:', error)
    return []
  }

  // Collect unique requested_by IDs to resolve names
  const requestedByIds = [
    ...new Set(
      (data as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.requested_by) // eslint-disable-line @typescript-eslint/no-explicit-any
        .filter(Boolean)
    ),
  ]

  let profileMap: Record<string, string> = {}
  if (requestedByIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', requestedByIds)

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p: any) => [p.id, p.full_name]) // eslint-disable-line @typescript-eslint/no-explicit-any
      )
    }
  }

  return (data as any[]).map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: row.id,
    bkk_number: row.bkk_number,
    advance_recipient_name: row.advance_recipient_name,
    amount_requested: Number(row.amount_requested),
    return_deadline: row.return_deadline,
    status: row.status,
    purpose: row.purpose,
    requested_by: row.requested_by,
    requester_name: profileMap[row.requested_by] || null,
    jo_id: row.jo_id,
    created_at: row.created_at,
  }))
}

/**
 * Get a single advance request by ID.
 */
export async function getAdvanceRequest(
  id: string
): Promise<AdvanceRequest | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, bkk_number, advance_recipient_name, amount_requested, return_deadline, status, purpose, requested_by, jo_id, created_at')
    .eq('id', id)
    .not('advance_recipient_name', 'is', null)
    .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  if (error || !data) return null

  // Resolve requester name
  let requesterName: string | null = null
  if (data.requested_by) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', data.requested_by)
      .single()
    requesterName = profile?.full_name || null
  }

  return {
    id: data.id,
    bkk_number: data.bkk_number,
    advance_recipient_name: data.advance_recipient_name,
    amount_requested: Number(data.amount_requested),
    return_deadline: data.return_deadline,
    status: data.status,
    purpose: data.purpose,
    requested_by: data.requested_by,
    requester_name: requesterName,
    jo_id: data.jo_id,
    created_at: data.created_at,
  }
}

/**
 * Create a new advance request (inserts a BKK with advance fields).
 */
export async function createAdvanceRequest(
  input: CreateAdvanceRequestInput
): Promise<{ data: any | null; error: string | null }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()

  try {
    // Auth & permission check
    const profile = await getUserProfile()
    if (!profile) {
      return { data: null, error: 'Tidak terautentikasi' }
    }
    if (!ADVANCE_CREATE_ROLES.includes(profile.role)) {
      return { data: null, error: 'Tidak memiliki akses untuk membuat advance request' }
    }

    // Validate required fields
    if (!input.recipient_name || !input.recipient_name.trim()) {
      return { data: null, error: 'Nama penerima advance wajib diisi' }
    }
    if (!input.amount || input.amount <= 0) {
      return { data: null, error: 'Jumlah advance harus lebih dari 0' }
    }
    if (!input.return_deadline) {
      return { data: null, error: 'Deadline pengembalian wajib diisi' }
    }

    // Advance eligibility check — hard block
    const eligibility = await checkAdvanceEligibility(input.recipient_name)
    if (!eligibility.eligible) {
      const blockMessage = buildAdvanceBlockMessage(
        input.recipient_name,
        eligibility.overdueAdvances
      )
      return { data: null, error: blockMessage }
    }

    // Generate BKK number
    const bkkNumber = await generateBKKNumber()

    const entityType = profile.role === 'agency' ? 'gama_agency' : 'gama_main'
    const requestedBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .insert({
        bkk_number: bkkNumber,
        advance_recipient_name: input.recipient_name.trim(),
        amount_requested: input.amount,
        return_deadline: input.return_deadline,
        purpose: input.purpose || null,
        jo_id: input.jo_id || null,
        status: 'draft',
        requested_by: requestedBy,
        entity_type: entityType,
      })
      .select()
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) throw error

    revalidatePath('/finance/advance-requests')
    revalidatePath('/disbursements')
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal membuat advance request'
    return { data: null, error: message }
  }
}

/**
 * Stats for advance requests dashboard cards.
 */
export async function getAdvanceStats(): Promise<AdvanceStats> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, status, return_deadline')
    .not('advance_recipient_name', 'is', null) as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  if (error || !data) {
    console.error('getAdvanceStats error:', error)
    return { total: 0, pending: 0, overdue: 0 }
  }

  const records = data as { id: string; status: string; return_deadline: string | null }[]

  const total = records.length
  const pending = records.filter(
    (r) => r.status === 'draft' || r.status === 'pending'
  ).length

  const terminalStatuses = ['settled', 'cancelled', 'rejected']
  const overdue = records.filter(
    (r) =>
      r.return_deadline &&
      r.return_deadline < today &&
      !terminalStatuses.includes(r.status)
  ).length

  return { total, pending, overdue }
}

/**
 * Fetch job orders for the advance request form dropdown.
 */
export async function getJobOrdersForAdvance(): Promise<
  { id: string; jo_number: string }[]
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !data) return []

  return data.map((jo) => ({
    id: jo.id,
    jo_number: jo.jo_number,
  }))
}

/**
 * Real-time eligibility check (callable from client).
 */
export async function checkRecipientAdvanceEligibility(recipientName: string) {
  return checkAdvanceEligibility(recipientName)
}
