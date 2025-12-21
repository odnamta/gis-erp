'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  Asset,
  AssetWithRelations,
  AssetCategory,
  AssetLocation,
  AssetStatusHistory,
  AssetDocument,
  AssetFormData,
  StatusChangeFormData,
  AssetDocumentFormData,
  AssetFilterState,
  AssetCategorySummary,
  ExpiringDocument,
} from '@/types/assets'

// ============================================
// Category and Location Actions
// ============================================

/**
 * Get all asset categories ordered by display_order
 */
export async function getAssetCategories(): Promise<AssetCategory[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching asset categories:', error)
    return []
  }
  
  return data || []
}

/**
 * Get all active asset locations
 */
export async function getAssetLocations(): Promise<AssetLocation[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_locations')
    .select('*')
    .eq('is_active', true)
    .order('location_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching asset locations:', error)
    return []
  }
  
  return data || []
}

// ============================================
// Asset CRUD Actions
// ============================================

/**
 * Create a new asset
 */
export async function createAsset(
  data: AssetFormData
): Promise<{ success: boolean; asset?: Asset; error?: string }> {
  const supabase = await createClient()
  
  // Validate required fields
  if (!data.asset_name?.trim()) {
    return { success: false, error: 'Asset name is required' }
  }
  if (!data.category_id) {
    return { success: false, error: 'Category is required' }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Prepare asset data
  const assetData = {
    asset_name: data.asset_name.trim(),
    description: data.description?.trim() || null,
    category_id: data.category_id,
    registration_number: data.registration_number?.trim() || null,
    vin_number: data.vin_number?.trim() || null,
    engine_number: data.engine_number?.trim() || null,
    chassis_number: data.chassis_number?.trim() || null,
    brand: data.brand?.trim() || null,
    model: data.model?.trim() || null,
    year_manufactured: data.year_manufactured || null,
    color: data.color?.trim() || null,
    capacity_tons: data.capacity_tons || null,
    capacity_cbm: data.capacity_cbm || null,
    axle_configuration: data.axle_configuration?.trim() || null,
    length_m: data.length_m || null,
    width_m: data.width_m || null,
    height_m: data.height_m || null,
    weight_kg: data.weight_kg || null,
    purchase_date: data.purchase_date || null,
    purchase_price: data.purchase_price || null,
    purchase_vendor: data.purchase_vendor?.trim() || null,
    purchase_invoice: data.purchase_invoice?.trim() || null,
    useful_life_years: data.useful_life_years || null,
    salvage_value: data.salvage_value || 0,
    depreciation_method: data.depreciation_method || 'straight_line',
    current_location_id: data.current_location_id || null,
    insurance_policy_number: data.insurance_policy_number?.trim() || null,
    insurance_provider: data.insurance_provider?.trim() || null,
    insurance_expiry_date: data.insurance_expiry_date || null,
    insurance_value: data.insurance_value || null,
    registration_expiry_date: data.registration_expiry_date || null,
    kir_expiry_date: data.kir_expiry_date || null,
    notes: data.notes?.trim() || null,
    status: 'active' as const,
    book_value: data.purchase_price || null,
    created_by: user?.id || null,
  }
  
  const { data: asset, error } = await supabase
    .from('assets')
    .insert(assetData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating asset:', error)
    return { success: false, error: error.message }
  }
  
  // Log initial status in history
  await supabase.from('asset_status_history').insert({
    asset_id: asset.id,
    previous_status: null,
    new_status: 'active',
    reason: 'Initial asset registration',
    changed_by: user?.id || null,
  })
  
  revalidatePath('/equipment')
  return { success: true, asset }
}

/**
 * Update an existing asset
 */
export async function updateAsset(
  id: string,
  data: Partial<AssetFormData>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Validate asset exists
  const { data: existing, error: fetchError } = await supabase
    .from('assets')
    .select('id, asset_code')
    .eq('id', id)
    .single()
  
  if (fetchError || !existing) {
    return { success: false, error: 'Asset not found' }
  }
  
  // Prepare update data (exclude asset_code - it's immutable)
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  
  // Only include fields that are provided
  if (data.asset_name !== undefined) updateData.asset_name = data.asset_name.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.category_id !== undefined) updateData.category_id = data.category_id
  if (data.registration_number !== undefined) updateData.registration_number = data.registration_number?.trim() || null
  if (data.vin_number !== undefined) updateData.vin_number = data.vin_number?.trim() || null
  if (data.engine_number !== undefined) updateData.engine_number = data.engine_number?.trim() || null
  if (data.chassis_number !== undefined) updateData.chassis_number = data.chassis_number?.trim() || null
  if (data.brand !== undefined) updateData.brand = data.brand?.trim() || null
  if (data.model !== undefined) updateData.model = data.model?.trim() || null
  if (data.year_manufactured !== undefined) updateData.year_manufactured = data.year_manufactured || null
  if (data.color !== undefined) updateData.color = data.color?.trim() || null
  if (data.capacity_tons !== undefined) updateData.capacity_tons = data.capacity_tons || null
  if (data.capacity_cbm !== undefined) updateData.capacity_cbm = data.capacity_cbm || null
  if (data.axle_configuration !== undefined) updateData.axle_configuration = data.axle_configuration?.trim() || null
  if (data.length_m !== undefined) updateData.length_m = data.length_m || null
  if (data.width_m !== undefined) updateData.width_m = data.width_m || null
  if (data.height_m !== undefined) updateData.height_m = data.height_m || null
  if (data.weight_kg !== undefined) updateData.weight_kg = data.weight_kg || null
  if (data.purchase_date !== undefined) updateData.purchase_date = data.purchase_date || null
  if (data.purchase_price !== undefined) updateData.purchase_price = data.purchase_price || null
  if (data.purchase_vendor !== undefined) updateData.purchase_vendor = data.purchase_vendor?.trim() || null
  if (data.purchase_invoice !== undefined) updateData.purchase_invoice = data.purchase_invoice?.trim() || null
  if (data.useful_life_years !== undefined) updateData.useful_life_years = data.useful_life_years || null
  if (data.salvage_value !== undefined) updateData.salvage_value = data.salvage_value || 0
  if (data.depreciation_method !== undefined) updateData.depreciation_method = data.depreciation_method
  if (data.current_location_id !== undefined) updateData.current_location_id = data.current_location_id || null
  if (data.insurance_policy_number !== undefined) updateData.insurance_policy_number = data.insurance_policy_number?.trim() || null
  if (data.insurance_provider !== undefined) updateData.insurance_provider = data.insurance_provider?.trim() || null
  if (data.insurance_expiry_date !== undefined) updateData.insurance_expiry_date = data.insurance_expiry_date || null
  if (data.insurance_value !== undefined) updateData.insurance_value = data.insurance_value || null
  if (data.registration_expiry_date !== undefined) updateData.registration_expiry_date = data.registration_expiry_date || null
  if (data.kir_expiry_date !== undefined) updateData.kir_expiry_date = data.kir_expiry_date || null
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
  
  const { error } = await supabase
    .from('assets')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating asset:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/equipment')
  revalidatePath(`/equipment/${id}`)
  return { success: true }
}

