'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  Eye,
  Code,
  AlertCircle,
} from 'lucide-react'
import {
  NotificationTemplate,
  NotificationTemplateInsert,
  NotificationTemplateUpdate,
  PlaceholderDefinition,
  EventType,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from '@/types/notification-workflows'
import {
  createTemplate,
  updateTemplate,
  replacePlaceholders,
  extractPlaceholderKeys,
  validateTemplate,
} from '@/lib/notification-template-utils'

interface NotificationTemplateEditorProps {
  template?: NotificationTemplate | null
  onSave?: (template: NotificationTemplate) => void
  onCancel?: () => void
}

interface FormState {
  template_code: string
  template_name: string
  event_type: EventType
  email_subject: string
  email_body_html: string
  email_body_text: string
  whatsapp_template_id: string
  whatsapp_body: string
  in_app_title: string
  in_app_body: string
  in_app_action_url: string
  push_title: string
  push_body: string
  placeholders: PlaceholderDefinition[]
  is_active: boolean
}

const initialFormState: FormState = {
  template_code: '',
  template_name: '',
  event_type: 'job_order.assigned',
  email_subject: '',
  email_body_html: '',
  email_body_text: '',
  whatsapp_template_id: '',
  whatsapp_body: '',
  in_app_title: '',
  in_app_body: '',
  in_app_action_url: '',
  push_title: '',
  push_body: '',
  placeholders: [],
  is_active: true,
}

export function NotificationTemplateEditor({
  template,
  onSave,
  onCancel,
}: NotificationTemplateEditorProps) {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('email')
  const [showPreview, setShowPreview] = useState(false)
  const { toast } = useToast()

  const isEditing = !!template?.id

  // Load template data when editing
  useEffect(() => {
    if (template) {
      setForm({
        template_code: template.template_code,
        template_name: template.template_name,
        event_type: template.event_type,
        email_subject: template.email_subject || '',
        email_body_html: template.email_body_html || '',
        email_body_text: template.email_body_text || '',
        whatsapp_template_id: template.whatsapp_template_id || '',
        whatsapp_body: template.whatsapp_body || '',
        in_app_title: template.in_app_title || '',
        in_app_body: template.in_app_body || '',
        in_app_action_url: template.in_app_action_url || '',
        push_title: template.push_title || '',
        push_body: template.push_body || '',
        placeholders: template.placeholders || [],
        is_active: template.is_active,
      })
      // Initialize preview data with placeholder defaults
      const data: Record<string, string> = {}
      for (const p of template.placeholders || []) {
        data[p.key] = p.default_value || `[${p.key}]`
      }
      setPreviewData(data)
    }
  }, [template])

  // Extract placeholders from all template fields
  const extractedPlaceholders = (() => {
    const allContent = [
      form.email_subject,
      form.email_body_html,
      form.email_body_text,
      form.whatsapp_body,
      form.in_app_title,
      form.in_app_body,
      form.in_app_action_url,
      form.push_title,
      form.push_body,
    ].join(' ')
    return extractPlaceholderKeys(allContent)
  })()

  // Check for undefined placeholders
  const undefinedPlaceholders = extractedPlaceholders.filter(
    (key) => !form.placeholders.some((p) => p.key === key)
  )

  const handleInputChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddPlaceholder = () => {
    setForm((prev) => ({
      ...prev,
      placeholders: [
        ...prev.placeholders,
        { key: '', description: '', default_value: '' },
      ],
    }))
  }

  const handleRemovePlaceholder = (index: number) => {
    setForm((prev) => ({
      ...prev,
      placeholders: prev.placeholders.filter((_, i) => i !== index),
    }))
  }

  const handlePlaceholderChange = (
    index: number,
    field: keyof PlaceholderDefinition,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      placeholders: prev.placeholders.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }))
  }

  const handlePreviewDataChange = (key: string, value: string) => {
    setPreviewData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    // Validate
    const templateData: NotificationTemplateInsert = {
      template_code: form.template_code,
      template_name: form.template_name,
      event_type: form.event_type,
      email_subject: form.email_subject || null,
      email_body_html: form.email_body_html || null,
      email_body_text: form.email_body_text || null,
      whatsapp_template_id: form.whatsapp_template_id || null,
      whatsapp_body: form.whatsapp_body || null,
      in_app_title: form.in_app_title || null,
      in_app_body: form.in_app_body || null,
      in_app_action_url: form.in_app_action_url || null,
      push_title: form.push_title || null,
      push_body: form.push_body || null,
      placeholders: form.placeholders.filter((p) => p.key.trim() !== ''),
      is_active: form.is_active,
    }

    const validation = validateTemplate(templateData)
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    if (validation.warnings && validation.warnings.length > 0) {
      toast({
        title: 'Warning',
        description: validation.warnings.join(', '),
      })
    }

    setIsSaving(true)
    try {
      if (isEditing && template) {
        const updates: NotificationTemplateUpdate = {
          template_name: form.template_name,
          event_type: form.event_type,
          email_subject: form.email_subject || null,
          email_body_html: form.email_body_html || null,
          email_body_text: form.email_body_text || null,
          whatsapp_template_id: form.whatsapp_template_id || null,
          whatsapp_body: form.whatsapp_body || null,
          in_app_title: form.in_app_title || null,
          in_app_body: form.in_app_body || null,
          in_app_action_url: form.in_app_action_url || null,
          push_title: form.push_title || null,
          push_body: form.push_body || null,
          placeholders: form.placeholders.filter((p) => p.key.trim() !== ''),
          is_active: form.is_active,
        }
        const { data, error } = await updateTemplate(template.id, updates)
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' })
          return
        }
        toast({ title: 'Success', description: 'Template updated successfully' })
        onSave?.(data!)
      } else {
        const { data, error } = await createTemplate(templateData)
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' })
          return
        }
        toast({ title: 'Success', description: 'Template created successfully' })
        onSave?.(data!)
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const renderPreview = (content: string) => {
    return replacePlaceholders(content, previewData, form.placeholders)
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Template' : 'Create Template'}</CardTitle>
          <CardDescription>
            Configure notification template for automated workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template_code">Template Code</Label>
              <Input
                id="template_code"
                value={form.template_code}
                onChange={(e) => handleInputChange('template_code', e.target.value.toUpperCase())}
                placeholder="JO_ASSIGNED"
                disabled={isEditing}
              />
              <p className="text-xs text-muted-foreground">
                Uppercase alphanumeric with underscores
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name</Label>
              <Input
                id="template_name"
                value={form.template_name}
                onChange={(e) => handleInputChange('template_name', e.target.value)}
                placeholder="Job Order Assigned"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select
                value={form.event_type}
                onValueChange={(value) => handleInputChange('event_type', value as EventType)}
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
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <span className="text-sm">
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Channel Templates</CardTitle>
              <CardDescription>
                Configure content for each notification channel
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <Code className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
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
                <Label>Subject</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {renderPreview(form.email_subject) || <span className="text-muted-foreground">No subject</span>}
                  </div>
                ) : (
                  <Input
                    value={form.email_subject}
                    onChange={(e) => handleInputChange('email_subject', e.target.value)}
                    placeholder="New Job Order: {{jo_number}}"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>HTML Body</Label>
                {showPreview ? (
                  <div
                    className="p-3 bg-muted rounded-md text-sm min-h-[150px] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderPreview(form.email_body_html) || '<span class="text-muted-foreground">No content</span>' }}
                  />
                ) : (
                  <Textarea
                    value={form.email_body_html}
                    onChange={(e) => handleInputChange('email_body_html', e.target.value)}
                    placeholder="<p>Hello {{recipient_name}},</p><p>You have been assigned to job order {{jo_number}}.</p>"
                    rows={6}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Plain Text Body (fallback)</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap min-h-[100px]">
                    {renderPreview(form.email_body_text) || <span className="text-muted-foreground">No content</span>}
                  </div>
                ) : (
                  <Textarea
                    value={form.email_body_text}
                    onChange={(e) => handleInputChange('email_body_text', e.target.value)}
                    placeholder="Hello {{recipient_name}}, You have been assigned to job order {{jo_number}}."
                    rows={4}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>WhatsApp Template ID (Meta Business)</Label>
                <Input
                  value={form.whatsapp_template_id}
                  onChange={(e) => handleInputChange('whatsapp_template_id', e.target.value)}
                  placeholder="jo_assigned_template"
                  disabled={showPreview}
                />
              </div>
              <div className="space-y-2">
                <Label>Message Body</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap min-h-[100px]">
                    {renderPreview(form.whatsapp_body) || <span className="text-muted-foreground">No content</span>}
                  </div>
                ) : (
                  <Textarea
                    value={form.whatsapp_body}
                    onChange={(e) => handleInputChange('whatsapp_body', e.target.value)}
                    placeholder="*New Job Order*\n\nYou have been assigned to {{jo_number}} for {{customer_name}}."
                    rows={4}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="in_app" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {renderPreview(form.in_app_title) || <span className="text-muted-foreground">No title</span>}
                  </div>
                ) : (
                  <Input
                    value={form.in_app_title}
                    onChange={(e) => handleInputChange('in_app_title', e.target.value)}
                    placeholder="Job Order Assigned"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap min-h-[100px]">
                    {renderPreview(form.in_app_body) || <span className="text-muted-foreground">No content</span>}
                  </div>
                ) : (
                  <Textarea
                    value={form.in_app_body}
                    onChange={(e) => handleInputChange('in_app_body', e.target.value)}
                    placeholder="You have been assigned to job order {{jo_number}}."
                    rows={3}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Action URL</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {renderPreview(form.in_app_action_url) || <span className="text-muted-foreground">No URL</span>}
                  </div>
                ) : (
                  <Input
                    value={form.in_app_action_url}
                    onChange={(e) => handleInputChange('in_app_action_url', e.target.value)}
                    placeholder="/job-orders/{{jo_id}}"
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="push" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {renderPreview(form.push_title) || <span className="text-muted-foreground">No title</span>}
                  </div>
                ) : (
                  <Input
                    value={form.push_title}
                    onChange={(e) => handleInputChange('push_title', e.target.value)}
                    placeholder="New Assignment"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Body (max 200 chars)</Label>
                {showPreview ? (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {renderPreview(form.push_body) || <span className="text-muted-foreground">No content</span>}
                  </div>
                ) : (
                  <Textarea
                    value={form.push_body}
                    onChange={(e) => handleInputChange('push_body', e.target.value)}
                    placeholder="Job order {{jo_number}} assigned to you"
                    rows={2}
                    maxLength={200}
                  />
                )}
                <p className="text-xs text-muted-foreground text-right">
                  {form.push_body.length}/200
                </p>
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
                Define variables that will be replaced with actual data
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddPlaceholder}>
              <Plus className="mr-2 h-4 w-4" />
              Add Placeholder
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {undefinedPlaceholders.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Undefined placeholders detected:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {undefinedPlaceholders.map((key) => (
                    <Badge key={key} variant="outline" className="text-yellow-700">
                      {`{{${key}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {form.placeholders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No placeholders defined. Add placeholders to use dynamic content.
            </p>
          ) : (
            <div className="space-y-3">
              {form.placeholders.map((placeholder, index) => (
                <div key={index} className="grid grid-cols-[1fr,2fr,1fr,auto] gap-2 items-start">
                  <div className="space-y-1">
                    <Label className="text-xs">Key</Label>
                    <Input
                      value={placeholder.key}
                      onChange={(e) =>
                        handlePlaceholderChange(index, 'key', e.target.value.toLowerCase())
                      }
                      placeholder="jo_number"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={placeholder.description}
                      onChange={(e) =>
                        handlePlaceholderChange(index, 'description', e.target.value)
                      }
                      placeholder="The job order number"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default Value</Label>
                    <Input
                      value={placeholder.default_value || ''}
                      onChange={(e) =>
                        handlePlaceholderChange(index, 'default_value', e.target.value)
                      }
                      placeholder="N/A"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    onClick={() => handleRemovePlaceholder(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Preview Data Input */}
          {showPreview && form.placeholders.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-medium">Preview Data</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Enter sample values to see how the template will render
              </p>
              <div className="grid grid-cols-2 gap-2">
                {form.placeholders.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <Label className="text-xs w-24 truncate">{p.key}:</Label>
                    <Input
                      value={previewData[p.key] || ''}
                      onChange={(e) => handlePreviewDataChange(p.key, e.target.value)}
                      placeholder={p.default_value || `[${p.key}]`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isEditing ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  )
}
