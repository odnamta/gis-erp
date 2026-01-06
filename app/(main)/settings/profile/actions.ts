'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateProfileData {
  full_name: string
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
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: 'Failed to update profile' }
    }

    revalidatePath('/settings/profile')
    revalidatePath('/', 'layout')
    
    return { success: true }
  } catch (error) {
    console.error('Error in updateProfile:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
