'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { trackCustomerCreation } from '@/lib/onboarding-tracker'
import { invalidateCustomerCache } from '@/lib/cached-queries'
import { getUserProfile } from '@/lib/permissions-server'
import { logActivity } from '@/lib/activity-logger'

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company_name: z.string().optional(),
  email: z.string().email('Invalid email format').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

export async function createCustomer(data: CustomerFormData): Promise<{ error?: string; id?: string }> {
  const validation = customerSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const profile = await getUserProfile()

  const { data: customer, error } = await supabase.from('customers').insert({
    name: data.name,
    company_name: data.company_name || null,
    email: data.email || '',
    phone: data.phone || null,
    address: data.address || null,
  }).select('id').single()

  if (error) {
    return { error: error.message }
  }

  // Log activity (v0.13.1)
  if (profile?.user_id && customer?.id) {
    logActivity(profile.user_id, 'create', 'customer', customer.id, { name: data.name })
  }

  // Track for onboarding
  await trackCustomerCreation()

  // Invalidate customer cache (Requirement 6.4)
  invalidateCustomerCache()

  revalidatePath('/customers')
  revalidatePath('/quotations/new')
  return { id: customer?.id }
}

export async function updateCustomer(
  id: string,
  data: CustomerFormData
): Promise<{ error?: string }> {
  const validation = customerSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()
  const profile = await getUserProfile()

  const { error } = await supabase
    .from('customers')
    .update({
      name: data.name,
      company_name: data.company_name || null,
      email: data.email || '',
      phone: data.phone || null,
      address: data.address || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Log activity (v0.13.1)
  if (profile?.user_id) {
    logActivity(profile.user_id, 'update', 'customer', id, { name: data.name })
  }

  // Invalidate customer cache (Requirement 6.4)
  invalidateCustomerCache()

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return {}
}

export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const profile = await getUserProfile()

  // Check if customer has active projects
  const { data: activeProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id')
    .eq('customer_id', id)
    .eq('is_active', true)
    .limit(1)

  if (projectsError) {
    return { error: projectsError.message }
  }

  if (activeProjects && activeProjects.length > 0) {
    return { error: 'Cannot delete customer with active projects. Please deactivate or reassign projects first.' }
  }

  // Soft delete - set is_active to false
  const { error } = await supabase
    .from('customers')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Log activity (v0.13.1)
  if (profile?.user_id) {
    logActivity(profile.user_id, 'delete', 'customer', id, {})
  }

  // Invalidate customer cache (Requirement 6.4)
  invalidateCustomerCache()

  revalidatePath('/customers')
  return {}
}

export async function restoreCustomer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .update({ is_active: true })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Invalidate customer cache (Requirement 6.4)
  invalidateCustomerCache()

  revalidatePath('/customers')
  return {}
}
