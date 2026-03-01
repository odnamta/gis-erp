import { createClient } from '@/lib/supabase/server'
import { NotificationPreferences, NotificationType } from '@/types/notifications'

/**
 * Get notification preferences for a user
 * Creates default preferences if none exist
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return null
  }

  // If no preferences exist, create default ones
  if (!data) {
    const { data: newPrefs, error: insertError } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        approval_enabled: true,
        budget_alert_enabled: true,
        status_change_enabled: true,
        overdue_enabled: true,
        system_enabled: true,
      })
      .select()
      .single()

    if (insertError) {
      return null
    }

    return newPrefs
  }

  return data
}

/**
 * Update notification preferences for a user
 */
export async function updatePreferences(
  userId: string,
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Check if a user wants to receive a specific notification type
 */
export async function shouldNotify(userId: string, type: NotificationType): Promise<boolean> {
  const preferences = await getPreferences(userId)

  if (!preferences) {
    // Default to true if we can't get preferences
    return true
  }

  switch (type) {
    case 'approval':
      return preferences.approval_enabled ?? true
    case 'budget_alert':
      return preferences.budget_alert_enabled ?? true
    case 'status_change':
      return preferences.status_change_enabled ?? true
    case 'overdue':
      return preferences.overdue_enabled ?? true
    case 'deadline':
      // Deadline shares preference with overdue (both are time-based alerts)
      return preferences.overdue_enabled ?? true
    case 'system':
      return preferences.system_enabled ?? true
    case 'info':
      return true // Info notifications are always enabled
    default:
      return true
  }
}

/**
 * Get preference field name for a notification type
 */
export function getPreferenceFieldForType(
  type: NotificationType
): keyof NotificationPreferences | null {
  switch (type) {
    case 'approval':
      return 'approval_enabled'
    case 'budget_alert':
      return 'budget_alert_enabled'
    case 'status_change':
      return 'status_change_enabled'
    case 'overdue':
      return 'overdue_enabled'
    case 'deadline':
      // Deadline shares preference with overdue (both are time-based alerts)
      return 'overdue_enabled'
    case 'system':
      return 'system_enabled'
    case 'info':
      return null // Info is always enabled
    default:
      return null
  }
}
