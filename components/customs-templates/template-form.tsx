'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import type {
  CustomsDocumentTemplate,
  TemplateFormData,
  PlaceholderDefinition,
  DocumentType,
  PaperSize,
  Orientation,
} from '@/types/customs-templates';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, PAPER_SIZES, ORIENTATIONS } from '@/types/customs-templates';
import { createTemplate, updateTemplate } from '@/lib/template-actions';
import { validateTemplateFormData, fillTemplate } from '@/lib/template-utils';
import { PlaceholderEditor } from './placeholder-editor';
import { toast } from 'sonner';

interface TemplateFormProps {
  template?: CustomsDocumentTemplate;
}

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');

  const [formData, setFormData] = useState<TemplateFormData>({
    template_code: template?.template_code || '',
    template_name: template?.template_name || '',
    description: template?.description || '',
    document_type: template?.document_type || 'packing_list',
    template_html: template?.template_html || getDefaultTemplate('packing_list'),
    placeholders: template?.placeholders || [],
    paper_size: template?.paper_size || 'A4',
    orientation: template?.orientation || 'portrait',
    include_company_header: template?.include_company_header ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof TemplateFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleDocumentTypeChange = (type: DocumentType) => {
    handleChange('document_type', type);
    // Optionally load default template for the type
    if (!template && !formData.template_html) {
      handleChange('template_html', getDefaultTemplate(type));
    }
  };

  const handlePlaceholdersChange = (placeholders: PlaceholderDefinition[]) => {
    handleChange('placeholders', placeholders);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate
    const validation = validateTemplateFormData(formData);
    if (!validation.valid) {
      const newErrors: Record<string, string> = {};
      for (const error of validation.errors) {
        newErrors[error.field] = error.message;
      }
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const result = template
        ? await updateTemplate(template.id, formData)
        : await createTemplate(formData);

      if (result.success) {
        toast.success(template ? 'Template updated' : 'Template created');
        router.push('/customs/templates');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to save template');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Generate sample data for preview
  const getSampleData = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    for (const placeholder of formData.placeholders) {
      if (placeholder.type === 'array') {
        data[placeholder.key] = [
          { item_no: 1, description: 'Sample Item 1', qty: 10, unit: 'PCS', net_wt: 100, gross_wt: 120, hs_code: '8471.30', unit_price: 100, amount: 1000 },
          { item_no: 2, description: 'Sample Item 2', qty: 5, unit: 'PCS', net_wt: 50, gross_wt: 60, hs_code: '8471.41', unit_price: 200, amount: 1000 },
        ];
      } else {
        data[placeholder.key] = `[${placeholder.label}]`;
      }
    }
    return data;
  };

  const previewHtml = fillTemplate(formData.template_html, getSampleData());

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template_code">Template Code *</Label>
              <Input
                id="template_code"
                value={formData.template_code}
                onChange={(e) => handleChange('template_code', e.target.value.toUpperCase())}
                placeholder="e.g., PL-CUSTOM"
                maxLength={30}
              />
              {errors.template_code && (
                <p className="text-sm text-destructive">{errors.template_code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => handleChange('template_name', e.target.value)}
                placeholder="e.g., Custom Packing List"
                maxLength={200}
              />
              {errors.template_name && (
                <p className="text-sm text-destructive">{errors.template_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type *</Label>
              <Select
                value={formData.document_type}
                onValueChange={(v) => handleDocumentTypeChange(v as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select
                  value={formData.paper_size}
                  onValueChange={(v) => handleChange('paper_size', v as PaperSize)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select
                  value={formData.orientation}
                  onValueChange={(v) => handleChange('orientation', v as Orientation)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIENTATIONS.map((orientation) => (
                      <SelectItem key={orientation} value={orientation}>
                        {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include_header">Include Company Header</Label>
              <Switch
                id="include_header"
                checked={formData.include_company_header}
                onCheckedChange={(v) => handleChange('include_company_header', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Editor & Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="editor">HTML Editor</TabsTrigger>
                  <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="editor" className="space-y-2">
                  <Textarea
                    value={formData.template_html}
                    onChange={(e) => handleChange('template_html', e.target.value)}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder="Enter HTML template..."
                  />
                  {errors.template_html && (
                    <p className="text-sm text-destructive">{errors.template_html}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use {'{{placeholder}}'} for simple values and {'{{#array}}...{{/array}}'} for repeating items.
                  </p>
                </TabsContent>

                <TabsContent value="placeholders">
                  <PlaceholderEditor
                    placeholders={formData.placeholders}
                    onChange={handlePlaceholdersChange}
                  />
                </TabsContent>

                <TabsContent value="preview">
                  <div className="border rounded-lg p-4 bg-white min-h-[400px]">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[400px] border-0"
                      title="Template Preview"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function getDefaultTemplate(type: DocumentType): string {
  const templates: Record<DocumentType, string> = {
    packing_list: `<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px; }
    .header { text-align: center; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>PACKING LIST</h2>
  </div>
  <table>
    <tr><td width="30%">Shipper:</td><td>{{shipper_name}}</td></tr>
    <tr><td>Consignee:</td><td>{{consignee_name}}</td></tr>
    <tr><td>Date:</td><td>{{date}}</td></tr>
  </table>
  <br>
  <table>
    <tr><th>No</th><th>Description</th><th>Qty</th><th>Net Wt</th><th>Gross Wt</th></tr>
    {{#items}}
    <tr><td>{{item_no}}</td><td>{{description}}</td><td>{{qty}}</td><td>{{net_wt}}</td><td>{{gross_wt}}</td></tr>
    {{/items}}
  </table>
</body>
</html>`,
    commercial_invoice: `<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px; }
    .header { text-align: center; }
    .amount { text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h2>COMMERCIAL INVOICE</h2>
  </div>
  <table>
    <tr><td width="50%"><strong>Seller:</strong><br>{{seller_name}}</td><td><strong>Invoice No:</strong> {{invoice_number}}<br><strong>Date:</strong> {{date}}</td></tr>
    <tr><td><strong>Buyer:</strong><br>{{buyer_name}}</td><td><strong>Terms:</strong> {{payment_terms}}</td></tr>
  </table>
  <br>
  <table>
    <tr><th>No</th><th>Description</th><th>HS Code</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
    {{#items}}
    <tr><td>{{item_no}}</td><td>{{description}}</td><td>{{hs_code}}</td><td>{{qty}}</td><td class="amount">{{unit_price}}</td><td class="amount">{{amount}}</td></tr>
    {{/items}}
  </table>
</body>
</html>`,
    coo: '<html><body><h2>Certificate of Origin</h2><p>Content here...</p></body></html>',
    insurance_cert: '<html><body><h2>Insurance Certificate</h2><p>Content here...</p></body></html>',
    bill_of_lading: '<html><body><h2>Bill of Lading</h2><p>Content here...</p></body></html>',
    shipping_instruction: '<html><body><h2>Shipping Instruction</h2><p>Content here...</p></body></html>',
    cargo_manifest: '<html><body><h2>Cargo Manifest</h2><p>Content here...</p></body></html>',
  };
  return templates[type];
}
