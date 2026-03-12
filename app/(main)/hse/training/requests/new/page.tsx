'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { submitTrainingRequest } from '@/lib/training-request-actions';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewTrainingRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

  const [formData, setFormData] = useState({
    employee_id: '',
    course_id: '',
    custom_course_name: '',
    custom_course_description: '',
    training_provider: '',
    estimated_cost: '',
    training_date_start: '',
    training_date_end: '',
    justification: '',
    notes: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const [empRes, courseRes] = await Promise.all([
          supabase
            .from('employees')
            .select('id, full_name, employee_code')
            .eq('status', 'active')
            .order('full_name'),
          supabase
            .from('safety_training_courses')
            .select('id, course_name')
            .eq('is_active', true)
            .order('course_name'),
        ]);

        setEmployees(empRes.data || []);
        setCourses(courseRes.data || []);
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    }
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitTrainingRequest({
      employee_id: formData.employee_id,
      course_id: formData.course_id || undefined,
      custom_course_name: formData.custom_course_name || undefined,
      custom_course_description: formData.custom_course_description || undefined,
      training_provider: formData.training_provider || undefined,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
      training_date_start: formData.training_date_start,
      training_date_end: formData.training_date_end || undefined,
      justification: formData.justification,
      notes: formData.notes || undefined,
    });

    setLoading(false);

    if (result.success) {
      router.push('/hse/training/requests');
    } else {
      setError(result.error || 'Gagal mengajukan permintaan');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hse/training/requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ajukan Permintaan Training</h1>
          <p className="text-muted-foreground">Isi formulir di bawah untuk mengajukan pelatihan</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Permintaan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">{error}</div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Karyawan *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, employee_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course_id">Kursus (opsional)</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, course_id: v === '_none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dari daftar kursus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-- Tidak ada (isi manual) --</SelectItem>
                    {courses.map((c: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <SelectItem key={c.id} value={c.id}>
                        {c.course_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!formData.course_id && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="custom_course_name">Nama Training *</Label>
                  <Input
                    id="custom_course_name"
                    value={formData.custom_course_name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, custom_course_name: e.target.value }))
                    }
                    placeholder="Nama pelatihan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="training_provider">Provider Training</Label>
                  <Input
                    id="training_provider"
                    value={formData.training_provider}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, training_provider: e.target.value }))
                    }
                    placeholder="Nama penyedia pelatihan"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="training_date_start">Tanggal Mulai *</Label>
                <Input
                  id="training_date_start"
                  type="date"
                  value={formData.training_date_start}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, training_date_start: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="training_date_end">Tanggal Selesai</Label>
                <Input
                  id="training_date_end"
                  type="date"
                  value={formData.training_date_end}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, training_date_end: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Estimasi Biaya (Rp)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  value={formData.estimated_cost}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, estimated_cost: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justifikasi / Alasan *</Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, justification: e.target.value }))
                }
                placeholder="Jelaskan mengapa training ini diperlukan"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajukan Permintaan
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/hse/training/requests">Batal</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
