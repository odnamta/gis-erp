'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { z } from 'zod'
import { ActionResult } from '@/types/actions'

const BG_ALLOWED_ROLES = ['owner', 'director', 'sysadmin', 'finance_manager', 'finance', 'administration'] as const

export type BGStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled'

export interface BilyetGiro {
  id: string
  invoice_id: string
  bg_number: string
  bank_name: string
  amount: number
  issue_date: string
  maturity_date: string
  status: BGStatus
  cleared_date: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

const createBGSchema = z.object({
  invoice_id: z.string().uuid('Invoice ID tidak valid'),
  bg_number: z.string().min(1, 'Nomor BG wajib diisi'),
  bank_name: z.string().min(1, 'Nama bank wajib diisi'),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  issue_date: z.string().min(1, 'Tanggal terbit wajib diisi'),
  maturity_date: z.string().min(1, 'Tanggal jatuh tempo wajib diisi'),
  notes: z.string().optional(),
})

export type CreateBGInput = z.infer<typeof createBGSchema>

/**
 * Get all BGs for a specific invoice
 */
export async function getBGsForInvoice(invoiceId: string): Promise<BilyetGiro[]> {
  const profile = await getUserProfile()
  if (!profile || !BG_ALLOWED_ROLES.includes(profile.role as typeof BG_ALLOWED_ROLES[number])) {
    return []
  }

  const supabase = await createClient()

  const { data, error } = await (supabase as any).from('bilyet_giro')
    .select('*')
    .eq('invoice_id', invoiceId)
    .eq('is_active', true)
    .order('maturity_date', { ascending: true })

  if (error) {
    console.error('getBGsForInvoice error:', error)
    return []
  }

  return (data || []) as BilyetGiro[]
}

/**
 * Create a new BG record
 */
export async function createBG(input: CreateBGInput): Promise<ActionResult<BilyetGiro>> {
  const profile = await getUserProfile()
  if (!profile || !BG_ALLOWED_ROLES.includes(profile.role as typeof BG_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate input
  const parsed = createBGSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(e => e.message).join(', ') }
  }

  const supabase = await createClient()

  // Validate that the invoice exists
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id')
    .eq('id', parsed.data.invoice_id)
    .single()

  if (invoiceError || !invoice) {
    return { success: false, error: 'Invoice tidak ditemukan' }
  }

  const { data, error } = await (supabase as any).from('bilyet_giro')
    .insert({
      invoice_id: parsed.data.invoice_id,
      bg_number: parsed.data.bg_number,
      bank_name: parsed.data.bank_name,
      amount: parsed.data.amount,
      issue_date: parsed.data.issue_date,
      maturity_date: parsed.data.maturity_date,
      notes: parsed.data.notes || null,
      status: 'pending',
      is_active: true,
    })
    .select('*')
    .single()

  if (error) {
    return { success: false, error: error.message || 'Gagal membuat BG' }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${parsed.data.invoice_id}`)

  return { success: true, data: data as BilyetGiro }
}

/**
 * Update BG status (pending -> cleared/bounced/cancelled)
 */
export async function updateBGStatus(
  id: string,
  status: BGStatus,
  clearedDate?: string
): Promise<ActionResult<void>> {
  const profile = await getUserProfile()
  if (!profile || !BG_ALLOWED_ROLES.includes(profile.role as typeof BG_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!['cleared', 'bounced', 'cancelled'].includes(status)) {
    return { success: false, error: 'Status tidak valid' }
  }

  const supabase = await createClient()

  // Fetch current BG
  const { data: bg, error: fetchError } = await (supabase as any).from('bilyet_giro')
    .select('status, invoice_id')
    .eq('id', id)
    .single()

  if (fetchError || !bg) {
    return { success: false, error: 'BG tidak ditemukan' }
  }

  if (bg.status !== 'pending') {
    return { success: false, error: `Tidak dapat mengubah status dari ${bg.status} ke ${status}` }
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'cleared') {
    updateData.cleared_date = clearedDate || new Date().toISOString().split('T')[0]
  }

  const { error: updateError } = await (supabase as any).from('bilyet_giro')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${bg.invoice_id}`)

  return { success: true, data: undefined as void }
}

/**
 * Get all BGs approaching maturity (within 7 days) for dashboard
 */
export async function getBGsPendingClearing(): Promise<BilyetGiro[]> {
  const profile = await getUserProfile()
  if (!profile || !BG_ALLOWED_ROLES.includes(profile.role as typeof BG_ALLOWED_ROLES[number])) {
    return []
  }

  const supabase = await createClient()

  const today = new Date()
  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(today.getDate() + 7)

  const { data, error } = await (supabase as any).from('bilyet_giro')
    .select('*')
    .eq('status', 'pending')
    .eq('is_active', true)
    .lte('maturity_date', sevenDaysLater.toISOString().split('T')[0])
    .order('maturity_date', { ascending: true })

  if (error) {
    console.error('getBGsPendingClearing error:', error)
    return []
  }

  return (data || []) as BilyetGiro[]
}

/**
 * Check if an invoice has any BG records
 */
export async function invoiceHasBGs(invoiceId: string): Promise<boolean> {
  const supabase = await createClient()

  const { count, error } = await (supabase as any).from('bilyet_giro')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId)
    .eq('is_active', true)

  if (error) return false
  return (count || 0) > 0
}
