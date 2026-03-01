'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateProfileData {
  full_name: string
  phone?: string
  address?: string
}

export async function updateProfile(data: UpdateProfileData) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
        address: data.address || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('user_id', user.id)

    if (error) {
      return { success: false, error: 'Failed to update profile' }
    }

    revalidatePath('/settings/profile')
    revalidatePath('/', 'layout')

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getProfileExtended() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // phone and address may exist in DB but not in generated types
    const { data, error } = await (supabase
      .from('user_profiles') as any)
      .select('phone, address')
      .eq('user_id', user.id)
      .single()

    if (error) {
      return null
    }

    return data as { phone: string | null; address: string | null } | null
  } catch {
    return null
  }
}
