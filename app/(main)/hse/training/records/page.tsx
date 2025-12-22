'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RecordList } from '@/components/training/record-list';
import { TrainingRecord, TrainingRecordStatus, RecordFilters } from '@/types/training';
import { getTrainingRecords } from '@/lib/training-actions';
import { Plus, Search, Loader2 } from 'lucide-react';

const STATUS_OPTIONS: { value: TrainingRecordStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'in_progress', label: 'Sedang Berlangsung' },
  { value: 'completed', label: 'Selesai' },
  { value: 'failed', label: 'Gagal' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export default function RecordsPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TrainingRecordStatus | 'all'>('all');

  useEffect(() => {
    loadRecords();
  }, [status]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const filters: RecordFilters = {};
      if (status !== 'all') {
        filters.status = status;
      }
      const data = await getTrainingRecords(filters);
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      record.employeeName?.toLowerCase().includes(searchLower) ||
      record.employeeCode?.toLowerCase().includes(searchLower) ||
      record.courseName?.toLowerCase().includes(searchLower) ||
      record.courseCode?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catatan Pelatihan</h1>
          <p className="text-muted-foreground">
            Kelola catatan pelatihan karyawan
          </p>
        </div>
        <Link href="/hse/training/records/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Catatan
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari karyawan atau kursus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as TrainingRecordStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <RecordList records={filteredRecords} />
      )}
    </div>
  );
}
