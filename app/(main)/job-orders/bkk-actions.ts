'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { 
  BKK, 
  BKKWithRelations, 
  CreateBKKInput, 
  ReleaseBKKInput, 
  SettleBKKInput,
  BKKStatus,
  BKKSummaryTotals
} from '@/types/database'
import { 
  generateBKKNumber, 
  isValidStatusTransition,
  validateCreateBKKInput,
  validateRejectBKKInput,
  validateReleaseBKKInput,
  validateSettleBKKInput,
  calculateBKKSummary
} from '@/lib/bkk-utils'

/**
 * Generate a unique BKK number for the current year
 * Format: BKK-YYYY-NNNN
 * 
 * **Feature: bukti-kas-keluar, Property 1: BKK Number Format Validity**
 * **Validates: Requirements 1.2**
 */
export async function generateBKKNumberAction(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  
  const { count, error } = await supabase
    .from('bukti_kas_keluar')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
  
  if (error) {
    console.error('Error counting BKK records:', error)
    throw new Error('Failed to generate BKK number')
  }
  
  return generateBKKNumber(year, (count || 0) + 1)
}

/**
 * Create a new BKK request
 * 
 * **Feature: bukti-kas-keluar, Property 3: State Consistency After Transitions**
 * **Validates: Requirements 1.2, 1.5, 1.6**
 */
