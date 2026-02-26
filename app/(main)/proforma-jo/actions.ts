'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { toRomanMonth, calculateProfit } from '@/lib/pjo-utils'
import { checkEngineeringRequired, canApprovePJO } from '@/lib/engineering-utils'
import { logActivity } from '@/lib/activity-logger'

const revenueItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unit_price: z.number().min(0),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
})

const costItemSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  description: z.string().min(1),
  estimated_amount: z.number().positive(),
})

const pjoSchema = z.object({
  project_id: z.string().min(1, 'Please select a project'),
  jo_date: z.string().min(1, 'Date is required'),
  commodity: z.string().optional(),
  quantity: z.number().optional(),
  quantity_unit: z.string().optional(),
  pol: z.string().optional(),
  pod: z.string().optional(),
  pol_place_id: z.string().optional(),
  pol_lat: z.number().optional(),
  pol_lng: z.number().optional(),
  pod_place_id: z.string().optional(),
  pod_lat: z.number().optional(),
  pod_lng: z.number().optional(),
  etd: z.string().optional(),
  eta: z.string().optional(),
  carrier_type: z.string().optional(),
  total_revenue: z.number().min(0, 'Revenue must be non-negative'),
  total_expenses: z.number().min(0, 'Expenses must be non-negative'),
  notes: z.string().optional(),
  revenue_items: z.array(revenueItemSchema).optional(),
  cost_items: z.array(costItemSchema).optional(),
  // Market classification fields
  cargo_weight_kg: z.number().min(0).optional().nullable(),
  cargo_length_m: z.number().min(0).optional().nullable(),
  cargo_width_m: z.number().min(0).optional().nullable(),
  cargo_height_m: z.number().min(0).optional().nullable(),
  cargo_value: z.number().min(0).optional().nullable(),
  duration_days: z.number().min(0).optional().nullable(),
  is_new_route: z.boolean().optional(),
  terrain_type: z.enum(['normal', 'mountain', 'unpaved', 'narrow']).optional().nullable(),
  requires_special_permit: z.boolean().optional(),
  is_hazardous: z.boolean().optional(),
  market_type: z.enum(['simple', 'complex']).optional().nullable(),
  complexity_score: z.number().optional().nullable(),
  complexity_factors: z.array(z.object({
    criteria_code: z.string(),
    criteria_name: z.string(),
    weight: z.number(),
    triggered_value: z.string(),
  })).optional().nullable(),
  pricing_approach: z.enum(['standard', 'premium', 'negotiated', 'cost_plus']).optional().nullable(),
  pricing_notes: z.string().optional().nullable(),
})

export type PJOFormData = z.infer<typeof pjoSchema>

