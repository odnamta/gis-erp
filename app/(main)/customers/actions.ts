'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { trackCustomerCreation } from '@/lib/onboarding-tracker'

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

export async function createCustomer(data: CustomerFormData): Promise<{ error?: string }> {
  const validation = customerSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('customers').insert({
    name: data.name,
    email: data.email || '',
    phone: data.phone || null,
    address: data.address || null,
  })

  if (error) {
    return { error: error.message }
  }

  // Track for onboarding
  await trackCustomerCreation()

  revalidatePath('/customers')
  return {}
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

  const { error } = await supabase
    .from('customers')
    .update({
      name: data.name,
      email: data.email || '',
      phone: data.phone || null,
      address: data.address || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return {}
}

export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

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

  revalidatePath('/customers')
  return {}
}
