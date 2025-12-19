'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PJOCostItem } from '@/types'
import { determineCostStatus } from '@/lib/pjo-utils'

const costItemSchema = z.object({
  category: z.enum([
    'trucking', 'port_charges', 'documentation', 'handling',
    'customs', 'insurance', 'storage', 'labor', 'fuel', 'tolls', 'other'
  ] as const),
  description: z.string().min(1, 'Description is required'),
  estimated_amount: z.number().positive('Amount must be positive'),
  notes: z.string().optional(),
  vendor_id: z.string().uuid().optional().nullable(),
  vendor_equipment_id: z.string().uuid().optional().nullable(),
})

const costConfirmationSchema = z.object({
  actual_amount: z.number().min(0, 'Amount cannot be negative'),
  justification: z.string().optional(),
  notes: z.string().optional(),
})

export type CostItemFormData = z.infer<typeof costItemSchema>
export type CostConfirmationData = z.infer<typeof costConfirmationSchema>

export async function getCostItems(pjoId: string): Promise<PJOCostItem[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pjo_cost_items')
    .select('*')
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching cost items:', error)
    return []
  }
  
  return data as PJOCostItem[]
}

export async function createCostItem(
  pjoId: string,
  data: CostItemFormData
): Promise<{ error?: string; item?: PJOCostItem }> {
  const validation = costItemSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Check PJO status - only allow in draft
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('status')
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return { error: 'PJO not found' }
  }

  if (pjo.status !== 'draft') {
    return { error: 'Cost items can only be added to draft PJOs' }
  }

  const { data: newItem, error } = await supabase
    .from('pjo_cost_items')
    .insert({
      pjo_id: pjoId,
      category: data.category,
      description: data.description,
      estimated_amount: data.estimated_amount,
      status: 'estimated',
      estimated_by: user?.id || null,
      notes: data.notes || null,
      vendor_id: data.vendor_id || null,
      vendor_equipment_id: data.vendor_equipment_id || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await updatePJOCostTotals(pjoId)

  revalidatePath(`/proforma-jo/${pjoId}`)
  revalidatePath(`/proforma-jo/${pjoId}/edit`)
  return { item: newItem as PJOCostItem }
}

export async function updateCostEstimate(
  id: string,
  data: Partial<CostItemFormData>
): Promise<{ error?: string; item?: PJOCostItem }> {
  const supabase = await createClient()

  // Get the item to find pjo_id
  const { data: existingItem, error: fetchError } = await supabase
    .from('pjo_cost_items')
    .select('pjo_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingItem) {
    return { error: 'Cost item not found' }
  }

  // Check PJO status
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('status')
    .eq('id', existingItem.pjo_id)
    .single()

  if (pjoError || !pjo) {
    return { error: 'PJO not found' }
  }

  if (pjo.status !== 'draft') {
    return { error: 'Cost estimates can only be edited in draft PJOs' }
  }

  const { data: updatedItem, error } = await supabase
    .from('pjo_cost_items')
    .update({
      category: data.category,
      description: data.description,
      estimated_amount: data.estimated_amount,
      notes: data.notes || null,
      vendor_id: data.vendor_id || null,
      vendor_equipment_id: data.vendor_equipment_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await updatePJOCostTotals(existingItem.pjo_id)

  revalidatePath(`/proforma-jo/${existingItem.pjo_id}`)
  revalidatePath(`/proforma-jo/${existingItem.pjo_id}/edit`)
  return { item: updatedItem as PJOCostItem }
}

export async function confirmActualCost(
  id: string,
  data: CostConfirmationData
): Promise<{ error?: string; item?: PJOCostItem }> {
  const validation = costConfirmationSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get the item to find pjo_id and estimated_amount
  const { data: existingItem, error: fetchError } = await supabase
    .from('pjo_cost_items')
    .select('pjo_id, estimated_amount')
    .eq('id', id)
    .single()

  if (fetchError || !existingItem) {
    return { error: 'Cost item not found' }
  }

  // Check PJO status - only allow when approved
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('status')
    .eq('id', existingItem.pjo_id)
    .single()

  if (pjoError || !pjo) {
    return { error: 'PJO not found' }
  }

  if (pjo.status !== 'approved') {
    return { error: 'Actual costs can only be entered for approved PJOs' }
  }

  // Check if justification is required (actual > estimated)
  if (data.actual_amount > existingItem.estimated_amount && !data.justification?.trim()) {
    return { error: 'Justification is required when actual cost exceeds budget' }
  }

  const status = determineCostStatus(existingItem.estimated_amount, data.actual_amount)

  const { data: updatedItem, error } = await supabase
    .from('pjo_cost_items')
    .update({
      actual_amount: data.actual_amount,
      status,
      justification: data.justification || null,
      notes: data.notes || null,
      confirmed_by: user?.id || null,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  await updatePJOCostTotals(existingItem.pjo_id)

  revalidatePath(`/proforma-jo/${existingItem.pjo_id}`)
  return { item: updatedItem as PJOCostItem }
}

export async function deleteCostItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Get the item to find pjo_id
  const { data: existingItem, error: fetchError } = await supabase
    .from('pjo_cost_items')
    .select('pjo_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingItem) {
    return { error: 'Cost item not found' }
  }

  // Check PJO status
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('status')
    .eq('id', existingItem.pjo_id)
    .single()

  if (pjoError || !pjo) {
    return { error: 'PJO not found' }
  }

  if (pjo.status !== 'draft') {
    return { error: 'Cost items can only be deleted from draft PJOs' }
  }

  const { error } = await supabase
    .from('pjo_cost_items')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  await updatePJOCostTotals(existingItem.pjo_id)

  revalidatePath(`/proforma-jo/${existingItem.pjo_id}`)
  revalidatePath(`/proforma-jo/${existingItem.pjo_id}/edit`)
  return {}
}

async function updatePJOCostTotals(pjoId: string): Promise<void> {
  const supabase = await createClient()

  // Get all cost items
  const { data: items } = await supabase
    .from('pjo_cost_items')
    .select('estimated_amount, actual_amount, status')
    .eq('pjo_id', pjoId)

  const total_estimated = items?.reduce((sum, item) => sum + item.estimated_amount, 0) ?? 0
  const total_actual = items?.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0) ?? 0
  const all_confirmed = items?.length ? items.every(item => item.actual_amount !== null) : false
  const has_cost_overruns = items?.some(item => item.status === 'exceeded') ?? false

  // Update PJO
  await supabase
    .from('proforma_job_orders')
    .update({
      total_cost_estimated: total_estimated,
      total_cost_actual: total_actual,
      total_expenses: total_estimated, // Keep backward compatibility
      all_costs_confirmed: all_confirmed,
      has_cost_overruns,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pjoId)
}

/**
 * Update PJO overrun status based on cost items
 * Called after cost confirmation to flag PJOs with overruns
 */
export async function updatePJOOverrunStatus(pjoId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Get all cost items for this PJO
  const { data: items, error: fetchError } = await supabase
    .from('pjo_cost_items')
    .select('status')
    .eq('pjo_id', pjoId)

  if (fetchError) {
    return { error: fetchError.message }
  }

  const has_cost_overruns = items?.some(item => item.status === 'exceeded') ?? false

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      has_cost_overruns,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pjoId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${pjoId}`)
  return {}
}
