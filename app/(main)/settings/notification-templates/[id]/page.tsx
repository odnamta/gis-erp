'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  NotificationTemplate,
  EVENT_TYPE_LABELS,
} from '@/types/notification-workflows'
import {
  getNotificationTemplate,
  activateNotificationTemplate,
  deactivateNotificationTemplate,
  previewNotificationTemplate,
} from '@/app/actions/notification-template-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  ArrowLeft,
  Edit,
  Power,
  PowerOff,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  Eye,
  Code,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function NotificationTemplateDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [template, setTemplate] = useState<NotificationTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<{
    email?: { subject: string; body: string }
    whatsapp?: { body: string }
    in_app?: { title: string; body: string; action_url?: string }
    push?: { title: string; body: string }
  } | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

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
      // Initialize preview data with placeholder defaults
      const initialData: Record<string, string> = {}
      for (const placeholder of data.placeholders || []) {
        initialData[placeholder.key] = placeholder.default_value || `[${placeholder.key}]`
      }
      setPreviewData(initialData)
    }
    setIsLoading(false)
  }

  const handleToggleActive = async () => {
    if (!template) return

    setIsToggling(true)
    const action = template.is_active
      ? deactivateNotificationTemplate
      : activateNotificationTemplate

    const { error } = await action(template.id)
    setIsToggling(false)

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: `Template ${template.is_active ? 'deactivated' : 'activated'}`,
      })
      loadTemplate()
    }
  }

  const handlePreview = async () => {
    if (!template) return

    setIsLoadingPreview(true)
    const { data, error } = await previewNotificationTemplate(template.id, previewData)
    setIsLoadingPreview(false)

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    } else {
      setPreview(data)
    }
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
            onClick={() => router.push('/settings/notification-templates')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{template.template_name}</h1>
            <p className="text-muted-foreground font-mono text-sm">
              {template.template_code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleActive}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : template.is_active ? (
              <PowerOff className="h-4 w-4 mr-2" />
            ) : (
              <Power className="h-4 w-4 mr-2" />
            )}
            {template.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button onClick={() => router.push(`/settings/notification-templates/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Event Type</Label>
              <p className="font-medium">{EVENT_TYPE_LABELS[template.event_type]}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p className="font-medium">
                {new Date(template.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Placeholders</Label>
              <p className="font-medium">{template.placeholders?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Channel Content</CardTitle>
          <CardDescription>Template content for each notification channel</CardDescription>
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
              {template.email_body_html || template.email_body_text ? (
                <>
                  <div>
                    <Label className="text-muted-foreground">Subject</Label>
                    <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                      {template.email_subject || '(No subject)'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">HTML Body</Label>
                    <pre className="font-mono text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-[300px]">
                      {template.email_body_html || '(No HTML body)'}
                    </pre>
                  </div>
                  {template.email_body_text && (
                    <div>
                      <Label className="text-muted-foreground">Text Body</Label>
                      <pre className="font-mono text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-[200px]">
                        {template.email_body_text}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No email content configured
                </p>
              )}
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              {template.whatsapp_body ? (
                <>
                  {template.whatsapp_template_id && (
                    <div>
                      <Label className="text-muted-foreground">Template ID</Label>
                      <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                        {template.whatsapp_template_id}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Body</Label>
                    <pre className="font-mono text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-[300px]">
                      {template.whatsapp_body}
                    </pre>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No WhatsApp content configured
                </p>
              )}
            </TabsContent>

            <TabsContent value="in_app" className="space-y-4 mt-4">
              {template.in_app_body ? (
                <>
                  <div>
                    <Label className="text-muted-foreground">Title</Label>
                    <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                      {template.in_app_title || '(No title)'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Body</Label>
                    <pre className="font-mono text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-[200px]">
                      {template.in_app_body}
                    </pre>
                  </div>
                  {template.in_app_action_url && (
                    <div>
                      <Label className="text-muted-foreground">Action URL</Label>
                      <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                        {template.in_app_action_url}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No in-app content configured
                </p>
              )}
            </TabsContent>

            <TabsContent value="push" className="space-y-4 mt-4">
              {template.push_body ? (
                <>
                  <div>
                    <Label className="text-muted-foreground">Title</Label>
                    <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                      {template.push_title || '(No title)'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Body</Label>
                    <pre className="font-mono text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-[200px]">
                      {template.push_body}
                    </pre>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No push content configured
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Placeholders */}
      {template.placeholders && template.placeholders.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Placeholders
            </CardTitle>
            <CardDescription>
              Variables that can be replaced with dynamic data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {template.placeholders.map((placeholder) => (
                <div
                  key={placeholder.key}
                  className="flex items-start justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {`{{${placeholder.key}}}`}
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">
                      {placeholder.description}
                    </p>
                  </div>
                  {placeholder.default_value && (
                    <Badge variant="outline">
                      Default: {placeholder.default_value}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview
          </CardTitle>
          <CardDescription>
            Test the template with sample data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview Data Inputs */}
          {template.placeholders && template.placeholders.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {template.placeholders.map((placeholder) => (
                <div key={placeholder.key} className="space-y-1">
                  <Label htmlFor={placeholder.key}>{placeholder.key}</Label>
                  <Input
                    id={placeholder.key}
                    value={previewData[placeholder.key] || ''}
                    onChange={(e) =>
                      setPreviewData((prev) => ({
                        ...prev,
                        [placeholder.key]: e.target.value,
                      }))
                    }
                    placeholder={placeholder.default_value || placeholder.description}
                  />
                </div>
              ))}
            </div>
          )}

          <Button onClick={handlePreview} disabled={isLoadingPreview}>
            {isLoadingPreview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Preview
          </Button>

          {/* Preview Results */}
          {preview && (
            <div className="space-y-4 mt-4">
              <Separator />
              {preview.email && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Preview
                  </Label>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-medium">Subject: {preview.email.subject}</p>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.email.body }}
                    />
                  </div>
                </div>
              )}
              {preview.whatsapp && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp Preview
                  </Label>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{preview.whatsapp.body}</p>
                  </div>
                </div>
              )}
              {preview.in_app && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    In-App Preview
                  </Label>
                  <div className="bg-muted p-4 rounded-lg space-y-1">
                    <p className="font-medium">{preview.in_app.title}</p>
                    <p className="text-sm">{preview.in_app.body}</p>
                    {preview.in_app.action_url && (
                      <p className="text-xs text-muted-foreground">
                        Action: {preview.in_app.action_url}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {preview.push && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Push Preview
                  </Label>
                  <div className="bg-muted p-4 rounded-lg space-y-1">
                    <p className="font-medium">{preview.push.title}</p>
                    <p className="text-sm">{preview.push.body}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
