'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Json } from '@/types/database'
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  NotificationType,
  NotificationTypeWithPreference,
  UserNotificationTypePreference,
} from '@/types/user-preferences'
import {
  mergePreferencesWithDefaults,
  mergeNotificationTypesWithPreferences,
  filterNotificationTypesByRole,
} from '@/lib/user-preferences-utils'

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get user preferences from database
 */
export async function getUserPreferences(): Promise<ActionResult<UserPreferences>> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Failed to fetch preferences:', error)
      return { success: false, error: 'Failed to load preferences' }
    }

    const preferences = mergePreferencesWithDefaults(profile?.preferences as Partial<UserPreferences>)
    return { success: true, data: preferences }
  } catch (error) {
    console.error('Error getting preferences:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Save user preferences to database
 */
export async function saveUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get current preferences and merge with updates
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    const currentPrefs = mergePreferencesWithDefaults(profile?.preferences as Partial<UserPreferences>)
    const updatedPrefs: UserPreferences = {
      display: { ...currentPrefs.display, ...preferences.display },
      notifications: { ...currentPrefs.notifications, ...preferences.notifications },
      dashboard: { ...currentPrefs.dashboard, ...preferences.dashboard },
      workflow: { ...currentPrefs.workflow, ...preferences.workflow },
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences: updatedPrefs as unknown as Json })
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to save preferences:', error)
      return { success: false, error: 'Failed to save preferences' }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Error saving preferences:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Reset preferences to defaults
 */
export async function resetPreferencesToDefaults(): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences: DEFAULT_PREFERENCES as unknown as Json })
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to reset preferences:', error)
      return { success: false, error: 'Failed to reset preferences' }
    }

    // Also delete all notification type preferences
    await supabase
      .from('user_notification_type_preferences')
      .delete()
      .eq('user_id', user.id)

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Error resetting preferences:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get notification types filtered by user role with user preferences
 */
export async function getNotificationTypesWithPreferences(): Promise<
  ActionResult<NotificationTypeWithPreference[]>
> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get user role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const userRole = profile?.role || 'user'

    // Get all notification types
    const { data: types, error: typesError } = await supabase
      .from('notification_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (typesError) {
      console.error('Failed to fetch notification types:', typesError)
      return { success: false, error: 'Failed to load notification types' }
    }

    // Get user's notification preferences
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_notification_type_preferences')
      .select('*')
      .eq('user_id', user.id)

    if (prefsError) {
      console.error('Failed to fetch notification preferences:', prefsError)
      // Continue with defaults if preferences fail to load
    }

    // Filter by role and merge with preferences
    const filteredTypes = filterNotificationTypesByRole(types as NotificationType[], userRole)
    const typesWithPrefs = mergeNotificationTypesWithPreferences(
      filteredTypes,
      (userPrefs || []) as UserNotificationTypePreference[]
    )

    return { success: true, data: typesWithPrefs }
  } catch (error) {
    console.error('Error getting notification types:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Save a single notification type preference
 */
export async function saveNotificationTypePreference(
  typeCode: string,
  channel: 'email' | 'push' | 'in_app',
  enabled: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if preference exists
    const { data: existing } = await supabase
      .from('user_notification_type_preferences')
      .select('id, email_enabled, push_enabled, in_app_enabled')
      .eq('user_id', user.id)
      .eq('notification_type', typeCode)
      .single()

    const channelField = `${channel}_enabled`
    
    if (existing) {
      // Update existing preference
      const { error } = await supabase
        .from('user_notification_type_preferences')
        .update({
          [channelField]: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Failed to update notification preference:', error)
        return { success: false, error: 'Failed to save preference' }
      }
    } else {
      // Get defaults from notification type
      const { data: typeData } = await supabase
        .from('notification_types')
        .select('default_email, default_push, default_in_app')
        .eq('type_code', typeCode)
        .single()

      // Insert new preference with defaults for other channels
      const { error } = await supabase
        .from('user_notification_type_preferences')
        .insert({
          user_id: user.id,
          notification_type: typeCode,
          email_enabled: channel === 'email' ? enabled : (typeData?.default_email ?? true),
          push_enabled: channel === 'push' ? enabled : (typeData?.default_push ?? true),
          in_app_enabled: channel === 'in_app' ? enabled : (typeData?.default_in_app ?? true),
        })

      if (error) {
        console.error('Failed to insert notification preference:', error)
        return { success: false, error: 'Failed to save preference' }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving notification preference:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get user's notification channel preferences (from main preferences JSONB)
 */
export async function getNotificationChannelPreferences(): Promise<
  ActionResult<UserPreferences['notifications']>
> {
  const result = await getUserPreferences()
  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }
  return { success: true, data: result.data.notifications }
}
