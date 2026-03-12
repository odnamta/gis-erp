'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { revalidatePath } from 'next/cache'
import { sanitizeSearchInput } from '@/lib/utils/sanitize'
import { profileHasRole, isExplorerMode } from '@/lib/auth-utils'
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
import { ActionResult } from '@/types/actions'

const ASSET_WRITE_ROLES = ['owner', 'director', 'sysadmin', 'operations_manager', 'engineer', 'administration'] as const
const ASSET_READ_ROLES = ['owner', 'director', 'sysadmin', 'operations_manager', 'engineer', 'ops', 'hse', 'administration', 'finance', 'finance_manager'] as const

// ============================================
// Category and Location Actions
// ============================================

/**
 * Get all asset categories ordered by display_order
 */
export async function getAssetCategories(): Promise<AssetCategory[]> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    const explorer = await isExplorerMode()
    if (!explorer || !profile) return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  if (error) {
    return []
  }
  
  return (data || []) as unknown as AssetCategory[]
}

/**
 * Get all active asset locations
 */
export async function getAssetLocations(): Promise<AssetLocation[]> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    const explorer = await isExplorerMode()
    if (!explorer || !profile) return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_locations')
    .select('*')
    .eq('is_active', true)
    .order('location_name', { ascending: true })
  
  if (error) {
    return []
  }
  
  return (data || []) as unknown as AssetLocation[]
}

// ============================================
// Asset CRUD Actions
// ============================================

/**
 * Create a new asset
 */
export async function createAsset(
  data: AssetFormData
): Promise<ActionResult<Asset>> {
  const userProfile = await getUserProfile()
  if (!userProfile || !profileHasRole(userProfile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  
  // Validate required fields
  if (!data.asset_name?.trim()) {
    return { success: false, error: 'Asset name is required' }
  }
  if (!data.category_id) {
    return { success: false, error: 'Category is required' }
  }
  
  // Get current user and profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single()

  // Generate asset code
  const { count: assetCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
  
  const nextNumber = (assetCount || 0) + 1
  const asset_code = `AST-${String(nextNumber).padStart(4, '0')}`
  
  // Prepare asset data
  const assetData = {
    asset_code,
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
    created_by: profile?.id || null,
  }

  const { data: asset, error } = await supabase
    .from('assets')
    .insert(assetData)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Log initial status in history
  await supabase.from('asset_status_history').insert({
    asset_id: (asset as unknown as Asset).id,
    previous_status: null,
    new_status: 'active',
    reason: 'Initial asset registration',
    changed_by: profile?.id || null,
  })

  revalidatePath('/equipment')
  return { success: true, data: asset as unknown as Asset }
}

/**
 * Update an existing asset
 */
export async function updateAsset(
  id: string,
  data: Partial<AssetFormData>
): Promise<ActionResult<void>> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

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
    return { success: false, error: error.message }
  }
  
  revalidatePath('/equipment')
  revalidatePath(`/equipment/${id}`)
  return { success: true, data: undefined as void }
}

/**
 * Change asset status
 */
export async function changeAssetStatus(
  assetId: string,
  data: StatusChangeFormData
): Promise<ActionResult<void>> {
  const userProfile = await getUserProfile()
  if (!userProfile || !profileHasRole(userProfile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

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

  // Validate status transition
  const VALID_TRANSITIONS: Record<string, string[]> = {
    active: ['maintenance', 'repair', 'idle', 'disposed', 'sold'],
    maintenance: ['active', 'repair', 'idle', 'disposed'],
    repair: ['active', 'maintenance', 'idle', 'disposed'],
    idle: ['active', 'maintenance', 'disposed', 'sold'],
    disposed: [], // terminal
    sold: [], // terminal
  }

  const allowed = VALID_TRANSITIONS[asset.status as string] || []
  if (!allowed.includes(data.new_status)) {
    return {
      success: false,
      error: `Tidak dapat mengubah status dari "${asset.status}" ke "${data.new_status}". Status "${asset.status === 'disposed' || asset.status === 'sold' ? 'sudah final' : 'hanya bisa ke: ' + allowed.join(', ')}"`
    }
  }
  
  // Get current user and profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single()

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
      changed_by: profile?.id || null,
    })
  
  if (historyError) {
  }
  
  revalidatePath('/equipment')
  revalidatePath(`/equipment/${assetId}`)
  return { success: true, data: undefined as void }
}

/**
 * Get assets with filters
 */
export async function getAssets(
  filters: AssetFilterState
): Promise<AssetWithRelations[]> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    // Allow explorer mode users to read assets
    const explorer = await isExplorerMode()
    if (!explorer || !profile) return []
  }

  const supabase = await createClient()

  // Use a simpler select first; join on category and location only.
  // assigned_employee and assigned_job joins can fail if FK columns don't exist
  // on all rows or if the referenced tables have restrictive RLS policies.
  let query = supabase
    .from('assets')
    .select(`
      *,
      category:asset_categories(id, category_code, category_name),
      location:asset_locations(id, location_code, location_name)
    `)

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
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
    const search = sanitizeSearchInput(filters.search.trim())
    query = query.or(`asset_code.ilike.%${search}%,asset_name.ilike.%${search}%,registration_number.ilike.%${search}%`)
  }

  query = query.order('created_at', { ascending: false })

  const result = await query
  const data = result.data as unknown as AssetWithRelations[] | null
  const error = result.error

  if (error) {
    console.error('getAssets query failed:', error.message, error.details, error.hint)
    throw new Error(`Failed to load assets: ${error.message}`)
  }

  return data || []
}

