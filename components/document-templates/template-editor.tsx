'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DocumentTemplate,
  DocumentType,
  PageSize,
  PageOrientation,
  MarginSettings,
  CreateTemplateInput,
  UpdateTemplateInput,
  VALID_DOCUMENT_TYPES,
  VALID_PAGE_SIZES,
  VALID_ORIENTATIONS,
  DEFAULT_MARGINS,
} from '@/types/document-generation'
import { extractAvailableVariables } from '@/lib/document-template-utils'
import { processTemplate } from '@/lib/variable-processor-utils'
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
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Loader2,
  Save,
  Code,
  Eye,
  FileText,
  Settings,
  Variable,
  Plus,
  Copy,
  Check,
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

// Common variables by document type
const COMMON_VARIABLES: Record<DocumentType, string[]> = {
  invoice: [
    'invoice_number', 'invoice_date', 'due_date', 'customer_name', 'customer_address',
    'customer_email', 'items', 'subtotal', 'tax_amount', 'total_amount', 'notes',
    'letterhead', 'styles'
  ],
  quotation: [
    'quotation_number', 'quotation_date', 'valid_until', 'customer_name', 'customer_address',
    'project_name', 'scope', 'items', 'total_amount', 'terms', 'letterhead', 'styles'
  ],
  delivery_note: [
    'dn_number', 'jo_number', 'delivery_date', 'origin', 'destination',
    'items', 'receiver_name', 'notes', 'letterhead', 'styles'
  ],
  contract: [
    'contract_number', 'contract_date', 'party_a', 'party_b', 'terms',
    'effective_date', 'expiry_date', 'letterhead', 'styles'
  ],
  certificate: [
    'certificate_number', 'certificate_date', 'recipient_name', 'description',
    'issued_by', 'letterhead', 'styles'
  ],
  report: [
    'report_number', 'report_date', 'title', 'summary', 'content',
    'prepared_by', 'letterhead', 'styles'
  ],
  packing_list: [
    'packing_list_number', 'date', 'shipper', 'consignee', 'items',
    'total_packages', 'total_weight', 'letterhead', 'styles'
  ],
}

interface TemplateEditorProps {
  template?: DocumentTemplate | null
  onSave: (data: CreateTemplateInput | UpdateTemplateInput) => Promise<void>
  onCancel?: () => void
  isSaving?: boolean
}

interface FormState {
  template_code: string
  template_name: string
  document_type: DocumentType
  html_template: string
  css_styles: string
  page_size: PageSize
  orientation: PageOrientation
  margins: MarginSettings
  header_html: string
  footer_html: string
  include_letterhead: boolean
  is_active: boolean
}

const initialFormState: FormState = {
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
}

