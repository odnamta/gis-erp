'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ConversionReadiness, JobOrderExtended } from '@/types'
import { generateJONumber, calculateProfit, calculateMargin } from '@/lib/pjo-utils'

export async function checkConversionReadiness(pjoId: string): Promise<ConversionReadiness> {
  const supabase = await createClient()

  // Get PJO with status
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('status, converted_to_jo, total_revenue, total_revenue_calculated')
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return {
      can_convert: false,
      reasons: ['PJO not found'],
      warnings: [],
      all_costs_confirmed: false,
      has_revenue_items: false,
      has_cost_items: false,
      budget_health: 'critical',
      ready: false,
      blockers: ['PJO not found'],
      summary: {
        totalRevenue: 0,
        totalCost: 0,
        estimatedProfit: 0,
        profitMargin: 0,
      },
    }
  }

  const blockers: string[] = []

  // Check if already converted
  if (pjo.converted_to_jo) {
    blockers.push('PJO has already been converted to a Job Order')
  }

  // Check PJO status
  if (pjo.status !== 'approved') {
    blockers.push(`PJO must be approved (current status: ${pjo.status})`)
  }

  // Get revenue items
  const { data: revenueItems } = await supabase
    .from('pjo_revenue_items')
    .select('quantity, unit_price, subtotal')
    .eq('pjo_id', pjoId)

  // Get cost items
  const { data: costItems } = await supabase
    .from('pjo_cost_items')
    .select('estimated_amount, actual_amount, status')
    .eq('pjo_id', pjoId)

  const totalRevenue = revenueItems?.reduce((sum, item) => sum + (item.subtotal || item.quantity * item.unit_price), 0) 
    ?? pjo.total_revenue_calculated 
    ?? pjo.total_revenue 
    ?? 0

  const costItemsTotal = costItems?.length ?? 0
  const costItemsConfirmed = costItems?.filter(item => item.actual_amount !== null).length ?? 0
  const totalCostActual = costItems?.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0) ?? 0
  const hasOverruns = costItems?.some(item => item.status === 'exceeded') ?? false

  // Check if all costs are confirmed
  if (costItemsTotal === 0) {
    blockers.push('No cost items found')
  } else if (costItemsConfirmed < costItemsTotal) {
    blockers.push(`Not all cost items confirmed (${costItemsConfirmed}/${costItemsTotal})`)
  }

  // Check revenue items
  if (!revenueItems || revenueItems.length === 0) {
    // Allow conversion if using legacy total_revenue field
    if (!pjo.total_revenue && !pjo.total_revenue_calculated) {
      blockers.push('No revenue items found')
    }
  }

  const profit = calculateProfit(totalRevenue, totalCostActual)
  const margin = calculateMargin(totalRevenue, totalCostActual)

  return {
    can_convert: blockers.length === 0,
    reasons: blockers,
    warnings: hasOverruns ? ['Some cost items have exceeded estimates'] : [],
    all_costs_confirmed: costItemsConfirmed === costItemsTotal && costItemsTotal > 0,
    has_revenue_items: (revenueItems?.length ?? 0) > 0 || totalRevenue > 0,
    has_cost_items: costItemsTotal > 0,
    budget_health: hasOverruns ? 'warning' : margin < 0 ? 'critical' : 'healthy',
    ready: blockers.length === 0,
    blockers,
    summary: {
      totalRevenue,
      totalCost: totalCostActual,
      estimatedProfit: profit,
      profitMargin: margin,
    },
  }
}

export async function convertToJobOrder(pjoId: string): Promise<{ error?: string; jobOrder?: JobOrderExtended }> {
  const supabase = await createClient()

  // Check readiness first
  const readiness = await checkConversionReadiness(pjoId)
  if (!readiness.can_convert) {
    return { error: (readiness.blockers || readiness.reasons).join('; ') }
  }

  // Get PJO details
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('*, projects(customer_id)')
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return { error: 'PJO not found' }
  }

  // Generate JO number
  const now = new Date()
  const year = now.getFullYear()

  // Get last JO number for this month
  const { data: lastJO } = await supabase
    .from('job_orders')
    .select('jo_number')
    .like('jo_number', `JO-%/CARGO/%/${year}`)
    .order('jo_number', { ascending: false })
    .limit(1)
    .single()

  let sequence = 1
  if (lastJO?.jo_number) {
    const match = lastJO.jo_number.match(/^JO-(\d{4})\//)
    if (match) {
      sequence = parseInt(match[1], 10) + 1
    }
  }

  const joNumber = generateJONumber(sequence, now)

  // Create Job Order
  const { data: newJO, error: joError } = await supabase
    .from('job_orders')
    .insert({
      jo_number: joNumber,
      pjo_id: pjoId,
      project_id: pjo.project_id,
      customer_id: pjo.customer_id,
      description: pjo.description || pjo.commodity || '',
      amount: readiness.summary?.totalRevenue ?? 0,
      final_revenue: readiness.summary?.totalRevenue ?? 0,
      final_cost: readiness.summary?.totalCost ?? 0,
      status: 'active',
      converted_from_pjo_at: now.toISOString(),
    })
    .select()
    .single()

  if (joError) {
    return { error: joError.message }
  }

  // Update PJO to mark as converted
  await supabase
    .from('proforma_job_orders')
    .update({
      converted_to_jo: true,
      converted_to_jo_at: now.toISOString(),
      job_order_id: newJO.id,
      updated_at: now.toISOString(),
    })
    .eq('id', pjoId)

  // Update vendor invoices linked to this PJO with the new JO reference
  try {
    const { updateVendorInvoiceJOReference } = await import('@/app/(main)/finance/vendor-invoices/actions')
    const result = await updateVendorInvoiceJOReference(pjoId, newJO.id)
    if (result.error) {
      console.error('Failed to update vendor invoice JO references:', result.error)
    } else if (result.updatedCount && result.updatedCount > 0) {
      console.log(`Updated ${result.updatedCount} vendor invoice(s) with JO reference`)
    }
  } catch (e) {
    console.error('Failed to update vendor invoice JO references:', e)
  }

  // Allocate overhead to the new Job Order
  try {
    const { allocateJobOverhead } = await import('@/app/(main)/job-orders/overhead-actions')
    const overheadResult = await allocateJobOverhead(newJO.id)
    if (overheadResult.error) {
      console.error('Failed to allocate overhead:', overheadResult.error)
    } else {
      console.log(`Allocated overhead: ${overheadResult.totalOverhead}`)
    }
  } catch (e) {
    console.error('Failed to allocate overhead:', e)
  }

  // Send notification for new JO created
  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', pjo.customer_id)
      .single()

    const { notifyJoCreated } = await import('@/lib/notifications/notification-triggers')
    await notifyJoCreated({
      id: newJO.id,
      jo_number: joNumber,
      customer_name: customer?.name,
      status: 'active',
    })
  } catch (e) {
    console.error('Failed to send JO creation notification:', e)
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${pjoId}`)
  revalidatePath('/job-orders')

  return { jobOrder: newJO as JobOrderExtended }
}
