'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile, requireFeatureAccess } from '@/lib/permissions-server'
import { logCreate, logWorkflowTransition } from '@/lib/audit-log'
import { checkDocument, approveDocument, rejectDocument } from '@/lib/workflow-service'
import { revalidatePath } from 'next/cache'
import { sanitizeSearchInput } from '@/lib/utils/sanitize'

export interface BKKFormData {
  jo_id?: string
  pjo_id?: string
  description: string
  amount: number
  payment_method: 'cash' | 'transfer' | 'check'
  recipient_name: string
  recipient_bank?: string
  recipient_account?: string
  notes?: string
}

// Table name for BKK - using existing bukti_kas_keluar table
const BKK_TABLE = 'bukti_kas_keluar'

// Type for BKK data (will be updated after migration)
interface BKKData {
  id: string
  bkk_number: string
  description?: string
  amount?: number
  workflow_status?: string
  created_at?: string
  recipient_name?: string
}

/**
 * Generate BKK number: BKK-YYYY-NNNN
 */
async function generateBKKNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  
  // Get the latest BKK number for this year
  const { data } = await supabase
    .from(BKK_TABLE)
    .select('bkk_number')
    .like('bkk_number', `BKK-${year}-%`)
    .order('bkk_number', { ascending: false })
    .limit(1)
  
  let sequence = 1
  if (data && data.length > 0) {
    const lastNumber = (data[0] as BKKData).bkk_number
    const lastSequence = parseInt(lastNumber.split('-')[2], 10)
    sequence = lastSequence + 1
  }
  
  return `BKK-${year}-${sequence.toString().padStart(4, '0')}`
}

/**
 * Create a new disbursement (BKK)
 * Maker: administration/finance staff
 * Note: This function requires the database migration to be applied first
 */
