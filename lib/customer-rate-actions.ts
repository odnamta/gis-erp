'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { canAccessFeature } from '@/lib/permissions'
import type { CustomerContractRate, CustomerRateFormData } from '@/types/customer-rate'

/**
 * Get all rates for a specific customer
 */
export async function getCustomerRates(customerId: string): Promise<{
  data: CustomerContractRate[]
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_contract_rates' as any)
    .select('*')
    .eq('customer_id', customerId)
    .order('is_active', { ascending: false })
    .order('service_type')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []) as unknown as CustomerContractRate[] }
}

/**
 * Get the current active rate for a customer + service type
 * (effective_from <= today AND (effective_to IS NULL OR effective_to >= today))
 */
export async function getActiveCustomerRate(
  customerId: string,
  serviceType: string
): Promise<{
  data: CustomerContractRate | null
  error?: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('customer_contract_rates' as any)
    .select('*')
    .eq('customer_id', customerId)
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

  return { data: data as unknown as CustomerContractRate | null }
}

/**
 * Get all active rates for a customer (currently effective)
 */
export async function getActiveCustomerRates(customerId: string): Promise<{
  data: CustomerContractRate[]
  error?: string
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('customer_contract_rates' as any)
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('service_type')

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []) as unknown as CustomerContractRate[] }
}

/**
 * Create a new customer contract rate
 */
export async function createCustomerRate(
  customerId: string,
  formData: CustomerRateFormData
): Promise<{
  data?: CustomerContractRate
  error?: string
}> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'customers.edit')) {
    return { error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('customer_contract_rates' as any)
    .insert({
      customer_id: customerId,
      service_type: formData.service_type,
      description: formData.description,
      route_pattern: formData.route_pattern || null,
      unit: formData.unit,
      base_price: formData.base_price,
      min_quantity: formData.min_quantity || null,
      max_quantity: formData.max_quantity || null,
      effective_from: formData.effective_from,
      effective_to: formData.effective_to || null,
      notes: formData.notes || null,
      is_active: true,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/customers/${customerId}`)
  return { data: data as unknown as CustomerContractRate }
}

/**
 * Update an existing customer contract rate
 */
export async function updateCustomerRate(
  id: string,
  customerId: string,
  formData: Partial<CustomerRateFormData>
): Promise<{
  error?: string
}> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'customers.edit')) {
    return { error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (formData.service_type !== undefined) updateData.service_type = formData.service_type
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.route_pattern !== undefined) updateData.route_pattern = formData.route_pattern || null
  if (formData.unit !== undefined) updateData.unit = formData.unit
  if (formData.base_price !== undefined) updateData.base_price = formData.base_price
  if (formData.min_quantity !== undefined) updateData.min_quantity = formData.min_quantity || null
  if (formData.max_quantity !== undefined) updateData.max_quantity = formData.max_quantity || null
  if (formData.effective_from !== undefined) updateData.effective_from = formData.effective_from
  if (formData.effective_to !== undefined) updateData.effective_to = formData.effective_to || null
  if (formData.notes !== undefined) updateData.notes = formData.notes || null

  const { error } = await supabase
    .from('customer_contract_rates' as any)
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/customers/${customerId}`)
  return {}
}

/**
 * Soft-deactivate a customer contract rate (set is_active = false)
 */
export async function deactivateCustomerRate(
  id: string,
  customerId: string
): Promise<{
  error?: string
}> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'customers.edit')) {
    return { error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('customer_contract_rates' as any)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/customers/${customerId}`)
  return {}
}
