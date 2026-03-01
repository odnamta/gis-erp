'use server'

import { createClient } from '@/lib/supabase/server'

export interface SystemOption {
  id: string
  category: string
  value: string
  label: string
  display_order: number
  is_active: boolean
}

/**
 * Get all active options for a dropdown category
 */
export async function getSystemOptions(category: string): Promise<{ data?: SystemOption[]; error?: string }> {
  const supabase = await createClient()

  const result = await supabase.from('system_options' as any)
    .select('id, category, value, label, display_order, is_active')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order')
    .order('label')

  if (result.error) return { error: result.error.message }
  return { data: (result.data as unknown as SystemOption[]) || [] }
}

/**
 * Add a new option to a dropdown category
 * Only managers+ can do this (enforced by RLS)
 */
export async function addSystemOption(input: {
  category: string
  value: string
  label: string
}): Promise<{ success: boolean; data?: SystemOption; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Get max display_order for the category
  const maxResult = await supabase.from('system_options' as any)
    .select('display_order')
    .eq('category', input.category)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = ((maxResult.data as any)?.display_order ?? -1) + 1

  const insertResult = await supabase.from('system_options' as any)
    .insert({
      category: input.category,
      value: input.value,
      label: input.label,
      display_order: nextOrder,
      created_by: user.id,
    })
    .select()
    .single()

  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      return { success: false, error: 'Opsi ini sudah ada' }
    }
    return { success: false, error: insertResult.error.message }
  }

  return { success: true, data: insertResult.data as unknown as SystemOption }
}

/**
 * Deactivate an option (soft delete)
 * Only owner/sysadmin/director can do this (enforced by RLS)
 */
export async function deactivateSystemOption(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const result = await supabase.from('system_options' as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (result.error) return { success: false, error: result.error.message }
  return { success: true }
}
