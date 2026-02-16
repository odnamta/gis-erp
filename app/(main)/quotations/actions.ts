'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Json } from '@/types/database'
import { getUserProfile } from '@/lib/permissions-server'
import {
  QuotationCreateInput,
  QuotationUpdateInput,
  RevenueItemInput,
  CostItemInput,
  PursuitCostInput,
  ConvertToPJOOptions,
  Quotation,
  QuotationRevenueItem,
  QuotationCostItem,
  PursuitCost,
  QuotationWithRelations,
} from '@/types/quotation'
import {
  generateQuotationNumber,
  calculateQuotationTotals,
  canSubmitQuotation,
  prepareQuotationForPJO,
  splitQuotationByShipments,
  calculatePursuitCostPerShipment,
} from '@/lib/quotation-utils'
import {
  calculateMarketClassification,
  classifyMarketType,
  requiresEngineering,
} from '@/lib/market-classification-utils'
import { PJOClassificationInput } from '@/types/market-classification'
import { generatePJONumber } from '@/app/(main)/proforma-jo/actions'
import { trackQuotationCreation } from '@/lib/onboarding-tracker'

// Action result type
interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}


// ============================================
// Quotation CRUD Operations
// ============================================

/**
 * Create a new quotation
 */
export async function createQuotation(
  data: QuotationCreateInput
): Promise<ActionResult<Quotation>> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get user profile to determine entity_type
    const profile = await getUserProfile()
    const entityType = profile?.role === 'agency' ? 'gama_agency' : 'gama_main'

    // Get count of quotations this year for number generation
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`)
    
    const quotationNumber = generateQuotationNumber(count || 0)
    
    // Get complexity criteria for classification
    const { data: criteria } = await supabase
      .from('complexity_criteria')
      .select('*')
      .eq('is_active', true)
    
    // Calculate classification
    const classificationInput: PJOClassificationInput = {
      cargo_weight_kg: data.cargo_weight_kg || null,
      cargo_length_m: data.cargo_length_m || null,
      cargo_width_m: data.cargo_width_m || null,
      cargo_height_m: data.cargo_height_m || null,
      cargo_value: data.cargo_value || null,
      duration_days: data.duration_days || null,
      is_new_route: data.is_new_route || false,
      terrain_type: data.terrain_type || null,
      requires_special_permit: data.requires_special_permit || false,
      is_hazardous: data.is_hazardous || false,
    }
    
    const classification = calculateMarketClassification(classificationInput, criteria || [])
    
    // Determine initial status
    const initialStatus = classification.requires_engineering ? 'engineering_review' : 'draft'
    const engineeringStatus = classification.requires_engineering ? 'pending' : 'not_required'
    
    // Insert quotation
    const { data: quotation, error } = await supabase
      .from('quotations')
      .insert({
        quotation_number: quotationNumber,
        customer_id: data.customer_id,
        project_id: data.project_id,
        title: data.title,
        commodity: data.commodity,
        rfq_number: data.rfq_number,
        rfq_date: data.rfq_date,
        rfq_received_date: data.rfq_received_date,
        rfq_deadline: data.rfq_deadline,
        origin: data.origin,
        origin_lat: data.origin_lat,
        origin_lng: data.origin_lng,
        origin_place_id: data.origin_place_id,
        destination: data.destination,
        destination_lat: data.destination_lat,
        destination_lng: data.destination_lng,
        destination_place_id: data.destination_place_id,
        cargo_weight_kg: data.cargo_weight_kg,
        cargo_length_m: data.cargo_length_m,
        cargo_width_m: data.cargo_width_m,
        cargo_height_m: data.cargo_height_m,
        cargo_value: data.cargo_value,
        is_new_route: data.is_new_route,
        terrain_type: data.terrain_type,
        requires_special_permit: data.requires_special_permit,
        is_hazardous: data.is_hazardous,
        duration_days: data.duration_days,
        estimated_shipments: data.estimated_shipments || 1,
        market_type: classification.market_type,
        complexity_score: classification.complexity_score,
        complexity_factors: classification.complexity_factors as unknown as Json,
        requires_engineering: classification.requires_engineering,
        engineering_status: engineeringStatus,
        status: initialStatus,
        created_by: user.id,
        notes: data.notes,
        entity_type: entityType,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Track for onboarding
    await trackQuotationCreation()
    
    revalidatePath('/quotations')
    return { success: true, data: quotation }
  } catch (err) {
    return { success: false, error: 'Failed to create quotation' }
  }
}


/**
 * Update an existing quotation
 */
export async function updateQuotation(
  data: QuotationUpdateInput
): Promise<ActionResult<Quotation>> {
  try {
    const supabase = await createClient()
    
    // Get complexity criteria for classification
    const { data: criteria } = await supabase
      .from('complexity_criteria')
      .select('*')
      .eq('is_active', true)
    
    // Calculate classification if cargo/route data changed
    const classificationInput: PJOClassificationInput = {
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
    }
    
    const classification = calculateMarketClassification(classificationInput, criteria || [])
    
    // Build update object
    const updateData: Record<string, unknown> = { ...data }
    delete updateData.id
    
    // Add classification fields
    updateData.market_type = classification.market_type
    updateData.complexity_score = classification.complexity_score
    updateData.complexity_factors = classification.complexity_factors
    updateData.requires_engineering = classification.requires_engineering
    
    const { data: quotation, error } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    await recalculateQuotationTotals(data.id)
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${data.id}`)
    return { success: true, data: quotation }
  } catch (err) {
    return { success: false, error: 'Failed to update quotation' }
  }
}

