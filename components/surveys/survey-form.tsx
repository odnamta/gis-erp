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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/forms/combobox';
import { RouteSurvey, SurveyFormData, SurveyType } from '@/types/survey';
import { createSurvey, updateSurvey } from '@/lib/survey-actions';
import { Loader2, Package, Truck, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';

interface SurveyFormProps {
  survey?: RouteSurvey;
  customers: { id: string; name: string }[];
  quotations: { id: string; quotation_number: string }[];
  projects: { id: string; name: string }[];
  employees: { id: string; full_name: string }[];
}

export function SurveyForm({
  survey,
  customers,
  quotations,
  projects,
  employees,
}: SurveyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SurveyFormData>({
    surveyType: ((survey as Record<string, unknown> | undefined)?.surveyType as SurveyType) || 'standard_route',
    quotationId: survey?.quotationId || '',
    projectId: survey?.projectId || '',
    customerId: survey?.customerId || '',
    cargoDescription: survey?.cargoDescription || '',
    cargoLengthM: survey?.cargoLengthM,
    cargoWidthM: survey?.cargoWidthM,
    cargoHeightM: survey?.cargoHeightM,
    cargoWeightTons: survey?.cargoWeightTons,
    transportConfig: survey?.transportConfig || '',
    totalLengthM: survey?.totalLengthM,
    totalWidthM: survey?.totalWidthM,
    totalHeightM: survey?.totalHeightM,
    totalWeightTons: survey?.totalWeightTons,
    axleConfiguration: survey?.axleConfiguration || '',
    groundClearanceM: survey?.groundClearanceM,
    turningRadiusM: survey?.turningRadiusM,
    originLocation: survey?.originLocation || '',
    originAddress: survey?.originAddress || '',
    originCoordinates: survey?.originCoordinates || '',
    destinationLocation: survey?.destinationLocation || '',
    destinationAddress: survey?.destinationAddress || '',
    destinationCoordinates: survey?.destinationCoordinates || '',
    surveyorId: survey?.surveyorId || '',
    surveyDate: survey?.surveyDate || '',
    notes: survey?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = survey
        ? await updateSurvey(survey.id, formData)
        : await createSurvey(formData);

      if (result.success) {
        toast.success(survey ? 'Survey updated successfully' : 'Survey created successfully');
        router.push('/engineering/surveys');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to save survey');
      }
    } catch (_error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SurveyFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof SurveyFormData, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    handleChange(field, numValue);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Survey Type */}
      <Card>
        <CardHeader>
          <CardTitle>Jenis Survey</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.surveyType || 'standard_route'}
            onValueChange={(v) => handleChange('surveyType', v)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard_route">Survey Rute Standar</SelectItem>
              <SelectItem value="jetty_port">Survey Jetty / Pelabuhan</SelectItem>
              <SelectItem value="site_inspection">Inspeksi Lokasi</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            References
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Combobox
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.customerId || ''}
              onSelect={(v) => handleChange('customerId', v)}
              placeholder="Pilih customer..."
              searchPlaceholder="Cari customer..."
              emptyText="Customer tidak ditemukan"
            />
          </div>
          <div className="space-y-2">
            <Label>Quotation</Label>
            <Select
              value={formData.quotationId || 'none'}
              onValueChange={(v) => handleChange('quotationId', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quotation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No quotation</SelectItem>
                {quotations.map((q) => (
                  <SelectItem key={q.id} value={q.id}>{q.quotation_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={formData.projectId || 'none'}
              onValueChange={(v) => handleChange('projectId', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cargo Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cargo Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cargoDescription">Cargo Description *</Label>
            <Textarea
              id="cargoDescription"
              value={formData.cargoDescription}
              onChange={(e) => handleChange('cargoDescription', e.target.value)}
              placeholder="Describe the cargo..."
              required
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cargoLengthM">Length (m)</Label>
              <Input
                id="cargoLengthM"
                type="number"
                step="0.01"
                min="0"
                value={formData.cargoLengthM ?? ''}
                onChange={(e) => handleNumberChange('cargoLengthM', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargoWidthM">Width (m)</Label>
              <Input
                id="cargoWidthM"
                type="number"
                step="0.01"
                min="0"
                value={formData.cargoWidthM ?? ''}
                onChange={(e) => handleNumberChange('cargoWidthM', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargoHeightM">Height (m)</Label>
              <Input
                id="cargoHeightM"
                type="number"
                step="0.01"
                min="0"
                value={formData.cargoHeightM ?? ''}
                onChange={(e) => handleNumberChange('cargoHeightM', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargoWeightTons">Weight (tons)</Label>
              <Input
                id="cargoWeightTons"
                type="number"
                step="0.01"
                min="0"
                value={formData.cargoWeightTons ?? ''}
                onChange={(e) => handleNumberChange('cargoWeightTons', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transport Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Transport Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transportConfig">Configuration Description</Label>
            <Textarea
              id="transportConfig"
              value={formData.transportConfig}
              onChange={(e) => handleChange('transportConfig', e.target.value)}
              placeholder="Describe the transport configuration..."
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalLengthM">Total Length (m)</Label>
              <Input
                id="totalLengthM"
                type="number"
                step="0.01"
                min="0"
                value={formData.totalLengthM ?? ''}
                onChange={(e) => handleNumberChange('totalLengthM', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalWidthM">Total Width (m)</Label>
              <Input
                id="totalWidthM"
                type="number"
                step="0.01"
                min="0"
                value={formData.totalWidthM ?? ''}
                onChange={(e) => handleNumberChange('totalWidthM', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalHeightM">Total Height (m)</Label>
              <Input
                id="totalHeightM"
                type="number"
                step="0.01"
                min="0"
                value={formData.totalHeightM ?? ''}
                onChange={(e) => handleNumberChange('totalHeightM', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalWeightTons">Total Weight (tons)</Label>
              <Input
                id="totalWeightTons"
                type="number"
                step="0.01"
                min="0"
                value={formData.totalWeightTons ?? ''}
                onChange={(e) => handleNumberChange('totalWeightTons', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="axleConfiguration">Axle Configuration</Label>
              <Input
                id="axleConfiguration"
                value={formData.axleConfiguration}
                onChange={(e) => handleChange('axleConfiguration', e.target.value)}
                placeholder="e.g., 12 axle modular"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groundClearanceM">Ground Clearance (m)</Label>
              <Input
                id="groundClearanceM"
                type="number"
                step="0.01"
                min="0"
                value={formData.groundClearanceM ?? ''}
                onChange={(e) => handleNumberChange('groundClearanceM', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="turningRadiusM">Turning Radius (m)</Label>
              <Input
                id="turningRadiusM"
                type="number"
                step="0.01"
                min="0"
                value={formData.turningRadiusM ?? ''}
                onChange={(e) => handleNumberChange('turningRadiusM', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin */}
            <div className="space-y-4">
              <h4 className="font-medium">Origin</h4>
              <div className="space-y-2">
                <Label htmlFor="originLocation">Location Name *</Label>
                <Input
                  id="originLocation"
                  value={formData.originLocation}
                  onChange={(e) => handleChange('originLocation', e.target.value)}
                  placeholder="e.g., Tanjung Perak Port"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originAddress">Address</Label>
                <Textarea
                  id="originAddress"
                  value={formData.originAddress}
                  onChange={(e) => handleChange('originAddress', e.target.value)}
                  placeholder="Full address..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originCoordinates">Coordinates</Label>
                <Input
                  id="originCoordinates"
                  value={formData.originCoordinates}
                  onChange={(e) => handleChange('originCoordinates', e.target.value)}
                  placeholder="e.g., -7.2575, 112.7521"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-4">
              <h4 className="font-medium">Destination</h4>
              <div className="space-y-2">
                <Label htmlFor="destinationLocation">Location Name *</Label>
                <Input
                  id="destinationLocation"
                  value={formData.destinationLocation}
                  onChange={(e) => handleChange('destinationLocation', e.target.value)}
                  placeholder="e.g., Industrial Estate Gresik"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationAddress">Address</Label>
                <Textarea
                  id="destinationAddress"
                  value={formData.destinationAddress}
                  onChange={(e) => handleChange('destinationAddress', e.target.value)}
                  placeholder="Full address..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCoordinates">Coordinates</Label>
                <Input
                  id="destinationCoordinates"
                  value={formData.destinationCoordinates}
                  onChange={(e) => handleChange('destinationCoordinates', e.target.value)}
                  placeholder="e.g., -7.1631, 112.6513"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Survey Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Survey Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Surveyor</Label>
            <Select
              value={formData.surveyorId || 'none'}
              onValueChange={(v) => handleChange('surveyorId', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select surveyor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="surveyDate">Survey Date</Label>
            <Input
              id="surveyDate"
              type="date"
              value={formData.surveyDate}
              onChange={(e) => handleChange('surveyDate', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {survey ? 'Update Survey' : 'Create Survey'}
        </Button>
      </div>
    </form>
  );
}
