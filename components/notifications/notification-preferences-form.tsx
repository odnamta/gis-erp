'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Bell, Mail, MessageSquare, Smartphone, Clock, RefreshCw } from 'lucide-react'
import {
  NotificationWorkflowPreference,
  EventType,
  DigestFrequency,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  DIGEST_FREQUENCIES,
  DIGEST_FREQUENCY_LABELS,
  CHANNEL_LABELS,
} from '@/types/notification-workflows'
import {
  getUserPreferences,
  upsertPreference,
  createDefaultPreference,
  isValidTimeFormat,
} from '@/lib/notification-preference-utils'

interface NotificationPreferencesFormProps {
  userId: string
  onSave?: () => void
}

interface PreferenceState {
  [key: string]: NotificationWorkflowPreference
}

export function NotificationPreferencesForm({ userId, onSave: _onSave }: NotificationPreferencesFormProps) {
  const [preferences, setPreferences] = useState<PreferenceState>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [globalQuietHoursStart, setGlobalQuietHoursStart] = useState<string>('')
  const [globalQuietHoursEnd, setGlobalQuietHoursEnd] = useState<string>('')
  const { toast } = useToast()

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPreferences = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getUserPreferences(userId)
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        })
        return
      }

      // Build preference map with defaults for missing event types
      const prefMap: PreferenceState = {}
      for (const eventType of EVENT_TYPES) {
        const existing = data.find((p) => p.event_type === eventType)
        prefMap[eventType] = existing || createDefaultPreference(userId, eventType)
      }
      setPreferences(prefMap)

      // Set global quiet hours from first preference that has them
      const withQuietHours = data.find((p) => p.quiet_hours_start && p.quiet_hours_end)
      if (withQuietHours) {
        setGlobalQuietHoursStart(withQuietHours.quiet_hours_start || '')
        setGlobalQuietHoursEnd(withQuietHours.quiet_hours_end || '')
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }


  const handleChannelToggle = async (
    eventType: EventType,
    channel: 'email' | 'whatsapp' | 'in_app' | 'push',
    enabled: boolean
  ) => {
    const pref = preferences[eventType]
    if (!pref) return

    // Update local state immediately
    const updatedPref = {
      ...pref,
      [`${channel}_enabled`]: enabled,
    }
    setPreferences((prev) => ({
      ...prev,
      [eventType]: updatedPref,
    }))

    // Save to server
    setIsSaving(eventType)
    try {
      const { error } = await upsertPreference({
        user_id: userId,
        event_type: eventType,
        [`${channel}_enabled`]: enabled,
      })

      if (error) {
        // Revert on failure
        setPreferences((prev) => ({
          ...prev,
          [eventType]: pref,
        }))
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        })
      }
    } catch {
      setPreferences((prev) => ({
        ...prev,
        [eventType]: pref,
      }))
      toast({
        title: 'Error',
        description: 'Failed to save preference',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(null)
    }
  }

  const handleDigestChange = async (eventType: EventType, frequency: DigestFrequency) => {
    const pref = preferences[eventType]
    if (!pref) return

    const updatedPref = {
      ...pref,
      digest_frequency: frequency,
    }
    setPreferences((prev) => ({
      ...prev,
      [eventType]: updatedPref,
    }))

    setIsSaving(eventType)
    try {
      const { error } = await upsertPreference({
        user_id: userId,
        event_type: eventType,
        digest_frequency: frequency,
      })

      if (error) {
        setPreferences((prev) => ({
          ...prev,
          [eventType]: pref,
        }))
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        })
      }
    } catch {
      setPreferences((prev) => ({
        ...prev,
        [eventType]: pref,
      }))
      toast({
        title: 'Error',
        description: 'Failed to save preference',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(null)
    }
  }

  const handleQuietHoursChange = async (start: string, end: string) => {
    // Validate format
    if (start && !isValidTimeFormat(start)) {
      toast({
        title: 'Invalid time format',
        description: 'Please use HH:MM format (e.g., 22:00)',
        variant: 'destructive',
      })
      return
    }
    if (end && !isValidTimeFormat(end)) {
      toast({
        title: 'Invalid time format',
        description: 'Please use HH:MM format (e.g., 07:00)',
        variant: 'destructive',
      })
      return
    }

    // Both must be set or both must be empty
    if ((start && !end) || (!start && end)) {
      toast({
        title: 'Incomplete quiet hours',
        description: 'Please set both start and end times',
        variant: 'destructive',
      })
      return
    }

    setGlobalQuietHoursStart(start)
    setGlobalQuietHoursEnd(end)

    // Apply to all event types
    setIsSaving('quiet_hours')
    try {
      const errors: string[] = []
      for (const eventType of EVENT_TYPES) {
        const { error } = await upsertPreference({
          user_id: userId,
          event_type: eventType,
          quiet_hours_start: start || null,
          quiet_hours_end: end || null,
        })
        if (error) {
          errors.push(`${eventType}: ${error}`)
        }
      }

      if (errors.length > 0) {
        toast({
          title: 'Partial save',
          description: `Some preferences failed to save: ${errors.join(', ')}`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Quiet hours saved',
          description: start && end
            ? `Notifications will be suppressed from ${start} to ${end}`
            : 'Quiet hours disabled',
        })
      }

      // Reload preferences
      await loadPreferences()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save quiet hours',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(null)
    }
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quiet Hours Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when notifications should be suppressed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <Input
                id="quiet-start"
                type="time"
                value={globalQuietHoursStart}
                onChange={(e) => setGlobalQuietHoursStart(e.target.value)}
                placeholder="22:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <Input
                id="quiet-end"
                type="time"
                value={globalQuietHoursEnd}
                onChange={(e) => setGlobalQuietHoursEnd(e.target.value)}
                placeholder="07:00"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleQuietHoursChange(globalQuietHoursStart, globalQuietHoursEnd)}
              disabled={isSaving === 'quiet_hours'}
              size="sm"
            >
              {isSaving === 'quiet_hours' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Quiet Hours
            </Button>
            {(globalQuietHoursStart || globalQuietHoursEnd) && (
              <Button
                variant="outline"
                onClick={() => handleQuietHoursChange('', '')}
                disabled={isSaving === 'quiet_hours'}
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-Event Type Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Event Notifications
          </CardTitle>
          <CardDescription>
            Configure notification channels and delivery frequency for each event type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            {/* Header */}
            <div className="grid grid-cols-[1fr,60px,60px,60px,60px,120px] gap-2 p-3 border-b bg-muted/50 text-xs font-medium">
              <div>Event Type</div>
              <div className="text-center" title={CHANNEL_LABELS.email}>
                <Mail className="h-4 w-4 mx-auto" />
              </div>
              <div className="text-center" title={CHANNEL_LABELS.whatsapp}>
                <MessageSquare className="h-4 w-4 mx-auto" />
              </div>
              <div className="text-center" title={CHANNEL_LABELS.in_app}>
                <Bell className="h-4 w-4 mx-auto" />
              </div>
              <div className="text-center" title={CHANNEL_LABELS.push}>
                <Smartphone className="h-4 w-4 mx-auto" />
              </div>
              <div className="text-center">Frequency</div>
            </div>

            {/* Rows */}
            {EVENT_TYPES.map((eventType) => {
              const pref = preferences[eventType]
              if (!pref) return null

              return (
                <div
                  key={eventType}
                  className="grid grid-cols-[1fr,60px,60px,60px,60px,120px] gap-2 p-3 border-b last:border-b-0 items-center"
                >
                  <div className="text-sm font-medium">
                    {EVENT_TYPE_LABELS[eventType]}
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.email_enabled}
                      onCheckedChange={(checked) =>
                        handleChannelToggle(eventType, 'email', checked)
                      }
                      disabled={isSaving === eventType}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.whatsapp_enabled}
                      onCheckedChange={(checked) =>
                        handleChannelToggle(eventType, 'whatsapp', checked)
                      }
                      disabled={isSaving === eventType}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.in_app_enabled}
                      onCheckedChange={(checked) =>
                        handleChannelToggle(eventType, 'in_app', checked)
                      }
                      disabled={isSaving === eventType}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={pref.push_enabled}
                      onCheckedChange={(checked) =>
                        handleChannelToggle(eventType, 'push', checked)
                      }
                      disabled={isSaving === eventType}
                    />
                  </div>
                  <div>
                    <Select
                      value={pref.digest_frequency}
                      onValueChange={(value) =>
                        handleDigestChange(eventType, value as DigestFrequency)
                      }
                      disabled={isSaving === eventType}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIGEST_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {DIGEST_FREQUENCY_LABELS[freq]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
