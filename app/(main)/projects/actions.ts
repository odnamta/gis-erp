'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const projectSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  name: z.string().min(1, 'Project name is required').refine(
    (val) => val.trim().length > 0,
    'Project name cannot be only whitespace'
  ),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  site_address: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>

export async function createProject(data: ProjectFormData): Promise<{ error?: string }> {
  const validation = projectSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('projects').insert({
    customer_id: data.customer_id,
    name: data.name,
    status: data.status,
    description: data.site_address || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/projects')
  revalidatePath(`/customers/${data.customer_id}`)
  return {}
}

export async function updateProject(
  id: string,
  data: ProjectFormData
): Promise<{ error?: string }> {
  const validation = projectSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({
      name: data.name,
      status: data.status,
      description: data.site_address || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  revalidatePath(`/customers/${data.customer_id}`)
  return {}
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Check if project has active PJOs
  const { data: activePJOs, error: pjosError } = await supabase
    .from('proforma_job_orders')
    .select('id')
    .eq('project_id', id)
    .limit(1)

  if (pjosError) {
    return { error: pjosError.message }
  }

  if (activePJOs && activePJOs.length > 0) {
    return { error: 'Cannot delete project with existing PJOs. Please remove PJOs first.' }
  }

  // Check if project has active JOs
  const { data: activeJOs, error: josError } = await supabase
    .from('job_orders')
    .select('id')
    .eq('project_id', id)
    .limit(1)

  if (josError) {
    return { error: josError.message }
  }

  if (activeJOs && activeJOs.length > 0) {
    return { error: 'Cannot delete project with existing Job Orders. Please remove JOs first.' }
  }

  // Soft delete - set is_active to false
  const { error } = await supabase
    .from('projects')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/projects')
  return {}
}

export async function restoreProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({ is_active: true })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/projects')
  return {}
}
