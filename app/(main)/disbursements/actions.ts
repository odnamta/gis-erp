'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { logActivity } from '@/lib/activity-logger'

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
}

export async function generateBKKNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const prefix = `BKK-${year}-`

  // Get the latest BKK number for this year
  const { data } = await (supabase
    .from('bukti_kas_keluar' as any)
    .select('bkk_number')
    .like('bkk_number', `${prefix}%`)
    .order('bkk_number', { ascending: false })
    .limit(1) as any)

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
    const entityType = profile.role === 'agency' ? 'gama_agency' : 'gama_main'
    const requestedBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any)
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
        status: 'draft',
        requested_by: requestedBy,
        entity_type: entityType,
      })
      .select()
      .single() as any)

    if (error) throw error

    // Log activity
    if (data) {
      logActivity(requestedBy, 'create', 'disbursement', data.id, { bkk_number: bkkNumber })
    }

    revalidatePath('/disbursements')
    return { data, error: null }
  } catch (error) {
    return { data: null, error: 'Gagal membuat disbursement' }
  }
}

export async function updateDisbursement(
  id: string,
  input: Partial<CreateDisbursementInput>
) {
  const supabase = await createClient()

  try {
    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any)
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single() as any)

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    return { data: null, error: 'Gagal mengupdate disbursement' }
  }
}

export async function submitForApproval(id: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any)
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single() as any)

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
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
    const approvedBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any)
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single() as any)

    if (error) throw error

    // Log activity
    if (data) {
      logActivity(approvedBy, 'approve', 'disbursement', id, { bkk_number: data.bkk_number })
    }

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
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

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any)
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single() as any)

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
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
    const releasedBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any)
      .update({
        status: 'released',
        released_by: releasedBy,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'approved')
      .select()
      .single() as any)

    if (error) throw error

    // Log activity
    if (data) {
      logActivity(releasedBy, 'update', 'disbursement', id, { bkk_number: data.bkk_number, status: 'released' })
    }

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
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
    const settledBy = profile.id

    const { data, error } = await (supabase
      .from('bukti_kas_keluar' as any)
      .update({
        status: 'settled',
        settled_by: settledBy,
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'released')
      .select()
      .single() as any)

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    return { data: null, error: 'Gagal menyelesaikan disbursement' }
  }
}

export async function deleteDisbursement(id: string) {
  const supabase = await createClient()

  try {
    // Set status to 'cancelled' since bukti_kas_keluar has no is_active column
    const { error } = await (supabase
      .from('bukti_kas_keluar' as any)
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'draft') as any)

    if (error) throw error

    revalidatePath('/disbursements')
    return { error: null }
  } catch (error) {
    return { error: 'Gagal menghapus disbursement' }
  }
}