/**
 * Soft delete a quotation
 */
export async function deleteQuotation(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('quotations')
      .update({ is_active: false })
      .eq('id', id)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    revalidatePath('/quotations')
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to delete quotation' }
  }
}

/**
 * Get a single quotation with relations
 */
export async function getQuotation(id: string): Promise<ActionResult<QuotationWithRelations>> {
  try {
    const supabase = await createClient()
    
    const { data: quotation, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(id, name, email),
        project:projects(id, name),
        revenue_items:quotation_revenue_items(*),
        cost_items:quotation_cost_items(*),
        pursuit_costs:pursuit_costs(*),
        created_by_user:user_profiles!quotations_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data: quotation as unknown as QuotationWithRelations }
  } catch (err) {
    return { success: false, error: 'Failed to get quotation' }
  }
}


/**
 * List quotations with filters
 */
export async function listQuotations(filters?: {
  status?: string
  market_type?: string
  customer_id?: string
  date_from?: string
  date_to?: string
}): Promise<ActionResult<QuotationWithRelations[]>> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('quotations')
      .select(`
        *,
        customer:customers(id, name, email),
        project:projects(id, name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.market_type) {
      query = query.eq('market_type', filters.market_type)
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }
    
    const { data, error } = await query
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as unknown as QuotationWithRelations[] }
  } catch (err) {
    return { success: false, error: 'Failed to list quotations' }
  }
}

// ============================================
// Revenue Item Operations
// ============================================

/**
 * Add a revenue item to a quotation
 */
export async function addRevenueItem(
  quotationId: string,
  data: RevenueItemInput
): Promise<ActionResult<QuotationRevenueItem>> {
  try {
    const supabase = await createClient()
    
    const { data: item, error } = await supabase
      .from('quotation_revenue_items')
      .insert({
        quotation_id: quotationId,
        category: data.category,
        description: data.description,
        quantity: data.quantity || 1,
        unit: data.unit,
        unit_price: data.unit_price,
        display_order: data.display_order || 0,
        notes: data.notes,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    await recalculateQuotationTotals(quotationId)
    
    revalidatePath(`/quotations/${quotationId}`)
    return { success: true, data: item }
  } catch (err) {
    return { success: false, error: 'Failed to add revenue item' }
  }
}

/**
 * Update a revenue item
 */
export async function updateRevenueItem(
  id: string,
  data: RevenueItemInput
): Promise<ActionResult<QuotationRevenueItem>> {
  try {
    const supabase = await createClient()
    
    // Get quotation_id first
    const { data: existing } = await supabase
      .from('quotation_revenue_items')
      .select('quotation_id')
      .eq('id', id)
      .single()
    
    const { data: item, error } = await supabase
      .from('quotation_revenue_items')
      .update({
        category: data.category,
        description: data.description,
        quantity: data.quantity || 1,
        unit: data.unit,
        unit_price: data.unit_price,
        display_order: data.display_order,
        notes: data.notes,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    if (existing?.quotation_id) {
      await recalculateQuotationTotals(existing.quotation_id)
      revalidatePath(`/quotations/${existing.quotation_id}`)
    }
    
    return { success: true, data: item }
  } catch (err) {
    return { success: false, error: 'Failed to update revenue item' }
  }
}

/**
 * Delete a revenue item
 */
export async function deleteRevenueItem(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    // Get quotation_id first
    const { data: existing } = await supabase
      .from('quotation_revenue_items')
      .select('quotation_id')
      .eq('id', id)
      .single()
    
    const { error } = await supabase
      .from('quotation_revenue_items')
      .delete()
      .eq('id', id)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    if (existing?.quotation_id) {
      await recalculateQuotationTotals(existing.quotation_id)
      revalidatePath(`/quotations/${existing.quotation_id}`)
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to delete revenue item' }
  }
}


// ============================================
// Cost Item Operations
// ============================================

/**
 * Add a cost item to a quotation
 */
export async function addCostItem(
  quotationId: string,
  data: CostItemInput
): Promise<ActionResult<QuotationCostItem>> {
  try {
    const supabase = await createClient()
    
    const { data: item, error } = await supabase
      .from('quotation_cost_items')
      .insert({
        quotation_id: quotationId,
        category: data.category,
        description: data.description,
        estimated_amount: data.estimated_amount,
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        display_order: data.display_order || 0,
        notes: data.notes,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    await recalculateQuotationTotals(quotationId)
    
    revalidatePath(`/quotations/${quotationId}`)
    return { success: true, data: item }
  } catch (err) {
    return { success: false, error: 'Failed to add cost item' }
  }
}

/**
 * Update a cost item
 */
export async function updateCostItem(
  id: string,
  data: CostItemInput
): Promise<ActionResult<QuotationCostItem>> {
  try {
    const supabase = await createClient()
    
    // Get quotation_id first
    const { data: existing } = await supabase
      .from('quotation_cost_items')
      .select('quotation_id')
      .eq('id', id)
      .single()
    
    const { data: item, error } = await supabase
      .from('quotation_cost_items')
      .update({
        category: data.category,
        description: data.description,
        estimated_amount: data.estimated_amount,
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        display_order: data.display_order,
        notes: data.notes,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    if (existing?.quotation_id) {
      await recalculateQuotationTotals(existing.quotation_id)
      revalidatePath(`/quotations/${existing.quotation_id}`)
    }
    
    return { success: true, data: item }
  } catch (err) {
    return { success: false, error: 'Failed to update cost item' }
  }
}

/**
 * Delete a cost item
 */
export async function deleteCostItem(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    // Get quotation_id first
    const { data: existing } = await supabase
      .from('quotation_cost_items')
      .select('quotation_id')
      .eq('id', id)
      .single()
    
    const { error } = await supabase
      .from('quotation_cost_items')
      .delete()
      .eq('id', id)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    if (existing?.quotation_id) {
      await recalculateQuotationTotals(existing.quotation_id)
      revalidatePath(`/quotations/${existing.quotation_id}`)
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to delete cost item' }
  }
}

// ============================================
// Pursuit Cost Operations
// ============================================

/**
 * Add a pursuit cost to a quotation
 */
export async function addPursuitCost(
  quotationId: string,
  data: PursuitCostInput
): Promise<ActionResult<PursuitCost>> {
  try {
    const supabase = await createClient()
    
    const { data: item, error } = await supabase
      .from('pursuit_costs')
      .insert({
        quotation_id: quotationId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        cost_date: data.cost_date,
        incurred_by: data.incurred_by,
        marketing_portion: data.marketing_portion || 100,
        engineering_portion: data.engineering_portion || 0,
        receipt_url: data.receipt_url,
        notes: data.notes,
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    await recalculateQuotationTotals(quotationId)
    
    revalidatePath(`/quotations/${quotationId}`)
    return { success: true, data: item }
  } catch (err) {
    return { success: false, error: 'Failed to add pursuit cost' }
  }
}

/**
 * Update a pursuit cost
 */
export async function updatePursuitCost(
  id: string,
  data: PursuitCostInput
): Promise<ActionResult<PursuitCost>> {
  try {
    const supabase = await createClient()
    
    // Get quotation_id first
    const { data: existing } = await supabase
      .from('pursuit_costs')
      .select('quotation_id')
      .eq('id', id)
      .single()
    
    const { data: item, error } = await supabase
      .from('pursuit_costs')
      .update({
        category: data.category,
        description: data.description,
        amount: data.amount,
        cost_date: data.cost_date,
        incurred_by: data.incurred_by,
        marketing_portion: data.marketing_portion,
        engineering_portion: data.engineering_portion,
        receipt_url: data.receipt_url,
        notes: data.notes,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    if (existing?.quotation_id) {
      await recalculateQuotationTotals(existing.quotation_id)
      revalidatePath(`/quotations/${existing.quotation_id}`)
    }
    
    return { success: true, data: item }
  } catch (err) {
    return { success: false, error: 'Failed to update pursuit cost' }
  }
}

/**
 * Delete a pursuit cost
 */
export async function deletePursuitCost(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    // Get quotation_id first
    const { data: existing } = await supabase
      .from('pursuit_costs')
      .select('quotation_id')
      .eq('id', id)
      .single()
    
    const { error } = await supabase
      .from('pursuit_costs')
      .delete()
      .eq('id', id)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Recalculate totals
    if (existing?.quotation_id) {
      await recalculateQuotationTotals(existing.quotation_id)
      revalidatePath(`/quotations/${existing.quotation_id}`)
    }
    
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to delete pursuit cost' }
  }
}


// ============================================
// Status Workflow Operations
// ============================================

/**
 * Submit quotation to client
 */
export async function submitQuotation(
  id: string,
  submittedTo: string
): Promise<ActionResult<Quotation>> {
  try {
    const supabase = await createClient()
    
    // Get current quotation
    const { data: quotation } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (!quotation) {
      return { success: false, error: 'Quotation not found' }
    }
    
    // Check if can submit
    const { canSubmit, reason } = canSubmitQuotation(quotation)
    if (!canSubmit) {
      return { success: false, error: reason }
    }
    
    const { data: updated, error } = await supabase
      .from('quotations')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_to: submittedTo,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true, data: updated }
  } catch (err) {
    return { success: false, error: 'Failed to submit quotation' }
  }
}

/**
 * Mark quotation as won
 */
export async function markQuotationWon(
  id: string,
  outcomeDate: string
): Promise<ActionResult<Quotation>> {
  try {
    const supabase = await createClient()
    
    const { data: updated, error } = await supabase
      .from('quotations')
      .update({
        status: 'won',
        outcome_date: outcomeDate,
      })
      .eq('id', id)
      .eq('status', 'submitted')
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Notify admin and finance
    // TODO: Call notifyQuotationWon()
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true, data: updated }
  } catch (err) {
    return { success: false, error: 'Failed to mark quotation as won' }
  }
}

/**
 * Mark quotation as lost
 */
export async function markQuotationLost(
  id: string,
  outcomeDate: string,
  outcomeReason: string
): Promise<ActionResult<Quotation>> {
  try {
    const supabase = await createClient()
    
    const { data: updated, error } = await supabase
      .from('quotations')
      .update({
        status: 'lost',
        outcome_date: outcomeDate,
        outcome_reason: outcomeReason,
      })
      .eq('id', id)
      .eq('status', 'submitted')
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true, data: updated }
  } catch (err) {
    return { success: false, error: 'Failed to mark quotation as lost' }
  }
}

/**
 * Cancel a quotation
 */
export async function cancelQuotation(id: string): Promise<ActionResult<Quotation>> {
  try {
    const supabase = await createClient()
    
    const { data: updated, error } = await supabase
      .from('quotations')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true, data: updated }
  } catch (err) {
    return { success: false, error: 'Failed to cancel quotation' }
  }
}

/**
 * Transition quotation to ready status
 */
export async function markQuotationReady(id: string): Promise<ActionResult<Quotation>> {
  try {
    const supabase = await createClient()
    
    // Get current quotation
    const { data: quotation } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (!quotation) {
      return { success: false, error: 'Quotation not found' }
    }
    
    // Check if engineering is required and complete
    if (quotation.requires_engineering) {
      if (quotation.engineering_status !== 'completed' && quotation.engineering_status !== 'waived') {
        return { success: false, error: 'Engineering review must be completed or waived first' }
      }
    }
    
    const { data: updated, error } = await supabase
      .from('quotations')
      .update({ status: 'ready' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true, data: updated }
  } catch (err) {
    return { success: false, error: 'Failed to mark quotation as ready' }
  }
}


// ============================================
// Convert to PJO Operations
// ============================================

/**
 * Convert a won quotation to PJO(s)
 */
export async function convertToPJO(
  quotationId: string,
  options: ConvertToPJOOptions
): Promise<ActionResult<{ pjo_ids: string[] }>> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Get quotation with all related data
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        *,
        revenue_items:quotation_revenue_items(*),
        cost_items:quotation_cost_items(*),
        pursuit_costs:pursuit_costs(*)
      `)
      .eq('id', quotationId)
      .single()
    
    if (quotationError || !quotation) {
      return { success: false, error: 'Quotation not found' }
    }
    
    // Verify quotation is won
    if (quotation.status !== 'won') {
      return { success: false, error: 'Only won quotations can be converted to PJO' }
    }
    
    const pjoIds: string[] = []
    const shipmentCount = options.splitByShipments 
      ? (options.shipmentCount || quotation.estimated_shipments || 1)
      : 1
    
    // Calculate pursuit cost per shipment
    const pursuitCostPerShipment = calculatePursuitCostPerShipment(
      quotation.total_pursuit_cost || 0,
      shipmentCount
    )
    
    // Create PJO(s)
    for (let i = 0; i < shipmentCount; i++) {
      const pjoNumber = await generatePJONumber()
      
      // Prepare PJO data
      const pjoData = prepareQuotationForPJO(quotation)
      
      // Calculate revenue/cost for this shipment
      const revenueTotal = (quotation.total_revenue || 0) / shipmentCount
      const costTotal = (quotation.total_cost || 0) / shipmentCount
      
      // Insert PJO
      const { data: pjo, error: pjoError } = await supabase
        .from('proforma_job_orders')
        .insert({
          pjo_number: pjoNumber,
          customer_id: pjoData.customer_id,
          project_id: pjoData.project_id,
          description: quotation.title + (shipmentCount > 1 ? ` (Shipment ${i + 1}/${shipmentCount})` : ''),
          commodity: pjoData.commodity,
          pol: pjoData.pol,
          pod: pjoData.pod,
          pol_lat: pjoData.pol_lat,
          pol_lng: pjoData.pol_lng,
          pol_place_id: pjoData.pol_place_id,
          pod_lat: pjoData.pod_lat,
          pod_lng: pjoData.pod_lng,
          pod_place_id: pjoData.pod_place_id,
          cargo_weight_kg: pjoData.cargo_weight_kg,
          cargo_length_m: pjoData.cargo_length_m,
          cargo_width_m: pjoData.cargo_width_m,
          cargo_height_m: pjoData.cargo_height_m,
          cargo_value: pjoData.cargo_value,
          is_new_route: pjoData.is_new_route,
          terrain_type: pjoData.terrain_type,
          requires_special_permit: pjoData.requires_special_permit,
          is_hazardous: pjoData.is_hazardous,
          duration_days: pjoData.duration_days,
          market_type: pjoData.market_type,
          complexity_score: pjoData.complexity_score,
          complexity_factors: pjoData.complexity_factors as Json,
          requires_engineering: false,
          engineering_status: 'not_required',
          quotation_id: quotationId,
          estimated_amount: revenueTotal,
          total_revenue: revenueTotal,
          total_cost_estimated: costTotal,
          status: 'draft',
          created_by: user.id,
          entity_type: user.role === 'agency' ? 'gama_agency' : 'gama_main',
        })
        .select()
        .single()
      
      if (pjoError) {
        return { success: false, error: `Failed to create PJO: ${pjoError.message}` }
      }
      
      pjoIds.push(pjo.id)
      
      // Copy revenue items (split proportionally)
      const revenueItems = quotation.revenue_items || []
      for (const item of revenueItems) {
        await supabase.from('pjo_revenue_items').insert({
          pjo_id: pjo.id,
          description: item.description,
          quantity: (item.quantity || 1) / shipmentCount,
          unit: item.unit || 'unit',
          unit_price: item.unit_price,
          source_type: 'quotation',
          source_id: item.id,
        })
      }
      
      // Copy cost items (split proportionally)
      const costItems = quotation.cost_items || []
      for (const item of costItems) {
        await supabase.from('pjo_cost_items').insert({
          pjo_id: pjo.id,
          category: item.category,
          description: item.description,
          estimated_amount: item.estimated_amount / shipmentCount,
          vendor_id: item.vendor_id,
          status: 'estimated',
        })
      }
    }
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${quotationId}`)
    revalidatePath('/proforma-jo')
    
    return { success: true, data: { pjo_ids: pjoIds } }
  } catch (err) {
    return { success: false, error: 'Failed to convert quotation to PJO' }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Recalculate and update quotation totals
 */
async function recalculateQuotationTotals(quotationId: string): Promise<void> {
  const supabase = await createClient()
  
  // Get all items
  const [revenueResult, costResult, pursuitResult, quotationResult] = await Promise.all([
    supabase.from('quotation_revenue_items').select('subtotal').eq('quotation_id', quotationId),
    supabase.from('quotation_cost_items').select('estimated_amount').eq('quotation_id', quotationId),
    supabase.from('pursuit_costs').select('amount').eq('quotation_id', quotationId),
    supabase.from('quotations').select('estimated_shipments').eq('id', quotationId).single(),
  ])
  
  const totals = calculateQuotationTotals(
    revenueResult.data || [],
    costResult.data || [],
    pursuitResult.data || [],
    quotationResult.data?.estimated_shipments || 1
  )
  
  // Update quotation
  await supabase
    .from('quotations')
    .update({
      total_revenue: totals.total_revenue,
      total_cost: totals.total_cost,
      total_pursuit_cost: totals.total_pursuit_cost,
      gross_profit: totals.gross_profit,
      profit_margin: totals.profit_margin,
    })
    .eq('id', quotationId)
}
