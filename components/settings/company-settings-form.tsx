'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CompanySettings } from '@/types/company-settings';
import { saveCompanySettings } from '@/app/(main)/settings/company/actions';
import { DocumentNumberPreview } from './document-number-preview';
import { LogoUploader } from './logo-uploader';
import { Loader2, Save } from 'lucide-react';

interface CompanySettingsFormProps {
  initialSettings: CompanySettings;
}

export function CompanySettingsForm({ initialSettings }: CompanySettingsFormProps) {
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleChange = (field: keyof CompanySettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrors({});

    try {
      const result = await saveCompanySettings(settings);

      if (result.success) {
        toast({
          title: 'Settings saved',
          description: 'Company settings have been updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save settings',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleLogoUpload = (url: string) => {
    setSettings(prev => ({ ...prev, logo_url: url }));
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Company Settings</h2>
          <p className="text-muted-foreground">Configure company-wide settings</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic company details for documents and invoices</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="PT. Gama Intisamudera"
              />
              {errors.company_name && (
                <p className="text-sm text-destructive">{errors.company_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name</Label>
              <Input
                id="legal_name"
                value={settings.legal_name}
                onChange={(e) => handleChange('legal_name', e.target.value)}
                placeholder="PT. Gama Intisamudera"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID (NPWP)</Label>
              <Input
                id="tax_id"
                value={settings.tax_id}
                onChange={(e) => handleChange('tax_id', e.target.value)}
                placeholder="01.234.567.8-901.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="031-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@gama-group.co"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Jl. Raya Surabaya No. 123&#10;Surabaya, East Java 60xxx"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>


        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
            <CardDescription>Configure default values for invoices</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vat_rate">VAT Rate (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                min="0"
                max="100"
                value={settings.vat_rate}
                onChange={(e) => handleChange('vat_rate', parseFloat(e.target.value) || 0)}
              />
              {errors.vat_rate && (
                <p className="text-sm text-destructive">{errors.vat_rate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_payment_terms">Default Payment Terms (days)</Label>
              <Input
                id="default_payment_terms"
                type="number"
                min="1"
                value={settings.default_payment_terms}
                onChange={(e) => handleChange('default_payment_terms', parseInt(e.target.value) || 30)}
              />
              {errors.default_payment_terms && (
                <p className="text-sm text-destructive">{errors.default_payment_terms}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
              <Input
                id="invoice_prefix"
                value={settings.invoice_prefix}
                onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                placeholder="GIS-A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={settings.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                placeholder="Bank Mandiri"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account">Bank Account Number</Label>
              <Input
                id="bank_account"
                value={settings.bank_account}
                onChange={(e) => handleChange('bank_account', e.target.value)}
                placeholder="123-456-789-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_name">Bank Account Name</Label>
              <Input
                id="bank_account_name"
                value={settings.bank_account_name}
                onChange={(e) => handleChange('bank_account_name', e.target.value)}
                placeholder="PT. Gama Intisamudera"
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Numbering */}
        <Card>
          <CardHeader>
            <CardTitle>Document Numbering</CardTitle>
            <CardDescription>
              Configure number formats. Use NNNN for sequence, MM for month (Roman), YYYY for year.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pjo_format">PJO Format</Label>
                <Input
                  id="pjo_format"
                  value={settings.pjo_format}
                  onChange={(e) => handleChange('pjo_format', e.target.value)}
                  placeholder="NNNN/CARGO/MM/YYYY"
                />
                <DocumentNumberPreview format={settings.pjo_format} />
                {errors.pjo_format && (
                  <p className="text-sm text-destructive">{errors.pjo_format}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="jo_format">JO Format</Label>
                <Input
                  id="jo_format"
                  value={settings.jo_format}
                  onChange={(e) => handleChange('jo_format', e.target.value)}
                  placeholder="NNNN/GG/MM/YYYY"
                />
                <DocumentNumberPreview format={settings.jo_format} />
                {errors.jo_format && (
                  <p className="text-sm text-destructive">{errors.jo_format}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_format">Invoice Format</Label>
                <Input
                  id="invoice_format"
                  value={settings.invoice_format}
                  onChange={(e) => handleChange('invoice_format', e.target.value)}
                  placeholder="NNNN/GIS-A/MM/YYYY"
                />
                <DocumentNumberPreview format={settings.invoice_format} />
                {errors.invoice_format && (
                  <p className="text-sm text-destructive">{errors.invoice_format}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Company Logo</CardTitle>
            <CardDescription>Upload your company logo for documents and branding</CardDescription>
          </CardHeader>
          <CardContent>
            <LogoUploader
              currentLogoUrl={settings.logo_url}
              onUploadComplete={handleLogoUpload}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
