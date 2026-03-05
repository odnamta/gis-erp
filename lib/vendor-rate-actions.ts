'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { canAccessFeature } from '@/lib/permissions'
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
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.edit')) {
    return { error: 'Tidak memiliki akses' };
  }

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
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.edit')) {
    return { error: 'Tidak memiliki akses' };
  }

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
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.edit')) {
    return { error: 'Tidak memiliki akses' };
  }

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

export interface VendorSuggestion {
  vendor_id: string
  vendor_name: string
  is_preferred: boolean
  rate_count: number
  lowest_rate: number | null
}

/**
 * Get suggested vendors for a cost category.
 * Returns vendors that match the category's vendor type,
 * sorted by preferred status and active rate count.
 */
export async function getVendorSuggestionsForCategory(
  category: string
): Promise<{ data: VendorSuggestion[]; error?: string }> {
  const { mapCostCategoryToVendorType } = await import('@/lib/vendor-utils')
  const vendorType = mapCostCategoryToVendorType(category)
  if (!vendorType) {
    return { data: [] }
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Get active vendors of matching type
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('id, vendor_name, is_preferred')
    .eq('vendor_type', vendorType)
    .eq('is_active', true)
    .order('is_preferred', { ascending: false })
    .order('vendor_name')
    .limit(8)

  if (vendorError || !vendors?.length) {
    return { data: [], error: vendorError?.message }
  }

  // Get active rate counts per vendor
  const vendorIds = vendors.map(v => v.id)
  const { data: rates } = await supabase
    .from('vendor_rates' as any)
    .select('vendor_id, base_price')
    .in('vendor_id', vendorIds)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)

  // Build rate stats per vendor
  const rateStats = new Map<string, { count: number; lowest: number | null }>()
  for (const rate of (rates || []) as unknown as { vendor_id: string; base_price: number }[]) {
    const existing = rateStats.get(rate.vendor_id) || { count: 0, lowest: null }
    existing.count++
    if (existing.lowest === null || rate.base_price < existing.lowest) {
      existing.lowest = rate.base_price
    }
    rateStats.set(rate.vendor_id, existing)
  }

  const suggestions = vendors.map(v => {
    const stats = rateStats.get(v.id) || { count: 0, lowest: null }
    return {
      vendor_id: v.id,
      vendor_name: v.vendor_name,
      is_preferred: v.is_preferred ?? false,
      rate_count: stats.count,
      lowest_rate: stats.lowest,
    }
  })

  // Sort: preferred first, then by rate count (vendors with rates first)
  suggestions.sort((a, b) => {
    if (a.is_preferred !== b.is_preferred) return a.is_preferred ? -1 : 1
    return b.rate_count - a.rate_count
  })

  return { data: suggestions.slice(0, 5) }
}