export async function createBKK(formData: BKKFormData): Promise<{
  success: boolean
  error?: string
  bkk?: { id: string; bkk_number: string }
}> {
  try {
    const profile = await requireFeatureAccess('bkk.create')
    const supabase = await createClient()
    
    const bkkNumber = await generateBKKNumber()
    
    // Map to existing bukti_kas_keluar table structure
    const insertData = {
      bkk_number: bkkNumber,
      jo_id: formData.jo_id || null,
      purpose: formData.description, // Map description to purpose
      amount_requested: formData.amount,
      // Add other required fields for bukti_kas_keluar
      recipient_name: formData.recipient_name,
      notes: formData.notes || null,
      created_by: profile.id,
      created_at: new Date().toISOString(),
    }
    
    const { data, error } = await supabase
      .from(BKK_TABLE)
      .insert(insertData as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('id, bkk_number')
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    const bkkData = data as BKKData
    
    // Log the creation
    await logCreate(
      profile,
      'bkk',
      bkkData.id,
      'BKK',
      bkkData.bkk_number,
      formData as unknown as Record<string, unknown>
    )
    
    revalidatePath('/disbursements')
    return { success: true, bkk: { id: bkkData.id, bkk_number: bkkData.bkk_number } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create BKK' }
  }
}

/**
 * Submit BKK for checking
 * Changes status from draft to pending_check
 */
export async function submitBKK(bkkId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const profile = await requireFeatureAccess('bkk.create')
    const supabase = await createClient()
    
    // Get current BKK
    const { data: bkk, error: fetchError } = await supabase
      .from(BKK_TABLE)
      .select('id, bkk_number, workflow_status')
      .eq('id', bkkId)
      .single()
    
    if (fetchError || !bkk) {
      return { success: false, error: 'BKK not found' }
    }
    
    const bkkData = bkk as unknown as BKKData
    
    if (bkkData.workflow_status !== 'draft') {
      return { success: false, error: 'BKK is not in draft status' }
    }
    
    const { error } = await supabase
      .from(BKK_TABLE)
      .update({
        workflow_status: 'pending_check',
        submitted_by: profile.id,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', bkkId)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Log the workflow transition
    await logWorkflowTransition(
      profile,
      'bkk',
      bkkId,
      'BKK',
      bkkData.bkk_number,
      'submit',
      'draft',
      'pending_check'
    )
    
    revalidatePath('/disbursements')
    revalidatePath(`/disbursements/${bkkId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit BKK' }
  }
}

/**
 * Check/Review BKK (Manager action)
 * Changes status from pending_check to checked
 */
export async function checkBKK(
  bkkId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await requireFeatureAccess('bkk.check')
    
    const result = await checkDocument('bkk', bkkId, profile, comment)
    
    if (result.success) {
      revalidatePath('/disbursements')
      revalidatePath(`/disbursements/${bkkId}`)
    }
    
    return result
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to check BKK' }
  }
}

/**
 * Approve BKK (Director/Owner action)
 * Changes status from checked to approved
 */
export async function approveBKK(
  bkkId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await requireFeatureAccess('bkk.approve')
    
    const result = await approveDocument('bkk', bkkId, profile, comment)
    
    if (result.success) {
      revalidatePath('/disbursements')
      revalidatePath(`/disbursements/${bkkId}`)
    }
    
    return result
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to approve BKK' }
  }
}

/**
 * Reject BKK
 * Can be done by manager (during check) or director/owner (during approval)
 */
export async function rejectBKK(
  bkkId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile()
    
    if (!profile) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Check if user can check or approve (either can reject)
    if (!profile.can_check_bkk && !profile.can_approve_bkk) {
      return { success: false, error: 'You do not have permission to reject BKK' }
    }
    
    const result = await rejectDocument('bkk', bkkId, profile, reason)
    
    if (result.success) {
      revalidatePath('/disbursements')
      revalidatePath(`/disbursements/${bkkId}`)
    }
    
    return result
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to reject BKK' }
  }
}

/**
 * Get BKK list with filters
 */
export async function getBKKList(filters?: {
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}): Promise<{
  success: boolean
  data?: Array<{
    id: string
    bkk_number: string
    description: string
    amount: number
    workflow_status: string
    created_at: string
    recipient_name: string
  }>
  error?: string
}> {
  try {
    await requireFeatureAccess('bkk.view')
    const supabase = await createClient()
    
    // Use any type to bypass strict typing until migration is applied
    let query = supabase
      .from(BKK_TABLE)
      .select('id, bkk_number, purpose, amount_requested, status, created_at, recipient_name')
      .order('created_at', { ascending: false })
    
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }
    if (filters?.search) {
      const search = sanitizeSearchInput(filters.search)
      query = query.or(`bkk_number.ilike.%${search}%,purpose.ilike.%${search}%,recipient_name.ilike.%${search}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Safely map the data to expected format
    const mappedData = Array.isArray(data) ? data.map((item: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: item.id || '',
      bkk_number: item.bkk_number || '',
      description: item.purpose || item.description || '',
      amount: item.amount_requested || item.amount || 0,
      workflow_status: item.status || item.workflow_status || 'draft',
      created_at: item.created_at || '',
      recipient_name: item.recipient_name || '',
    })) : []
    
    return { success: true, data: mappedData }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch BKK list' }
  }
}

/**
 * Get BKK details
 */
export async function getBKKDetails(bkkId: string): Promise<{
  success: boolean
  data?: Record<string, unknown>
  error?: string
}> {
  try {
    await requireFeatureAccess('bkk.view')
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from(BKK_TABLE)
      .select(`
        *,
        job_orders (id, jo_number)
      `)
      .eq('id', bkkId)
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as Record<string, unknown> }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch BKK details' }
  }
}

/**
 * Get pending BKKs for approval dashboard
 */
export async function getPendingBKKs(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    bkk_number: string
    description: string
    amount: number
    workflow_status: string
    created_at: string
  }>
  error?: string
}> {
  try {
    const profile = await getUserProfile()
    
    if (!profile) {
      return { success: false, error: 'Not authenticated' }
    }
    
    const supabase = await createClient()
    
    // Determine which statuses to show based on user's permissions
    const statuses: string[] = []
    if (profile.can_check_bkk) {
      statuses.push('pending_check', 'pending') // Include both new and legacy status
    }
    if (profile.can_approve_bkk) {
      statuses.push('checked', 'approved') // Include both new and legacy status
    }
    
    if (statuses.length === 0) {
      return { success: true, data: [] }
    }
    
    // Use any type to bypass strict typing until migration is applied
    const { data, error } = await supabase
      .from(BKK_TABLE)
      .select('id, bkk_number, purpose, amount_requested, status, created_at')
      .in('status', statuses)
      .order('created_at', { ascending: true })
      .limit(10)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Safely map the data to expected format
    const mappedData = Array.isArray(data) ? data.map((item: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: item.id || '',
      bkk_number: item.bkk_number || '',
      description: item.purpose || item.description || '',
      amount: item.amount_requested || item.amount || 0,
      workflow_status: item.status || item.workflow_status || 'draft',
      created_at: item.created_at || '',
    })) : []
    
    return { success: true, data: mappedData }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch pending BKKs' }
  }
}