/**
 * Change asset status
 */
export async function changeAssetStatus(
  assetId: string,
  data: StatusChangeFormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Validate reason is provided
  if (!data.reason?.trim()) {
    return { success: false, error: 'Reason is required for status change' }
  }
  
  // Get current asset
  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('id, status, current_location_id')
    .eq('id', assetId)
    .single()
  
  if (fetchError || !asset) {
    return { success: false, error: 'Asset not found' }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Update asset status
  const updateData: Record<string, unknown> = {
    status: data.new_status,
    updated_at: new Date().toISOString(),
  }
  
  if (data.new_location_id) {
    updateData.current_location_id = data.new_location_id
  }
  
  const { error: updateError } = await supabase
    .from('assets')
    .update(updateData)
    .eq('id', assetId)
  
  if (updateError) {
    console.error('Error updating asset status:', updateError)
    return { success: false, error: updateError.message }
  }
  
  // Log status change in history
  const { error: historyError } = await supabase
    .from('asset_status_history')
    .insert({
      asset_id: assetId,
      previous_status: asset.status,
      new_status: data.new_status,
      previous_location_id: asset.current_location_id,
      new_location_id: data.new_location_id || asset.current_location_id,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || null,
      changed_by: user?.id || null,
    })
  
  if (historyError) {
    console.error('Error logging status history:', historyError)
  }
  
  revalidatePath('/equipment')
  revalidatePath(`/equipment/${assetId}`)
  return { success: true }
}

/**
 * Get assets with filters
 */
export async function getAssets(
  filters: AssetFilterState
): Promise<AssetWithRelations[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('assets')
    .select(`
      *,
      category:asset_categories(id, category_code, category_name),
      location:asset_locations(id, location_code, location_name),
      assigned_employee:employees(full_name, employee_code),
      assigned_job:job_orders(jo_number)
    `)
  
  // Exclude disposed/sold by default unless explicitly filtered
  if (filters.status === 'all') {
    // Show all including disposed/sold
  } else if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  } else {
    // Default: exclude disposed and sold
    query = query.not('status', 'in', '("disposed","sold")')
  }
  
  // Apply category filter
  if (filters.categoryId && filters.categoryId !== 'all') {
    query = query.eq('category_id', filters.categoryId)
  }
  
  // Apply location filter
  if (filters.locationId && filters.locationId !== 'all') {
    query = query.eq('current_location_id', filters.locationId)
  }
  
  // Apply search filter
  if (filters.search?.trim()) {
    const search = filters.search.trim()
    query = query.or(`asset_code.ilike.%${search}%,asset_name.ilike.%${search}%,registration_number.ilike.%${search}%`)
  }
  
  query = query.order('created_at', { ascending: false })
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching assets:', error)
    return []
  }
  
  return (data || []) as AssetWithRelations[]
}

