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
import { Loader2, Package, Truck, MapPin, User, Anchor, Search } from 'lucide-react';
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
            {formData.surveyType === 'site_inspection' ? 'Deskripsi Pekerjaan' : 'Detail Cargo'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cargoDescription">
              {formData.surveyType === 'site_inspection' ? 'Deskripsi Pekerjaan / Inspeksi *' : 'Deskripsi Cargo *'}
            </Label>
            <Textarea
              id="cargoDescription"
              value={formData.cargoDescription}
              onChange={(e) => handleChange('cargoDescription', e.target.value)}
              placeholder={formData.surveyType === 'site_inspection' ? 'Jelaskan pekerjaan atau tujuan inspeksi...' : 'Deskripsi cargo yang akan diangkut...'}
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

      {/* Transport Configuration — only for standard_route and jetty_port */}
      {formData.surveyType !== 'site_inspection' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Konfigurasi Transportasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transportConfig">Deskripsi Konfigurasi</Label>
              <Textarea
                id="transportConfig"
                value={formData.transportConfig}
                onChange={(e) => handleChange('transportConfig', e.target.value)}
                placeholder="Deskripsi konfigurasi transportasi..."
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalLengthM">Panjang Total (m)</Label>
                <Input id="totalLengthM" type="number" step="0.01" min="0" value={formData.totalLengthM ?? ''} onChange={(e) => handleNumberChange('totalLengthM', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalWidthM">Lebar Total (m)</Label>
                <Input id="totalWidthM" type="number" step="0.01" min="0" value={formData.totalWidthM ?? ''} onChange={(e) => handleNumberChange('totalWidthM', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalHeightM">Tinggi Total (m)</Label>
                <Input id="totalHeightM" type="number" step="0.01" min="0" value={formData.totalHeightM ?? ''} onChange={(e) => handleNumberChange('totalHeightM', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalWeightTons">Berat Total (ton)</Label>
                <Input id="totalWeightTons" type="number" step="0.01" min="0" value={formData.totalWeightTons ?? ''} onChange={(e) => handleNumberChange('totalWeightTons', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="axleConfiguration">Konfigurasi Axle</Label>
                <Input id="axleConfiguration" value={formData.axleConfiguration} onChange={(e) => handleChange('axleConfiguration', e.target.value)} placeholder="cth. 12 axle modular" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groundClearanceM">Ground Clearance (m)</Label>
                <Input id="groundClearanceM" type="number" step="0.01" min="0" value={formData.groundClearanceM ?? ''} onChange={(e) => handleNumberChange('groundClearanceM', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turningRadiusM">Turning Radius (m)</Label>
                <Input id="turningRadiusM" type="number" step="0.01" min="0" value={formData.turningRadiusM ?? ''} onChange={(e) => handleNumberChange('turningRadiusM', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location / Route — varies by survey type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {formData.surveyType === 'jetty_port' ? (
              <><Anchor className="h-5 w-5" /> Lokasi Pelabuhan</>
            ) : formData.surveyType === 'site_inspection' ? (
              <><Search className="h-5 w-5" /> Lokasi Inspeksi</>
            ) : (
              <><MapPin className="h-5 w-5" /> Rute</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.surveyType === 'jetty_port' ? (
            /* Jetty/Port: Single location — the port itself */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="originLocation">Nama Pelabuhan / Jetty *</Label>
                <Input
                  id="originLocation"
                  value={formData.originLocation}
                  onChange={(e) => handleChange('originLocation', e.target.value)}
                  placeholder="cth. Pelabuhan Tanjung Perak, Jetty PLTU Paiton"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originAddress">Alamat Pelabuhan</Label>
                <Textarea
                  id="originAddress"
                  value={formData.originAddress}
                  onChange={(e) => handleChange('originAddress', e.target.value)}
                  placeholder="Alamat lengkap pelabuhan..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originCoordinates">Koordinat</Label>
                <Input
                  id="originCoordinates"
                  value={formData.originCoordinates}
                  onChange={(e) => handleChange('originCoordinates', e.target.value)}
                  placeholder="cth. -7.2575, 112.7521"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationLocation">Info Dermaga / Berth</Label>
                <Input
                  id="destinationLocation"
                  value={formData.destinationLocation}
                  onChange={(e) => handleChange('destinationLocation', e.target.value)}
                  placeholder="cth. Dermaga 5, Berth B3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationAddress">Catatan Akses & Kedalaman</Label>
                <Textarea
                  id="destinationAddress"
                  value={formData.destinationAddress}
                  onChange={(e) => handleChange('destinationAddress', e.target.value)}
                  placeholder="Draft kedalaman, lebar dermaga, kapasitas crane, batasan akses..."
                />
              </div>
            </div>
          ) : formData.surveyType === 'site_inspection' ? (
            /* Site Inspection: Single location */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="originLocation">Nama Lokasi Inspeksi *</Label>
                <Input
                  id="originLocation"
                  value={formData.originLocation}
                  onChange={(e) => handleChange('originLocation', e.target.value)}
                  placeholder="cth. Site PLTU Paiton, Area Fabrikasi PT XYZ"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originAddress">Alamat Lokasi</Label>
                <Textarea
                  id="originAddress"
                  value={formData.originAddress}
                  onChange={(e) => handleChange('originAddress', e.target.value)}
                  placeholder="Alamat lengkap lokasi inspeksi..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originCoordinates">Koordinat</Label>
                <Input
                  id="originCoordinates"
                  value={formData.originCoordinates}
                  onChange={(e) => handleChange('originCoordinates', e.target.value)}
                  placeholder="cth. -7.2575, 112.7521"
                />
              </div>
            </div>
          ) : (
            /* Standard Route: Origin + Destination */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Asal (Origin)</h4>
                <div className="space-y-2">
                  <Label htmlFor="originLocation">Nama Lokasi *</Label>
                  <Input id="originLocation" value={formData.originLocation} onChange={(e) => handleChange('originLocation', e.target.value)} placeholder="cth. Pelabuhan Tanjung Perak" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originAddress">Alamat</Label>
                  <Textarea id="originAddress" value={formData.originAddress} onChange={(e) => handleChange('originAddress', e.target.value)} placeholder="Alamat lengkap..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originCoordinates">Koordinat</Label>
                  <Input id="originCoordinates" value={formData.originCoordinates} onChange={(e) => handleChange('originCoordinates', e.target.value)} placeholder="cth. -7.2575, 112.7521" />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Tujuan (Destination)</h4>
                <div className="space-y-2">
                  <Label htmlFor="destinationLocation">Nama Lokasi *</Label>
                  <Input id="destinationLocation" value={formData.destinationLocation} onChange={(e) => handleChange('destinationLocation', e.target.value)} placeholder="cth. Industrial Estate Gresik" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationAddress">Alamat</Label>
                  <Textarea id="destinationAddress" value={formData.destinationAddress} onChange={(e) => handleChange('destinationAddress', e.target.value)} placeholder="Alamat lengkap..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationCoordinates">Koordinat</Label>
                  <Input id="destinationCoordinates" value={formData.destinationCoordinates} onChange={(e) => handleChange('destinationCoordinates', e.target.value)} placeholder="cth. -7.1631, 112.6513" />
                </div>
              </div>
            </div>
          )}
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
