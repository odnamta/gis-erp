'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import {
  createTaskAssignment,
  getEmployeesForTaskAssignment,
} from '@/lib/task-assignment-actions';
import { PRIORITY_LABELS, TaskAssignmentPriority } from '@/types/task-assignment';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewTaskAssignmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);

  const [form, setForm] = useState({
    employee_id: '',
    task_title: '',
    task_description: '',
    purpose: '',
    location: '',
    start_date: '',
    end_date: '',
    budget_allocation: '',
    priority: 'normal' as TaskAssignmentPriority,
    notes: '',
  });

  useEffect(() => {
    getEmployeesForTaskAssignment().then(setEmployees);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await createTaskAssignment({
      employee_id: form.employee_id,
      task_title: form.task_title,
      task_description: form.task_description,
      purpose: form.purpose,
      location: form.location,
      start_date: form.start_date,
      end_date: form.end_date,
      budget_allocation: form.budget_allocation ? Number(form.budget_allocation) : undefined,
      priority: form.priority,
      notes: form.notes || undefined,
    });

    setLoading(false);

    if (result.success) {
      router.push('/hr/task-assignments');
    } else {
      setError(result.error || 'Gagal membuat surat tugas');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hr/task-assignments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Surat Tugas</h1>
          <p className="text-muted-foreground">Isi formulir di bawah untuk membuat surat tugas baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detail Penugasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Karyawan yang Ditugaskan *</Label>
              <Select
                value={form.employee_id}
                onValueChange={(v) => setForm({ ...form, employee_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_title">Judul Tugas *</Label>
              <Input
                id="task_title"
                value={form.task_title}
                onChange={(e) => setForm({ ...form, task_title: e.target.value })}
                placeholder="Contoh: Pengawasan Proyek Site A"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_description">Deskripsi Tugas *</Label>
              <Textarea
                id="task_description"
                value={form.task_description}
                onChange={(e) => setForm({ ...form, task_description: e.target.value })}
                placeholder="Jelaskan detail tugas yang diberikan..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Tujuan Penugasan *</Label>
              <Textarea
                id="purpose"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Jelaskan tujuan dari penugasan ini..."
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi Penugasan *</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Contoh: Site Proyek Gresik, Pelabuhan Tanjung Perak"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Tanggal Mulai *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Tanggal Selesai *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget_allocation">Alokasi Anggaran (Rp)</Label>
                <Input
                  id="budget_allocation"
                  type="number"
                  value={form.budget_allocation}
                  onChange={(e) => setForm({ ...form, budget_allocation: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioritas</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as TaskAssignmentPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PRIORITY_LABELS) as [TaskAssignmentPriority, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={2}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat Surat Tugas
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