export async function generatePJONumber(): Promise<string> {
  const profile = await getUserProfile()
  if (!profile) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const romanMonth = toRomanMonth(month)
  const pattern = `%/CARGO/${romanMonth}/${year}`

  const { data: lastPJO } = await supabase
    .from('proforma_job_orders')
    .select('pjo_number')
    .like('pjo_number', pattern)
    .order('pjo_number', { ascending: false })
    .limit(1)
    .single()

  let sequence = 1
  if (lastPJO?.pjo_number) {
    const match = lastPJO.pjo_number.match(/^(\d{4})\//)
    if (match) {
      sequence = parseInt(match[1], 10) + 1
    }
  }

  const paddedSequence = sequence.toString().padStart(4, '0')
  return `${paddedSequence}/CARGO/${romanMonth}/${year}`
}

export async function createPJO(data: PJOFormData): Promise<{ error?: string; id?: string }> {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized' }
  }

  const validation = pjoSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to create a PJO' }
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('customer_id')
    .eq('id', data.project_id)
    .single()

  if (projectError || !project) {
    return { error: 'Project not found' }
  }

  const pjoNumber = await generatePJONumber()
  const profit = calculateProfit(data.total_revenue, data.total_expenses)

  // Check if engineering review is required based on complexity score
  const requiresEngineering = checkEngineeringRequired(data.complexity_score)

  const { data: newPJO, error } = await supabase
    .from('proforma_job_orders')
    .insert({
      pjo_number: pjoNumber,
      project_id: data.project_id,
      customer_id: project.customer_id,
      description: data.commodity || '',
      jo_date: data.jo_date || null,
      commodity: data.commodity || null,
      quantity: data.quantity || null,
      quantity_unit: data.quantity_unit || null,
      pol: data.pol || null,
      pod: data.pod || null,
      pol_place_id: data.pol_place_id || null,
      pol_lat: data.pol_lat || null,
      pol_lng: data.pol_lng || null,
      pod_place_id: data.pod_place_id || null,
      pod_lat: data.pod_lat || null,
      pod_lng: data.pod_lng || null,
      etd: data.etd || null,
      eta: data.eta || null,
      carrier_type: data.carrier_type || null,
      total_revenue: data.total_revenue,
      total_revenue_calculated: data.total_revenue,
      total_expenses: data.total_expenses,
      profit: profit,
      notes: data.notes || null,
      status: 'draft',
      created_by: profile.id,
      is_active: true,
      // Market classification fields
      cargo_weight_kg: data.cargo_weight_kg ?? null,
      cargo_length_m: data.cargo_length_m ?? null,
      cargo_width_m: data.cargo_width_m ?? null,
      cargo_height_m: data.cargo_height_m ?? null,
      cargo_value: data.cargo_value ?? null,
      duration_days: data.duration_days ?? null,
      is_new_route: data.is_new_route ?? false,
      terrain_type: data.terrain_type ?? null,
      requires_special_permit: data.requires_special_permit ?? false,
      is_hazardous: data.is_hazardous ?? false,
      market_type: data.market_type ?? null,
      complexity_score: data.complexity_score ?? null,
      complexity_factors: data.complexity_factors ?? null,
      pricing_approach: data.pricing_approach ?? null,
      pricing_notes: data.pricing_notes ?? null,
      // Engineering flag fields
      requires_engineering: requiresEngineering,
      engineering_status: requiresEngineering ? 'pending' : null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Insert revenue items if provided
  if (data.revenue_items && data.revenue_items.length > 0) {
    const revenueItemsToInsert = data.revenue_items.map(item => ({
      pjo_id: newPJO.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      source_type: item.source_type || 'manual',
      source_id: item.source_id || null,
    }))

    const { error: revenueError } = await supabase
      .from('pjo_revenue_items')
      .insert(revenueItemsToInsert)

    if (revenueError) {
      console.error('PJO revenue items insert error:', revenueError);
    }
  }

  // Insert cost items if provided
  if (data.cost_items && data.cost_items.length > 0) {
    const costItemsToInsert = data.cost_items.map(item => ({
      pjo_id: newPJO.id,
      category: item.category,
      description: item.description,
      estimated_amount: item.estimated_amount,
      status: 'estimated',
      estimated_by: profile.id,
    }))

    const { error: costError } = await supabase
      .from('pjo_cost_items')
      .insert(costItemsToInsert)

    if (costError) {
      console.error('PJO cost items insert error:', costError);
    }

    // Update PJO with total_cost_estimated
    const totalCostEstimated = data.cost_items.reduce((sum, item) => sum + item.estimated_amount, 0)
    await supabase
      .from('proforma_job_orders')
      .update({ total_cost_estimated: totalCostEstimated })
      .eq('id', newPJO.id)
  }

  // Log activity (v0.13.1)
  logActivity(user.id, 'create', 'pjo', newPJO.id, { pjo_number: pjoNumber })

  revalidatePath('/proforma-jo')
  revalidatePath(`/projects/${data.project_id}`)
  return { id: newPJO.id }
}


export async function updatePJO(
  id: string,
  data: PJOFormData
): Promise<{ error?: string }> {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized' }
  }

  const validation = pjoSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { data: existingPJO, error: fetchError } = await supabase
    .from('proforma_job_orders')
    .select('status, project_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingPJO) {
    return { error: 'PJO not found' }
  }

  if (existingPJO.status !== 'draft') {
    return { error: 'Only draft PJOs can be edited' }
  }

  const profit = calculateProfit(data.total_revenue, data.total_expenses)

  // Check if engineering review is required based on complexity score
  const requiresEngineering = checkEngineeringRequired(data.complexity_score)

  // Get current engineering status to preserve it if already set
  const { data: currentPJO } = await supabase
    .from('proforma_job_orders')
    .select('requires_engineering, engineering_status')
    .eq('id', id)
    .single()

  // Only update engineering fields if the requirement changes
  // Don't reset status if engineering review is already in progress or completed
  const engineeringUpdate: Record<string, unknown> = {}
  if (requiresEngineering !== currentPJO?.requires_engineering) {
    engineeringUpdate.requires_engineering = requiresEngineering
    // Only set to pending if newly required and not already set
    if (requiresEngineering && !currentPJO?.engineering_status) {
      engineeringUpdate.engineering_status = 'pending'
    }
    // If no longer required and was pending, clear the status
    if (!requiresEngineering && currentPJO?.engineering_status === 'pending') {
      engineeringUpdate.engineering_status = null
    }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      jo_date: data.jo_date || null,
      commodity: data.commodity || null,
      quantity: data.quantity || null,
      quantity_unit: data.quantity_unit || null,
      pol: data.pol || null,
      pod: data.pod || null,
      pol_place_id: data.pol_place_id || null,
      pol_lat: data.pol_lat || null,
      pol_lng: data.pol_lng || null,
      pod_place_id: data.pod_place_id || null,
      pod_lat: data.pod_lat || null,
      pod_lng: data.pod_lng || null,
      etd: data.etd || null,
      eta: data.eta || null,
      carrier_type: data.carrier_type || null,
      total_revenue: data.total_revenue,
      total_revenue_calculated: data.total_revenue,
      total_expenses: data.total_expenses,
      profit: profit,
      notes: data.notes || null,
      description: data.commodity || '',
      // Market classification fields
      cargo_weight_kg: data.cargo_weight_kg ?? null,
      cargo_length_m: data.cargo_length_m ?? null,
      cargo_width_m: data.cargo_width_m ?? null,
      cargo_height_m: data.cargo_height_m ?? null,
      cargo_value: data.cargo_value ?? null,
      duration_days: data.duration_days ?? null,
      is_new_route: data.is_new_route ?? false,
      terrain_type: data.terrain_type ?? null,
      requires_special_permit: data.requires_special_permit ?? false,
      is_hazardous: data.is_hazardous ?? false,
      market_type: data.market_type ?? null,
      complexity_score: data.complexity_score ?? null,
      complexity_factors: data.complexity_factors ?? null,
      pricing_approach: data.pricing_approach ?? null,
      pricing_notes: data.pricing_notes ?? null,
      ...engineeringUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Handle revenue items diff
  if (data.revenue_items) {
    // Get existing items
    const { data: existingItems } = await supabase
      .from('pjo_revenue_items')
      .select('id')
      .eq('pjo_id', id)

    const existingIds = new Set(existingItems?.map(item => item.id) || [])
    const newIds = new Set(data.revenue_items.filter(item => item.id).map(item => item.id))

    // Delete removed items
    const idsToDelete = [...existingIds].filter(existingId => !newIds.has(existingId))
    if (idsToDelete.length > 0) {
      await supabase.from('pjo_revenue_items').delete().in('id', idsToDelete)
    }

    // Update existing and insert new items
    for (const item of data.revenue_items) {
      if (item.id && existingIds.has(item.id)) {
        // Update existing
        await supabase
          .from('pjo_revenue_items')
          .update({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            source_type: item.source_type || 'manual',
            source_id: item.source_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
      } else {
        // Insert new
        await supabase.from('pjo_revenue_items').insert({
          pjo_id: id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          source_type: item.source_type || 'manual',
          source_id: item.source_id || null,
        })
      }
    }
  }

  // Handle cost items diff
  if (data.cost_items) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get existing cost items
    const { data: existingCostItems } = await supabase
      .from('pjo_cost_items')
      .select('id, status')
      .eq('pjo_id', id)

    const existingCostIds = new Set(existingCostItems?.map(item => item.id) || [])
    const existingCostMap = new Map(existingCostItems?.map(item => [item.id, item]) || [])
    const newCostIds = new Set(data.cost_items.filter(item => item.id).map(item => item.id))

    // Delete removed items
    const costIdsToDelete = [...existingCostIds].filter(existingId => !newCostIds.has(existingId))
    if (costIdsToDelete.length > 0) {
      await supabase.from('pjo_cost_items').delete().in('id', costIdsToDelete)
    }

    // Update existing and insert new items
    for (const item of data.cost_items) {
      if (item.id && existingCostIds.has(item.id)) {
        // Update existing - preserve status if already confirmed
        const existingItem = existingCostMap.get(item.id)
        const preserveStatus = existingItem?.status !== 'estimated'
        
        await supabase
          .from('pjo_cost_items')
          .update({
            category: item.category,
            description: item.description,
            estimated_amount: preserveStatus ? undefined : item.estimated_amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
      } else {
        // Insert new
        await supabase.from('pjo_cost_items').insert({
          pjo_id: id,
          category: item.category,
          description: item.description,
          estimated_amount: item.estimated_amount,
          status: 'estimated',
          estimated_by: profile.id,
        })
      }
    }

    // Update PJO with total_cost_estimated
    const totalCostEstimated = data.cost_items.reduce((sum, item) => sum + item.estimated_amount, 0)
    await supabase
      .from('proforma_job_orders')
      .update({ total_cost_estimated: totalCostEstimated })
      .eq('id', id)
  }

  // Log activity (v0.13.1)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    logActivity(user.id, 'update', 'pjo', id, {})
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  revalidatePath(`/projects/${existingPJO.project_id}`)
  return {}
}

export async function deletePJO(id: string): Promise<{ error?: string }> {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { data: existingPJO, error: fetchError } = await supabase
    .from('proforma_job_orders')
    .select('status, project_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingPJO) {
    return { error: 'PJO not found' }
  }

  if (existingPJO.status !== 'draft') {
    return { error: 'Only draft PJOs can be deleted' }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/projects/${existingPJO.project_id}`)
  return {}
}

export async function submitForApproval(id: string): Promise<{ error?: string }> {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { data: existingPJO, error: fetchError } = await supabase
    .from('proforma_job_orders')
    .select('status, pjo_number, total_revenue_calculated, created_by, customers(name)')
    .eq('id', id)
    .single()

  if (fetchError || !existingPJO) {
    return { error: 'PJO not found' }
  }

  if (existingPJO.status !== 'draft') {
    return { error: 'Only draft PJOs can be submitted for approval' }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      status: 'pending_approval',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Send notification to approvers
  try {
    const { notifyPjoApprovalRequired } = await import('@/lib/notifications/notification-triggers')
    await notifyPjoApprovalRequired({
      id,
      pjo_number: existingPJO.pjo_number,
      customer_name: (existingPJO.customers as { name: string } | null)?.name,
      total_revenue: existingPJO.total_revenue_calculated || undefined,
      created_by: existingPJO.created_by || undefined,
    })
  } catch (e) {
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  return {}
}

export async function approvePJO(id: string): Promise<{ error?: string; blocked?: boolean; blockReason?: string }> {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to approve a PJO' }
  }

  const { data: existingPJO, error: fetchError } = await supabase
    .from('proforma_job_orders')
    .select('status, pjo_number, created_by, requires_engineering, engineering_status')
    .eq('id', id)
    .single()

  if (fetchError || !existingPJO) {
    return { error: 'PJO not found' }
  }

  if (existingPJO.status !== 'pending_approval') {
    return { error: 'Only pending approval PJOs can be approved' }
  }

  // Check engineering status before allowing approval
  const approvalCheck = canApprovePJO({
    requires_engineering: existingPJO.requires_engineering,
    engineering_status: existingPJO.engineering_status,
  })

  if (!approvalCheck.canApprove) {
    return {
      error: approvalCheck.reason || 'Engineering review must be completed before approval',
      blocked: true,
      blockReason: approvalCheck.reason,
    }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Log activity for dashboard
  await supabase.from('activity_log').insert({
    action_type: 'pjo_approved',
    document_type: 'pjo',
    document_id: id,
    document_number: existingPJO.pjo_number,
    user_id: user.id,
    user_name: user.email || 'Unknown User',
  })

  // Log activity (v0.13.1)
  logActivity(user.id, 'approve', 'pjo', id, { pjo_number: existingPJO.pjo_number })

  // Notify PJO creator of approval
  try {
    const { notifyPjoDecision } = await import('@/lib/notifications/notification-triggers')
    await notifyPjoDecision(
      {
        id,
        pjo_number: existingPJO.pjo_number,
        created_by: existingPJO.created_by || undefined,
      },
      'approved'
    )
  } catch (e) {
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  revalidatePath('/dashboard')
  return {}
}

export async function rejectPJO(id: string, reason: string): Promise<{ error?: string }> {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  if (!reason.trim()) {
    return { error: 'Rejection reason is required' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to reject a PJO' }
  }

  const { data: existingPJO, error: fetchError } = await supabase
    .from('proforma_job_orders')
    .select('status, pjo_number, created_by')
    .eq('id', id)
    .single()

  if (fetchError || !existingPJO) {
    return { error: 'PJO not found' }
  }

  if (existingPJO.status !== 'pending_approval') {
    return { error: 'Only pending approval PJOs can be rejected' }
  }

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Log activity (v0.13.1)
  logActivity(user.id, 'reject', 'pjo', id, { pjo_number: existingPJO.pjo_number, reason })

  // Notify PJO creator of rejection
  try {
    const { notifyPjoDecision } = await import('@/lib/notifications/notification-triggers')
    await notifyPjoDecision(
      {
        id,
        pjo_number: existingPJO.pjo_number,
        created_by: existingPJO.created_by || undefined,
      },
      'rejected',
      reason
    )
  } catch (e) {
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  return {}
}


// ============================================
// v0.5 - Operations Actual Cost Entry Actions
// ============================================

import { calculateCostStatus } from '@/lib/pjo-utils'

/**
 * Confirm a cost item with actual amount
 * Updates the cost item with actual_amount, status, confirmed_by, confirmed_at
 * For exceeded items, justification is required
 */
export async function confirmCostItem(
  itemId: string,
  actualAmount: number,
  justification?: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile()
  if (!profile) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in to confirm cost items' }
  }

  // Fetch the cost item to get estimated amount
  const { data: costItem, error: fetchError } = await supabase
    .from('pjo_cost_items')
    .select('id, pjo_id, estimated_amount')
    .eq('id', itemId)
    .single()

  if (fetchError || !costItem) {
    return { success: false, error: 'Cost item not found' }
  }

  // Validate actual amount
  if (actualAmount < 0) {
    return { success: false, error: 'Actual amount cannot be negative' }
  }

  // Calculate status and variance
  const { status, variance, variancePct } = calculateCostStatus(
    costItem.estimated_amount,
    actualAmount
  )

  // Require justification for exceeded items
  if (status === 'exceeded') {
    if (!justification || justification.trim().length < 10) {
      return { success: false, error: 'Justification (minimum 10 characters) is required for exceeded budget items' }
    }
  }

  // Update the cost item
  const { error: updateError } = await supabase
    .from('pjo_cost_items')
    .update({
      actual_amount: actualAmount,
      status: status,
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      justification: status === 'exceeded' ? justification?.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Send budget alert notification if variance > 10%
  if (variancePct > 10) {
    try {
      // Get PJO details for notification
      const { data: pjo } = await supabase
        .from('proforma_job_orders')
        .select('pjo_number')
        .eq('id', costItem.pjo_id)
        .single()

      // Get cost item category
      const { data: fullCostItem } = await supabase
        .from('pjo_cost_items')
        .select('category')
        .eq('id', itemId)
        .single()

      if (pjo && fullCostItem) {
        const { notifyBudgetExceeded } = await import('@/lib/notifications/notification-triggers')
        await notifyBudgetExceeded(
          {
            id: itemId,
            pjo_id: costItem.pjo_id,
            category: fullCostItem.category,
            estimated_amount: costItem.estimated_amount,
            actual_amount: actualAmount,
            variance_pct: variancePct,
          },
          {
            id: costItem.pjo_id,
            pjo_number: pjo.pjo_number,
          }
        )
      }
    } catch (e) {
    }
  }

  // Check if all costs are confirmed and update PJO
  await checkAndUpdatePJOCostStatus(costItem.pjo_id)

  revalidatePath(`/proforma-jo/${costItem.pjo_id}`)
  revalidatePath(`/proforma-jo/${costItem.pjo_id}/costs`)
  
  return { success: true }
}

/**
 * Check if all cost items are confirmed and update PJO flags
 */
async function checkAndUpdatePJOCostStatus(pjoId: string): Promise<{
  allConfirmed: boolean
  hasOverruns: boolean
  totalActual: number
}> {
  const supabase = await createClient()

  // Fetch all cost items for this PJO
  const { data: costItems, error } = await supabase
    .from('pjo_cost_items')
    .select('id, actual_amount, status')
    .eq('pjo_id', pjoId)

  if (error || !costItems) {
    return { allConfirmed: false, hasOverruns: false, totalActual: 0 }
  }

  // Check if all items have actual amounts
  const pendingItems = costItems.filter(item => item.actual_amount === null)
  const allConfirmed = pendingItems.length === 0 && costItems.length > 0

  // Check for overruns
  const hasOverruns = costItems.some(item => item.status === 'exceeded')

  // Calculate total actual cost
  const totalActual = costItems.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)

  // Update PJO record
  await supabase
    .from('proforma_job_orders')
    .update({
      all_costs_confirmed: allConfirmed,
      has_cost_overruns: hasOverruns,
      total_cost_actual: totalActual,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pjoId)

  return { allConfirmed, hasOverruns, totalActual }
}

/**
 * Get cost confirmation status for a PJO
 */
export async function getCostConfirmationStatus(pjoId: string): Promise<{
  confirmed: number
  total: number
  allConfirmed: boolean
  hasOverruns: boolean
  totalEstimated: number
  totalActual: number
}> {
  const profile = await getUserProfile()
  if (!profile) {
    return {
      confirmed: 0,
      total: 0,
      allConfirmed: false,
      hasOverruns: false,
      totalEstimated: 0,
      totalActual: 0,
    }
  }

  const supabase = await createClient()

  const { data: costItems, error } = await supabase
    .from('pjo_cost_items')
    .select('id, estimated_amount, actual_amount, status')
    .eq('pjo_id', pjoId)

  if (error || !costItems) {
    return {
      confirmed: 0,
      total: 0,
      allConfirmed: false,
      hasOverruns: false,
      totalEstimated: 0,
      totalActual: 0,
    }
  }

  const confirmed = costItems.filter(item => item.actual_amount !== null).length
  const total = costItems.length
  const allConfirmed = confirmed === total && total > 0
  const hasOverruns = costItems.some(item => item.status === 'exceeded')
  const totalEstimated = costItems.reduce((sum, item) => sum + item.estimated_amount, 0)
  const totalActual = costItems.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)

  return {
    confirmed,
    total,
    allConfirmed,
    hasOverruns,
    totalEstimated,
    totalActual,
  }
}
