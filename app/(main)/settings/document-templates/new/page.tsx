'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentType,
  PageSize,
  PageOrientation,
  MarginSettings,
  CreateTemplateInput,
  VALID_DOCUMENT_TYPES,
  VALID_PAGE_SIZES,
  VALID_ORIENTATIONS,
  DEFAULT_MARGINS,
} from '@/types/document-generation'
import { createTemplate } from '@/lib/document-template-actions'
import { extractAvailableVariables } from '@/lib/document-template-utils'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  ArrowLeft,
  Save,
  Code,
  Eye,
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

export default function NewDocumentTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateTemplateInput>({
    template_code: '',
    template_name: '',
    document_type: 'invoice',
    html_template: '',
    css_styles: '',
    page_size: 'A4',
    orientation: 'portrait',
    margins: { ...DEFAULT_MARGINS },
    header_html: '',
    footer_html: '',
    include_letterhead: true,
    is_active: true,
  })

  // Extract variables from template
  const extractedVariables = extractAvailableVariables(formData.html_template)

  const handleSave = async () => {
    // Validation
    if (!formData.template_code.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template code is required',
        variant: 'destructive',
      })
      return
    }
    if (!formData.template_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name is required',
        variant: 'destructive',
      })
      return
    }
    if (!formData.html_template.trim()) {
      toast({
        title: 'Validation Error',
        description: 'HTML template is required',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    const result = await createTemplate({
      ...formData,
      available_variables: extractedVariables,
    })
    setIsSaving(false)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to create template',
        variant: 'destructive',
      })
    } else if (result.data) {
      toast({
        title: 'Success',
        description: 'Template created successfully',
      })
      router.push(`/settings/document-templates/${result.data.id}`)
    }
  }

  const handleMarginChange = (key: keyof MarginSettings, value: string) => {
    const numValue = parseInt(value) || 0
    setFormData({
      ...formData,
      margins: {
        ...formData.margins!,
        [key]: numValue,
      },
    })
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('html_template') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = formData.html_template
      const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end)
      setFormData({ ...formData, html_template: newText })
    }
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
            <h1 className="text-2xl font-bold">New Document Template</h1>
            <p className="text-muted-foreground">
              Create a new PDF document template
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Page Settings
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the template identification and type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template_code">Template Code</Label>
                  <Input
                    id="template_code"
                    value={formData.template_code}
                    onChange={(e) =>
                      setFormData({ ...formData, template_code: e.target.value.toUpperCase() })
                    }
                    placeholder="INV_STANDARD"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier (uppercase, underscores allowed)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template_name">Template Name</Label>
                  <Input
                    id="template_name"
                    value={formData.template_name}
                    onChange={(e) =>
                      setFormData({ ...formData, template_name: e.target.value })
                    }
                    placeholder="Standard Invoice"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document_type">Document Type</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, document_type: value as DocumentType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="include_letterhead"
                  checked={formData.include_letterhead}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, include_letterhead: checked })
                  }
                />
                <Label htmlFor="include_letterhead">Include Company Letterhead</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Tab */}
        <TabsContent value="template">
          <div className="space-y-6">
            {/* HTML Template */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>HTML Template</CardTitle>
                    <CardDescription>
                      Write HTML with {`{{variable}}`} placeholders for dynamic content
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? (
                      <Code className="mr-2 h-4 w-4" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    {showPreview ? 'Edit' : 'Preview'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showPreview ? (
                  <div
                    className="p-4 border rounded-md min-h-[300px] prose prose-sm max-w-none bg-white"
                    dangerouslySetInnerHTML={{
                      __html: formData.html_template || '<p class="text-muted-foreground">No content</p>',
                    }}
                  />
                ) : (
                  <Textarea
                    id="html_template"
                    value={formData.html_template}
                    onChange={(e) =>
                      setFormData({ ...formData, html_template: e.target.value })
                    }
                    placeholder={`<!DOCTYPE html>
<html>
<head><style>{{styles}}</style></head>
<body>
  {{letterhead}}
  <h1>INVOICE</h1>
  <p>Invoice #: {{invoice_number}}</p>
  <!-- Add your template content here -->
</body>
</html>`}
                    rows={15}
                    className="font-mono text-sm"
                  />
                )}
              </CardContent>
            </Card>

            {/* CSS Styles */}
            <Card>
              <CardHeader>
                <CardTitle>CSS Styles</CardTitle>
                <CardDescription>
                  Custom CSS styles for the document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="css_styles"
                  value={formData.css_styles || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, css_styles: e.target.value })
                  }
                  placeholder={`body { font-family: Arial, sans-serif; padding: 20px; }
.header { margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 8px; }`}
                  rows={8}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* Detected Variables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Variable className="h-5 w-5" />
                  Detected Variables
                </CardTitle>
                <CardDescription>
                  Variables found in your template (click to insert)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {extractedVariables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No variables detected. Use {`{{variable_name}}`} syntax in your template.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {extractedVariables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => insertVariable(variable)}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Header & Footer */}
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Header HTML</CardTitle>
                  <CardDescription>
                    Optional header for each page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.header_html || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, header_html: e.target.value })
                    }
                    placeholder="<div>Page Header</div>"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Footer HTML</CardTitle>
                  <CardDescription>
                    Optional footer for each page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.footer_html || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, footer_html: e.target.value })
                    }
                    placeholder="<div>Page {{pageNumber}} of {{totalPages}}</div>"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Page Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
              <CardDescription>
                Configure PDF page size, orientation, and margins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page_size">Page Size</Label>
                  <Select
                    value={formData.page_size}
                    onValueChange={(value) =>
                      setFormData({ ...formData, page_size: value as PageSize })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_PAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orientation">Orientation</Label>
                  <Select
                    value={formData.orientation}
                    onValueChange={(value) =>
                      setFormData({ ...formData, orientation: value as PageOrientation })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_ORIENTATIONS.map((orientation) => (
                        <SelectItem key={orientation} value={orientation}>
                          {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Margins (mm)</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Top</Label>
                    <Input
                      type="number"
                      value={formData.margins?.top || 20}
                      onChange={(e) => handleMarginChange('top', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Right</Label>
                    <Input
                      type="number"
                      value={formData.margins?.right || 20}
                      onChange={(e) => handleMarginChange('right', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bottom</Label>
                    <Input
                      type="number"
                      value={formData.margins?.bottom || 20}
                      onChange={(e) => handleMarginChange('bottom', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Left</Label>
                    <Input
                      type="number"
                      value={formData.margins?.left || 20}
                      onChange={(e) => handleMarginChange('left', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
