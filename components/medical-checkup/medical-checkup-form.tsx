'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MedicalCheckup,
  CheckupType,
  MedicalStatus,
  CheckupRecordStatus,
  CHECKUP_TYPE_LABELS,
  MEDICAL_STATUS_LABELS,
  CHECKUP_STATUS_LABELS,
} from '@/types/medical-checkup';
import { createMedicalCheckup, updateMedicalCheckup } from '@/lib/medical-checkup-actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface MedicalCheckupFormProps {
  record?: MedicalCheckup;
  employees: Employee[];
}

export function MedicalCheckupForm({ record, employees }: MedicalCheckupFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: record?.employee_id || '',
    checkup_type: record?.checkup_type || ('annual' as CheckupType),
    checkup_date: record?.checkup_date || '',
    scheduled_date: record?.scheduled_date || '',
    clinic_name: record?.clinic_name || '',
    doctor_name: record?.doctor_name || '',
    height_cm: record?.height_cm?.toString() || '',
    weight_kg: record?.weight_kg?.toString() || '',
    blood_pressure: record?.blood_pressure || '',
    heart_rate: record?.heart_rate?.toString() || '',
    vision_left: record?.vision_left || '',
    vision_right: record?.vision_right || '',
    hearing_left: record?.hearing_left || '',
    hearing_right: record?.hearing_right || '',
    blood_test: record?.blood_test ?? false,
    blood_test_result: record?.blood_test_result || '',
    urine_test: record?.urine_test ?? false,
    urine_test_result: record?.urine_test_result || '',
    xray_performed: record?.xray_performed ?? false,
    xray_result: record?.xray_result || '',
    findings: record?.findings || '',
    medical_status: record?.medical_status || ('fit' as MedicalStatus),
    restrictions: record?.restrictions || '',
    recommendations: record?.recommendations || '',
    referral_required: record?.referral_required ?? false,
    referral_to: record?.referral_to || '',
    valid_from: record?.valid_from || '',
    valid_to: record?.valid_to || '',
    status: record?.status || ('completed' as CheckupRecordStatus),
    cost_idr: record?.cost_idr?.toString() || '',
    certificate_number: record?.certificate_number || '',
    notes: record?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (record) {
        await updateMedicalCheckup(record.id, {
          checkup_type: formData.checkup_type,
          checkup_date: formData.checkup_date,
          scheduled_date: formData.scheduled_date || undefined,
          clinic_name: formData.clinic_name,
          doctor_name: formData.doctor_name,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          blood_pressure: formData.blood_pressure || null,
          heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
          vision_left: formData.vision_left || null,
          vision_right: formData.vision_right || null,
          hearing_left: formData.hearing_left || null,
          hearing_right: formData.hearing_right || null,
          blood_test: formData.blood_test,
          blood_test_result: formData.blood_test_result || null,
          urine_test: formData.urine_test,
          urine_test_result: formData.urine_test_result || null,
          xray_performed: formData.xray_performed,
          xray_result: formData.xray_result || null,
          findings: formData.findings,
          medical_status: formData.medical_status,
          restrictions: formData.restrictions || null,
          recommendations: formData.recommendations || null,
          referral_required: formData.referral_required,
          referral_to: formData.referral_to || null,
          valid_from: formData.valid_from || undefined,
          valid_to: formData.valid_to || undefined,
          status: formData.status,
          cost_idr: formData.cost_idr ? parseFloat(formData.cost_idr) : null,
          certificate_number: formData.certificate_number || null,
          notes: formData.notes || null,
        });
        toast.success('Data MCU berhasil diupdate');
      } else {
        await createMedicalCheckup({
          employee_id: formData.employee_id,
          checkup_type: formData.checkup_type,
          checkup_date: formData.checkup_date,
          scheduled_date: formData.scheduled_date || undefined,
          clinic_name: formData.clinic_name,
          doctor_name: formData.doctor_name,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
          blood_pressure: formData.blood_pressure || undefined,
          heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : undefined,
          vision_left: formData.vision_left || undefined,
          vision_right: formData.vision_right || undefined,
          hearing_left: formData.hearing_left || undefined,
          hearing_right: formData.hearing_right || undefined,
          blood_test: formData.blood_test,
          blood_test_result: formData.blood_test_result || undefined,
          urine_test: formData.urine_test,
          urine_test_result: formData.urine_test_result || undefined,
          xray_performed: formData.xray_performed,
          xray_result: formData.xray_result || undefined,
          findings: formData.findings || undefined,
          medical_status: formData.medical_status,
          restrictions: formData.restrictions || undefined,
          recommendations: formData.recommendations || undefined,
          referral_required: formData.referral_required,
          referral_to: formData.referral_to || undefined,
          valid_from: formData.valid_from || undefined,
          valid_to: formData.valid_to || undefined,
          status: formData.status,
          cost_idr: formData.cost_idr ? parseFloat(formData.cost_idr) : undefined,
          certificate_number: formData.certificate_number || undefined,
          notes: formData.notes || undefined,
        });
        toast.success('Data MCU berhasil dibuat');
      }

      router.push('/hse/medical-checkups');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Karyawan *</Label>
                <EmployeeCombobox
                  employees={employees}
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  placeholder="Cari karyawan..."
                  disabled={!!record}
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Pemeriksaan *</Label>
                <Select
                  value={formData.checkup_type}
                  onValueChange={(value) => setFormData({ ...formData, checkup_type: value as CheckupType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHECKUP_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Tanggal Pemeriksaan *</Label>
                <Input
                  type="date"
                  value={formData.checkup_date}
                  onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Jadwal</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as CheckupRecordStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHECKUP_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nama Klinik/RS *</Label>
                <Input
                  value={formData.clinic_name}
                  onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                  placeholder="Nama klinik atau rumah sakit"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nama Dokter *</Label>
                <Input
                  value={formData.doctor_name}
                  onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                  placeholder="Nama dokter pemeriksa"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Examination */}
        <Card>
          <CardHeader>
            <CardTitle>Pemeriksaan Fisik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Tinggi Badan (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                  placeholder="170"
                />
              </div>
              <div className="space-y-2">
                <Label>Berat Badan (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <Label>Tekanan Darah</Label>
                <Input
                  value={formData.blood_pressure}
                  onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value })}
                  placeholder="120/80"
                />
              </div>
              <div className="space-y-2">
                <Label>Detak Jantung (bpm)</Label>
                <Input
                  type="number"
                  value={formData.heart_rate}
                  onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                  placeholder="72"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Visus Kiri</Label>
                <Input
                  value={formData.vision_left}
                  onChange={(e) => setFormData({ ...formData, vision_left: e.target.value })}
                  placeholder="6/6"
                />
              </div>
              <div className="space-y-2">
                <Label>Visus Kanan</Label>
                <Input
                  value={formData.vision_right}
                  onChange={(e) => setFormData({ ...formData, vision_right: e.target.value })}
                  placeholder="6/6"
                />
              </div>
              <div className="space-y-2">
                <Label>Pendengaran Kiri</Label>
                <Input
                  value={formData.hearing_left}
                  onChange={(e) => setFormData({ ...formData, hearing_left: e.target.value })}
                  placeholder="Normal"
                />
              </div>
              <div className="space-y-2">
                <Label>Pendengaran Kanan</Label>
                <Input
                  value={formData.hearing_right}
                  onChange={(e) => setFormData({ ...formData, hearing_right: e.target.value })}
                  placeholder="Normal"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lab Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Pemeriksaan Laboratorium</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="blood_test"
                    checked={formData.blood_test}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, blood_test: checked === true })
                    }
                  />
                  <Label htmlFor="blood_test">Tes Darah</Label>
                </div>
                {formData.blood_test && (
                  <Textarea
                    value={formData.blood_test_result}
                    onChange={(e) => setFormData({ ...formData, blood_test_result: e.target.value })}
                    placeholder="Hasil tes darah..."
                    rows={2}
                  />
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="urine_test"
                    checked={formData.urine_test}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, urine_test: checked === true })
                    }
                  />
                  <Label htmlFor="urine_test">Tes Urin</Label>
                </div>
                {formData.urine_test && (
                  <Textarea
                    value={formData.urine_test_result}
                    onChange={(e) => setFormData({ ...formData, urine_test_result: e.target.value })}
                    placeholder="Hasil tes urin..."
                    rows={2}
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="xray_performed"
                  checked={formData.xray_performed}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, xray_performed: checked === true })
                  }
                />
                <Label htmlFor="xray_performed">Rontgen (X-Ray)</Label>
              </div>
              {formData.xray_performed && (
                <Textarea
                  value={formData.xray_result}
                  onChange={(e) => setFormData({ ...formData, xray_result: e.target.value })}
                  placeholder="Hasil rontgen..."
                  rows={2}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results & Status */}
        <Card>
          <CardHeader>
            <CardTitle>Hasil & Status Medis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Temuan Medis</Label>
              <Textarea
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                placeholder="Temuan dari pemeriksaan medis..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status Medis *</Label>
                <Select
                  value={formData.medical_status}
                  onValueChange={(value) => setFormData({ ...formData, medical_status: value as MedicalStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEDICAL_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pembatasan Kerja</Label>
                <Input
                  value={formData.restrictions}
                  onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                  placeholder="Contoh: Tidak boleh kerja di ketinggian"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rekomendasi</Label>
              <Textarea
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                placeholder="Rekomendasi dari dokter..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="referral_required"
                  checked={formData.referral_required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, referral_required: checked === true })
                  }
                />
                <Label htmlFor="referral_required">Perlu Rujukan</Label>
              </div>
              {formData.referral_required && (
                <div className="space-y-2">
                  <Label>Rujukan Ke</Label>
                  <Input
                    value={formData.referral_to}
                    onChange={(e) => setFormData({ ...formData, referral_to: e.target.value })}
                    placeholder="Nama dokter spesialis / RS tujuan"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validity & Certificate */}
        <Card>
          <CardHeader>
            <CardTitle>Masa Berlaku & Sertifikat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Berlaku Dari</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan untuk otomatis dari tanggal pemeriksaan
                </p>
              </div>
              <div className="space-y-2">
                <Label>Berlaku Sampai</Label>
                <Input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan untuk otomatis (12 bulan untuk tahunan/berkala)
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nomor Sertifikat</Label>
                <Input
                  value={formData.certificate_number}
                  onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                  placeholder="Nomor sertifikat MCU"
                />
              </div>
              <div className="space-y-2">
                <Label>Biaya (Rp)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cost_idr}
                  onChange={(e) => setFormData({ ...formData, cost_idr: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {record ? 'Update Data MCU' : 'Simpan Data MCU'}
          </Button>
        </div>
      </div>
    </form>
  );
}