export async function createBKK(
  input: CreateBKKInput
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  
  // Validate input
  const validation = validateCreateBKKInput({
    purpose: input.purpose,
    amount_requested: input.amount_requested
  })
  
  if (!validation.isValid) {
    return { error: validation.errors.join(', ') }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Check if cost item is already confirmed/exceeded (if linked)
  if (input.pjo_cost_item_id) {
    const { data: costItem } = await supabase
      .from('pjo_cost_items')
      .select('status')
      .eq('id', input.pjo_cost_item_id)
      .single()
    
    if (costItem && (costItem.status === 'confirmed' || costItem.status === 'exceeded')) {
      return { error: 'Cannot create BKK for a closed cost item' }
    }
  }
  
  // Generate BKK number
  let bkkNumber: string
  try {
    bkkNumber = await generateBKKNumberAction()
  } catch {
    return { error: 'Failed to generate BKK number' }
  }
  
  // Create BKK with initial status 'pending'
  const { data, error } = await supabase
    .from('bukti_kas_keluar')
    .insert({
      bkk_number: bkkNumber,
      jo_id: input.jo_id,
      pjo_cost_item_id: input.pjo_cost_item_id || null,
      purpose: input.purpose,
      amount_requested: input.amount_requested,
      budget_category: input.budget_category || null,
      budget_amount: input.budget_amount || null,
      notes: input.notes || null,
      status: 'pending',
      requested_by: profile?.id || null,
      requested_at: new Date().toISOString()
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Error creating BKK:', error)
    return { error: error.message }
  }
  
  revalidatePath(`/job-orders/${input.jo_id}`)
  return { id: data.id }
}

/**
 * Get all BKKs for a job order
 */
export async function getBKKsByJobOrder(joId: string): Promise<BKKWithRelations[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bukti_kas_keluar')
    .select(`
      *,
      requester:user_profiles!bukti_kas_keluar_requested_by_fkey (
        id,
        full_name
      ),
      approver:user_profiles!bukti_kas_keluar_approved_by_fkey (
        id,
        full_name
      ),
      releaser:user_profiles!bukti_kas_keluar_released_by_fkey (
        id,
        full_name
      ),
      settler:user_profiles!bukti_kas_keluar_settled_by_fkey (
        id,
        full_name
      ),
      cost_item:pjo_cost_items (
        id,
        category,
        description,
        estimated_amount
      )
    `)
    .eq('jo_id', joId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching BKKs:', error)
    return []
  }
  
  return data as BKKWithRelations[]
}

/**
 * Get a single BKK by ID
 */
export async function getBKKById(bkkId: string): Promise<BKKWithRelations | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bukti_kas_keluar')
    .select(`
      *,
      job_order:job_orders (
        id,
        jo_number,
        description
      ),
      requester:user_profiles!bukti_kas_keluar_requested_by_fkey (
        id,
        full_name
      ),
      approver:user_profiles!bukti_kas_keluar_approved_by_fkey (
        id,
        full_name
      ),
      releaser:user_profiles!bukti_kas_keluar_released_by_fkey (
        id,
        full_name
      ),
      settler:user_profiles!bukti_kas_keluar_settled_by_fkey (
        id,
        full_name
      ),
      cost_item:pjo_cost_items (
        id,
        category,
        description,
        estimated_amount,
        actual_amount,
        status
      )
    `)
    .eq('id', bkkId)
    .single()
  
  if (error) {
    console.error('Error fetching BKK:', error)
    return null
  }
  
  return data as BKKWithRelations
}


/**
 * Approve a BKK request
 * 
 * **Feature: bukti-kas-keluar, Property 2: Status Transition Validity**
 * **Feature: bukti-kas-keluar, Property 3: State Consistency After Transitions**
 * **Validates: Requirements 2.1, 2.2**
 */
export async function approveBKK(bkkId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()
  
  // Check permission
  if (!profile || !['admin', 'finance', 'manager', 'super_admin'].includes(profile.role)) {
    return { error: 'You don\'t have permission to approve BKK requests' }
  }
  
  // Fetch current BKK
  const { data: bkk, error: fetchError } = await supabase
    .from('bukti_kas_keluar')
    .select('status, jo_id')
    .eq('id', bkkId)
    .single()
  
  if (fetchError || !bkk) {
    return { error: 'BKK not found' }
  }
  
  // Validate status transition
  if (!isValidStatusTransition(bkk.status as BKKStatus, 'approved')) {
    return { error: `Cannot approve a BKK with status ${bkk.status}` }
  }
  
  // Update BKK
  const { error: updateError } = await supabase
    .from('bukti_kas_keluar')
    .update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', bkkId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  revalidatePath(`/job-orders/${bkk.jo_id}`)
  revalidatePath('/dashboard')
  return {}
}

/**
 * Reject a BKK request
 * 
 * **Feature: bukti-kas-keluar, Property 2: Status Transition Validity**
 * **Feature: bukti-kas-keluar, Property 4: Input Validation Completeness**
 * **Validates: Requirements 2.1, 2.3, 2.4**
 */
export async function rejectBKK(
  bkkId: string, 
  reason: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  
  // Validate rejection reason
  const validation = validateRejectBKKInput(reason)
  if (!validation.isValid) {
    return { error: validation.errors.join(', ') }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()
  
  // Check permission
  if (!profile || !['admin', 'finance', 'manager', 'super_admin'].includes(profile.role)) {
    return { error: 'You don\'t have permission to reject BKK requests' }
  }
  
  // Fetch current BKK
  const { data: bkk, error: fetchError } = await supabase
    .from('bukti_kas_keluar')
    .select('status, jo_id')
    .eq('id', bkkId)
    .single()
  
  if (fetchError || !bkk) {
    return { error: 'BKK not found' }
  }
  
  // Validate status transition
  if (!isValidStatusTransition(bkk.status as BKKStatus, 'rejected')) {
    return { error: `Cannot reject a BKK with status ${bkk.status}` }
  }
  
  // Update BKK
  const { error: updateError } = await supabase
    .from('bukti_kas_keluar')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', bkkId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  revalidatePath(`/job-orders/${bkk.jo_id}`)
  revalidatePath('/dashboard')
  return {}
}

/**
 * Cancel a pending BKK request
 * 
 * **Feature: bukti-kas-keluar, Property 2: Status Transition Validity**
 * **Validates: Requirements 2.5**
 */
export async function cancelBKK(bkkId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  // Fetch current BKK
  const { data: bkk, error: fetchError } = await supabase
    .from('bukti_kas_keluar')
    .select('status, jo_id, requested_by')
    .eq('id', bkkId)
    .single()
  
  if (fetchError || !bkk) {
    return { error: 'BKK not found' }
  }
  
  // Validate status transition
  if (!isValidStatusTransition(bkk.status as BKKStatus, 'cancelled')) {
    return { error: `Cannot cancel a BKK with status ${bkk.status}` }
  }
  
  // Update BKK
  const { error: updateError } = await supabase
    .from('bukti_kas_keluar')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', bkkId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  revalidatePath(`/job-orders/${bkk.jo_id}`)
  return {}
}


/**
 * Release cash for an approved BKK
 * 
 * **Feature: bukti-kas-keluar, Property 2: Status Transition Validity**
 * **Feature: bukti-kas-keluar, Property 4: Input Validation Completeness**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
export async function releaseBKK(
  bkkId: string,
  input: ReleaseBKKInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  
  // Validate input
  const validation = validateReleaseBKKInput({
    release_method: input.release_method
  })
  if (!validation.isValid) {
    return { error: validation.errors.join(', ') }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()
  
  // Check permission
  if (!profile || !['admin', 'finance', 'super_admin'].includes(profile.role)) {
    return { error: 'You don\'t have permission to release cash' }
  }
  
  // Fetch current BKK
  const { data: bkk, error: fetchError } = await supabase
    .from('bukti_kas_keluar')
    .select('status, jo_id')
    .eq('id', bkkId)
    .single()
  
  if (fetchError || !bkk) {
    return { error: 'BKK not found' }
  }
  
  // Validate status transition
  if (!isValidStatusTransition(bkk.status as BKKStatus, 'released')) {
    return { error: `Cannot release a BKK with status ${bkk.status}` }
  }
  
  // Update BKK
  const { error: updateError } = await supabase
    .from('bukti_kas_keluar')
    .update({
      status: 'released',
      released_by: profile.id,
      released_at: new Date().toISOString(),
      release_method: input.release_method,
      release_reference: input.release_reference || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', bkkId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  revalidatePath(`/job-orders/${bkk.jo_id}`)
  revalidatePath('/dashboard')
  return {}
}

/**
 * Settle a released BKK
 * 
 * **Feature: bukti-kas-keluar, Property 2: Status Transition Validity**
 * **Feature: bukti-kas-keluar, Property 7: Cost Item Synchronization After Settlement**
 * **Validates: Requirements 4.1, 4.2, 4.6, 4.7, 4.8, 4.9**
 */
export async function settleBKK(
  bkkId: string,
  input: SettleBKKInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  
  // Validate input
  const validation = validateSettleBKKInput({
    amount_spent: input.amount_spent
  })
  if (!validation.isValid) {
    return { error: validation.errors.join(', ') }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  // Fetch current BKK
  const { data: bkk, error: fetchError } = await supabase
    .from('bukti_kas_keluar')
    .select('status, jo_id, amount_requested, pjo_cost_item_id, budget_amount')
    .eq('id', bkkId)
    .single()
  
  if (fetchError || !bkk) {
    return { error: 'BKK not found' }
  }
  
  // Validate status transition
  if (!isValidStatusTransition(bkk.status as BKKStatus, 'settled')) {
    return { error: `Cannot settle a BKK with status ${bkk.status}` }
  }
  
  // Calculate amount returned
  const amountReturned = bkk.amount_requested > input.amount_spent 
    ? bkk.amount_requested - input.amount_spent 
    : 0
  
  // Update BKK
  const { error: updateError } = await supabase
    .from('bukti_kas_keluar')
    .update({
      status: 'settled',
      settled_by: profile?.id || null,
      settled_at: new Date().toISOString(),
      amount_spent: input.amount_spent,
      amount_returned: amountReturned,
      receipt_urls: input.receipt_urls || [],
      notes: input.notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', bkkId)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  // Update linked cost item if exists
  if (bkk.pjo_cost_item_id) {
    // Determine cost item status based on budget comparison
    const budgetAmount = bkk.budget_amount || 0
    const costItemStatus = input.amount_spent > budgetAmount ? 'exceeded' : 'confirmed'
    
    const { error: costItemError } = await supabase
      .from('pjo_cost_items')
      .update({
        actual_amount: input.amount_spent,
        status: costItemStatus,
        confirmed_at: new Date().toISOString(),
        confirmed_by: profile?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bkk.pjo_cost_item_id)
    
    if (costItemError) {
      console.error('Error updating cost item:', costItemError)
    }
  }
  
  revalidatePath(`/job-orders/${bkk.jo_id}`)
  return {}
}


/**
 * Get pending BKKs for approval (Finance dashboard)
 * 
 * **Validates: Requirements 6.1, 6.2**
 */
export async function getPendingBKKs(): Promise<BKKWithRelations[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bukti_kas_keluar')
    .select(`
      *,
      job_order:job_orders (
        id,
        jo_number,
        description
      ),
      requester:user_profiles!bukti_kas_keluar_requested_by_fkey (
        id,
        full_name
      ),
      cost_item:pjo_cost_items (
        id,
        category,
        description
      )
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching pending BKKs:', error)
    return []
  }
  
  return data as BKKWithRelations[]
}

/**
 * Get BKK summary for a job order
 * 
 * **Feature: bukti-kas-keluar, Property 8: BKK Summary Calculation**
 * **Validates: Requirements 5.3**
 */
export async function getBKKSummary(joId: string): Promise<BKKSummaryTotals> {
  const bkks = await getBKKsByJobOrder(joId)
  return calculateBKKSummary(bkks)
}

/**
 * Get cost items for a job order (for BKK form dropdown)
 */
export async function getCostItemsForBKK(joId: string): Promise<{
  id: string
  category: string
  description: string
  estimated_amount: number
  actual_amount: number | null
  status: string
}[]> {
  const supabase = await createClient()
  
  // First get the PJO ID from the JO
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('pjo_id')
    .eq('id', joId)
    .single()
  
  if (joError || !jo?.pjo_id) {
    return []
  }
  
  // Get cost items for the PJO
  const { data, error } = await supabase
    .from('pjo_cost_items')
    .select('id, category, description, estimated_amount, actual_amount, status')
    .eq('pjo_id', jo.pjo_id)
    .order('category')
  
  if (error) {
    console.error('Error fetching cost items:', error)
    return []
  }
  
  return data || []
}

/**
 * Get BKKs for a specific cost item (to calculate available budget)
 */
export async function getBKKsForCostItem(costItemId: string): Promise<BKK[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bukti_kas_keluar')
    .select('*')
    .eq('pjo_cost_item_id', costItemId)
  
  if (error) {
    console.error('Error fetching BKKs for cost item:', error)
    return []
  }
  
  return data || []
}
