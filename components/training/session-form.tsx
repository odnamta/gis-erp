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
  TrainingSession,
  TrainingCourse,
  SessionStatus,
  CreateSessionInput,
  UpdateSessionInput,
} from '@/types/training';
import { createSession, updateSession, getCourses } from '@/lib/training-actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface SessionFormProps {
  session?: TrainingSession;
  employees: Employee[];
  onSuccess?: () => void;
}

const STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'in_progress', label: 'Sedang Berlangsung' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export function SessionForm({ session, employees, onSuccess }: SessionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);

  const [formData, setFormData] = useState({
    courseId: session?.courseId || '',
    sessionDate: session?.sessionDate || '',
    startTime: session?.startTime || '',
    endTime: session?.endTime || '',
    location: session?.location || '',
    trainerName: session?.trainerName || '',
    trainerEmployeeId: session?.trainerEmployeeId || '',
    maxParticipants: session?.maxParticipants?.toString() || '',
    status: session?.status || 'scheduled' as SessionStatus,
    notes: session?.notes || '',
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await getCourses({ isActive: true });
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (session) {
        const input: UpdateSessionInput = {
          sessionDate: formData.sessionDate,
          startTime: formData.startTime || undefined,
          endTime: formData.endTime || undefined,
          location: formData.location || undefined,
          trainerName: formData.trainerName || undefined,
          trainerEmployeeId: formData.trainerEmployeeId || undefined,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        };
        await updateSession(session.id, input);
        toast.success('Sesi pelatihan berhasil diupdate');
      } else {
        const input: CreateSessionInput = {
          courseId: formData.courseId,
          sessionDate: formData.sessionDate,
          startTime: formData.startTime || undefined,
          endTime: formData.endTime || undefined,
          location: formData.location || undefined,
          trainerName: formData.trainerName || undefined,
          trainerEmployeeId: formData.trainerEmployeeId || undefined,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
          notes: formData.notes || undefined,
        };
        await createSession(input);
        toast.success('Sesi pelatihan berhasil dibuat');
      }

      onSuccess?.();
      router.push('/hse/training/sessions');
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
            <CardTitle>Informasi Sesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courseId">Kursus *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                  disabled={!!session}
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
              <div className="space-y-2">
                <Label htmlFor="sessionDate">Tanggal Sesi *</Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Waktu Mulai</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Waktu Selesai</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maks Peserta</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  placeholder="Kosongkan jika tidak dibatasi"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Lokasi pelatihan"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trainer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trainerEmployeeId">Trainer (Karyawan)</Label>
                <EmployeeCombobox
                  employees={employees}
                  value={formData.trainerEmployeeId}
                  onValueChange={(value) => setFormData({ ...formData, trainerEmployeeId: value })}
                  placeholder="Cari trainer dari karyawan..."
                  allowClear
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainerName">Nama Trainer (Eksternal)</Label>
                <Input
                  id="trainerName"
                  value={formData.trainerName}
                  onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })}
                  placeholder="Nama trainer eksternal"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {session && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="status">Status Sesi</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as SessionStatus })}
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
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Catatan tambahan..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {session ? 'Update Sesi' : 'Buat Sesi'}
          </Button>
        </div>
      </div>
    </form>
  );
}
