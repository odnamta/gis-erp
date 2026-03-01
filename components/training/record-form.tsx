'use client';

import { useState, useEffect } from 'react';
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
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrainingRecord,
  TrainingCourse,
  TrainingRecordStatus,
  CreateRecordInput,
  UpdateRecordInput,
} from '@/types/training';
import { createTrainingRecord, updateTrainingRecord, getCourses } from '@/lib/training-actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface RecordFormProps {
  record?: TrainingRecord;
  employees: Employee[];
  onSuccess?: () => void;
}

const STATUS_OPTIONS: { value: TrainingRecordStatus; label: string }[] = [
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'in_progress', label: 'Sedang Berlangsung' },
  { value: 'completed', label: 'Selesai' },
  { value: 'failed', label: 'Gagal' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export function RecordForm({ record, employees, onSuccess }: RecordFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);

  const [formData, setFormData] = useState({
    employeeId: record?.employeeId || '',
    courseId: record?.courseId || '',
    trainingDate: record?.trainingDate || '',
    completionDate: record?.completionDate || '',
    trainingLocation: record?.trainingLocation || '',
    trainerName: record?.trainerName || '',
    trainingProvider: record?.trainingProvider || '',
    status: record?.status || 'scheduled' as TrainingRecordStatus,
    assessmentScore: record?.assessmentScore?.toString() || '',
    certificateNumber: record?.certificateNumber || '',
    trainingCost: record?.trainingCost?.toString() || '',
    notes: record?.notes || '',
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (formData.courseId && courses.length > 0) {
      const course = courses.find((c) => c.id === formData.courseId);
      setSelectedCourse(course || null);
    }
  }, [formData.courseId, courses]);

  const loadCourses = async () => {
    try {
      const data = await getCourses({ isActive: true });
      setCourses(data);
    } catch {
      toast.error('Gagal memuat daftar kursus');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (record) {
        const input: UpdateRecordInput = {
          trainingDate: formData.trainingDate,
          completionDate: formData.completionDate || undefined,
          trainingLocation: formData.trainingLocation || undefined,
          trainerName: formData.trainerName || undefined,
          trainingProvider: formData.trainingProvider || undefined,
          status: formData.status,
          assessmentScore: formData.assessmentScore ? parseInt(formData.assessmentScore) : undefined,
          certificateNumber: formData.certificateNumber || undefined,
          trainingCost: formData.trainingCost ? parseFloat(formData.trainingCost) : undefined,
          notes: formData.notes || undefined,
        };
        await updateTrainingRecord(record.id, input);
        toast.success('Catatan pelatihan berhasil diupdate');
      } else {
        const input: CreateRecordInput = {
          employeeId: formData.employeeId,
          courseId: formData.courseId,
          trainingDate: formData.trainingDate,
          completionDate: formData.completionDate || undefined,
          trainingLocation: formData.trainingLocation || undefined,
          trainerName: formData.trainerName || undefined,
          trainingProvider: formData.trainingProvider || undefined,
          status: formData.status,
          assessmentScore: formData.assessmentScore ? parseInt(formData.assessmentScore) : undefined,
          certificateNumber: formData.certificateNumber || undefined,
          trainingCost: formData.trainingCost ? parseFloat(formData.trainingCost) : undefined,
          notes: formData.notes || undefined,
        };
        await createTrainingRecord(input);
        toast.success('Catatan pelatihan berhasil dibuat');
      }

      onSuccess?.();
      router.push('/hse/training/records');
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
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pelatihan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Karyawan *</Label>
                <EmployeeCombobox
                  employees={employees}
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                  placeholder="Cari karyawan..."
                  disabled={!!record}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseId">Kursus *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                  disabled={!!record}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kursus" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.courseCode} - {course.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="trainingDate">Tanggal Pelatihan *</Label>
                <Input
                  id="trainingDate"
                  type="date"
                  value={formData.trainingDate}
                  onChange={(e) => setFormData({ ...formData, trainingDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completionDate">Tanggal Selesai</Label>
                <Input
                  id="completionDate"
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as TrainingRecordStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trainingLocation">Lokasi Pelatihan</Label>
                <Input
                  id="trainingLocation"
                  value={formData.trainingLocation}
                  onChange={(e) => setFormData({ ...formData, trainingLocation: e.target.value })}
                  placeholder="Lokasi pelatihan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainerName">Nama Trainer</Label>
                <Input
                  id="trainerName"
                  value={formData.trainerName}
                  onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })}
                  placeholder="Nama trainer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainingProvider">Penyedia Pelatihan</Label>
              <Input
                id="trainingProvider"
                value={formData.trainingProvider}
                onChange={(e) => setFormData({ ...formData, trainingProvider: e.target.value })}
                placeholder="Nama lembaga/penyedia pelatihan"
              />
            </div>
          </CardContent>
        </Card>

        {selectedCourse?.requiresAssessment && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assessmentScore">Nilai Assessment</Label>
                  <Input
                    id="assessmentScore"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.assessmentScore}
                    onChange={(e) => setFormData({ ...formData, assessmentScore: e.target.value })}
                    placeholder="0-100"
                  />
                  <p className="text-sm text-muted-foreground">
                    Nilai kelulusan: {selectedCourse.passingScore}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sertifikat & Biaya</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="certificateNumber">Nomor Sertifikat</Label>
                <Input
                  id="certificateNumber"
                  value={formData.certificateNumber}
                  onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                  placeholder="Nomor sertifikat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainingCost">Biaya Pelatihan (Rp)</Label>
                <Input
                  id="trainingCost"
                  type="number"
                  min="0"
                  value={formData.trainingCost}
                  onChange={(e) => setFormData({ ...formData, trainingCost: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {record ? 'Update Catatan' : 'Simpan Catatan'}
          </Button>
        </div>
      </div>
    </form>
  );
}