/**
 * Get single asset by ID
 */
export async function getAssetById(id: string): Promise<AssetWithRelations | null> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    return null
  }

  const supabase = await createClient()

  const result = await supabase
    .from('assets')
    .select(`
      *,
      category:asset_categories(id, category_code, category_name, default_useful_life_years, default_depreciation_method),
      location:asset_locations(id, location_code, location_name, address, city)
    `)
    .eq('id', id)
    .single()

  const data = result.data as unknown as AssetWithRelations | null
  const error = result.error

  if (error) {
    console.error('getAssetById query failed:', error.message, error.details)
    return null
  }

  return data
}

// ============================================
// Document Actions
// ============================================

/**
 * Get documents for an asset
 */
export async function getAssetDocuments(assetId: string): Promise<AssetDocument[]> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_documents')
    .select('*')
    .eq('asset_id', assetId)
    .order('uploaded_at', { ascending: false })
  
  if (error) {
    return []
  }
  
  return (data || []) as unknown as AssetDocument[]
}

/**
 * Create asset document record
 */
export async function createAssetDocument(
  assetId: string,
  data: AssetDocumentFormData,
  documentUrl?: string
): Promise<ActionResult<AssetDocument>> {
  const userProfile = await getUserProfile()
  if (!userProfile || !profileHasRole(userProfile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single()

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
      uploaded_by: profile?.id || null,
    })
    .select()
    .single()
  
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/equipment/${assetId}`)
  return { success: true, data: document as unknown as AssetDocument }
}

/**
 * Upload a file for an asset document to Supabase Storage
 * Returns the storage path (not a signed URL)
 */
export async function uploadAssetDocumentFile(
  assetId: string,
  file: File
): Promise<ActionResult<string>> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Format file harus PDF, JPEG, atau PNG' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'Ukuran file maksimal 10MB' }
  }

  const supabase = await createClient()
  const fileExt = file.name.split('.').pop()
  const storagePath = `equipment_documents/${assetId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(storagePath, file)

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  return { success: true, data: storagePath }
}

/**
 * Get a signed URL for an asset document file
 */
export async function getAssetDocumentSignedUrl(
  storagePath: string
): Promise<ActionResult<string>> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('assets')
    .createSignedUrl(storagePath, 3600) // 1 hour expiry

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data.signedUrl }
}

/**
 * Delete asset document (and its file from storage if exists)
 */
export async function deleteAssetDocument(
  documentId: string
): Promise<ActionResult<void>> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Get document first to check for file
  const { data: doc } = await supabase
    .from('asset_documents')
    .select('document_url')
    .eq('id', documentId)
    .single()

  const { error } = await supabase
    .from('asset_documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Clean up storage file if exists
  if (doc?.document_url) {
    try {
      await supabase.storage.from('assets').remove([doc.document_url])
    } catch {
      // Storage cleanup failure is non-critical
    }
  }

  revalidatePath('/equipment')
  return { success: true, data: undefined as void }
}

