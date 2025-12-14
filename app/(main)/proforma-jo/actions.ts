'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { toRomanMonth, calculateProfit } from '@/lib/pjo-utils'

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
})

export type PJOFormData = z.infer<typeof pjoSchema>

export async function generatePJONumber(): Promise<string> {
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
      created_by: user.id,
      is_active: true,
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
      console.error('Error inserting revenue items:', revenueError)
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
      estimated_by: user.id,
    }))

    const { error: costError } = await supabase
      .from('pjo_cost_items')
      .insert(costItemsToInsert)

    if (costError) {
      console.error('Error inserting cost items:', costError)
    }

    // Update PJO with total_cost_estimated
    const totalCostEstimated = data.cost_items.reduce((sum, item) => sum + item.estimated_amount, 0)
    await supabase
      .from('proforma_job_orders')
      .update({ total_cost_estimated: totalCostEstimated })
      .eq('id', newPJO.id)
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/projects/${data.project_id}`)
  return { id: newPJO.id }
}


export async function updatePJO(
  id: string,
  data: PJOFormData
): Promise<{ error?: string }> {
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
          estimated_by: user?.id,
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

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  revalidatePath(`/projects/${existingPJO.project_id}`)
  return {}
}

export async function deletePJO(id: string): Promise<{ error?: string }> {
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
  const supabase = await createClient()

  const { data: existingPJO, error: fetchError } = await supabase
    .from('proforma_job_orders')
    .select('status')
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

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  return {}
}

export async function approvePJO(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to approve a PJO' }
  }

  const { data: existingPJO, error: fetchError } = await supabase
    .from('proforma_job_orders')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !existingPJO) {
    return { error: 'PJO not found' }
  }

  if (existingPJO.status !== 'pending_approval') {
    return { error: 'Only pending approval PJOs can be approved' }
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

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  return {}
}

export async function rejectPJO(id: string, reason: string): Promise<{ error?: string }> {
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
    .select('status')
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

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${id}`)
  return {}
}
