'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentTemplate,
  DocumentType,
} from '@/types/document-generation'
import {
  getTemplate,
  activateTemplate,
  deactivateTemplate,
} from '@/lib/document-template-actions'
import { processTemplate } from '@/lib/variable-processor-utils'
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
  Eye,
  Code,
  FileText,
  Settings,
  Variable,
} from 'lucide-react'

// Document type labels
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  contract: 'Contract',
  certificate: 'Certificate',
  report: 'Report',
  packing_list: 'Packing List',
  delivery_note: 'Delivery Note',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentTemplateDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadTemplate()
  }, [id])

  const loadTemplate = async () => {
    setIsLoading(true)
    const result = await getTemplate(id)
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to load template',
        variant: 'destructive',
      })
      router.push('/settings/document-templates')
    } else if (!result.data) {
      toast({
        title: 'Not Found',
        description: 'Template not found',
        variant: 'destructive',
      })
      router.push('/settings/document-templates')
    } else {
      setTemplate(result.data)
      // Initialize preview data with placeholder defaults
      const initialData: Record<string, string> = {}
      for (const variable of result.data.available_variables || []) {
        initialData[variable] = `[${variable}]`
      }
      setPreviewData(initialData)
    }
    setIsLoading(false)
  }

  const handleToggleActive = async () => {
    if (!template) return

    setIsToggling(true)
    const action = template.is_active ? deactivateTemplate : activateTemplate

    const result = await action(template.id)
    setIsToggling(false)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update template',
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

  const handlePreview = () => {
    if (!template) return

    const result = processTemplate(template.html_template, previewData)
    setPreview(result.html)
    setShowPreview(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-5xl">
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
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings/document-templates')}
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
          <Button onClick={() => router.push(`/settings/document-templates/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Document Type</Label>
                    <p className="font-medium">{DOCUMENT_TYPE_LABELS[template.document_type]}</p>
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
                    <p className="font-medium">{formatDate(template.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Include Letterhead</Label>
                    <p className="font-medium">{template.include_letterhead ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Page Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Page Size</Label>
                    <p className="font-medium">{template.page_size}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Orientation</Label>
                    <p className="font-medium capitalize">{template.orientation}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Margins (mm)</Label>
                    <p className="font-medium">
                      Top: {template.margins.top}, Right: {template.margins.right}, 
                      Bottom: {template.margins.bottom}, Left: {template.margins.left}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variables */}
            {template.available_variables && template.available_variables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Variable className="h-5 w-5" />
                    Available Variables
                  </CardTitle>
                  <CardDescription>
                    Variables that can be used in this template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {template.available_variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="font-mono">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Template Tab */}
        <TabsContent value="template">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>HTML Template</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="font-mono text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">
                  {template.html_template}
                </pre>
              </CardContent>
            </Card>

            {template.css_styles && (
              <Card>
                <CardHeader>
                  <CardTitle>CSS Styles</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="font-mono text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[200px]">
                    {template.css_styles}
                  </pre>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-6">
              {template.header_html && (
                <Card>
                  <CardHeader>
                    <CardTitle>Header HTML</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="font-mono text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[150px]">
                      {template.header_html}
                    </pre>
                  </CardContent>
                </Card>
              )}
              {template.footer_html && (
                <Card>
                  <CardHeader>
                    <CardTitle>Footer HTML</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="font-mono text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[150px]">
                      {template.footer_html}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Template Preview
              </CardTitle>
              <CardDescription>
                Test the template with sample data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Data Inputs */}
              {template.available_variables && template.available_variables.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {template.available_variables.map((variable) => (
                    <div key={variable} className="space-y-1">
                      <Label htmlFor={variable} className="text-xs font-mono">
                        {variable}
                      </Label>
                      <Input
                        id={variable}
                        value={previewData[variable] || ''}
                        onChange={(e) =>
                          setPreviewData((prev) => ({
                            ...prev,
                            [variable]: e.target.value,
                          }))
                        }
                        placeholder={`[${variable}]`}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>

              {/* Preview Results */}
              {showPreview && preview && (
                <div className="space-y-4 mt-4">
                  <Separator />
                  <div className="border rounded-lg p-4 bg-white min-h-[400px]">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