/**
 * Get single asset by ID
 */
export async function getAssetById(id: string): Promise<AssetWithRelations | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      category:asset_categories(id, category_code, category_name, default_useful_life_years, default_depreciation_method),
      location:asset_locations(id, location_code, location_name, address, city),
      assigned_employee:employees(full_name, employee_code),
      assigned_job:job_orders(jo_number)
    `)
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching asset:', error)
    return null
  }
  
  return data as AssetWithRelations
}

// ============================================
// Document Actions
// ============================================

/**
 * Get documents for an asset
 */
export async function getAssetDocuments(assetId: string): Promise<AssetDocument[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_documents')
    .select('*')
    .eq('asset_id', assetId)
    .order('uploaded_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching asset documents:', error)
    return []
  }
  
  return data || []
}

/**
 * Create asset document record
 */
export async function createAssetDocument(
  assetId: string,
  data: AssetDocumentFormData,
  documentUrl?: string
): Promise<{ success: boolean; document?: AssetDocument; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: document, error } = await supabase
    .from('asset_documents')
    .insert({
      asset_id: assetId,
      document_type: data.document_type,
      document_name: data.document_name,
      document_url: documentUrl || null,
      issue_date: data.issue_date || null,
      expiry_date: data.expiry_date || null,
      reminder_days: data.reminder_days || 30,
      notes: data.notes || null,
      uploaded_by: user?.id || null,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating asset document:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/equipment/${assetId}`)
  return { success: true, document }
}

/**
 * Delete asset document
 */
export async function deleteAssetDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('asset_documents')
    .delete()
    .eq('id', documentId)
  
  if (error) {
    console.error('Error deleting asset document:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/equipment')
  return { success: true }
}

// ============================================
// Summary and History Actions
// ============================================

/**
 * Get expiring documents
 */
export async function getExpiringDocuments(daysAhead: number = 30): Promise<ExpiringDocument[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_expiring_documents')
    .select('*')
    .in('status', ['expired', 'expiring_soon'])
    .order('expiry_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching expiring documents:', error)
    return []
  }
  
  return (data || []) as ExpiringDocument[]
}

/**
 * Get asset category summary
 */
export async function getAssetCategorySummary(): Promise<AssetCategorySummary[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_summary')
    .select('*')
  
  if (error) {
    console.error('Error fetching asset summary:', error)
    return []
  }
  
  return (data || []) as AssetCategorySummary[]
}

/**
 * Get asset status history
 */
export async function getAssetStatusHistory(assetId: string): Promise<AssetStatusHistory[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_status_history')
    .select('*')
    .eq('asset_id', assetId)
    .order('changed_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching asset status history:', error)
    return []
  }
  
  return data || []
}

/**
 * Get count of expiring documents for summary stats
 */
export async function getExpiringDocumentsCount(): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('asset_expiring_documents')
    .select('*', { count: 'exact', head: true })
    .in('status', ['expired', 'expiring_soon'])
  
  if (error) {
    console.error('Error counting expiring documents:', error)
    return 0
  }
  
  return count || 0
}
