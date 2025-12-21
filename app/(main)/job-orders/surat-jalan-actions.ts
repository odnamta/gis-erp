'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { SuratJalanFormData, SuratJalanWithRelations, SJStatus } from '@/types'
import { formatSJNumber, canTransitionSJStatus, validateSJForm } from '@/lib/sj-utils'
import { trackSuratJalanCreation } from '@/lib/onboarding-tracker'

/**
 * Generate a unique SJ number for the current year
 * Format: SJ-YYYY-NNNN
 * 
 * **Feature: v0.17-surat-jalan-berita-acara, Property 1: SJ Number Generation Format**
 * **Validates: Requirements 1.2, 8.1**
 */
export async function generateSJNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  
  const { count, error } = await supabase
    .from('surat_jalan')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
  
  if (error) {
    console.error('Error counting SJ records:', error)
    throw new Error('Failed to generate SJ number')
  }
  
  return formatSJNumber(year, count || 0)
}

/**
 * Get list of Surat Jalan documents for a Job Order
 */
export async function getSuratJalanList(joId: string): Promise<SuratJalanWithRelations[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('surat_jalan')
    .select(`
      *,
      user_profiles:created_by (
        id,
        full_name
      )
    `)
    .eq('jo_id', joId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching Surat Jalan list:', error)
    return []
  }
  
  return data as SuratJalanWithRelations[]
}


/**
 * Get a single Surat Jalan by ID
 */
export async function getSuratJalan(id: string): Promise<SuratJalanWithRelations | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('surat_jalan')
    .select(`
      *,
      job_orders (
        id,
        jo_number,
        description
      ),
      user_profiles:created_by (
        id,
        full_name
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching Surat Jalan:', error)
    return null
  }
  
  return data as SuratJalanWithRelations
}

/**
 * Create a new Surat Jalan
 * 
 * **Feature: v0.17-surat-jalan-berita-acara, Property 11: SJ Initial Status**
 * **Validates: Requirements 1.5**
 */
export async function createSuratJalan(
  joId: string,
  formData: SuratJalanFormData
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  
  // Validate form data
  const validation = validateSJForm(formData)
  if (!validation.isValid) {
    return { error: validation.errors.join(', ') }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Generate SJ number
  let sjNumber: string
  try {
    sjNumber = await generateSJNumber()
  } catch {
    return { error: 'Failed to generate SJ number' }
  }
  
  // Create Surat Jalan with initial status 'issued'
  const { data, error } = await supabase
    .from('surat_jalan')
    .insert({
      sj_number: sjNumber,
      jo_id: joId,
      delivery_date: formData.delivery_date,
      vehicle_plate: formData.vehicle_plate,
      driver_name: formData.driver_name,
      driver_phone: formData.driver_phone || null,
      origin: formData.origin,
      destination: formData.destination,
      cargo_description: formData.cargo_description,
      quantity: formData.quantity || null,
      quantity_unit: formData.quantity_unit || null,
      weight_kg: formData.weight_kg || null,
      sender_name: formData.sender_name || null,
      notes: formData.notes || null,
      status: 'issued',
      issued_at: new Date().toISOString(),
      created_by: user?.id || null,
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Error creating Surat Jalan:', error)
    return { error: error.message }
  }
  
  // Track for onboarding
  await trackSuratJalanCreation()
  
  revalidatePath(`/job-orders/${joId}`)
  return { id: data.id }
}


/**
 * Update Surat Jalan status
 * 
 * **Feature: v0.17-surat-jalan-berita-acara, Property 8: SJ Delivery Triggers JO Update**
 * **Validates: Requirements 2.1, 2.2, 2.4**
 */
export async function updateSuratJalanStatus(
  id: string,
  newStatus: SJStatus,
  receiverName?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  
  // Fetch current SJ
  const { data: sj, error: fetchError } = await supabase
    .from('surat_jalan')
    .select('status, jo_id')
    .eq('id', id)
    .single()
  
  if (fetchError || !sj) {
    return { error: 'Surat Jalan not found' }
  }
  
  // Validate status transition
  if (!canTransitionSJStatus(sj.status as SJStatus, newStatus)) {
    return { error: `Invalid status transition from ${sj.status} to ${newStatus}` }
  }
  
  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }
  
  // If delivered, set delivered_at and receiver_name
  if (newStatus === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
    if (receiverName) {
      updateData.receiver_name = receiverName
    }
  }
  
  // Update SJ status
  const { error: updateError } = await supabase
    .from('surat_jalan')
    .update(updateData)
    .eq('id', id)
  
  if (updateError) {
    return { error: updateError.message }
  }
  
  // If delivered, update JO has_surat_jalan flag
  if (newStatus === 'delivered') {
    const { error: joError } = await supabase
      .from('job_orders')
      .update({
        has_surat_jalan: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sj.jo_id)
    
    if (joError) {
      console.error('Error updating JO has_surat_jalan:', joError)
    }
  }
  
  revalidatePath(`/job-orders/${sj.jo_id}`)
  return {}
}

/**
 * Get JO data for auto-filling SJ form
 * 
 * **Feature: v0.17-surat-jalan-berita-acara, Property 10: SJ Auto-fill from JO**
 * **Validates: Requirements 1.3**
 */
export async function getJODataForSJ(joId: string): Promise<{
  origin?: string
  destination?: string
  cargo_description?: string
  quantity?: number
  quantity_unit?: string
} | null> {
  const supabase = await createClient()
  
  const { data: jo, error } = await supabase
    .from('job_orders')
    .select(`
      description,
      proforma_job_orders!job_orders_pjo_id_fkey (
        pol,
        pod,
        commodity,
        quantity,
        quantity_unit
      )
    `)
    .eq('id', joId)
    .single()
  
  if (error || !jo) {
    return null
  }
  
  const pjo = jo.proforma_job_orders as {
    pol?: string
    pod?: string
    commodity?: string
    quantity?: number
    quantity_unit?: string
  } | null
  
  return {
    origin: pjo?.pol || undefined,
    destination: pjo?.pod || undefined,
    cargo_description: pjo?.commodity || jo.description || undefined,
    quantity: pjo?.quantity || undefined,
    quantity_unit: pjo?.quantity_unit || undefined,
  }
}