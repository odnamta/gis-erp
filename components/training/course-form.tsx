'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingCourse, TrainingType, CreateCourseInput, UpdateCourseInput } from '@/types/training';
import { createCourse, updateCourse } from '@/lib/training-actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CourseFormProps {
  course?: TrainingCourse;
  onSuccess?: () => void;
}

const TRAINING_TYPES: { value: TrainingType; label: string }[] = [
  { value: 'induction', label: 'Induksi' },
  { value: 'refresher', label: 'Penyegaran' },
  { value: 'specialized', label: 'Khusus' },
  { value: 'certification', label: 'Sertifikasi' },
  { value: 'toolbox', label: 'Toolbox Talk' },
];

export function CourseForm({ course, onSuccess }: CourseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    courseCode: course?.courseCode || '',
    courseName: course?.courseName || '',
    description: course?.description || '',
    trainingType: course?.trainingType || 'induction' as TrainingType,
    durationHours: course?.durationHours?.toString() || '',
    validityMonths: course?.validityMonths?.toString() || '',
    isMandatory: course?.isMandatory || false,
    internalTraining: course?.internalTraining ?? true,
    externalProvider: course?.externalProvider || '',
    requiresAssessment: course?.requiresAssessment || false,
    passingScore: course?.passingScore?.toString() || '70',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (course) {
        const input: UpdateCourseInput = {
          courseName: formData.courseName,
          description: formData.description || undefined,
          trainingType: formData.trainingType,
          durationHours: formData.durationHours ? parseFloat(formData.durationHours) : undefined,
          validityMonths: formData.validityMonths ? parseInt(formData.validityMonths) : undefined,
          isMandatory: formData.isMandatory,
          internalTraining: formData.internalTraining,
          externalProvider: formData.externalProvider || undefined,
          requiresAssessment: formData.requiresAssessment,
          passingScore: formData.passingScore ? parseInt(formData.passingScore) : undefined,
        };
        await updateCourse(course.id, input);
        toast.success('Kursus berhasil diupdate');
      } else {
        const input: CreateCourseInput = {
          courseCode: formData.courseCode,
          courseName: formData.courseName,
          description: formData.description || undefined,
          trainingType: formData.trainingType,
          durationHours: formData.durationHours ? parseFloat(formData.durationHours) : undefined,
          validityMonths: formData.validityMonths ? parseInt(formData.validityMonths) : undefined,
          isMandatory: formData.isMandatory,
          internalTraining: formData.internalTraining,
          externalProvider: formData.externalProvider || undefined,
          requiresAssessment: formData.requiresAssessment,
          passingScore: formData.passingScore ? parseInt(formData.passingScore) : undefined,
        };
        await createCourse(input);
        toast.success('Kursus berhasil dibuat');
      }
      
      onSuccess?.();
      router.push('/hse/training/courses');
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
            <CardTitle>Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courseCode">Kode Kursus *</Label>
                <Input
                  id="courseCode"
                  value={formData.courseCode}
                  onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                  placeholder="Contoh: FIRE-001"
                  disabled={!!course}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseName">Nama Kursus *</Label>
                <Input
                  id="courseName"
                  value={formData.courseName}
                  onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                  placeholder="Nama kursus pelatihan"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi kursus..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="trainingType">Jenis Pelatihan *</Label>
                <Select
                  value={formData.trainingType}
                  onValueChange={(value) => setFormData({ ...formData, trainingType: value as TrainingType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationHours">Durasi (jam)</Label>
                <Input
                  id="durationHours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.durationHours}
                  onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
                  placeholder="8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityMonths">Masa Berlaku (bulan)</Label>
                <Input
                  id="validityMonths"
                  type="number"
                  min="1"
                  value={formData.validityMonths}
                  onChange={(e) => setFormData({ ...formData, validityMonths: e.target.value })}
                  placeholder="Kosongkan jika tidak kadaluarsa"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Pelatihan Wajib</Label>
                <p className="text-sm text-muted-foreground">
                  Tandai jika pelatihan ini wajib untuk semua karyawan
                </p>
              </div>
              <Switch
                checked={formData.isMandatory}
                onCheckedChange={(checked) => setFormData({ ...formData, isMandatory: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Pelatihan Internal</Label>
                <p className="text-sm text-muted-foreground">
                  Pelatihan dilakukan oleh internal perusahaan
                </p>
              </div>
              <Switch
                checked={formData.internalTraining}
                onCheckedChange={(checked) => setFormData({ ...formData, internalTraining: checked })}
              />
            </div>

            {!formData.internalTraining && (
              <div className="space-y-2">
                <Label htmlFor="externalProvider">Penyedia Eksternal</Label>
                <Input
                  id="externalProvider"
                  value={formData.externalProvider}
                  onChange={(e) => setFormData({ ...formData, externalProvider: e.target.value })}
                  placeholder="Nama lembaga pelatihan"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Memerlukan Assessment</Label>
                <p className="text-sm text-muted-foreground">
                  Peserta harus lulus ujian untuk menyelesaikan pelatihan
                </p>
              </div>
              <Switch
                checked={formData.requiresAssessment}
                onCheckedChange={(checked) => setFormData({ ...formData, requiresAssessment: checked })}
              />
            </div>

            {formData.requiresAssessment && (
              <div className="space-y-2">
                <Label htmlFor="passingScore">Nilai Kelulusan (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {course ? 'Update Kursus' : 'Buat Kursus'}
          </Button>
        </div>
      </div>
    </form>
  );
}