// ============================================
// Summary and History Actions
// ============================================

/**
 * Get expiring documents
 */
export async function getExpiringDocuments(_daysAhead: number = 30): Promise<ExpiringDocument[]> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_expiring_documents')
    .select('*')
    .in('status', ['expired', 'expiring_soon'])
    .order('expiry_date', { ascending: true })
  
  if (error) {
    return []
  }
  
  return (data || []) as ExpiringDocument[]
}

/**
 * Get asset category summary
 */
export async function getAssetCategorySummary(): Promise<AssetCategorySummary[]> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_summary')
    .select('*')
  
  if (error) {
    return []
  }
  
  return (data || []) as AssetCategorySummary[]
}

/**
 * Get asset status history
 */
export async function getAssetStatusHistory(assetId: string): Promise<AssetStatusHistory[]> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('asset_status_history')
    .select('*')
    .eq('asset_id', assetId)
    .order('changed_at', { ascending: false })
  
  if (error) {
    return []
  }
  
  return (data || []) as unknown as AssetStatusHistory[]
}

/**
 * Get count of expiring documents for summary stats
 */
export async function getExpiringDocumentsCount(): Promise<number> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_READ_ROLES])) {
    const explorer = await isExplorerMode()
    if (!explorer || !profile) return 0
  }

  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('asset_expiring_documents')
    .select('*', { count: 'exact', head: true })
    .in('status', ['expired', 'expiring_soon'])
  
  if (error) {
    return 0
  }
  
  return count || 0
}

// ============================================
// Photo Actions
// ============================================

/**
 * Upload a photo for an asset
 * Uploads to Supabase Storage and updates the photos JSONB array on the asset
 */
export async function uploadAssetPhoto(
  assetId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

  const file = formData.get('file') as File | null
  const caption = formData.get('caption') as string | null
  const isPrimary = formData.get('is_primary') === 'true'

  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File size must be under 10MB' }
  }

  const supabase = await createClient()

  // Upload to storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${assetId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(fileName, file)

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('assets')
    .getPublicUrl(fileName)

  const photoUrl = urlData.publicUrl

  // Get current photos
  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('photos')
    .eq('id', assetId)
    .single()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const currentPhotos = (asset?.photos as unknown as Array<{ url: string; caption: string | null; is_primary: boolean }>) || []

  // If setting as primary, unset others
  const updatedPhotos = isPrimary
    ? currentPhotos.map(p => ({ ...p, is_primary: false }))
    : [...currentPhotos]

  updatedPhotos.push({
    url: photoUrl,
    caption: caption || null,
    is_primary: isPrimary || currentPhotos.length === 0,
  })

  const { error: updateError } = await supabase
    .from('assets')
    .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
    .eq('id', assetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath(`/equipment/${assetId}`)
  return { success: true, data: { url: photoUrl } }
}

/**
 * Delete a photo from an asset
 */
export async function deleteAssetPhoto(
  assetId: string,
  photoUrl: string
): Promise<ActionResult<void>> {
  const profile = await getUserProfile()
  if (!profile || !profileHasRole(profile, [...ASSET_WRITE_ROLES])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Get current photos
  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('photos')
    .eq('id', assetId)
    .single()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const currentPhotos = (asset?.photos as unknown as Array<{ url: string; caption: string | null; is_primary: boolean }>) || []

  // Remove the photo
  const updatedPhotos = currentPhotos.filter(p => p.url !== photoUrl)

  // If removed photo was primary and there are still photos, set first as primary
  const removedPhoto = currentPhotos.find(p => p.url === photoUrl)
  if (removedPhoto?.is_primary && updatedPhotos.length > 0) {
    updatedPhotos[0].is_primary = true
  }

  const { error: updateError } = await supabase
    .from('assets')
    .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
    .eq('id', assetId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Try to delete from storage (extract path from URL)
  try {
    const urlParts = photoUrl.split('/assets/')
    if (urlParts.length > 1) {
      const storagePath = urlParts[urlParts.length - 1]
      await supabase.storage.from('assets').remove([storagePath])
    }
  } catch {
    // Storage delete failure is non-critical
  }

  revalidatePath(`/equipment/${assetId}`)
  return { success: true, data: undefined as void }
}
