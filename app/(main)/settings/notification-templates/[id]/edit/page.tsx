'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  NotificationTemplate,
  NotificationTemplateUpdate,
  EventType,
  PlaceholderDefinition,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from '@/types/notification-workflows'
import {
  getNotificationTemplate,
  updateNotificationTemplate,
} from '@/app/actions/notification-template-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  ArrowLeft,
  Save,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  Plus,
  Trash2,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditNotificationTemplatePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [template, setTemplate] = useState<NotificationTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<NotificationTemplateUpdate>({})
  const [placeholders, setPlaceholders] = useState<PlaceholderDefinition[]>([])

  useEffect(() => {
    if (document.cookie.includes('gama-explorer-mode=true')) {
      router.replace('/settings/notification-templates')
    }
  }, [router])

  useEffect(() => {
    loadTemplate()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTemplate = async () => {
    setIsLoading(true)
    const { data, error } = await getNotificationTemplate(id)
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
      router.push('/settings/notification-templates')
    } else if (!data) {
      toast({
        title: 'Not Found',
        description: 'Template not found',
        variant: 'destructive',
      })
      router.push('/settings/notification-templates')
    } else {
      setTemplate(data)
      setFormData({
        template_name: data.template_name,
        event_type: data.event_type,
        email_subject: data.email_subject,
        email_body_html: data.email_body_html,
        email_body_text: data.email_body_text,
        whatsapp_template_id: data.whatsapp_template_id,
        whatsapp_body: data.whatsapp_body,
        in_app_title: data.in_app_title,
        in_app_body: data.in_app_body,
        in_app_action_url: data.in_app_action_url,
        push_title: data.push_title,
        push_body: data.push_body,
        is_active: data.is_active,
      })
      setPlaceholders(data.placeholders || [])
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const { error } = await updateNotificationTemplate(id, {
      ...formData,
      placeholders,
    })
    setIsSaving(false)

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      })
      router.push(`/settings/notification-templates/${id}`)
    }
  }

  const addPlaceholder = () => {
    setPlaceholders([
      ...placeholders,
      { key: '', description: '', default_value: '' },
    ])
  }

  const updatePlaceholder = (
    index: number,
    field: keyof PlaceholderDefinition,
    value: string
  ) => {
    const updated = [...placeholders]
    updated[index] = { ...updated[index], [field]: value }
    setPlaceholders(updated)
  }

  const removePlaceholder = (index: number) => {
    setPlaceholders(placeholders.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!template) {
    return null
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/settings/notification-templates/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Template</h1>
            <p className="text-muted-foreground font-mono text-sm">
              {template.template_code}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Basic Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name</Label>
              <Input
                id="template_name"
                value={formData.template_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, template_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, event_type: value as EventType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Channel Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Channel Content</CardTitle>
          <CardDescription>
            Configure notification content for each channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email">
            <TabsList>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="in_app" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                In-App
              </TabsTrigger>
              <TabsTrigger value="push" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email_subject">Subject</Label>
                <Input
                  id="email_subject"
                  value={formData.email_subject || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, email_subject: e.target.value })
                  }
                  placeholder="Email subject line"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_body_html">HTML Body</Label>
                <Textarea
                  id="email_body_html"
                  value={formData.email_body_html || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, email_body_html: e.target.value })
                  }
                  placeholder="HTML email content"
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_body_text">Plain Text Body (fallback)</Label>
                <Textarea
                  id="email_body_text"
                  value={formData.email_body_text || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, email_body_text: e.target.value })
                  }
                  placeholder="Plain text fallback"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_template_id">Template ID (Meta)</Label>
                <Input
                  id="whatsapp_template_id"
                  value={formData.whatsapp_template_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp_template_id: e.target.value })
                  }
                  placeholder="Meta WhatsApp template ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_body">Message Body</Label>
                <Textarea
                  id="whatsapp_body"
                  value={formData.whatsapp_body || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp_body: e.target.value })
                  }
                  placeholder="WhatsApp message content"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="in_app" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="in_app_title">Title</Label>
                <Input
                  id="in_app_title"
                  value={formData.in_app_title || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, in_app_title: e.target.value })
                  }
                  placeholder="Notification title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="in_app_body">Body</Label>
                <Textarea
                  id="in_app_body"
                  value={formData.in_app_body || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, in_app_body: e.target.value })
                  }
                  placeholder="Notification body"
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="in_app_action_url">Action URL</Label>
                <Input
                  id="in_app_action_url"
                  value={formData.in_app_action_url || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, in_app_action_url: e.target.value })
                  }
                  placeholder="/path/to/action"
                />
              </div>
            </TabsContent>

            <TabsContent value="push" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="push_title">Title</Label>
                <Input
                  id="push_title"
                  value={formData.push_title || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, push_title: e.target.value })
                  }
                  placeholder="Push notification title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="push_body">Body</Label>
                <Textarea
                  id="push_body"
                  value={formData.push_body || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, push_body: e.target.value })
                  }
                  placeholder="Push notification body"
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Placeholders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Placeholders</CardTitle>
              <CardDescription>
                Define variables that can be replaced with dynamic data
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addPlaceholder}>
              <Plus className="h-4 w-4 mr-2" />
              Add Placeholder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {placeholders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No placeholders defined. Click &quot;Add Placeholder&quot; to create one.
            </p>
          ) : (
            <div className="space-y-4">
              {placeholders.map((placeholder, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr,2fr,1fr,auto] gap-3 items-start p-3 bg-muted rounded-lg"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Key</Label>
                    <Input
                      value={placeholder.key}
                      onChange={(e) =>
                        updatePlaceholder(index, 'key', e.target.value)
                      }
                      placeholder="variable_name"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={placeholder.description}
                      onChange={(e) =>
                        updatePlaceholder(index, 'description', e.target.value)
                      }
                      placeholder="What this placeholder represents"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default Value</Label>
                    <Input
                      value={placeholder.default_value || ''}
                      onChange={(e) =>
                        updatePlaceholder(index, 'default_value', e.target.value)
                      }
                      placeholder="Optional default"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    onClick={() => removePlaceholder(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