export function TemplateEditor({
  template,
  onSave,
  onCancel,
  isSaving = false,
}: TemplateEditorProps) {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')

  const isEditing = !!template?.id

  // Extract variables from template
  const extractedVariables = extractAvailableVariables(form.html_template)

  // Load template data when editing
  useEffect(() => {
    if (template) {
      setForm({
        template_code: template.template_code,
        template_name: template.template_name,
        document_type: template.document_type,
        html_template: template.html_template,
        css_styles: template.css_styles || '',
        page_size: template.page_size,
        orientation: template.orientation,
        margins: template.margins,
        header_html: template.header_html || '',
        footer_html: template.footer_html || '',
        include_letterhead: template.include_letterhead,
        is_active: template.is_active,
      })
      // Initialize preview data
      const data: Record<string, string> = {}
      for (const v of template.available_variables || []) {
        data[v] = `[${v}]`
      }
      setPreviewData(data)
    }
  }, [template])

  // Update preview data when variables change
  useEffect(() => {
    const newData: Record<string, string> = {}
    for (const v of extractedVariables) {
      newData[v] = previewData[v] || `[${v}]`
    }
    setPreviewData(newData)
  }, [extractedVariables.join(',')])

  const handleInputChange = useCallback((field: keyof FormState, value: string | boolean | MarginSettings | DocumentType | PageSize | PageOrientation) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleMarginChange = useCallback((key: keyof MarginSettings, value: string) => {
    const numValue = parseInt(value) || 0
    setForm((prev) => ({
      ...prev,
      margins: {
        ...prev.margins,
        [key]: numValue,
      },
    }))
  }, [])

  const insertVariable = useCallback((variable: string) => {
    const textarea = document.getElementById('html_template') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = form.html_template
      const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end)
      setForm((prev) => ({ ...prev, html_template: newText }))
      // Focus back on textarea
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4)
      }, 0)
    }
  }, [form.html_template])

  const copyVariable = useCallback((variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`)
    setCopiedVariable(variable)
    setTimeout(() => setCopiedVariable(null), 2000)
  }, [])

  const handlePreview = useCallback(() => {
    const result = processTemplate(form.html_template, previewData)
    // Inject CSS styles
    let html = result.html
    if (form.css_styles) {
      html = html.replace('{{styles}}', form.css_styles)
    }
    setPreview(html)
    setShowPreview(true)
  }, [form.html_template, form.css_styles, previewData])

  const handleSave = async () => {
    const data: CreateTemplateInput | UpdateTemplateInput = {
      template_name: form.template_name,
      document_type: form.document_type,
      html_template: form.html_template,
      css_styles: form.css_styles || null,
      page_size: form.page_size,
      orientation: form.orientation,
      margins: form.margins,
      header_html: form.header_html || null,
      footer_html: form.footer_html || null,
      include_letterhead: form.include_letterhead,
      available_variables: extractedVariables,
      is_active: form.is_active,
    }

    if (!isEditing) {
      (data as CreateTemplateInput).template_code = form.template_code
    }

    await onSave(data)
  }

  const suggestedVariables = COMMON_VARIABLES[form.document_type] || []
  const unusedSuggestions = suggestedVariables.filter(
    (v) => !extractedVariables.includes(v)
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
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
                    value={form.template_code}
                    onChange={(e) =>
                      handleInputChange('template_code', e.target.value.toUpperCase())
                    }
                    placeholder="INV_STANDARD"
                    className="font-mono"
                    disabled={isEditing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEditing ? 'Template code cannot be changed' : 'Unique identifier (uppercase, underscores allowed)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template_name">Template Name</Label>
                  <Input
                    id="template_name"
                    value={form.template_name}
                    onChange={(e) => handleInputChange('template_name', e.target.value)}
                    placeholder="Standard Invoice"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document_type">Document Type</Label>
                  <Select
                    value={form.document_type}
                    onValueChange={(value) => handleInputChange('document_type', value as DocumentType)}
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
                    checked={form.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="include_letterhead"
                  checked={form.include_letterhead}
                  onCheckedChange={(checked) => handleInputChange('include_letterhead', checked)}
                />
                <Label htmlFor="include_letterhead">Include Company Letterhead</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Tab */}
        <TabsContent value="template">
          <div className="space-y-6">
            {/* Variable Helper */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Variable className="h-5 w-5" />
                  Variable Helper
                </CardTitle>
                <CardDescription>
                  Click to insert or copy variables into your template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Detected Variables */}
                {extractedVariables.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Detected Variables</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <TooltipProvider>
                        {extractedVariables.map((variable) => (
                          <Tooltip key={variable}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="default"
                                className="cursor-pointer"
                                onClick={() => copyVariable(variable)}
                              >
                                {copiedVariable === variable ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                {`{{${variable}}}`}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Click to copy</TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </div>
                )}

                {/* Suggested Variables */}
                {unusedSuggestions.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Suggested Variables</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Common variables for {DOCUMENT_TYPE_LABELS[form.document_type]} templates
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <TooltipProvider>
                        {unusedSuggestions.map((variable) => (
                          <Tooltip key={variable}>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-secondary"
                                onClick={() => insertVariable(variable)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {variable}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Click to insert</TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* HTML Template */}
            <Card>
              <CardHeader>
                <CardTitle>HTML Template</CardTitle>
                <CardDescription>
                  Write HTML with {`{{variable}}`} placeholders for dynamic content.
                  Use {`{{#items}}...{{/items}}`} for loops.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="html_template"
                  value={form.html_template}
                  onChange={(e) => handleInputChange('html_template', e.target.value)}
                  placeholder={`<!DOCTYPE html>
<html>
<head><style>{{styles}}</style></head>
<body>
  {{letterhead}}
  <h1>INVOICE</h1>
  <p>Invoice #: {{invoice_number}}</p>
  <table>
    {{#items}}
    <tr>
      <td>{{description}}</td>
      <td>{{quantity}}</td>
      <td>{{amount}}</td>
    </tr>
    {{/items}}
  </table>
</body>
</html>`}
                  rows={18}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* CSS Styles */}
            <Card>
              <CardHeader>
                <CardTitle>CSS Styles</CardTitle>
                <CardDescription>
                  Custom CSS styles (referenced as {`{{styles}}`} in template)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="css_styles"
                  value={form.css_styles}
                  onChange={(e) => handleInputChange('css_styles', e.target.value)}
                  placeholder={`body { font-family: Arial, sans-serif; padding: 20px; }
.header { margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
.total { font-size: 18px; font-weight: bold; }`}
                  rows={8}
                  className="font-mono text-sm"
                />
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
                    value={form.header_html}
                    onChange={(e) => handleInputChange('header_html', e.target.value)}
                    placeholder="<div style='text-align: center;'>Company Name</div>"
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
                    value={form.footer_html}
                    onChange={(e) => handleInputChange('footer_html', e.target.value)}
                    placeholder="<div style='text-align: center;'>Page <span class='pageNumber'></span> of <span class='totalPages'></span></div>"
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
                    value={form.page_size}
                    onValueChange={(value) => handleInputChange('page_size', value as PageSize)}
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
                    value={form.orientation}
                    onValueChange={(value) => handleInputChange('orientation', value as PageOrientation)}
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
                      value={form.margins.top}
                      onChange={(e) => handleMarginChange('top', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Right</Label>
                    <Input
                      type="number"
                      value={form.margins.right}
                      onChange={(e) => handleMarginChange('right', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bottom</Label>
                    <Input
                      type="number"
                      value={form.margins.bottom}
                      onChange={(e) => handleMarginChange('bottom', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Left</Label>
                    <Input
                      type="number"
                      value={form.margins.left}
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
              {extractedVariables.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {extractedVariables.filter(v => v !== 'styles' && v !== 'letterhead' && !v.startsWith('#') && !v.startsWith('/')).map((variable) => (
                    <div key={variable} className="space-y-1">
                      <Label htmlFor={`preview-${variable}`} className="text-xs font-mono">
                        {variable}
                      </Label>
                      <Input
                        id={`preview-${variable}`}
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
                  <div className="border rounded-lg p-4 bg-white min-h-[400px] overflow-auto">
                    <style>{form.css_styles}</style>
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
