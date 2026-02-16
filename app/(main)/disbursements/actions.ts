'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { logActivity } from '@/lib/activity-logger'

interface CreateDisbursementInput {
  category: 'job_cost' | 'vendor_payment' | 'overhead' | 'other'
  job_order_id?: string
  vendor_id?: string
  date: string
  description: string
  amount: number
  currency: string
  exchange_rate?: number
  payment_method?: string
  bank_account?: string
  reference_number?: string
  notes?: string
  created_by: string
}

export async function generateBKKNumber(): Promise<string> {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `BKK-${year}${month}-`

  // Get the latest BKK number for this month
  const { data } = await supabase
    .from('bkk_records')
    .select('bkk_number')
    .like('bkk_number', `${prefix}%`)
    .order('bkk_number', { ascending: false })
    .limit(1)

  let sequence = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].bkk_number
    const lastSequence = parseInt(lastNumber.split('-').pop() || '0', 10)
    sequence = lastSequence + 1
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`
}

export async function createDisbursement(input: CreateDisbursementInput) {
  const supabase = await createClient()

  try {
    // Generate BKK number
    const bkkNumber = await generateBKKNumber()

    // Determine entity_type from user role
    const profile = await getUserProfile()
    const entityType = profile?.role === 'agency' ? 'gama_agency' : 'gama_main'

    const { data, error } = await supabase
      .from('bkk_records')
      .insert({
        bkk_number: bkkNumber,
        category: input.category,
        job_order_id: input.job_order_id || null,
        vendor_id: input.vendor_id || null,
        date: input.date,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        exchange_rate: input.exchange_rate || 1,
        payment_method: input.payment_method || null,
        bank_account: input.bank_account || null,
        reference_number: input.reference_number || null,
        notes: input.notes || null,
        status: 'draft',
        created_by: input.created_by,
        entity_type: entityType,
      })
      .select()
      .single()

    if (error) throw error

    // Log activity (v0.13.1)
    if (data && input.created_by) {
      logActivity(input.created_by, 'create', 'disbursement', data.id, { bkk_number: bkkNumber })
    }

    revalidatePath('/disbursements')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating disbursement:', error)
    return { data: null, error: 'Failed to create disbursement' }
  }
}

export async function updateDisbursement(
  id: string,
  input: Partial<CreateDisbursementInput>
) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bkk_records')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error updating disbursement:', error)
    return { data: null, error: 'Failed to update disbursement' }
  }
}

export async function submitForApproval(id: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bkk_records')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single()

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error submitting for approval:', error)
    return { data: null, error: 'Failed to submit for approval' }
  }
}

export async function approveDisbursement(id: string, userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bkk_records')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw error

    // Log activity (v0.13.1)
    if (data) {
      logActivity(userId, 'approve', 'disbursement', id, { bkk_number: data.bkk_number })
    }

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error approving disbursement:', error)
    return { data: null, error: 'Failed to approve disbursement' }
  }
}

export async function rejectDisbursement(id: string, userId: string, reason?: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bkk_records')
      .update({
        status: 'rejected',
        notes: reason ? `Rejected: ${reason}` : 'Rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error rejecting disbursement:', error)
    return { data: null, error: 'Failed to reject disbursement' }
  }
}

export async function releaseDisbursement(id: string, userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bkk_records')
      .update({
        status: 'released',
        released_by: userId,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'approved')
      .select()
      .single()

    if (error) throw error

    // Log activity (v0.13.1)
    if (data) {
      logActivity(userId, 'update', 'disbursement', id, { bkk_number: data.bkk_number, status: 'released' })
    }

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error releasing disbursement:', error)
    return { data: null, error: 'Failed to release disbursement' }
  }
}

export async function settleDisbursement(id: string, userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bkk_records')
      .update({
        status: 'settled',
        settled_by: userId,
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'released')
      .select()
      .single()

    if (error) throw error

    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error settling disbursement:', error)
    return { data: null, error: 'Failed to settle disbursement' }
  }
}

export async function deleteDisbursement(id: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('bkk_records')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')

    if (error) throw error

    revalidatePath('/disbursements')
    return { error: null }
  } catch (error) {
    console.error('Error deleting disbursement:', error)
    return { error: 'Failed to delete disbursement' }
  }
}
