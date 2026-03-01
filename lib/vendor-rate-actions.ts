'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { VendorRate, VendorRateFormData } from '@/types/vendor-rate'

/**
 * Get all rates for a specific vendor
 */
export async function getVendorRates(vendorId: string): Promise<{
  data: VendorRate[]
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vendor_rates' as any)
    .select('*')
    .eq('vendor_id', vendorId)
    .order('is_active', { ascending: false })
    .order('service_type')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []) as unknown as VendorRate[] }
}

/**
 * Get the current active rate for a vendor + service type
 * (effective_from <= today AND (effective_to IS NULL OR effective_to >= today))
 */
export async function getActiveRate(
  vendorId: string,
  serviceType: string
): Promise<{
  data: VendorRate | null
  error?: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('vendor_rates' as any)
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('service_type', serviceType)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as VendorRate | null }
}

/**
 * Get all active rates for a vendor (currently effective)
 */
export async function getActiveVendorRates(vendorId: string): Promise<{
  data: VendorRate[]
  error?: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('vendor_rates' as any)
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('service_type')

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []) as unknown as VendorRate[] }
}

/**
 * Create a new vendor rate
 */
export async function createVendorRate(
  vendorId: string,
  formData: VendorRateFormData
): Promise<{
  data?: VendorRate
  error?: string
}> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('vendor_rates' as any)
    .insert({
      vendor_id: vendorId,
      service_type: formData.service_type,
      description: formData.description,
      unit: formData.unit,
      base_price: formData.base_price,
      min_quantity: formData.min_quantity || null,
      max_quantity: formData.max_quantity || null,
      effective_from: formData.effective_from,
      effective_to: formData.effective_to || null,
      payment_terms: formData.payment_terms || null,
      notes: formData.notes || null,
      is_active: true,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/vendors/${vendorId}`)
  return { data: data as unknown as VendorRate }
}

/**
 * Update an existing vendor rate
 */
export async function updateVendorRate(
  id: string,
  vendorId: string,
  formData: Partial<VendorRateFormData>
): Promise<{
  error?: string
}> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (formData.service_type !== undefined) updateData.service_type = formData.service_type
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.unit !== undefined) updateData.unit = formData.unit
  if (formData.base_price !== undefined) updateData.base_price = formData.base_price
  if (formData.min_quantity !== undefined) updateData.min_quantity = formData.min_quantity || null
  if (formData.max_quantity !== undefined) updateData.max_quantity = formData.max_quantity || null
  if (formData.effective_from !== undefined) updateData.effective_from = formData.effective_from
  if (formData.effective_to !== undefined) updateData.effective_to = formData.effective_to || null
  if (formData.payment_terms !== undefined) updateData.payment_terms = formData.payment_terms || null
  if (formData.notes !== undefined) updateData.notes = formData.notes || null

  const { error } = await supabase
    .from('vendor_rates' as any)
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/vendors/${vendorId}`)
  return {}
}

/**
 * Soft-deactivate a vendor rate (set is_active = false)
 */
export async function deactivateVendorRate(
  id: string,
  vendorId: string
): Promise<{
  error?: string
}> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vendor_rates' as any)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/vendors/${vendorId}`)
  return {}
}

/**
 * Get all active rates across vendors for a given service type (for comparison)
 */
export async function getRatesByServiceType(serviceType: string): Promise<{
  data: VendorRate[]
  error?: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('vendor_rates' as any)
    .select('*, vendors(vendor_name)')
    .eq('service_type', serviceType)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('base_price')

  if (error) {
    return { data: [], error: error.message }
  }

  // Map vendor name from joined data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rates = ((data || []) as any[]).map((item) => {
    const vendors = item.vendors as { vendor_name: string } | null
    return {
      ...item,
      vendor_name: vendors?.vendor_name ?? null,
      vendors: undefined,
    }
  })

  return { data: rates as unknown as VendorRate[] }
}
