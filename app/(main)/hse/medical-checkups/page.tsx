'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MedicalCheckup,
  MedicalStatus,
  CheckupType,
  CHECKUP_TYPE_LABELS,
  MEDICAL_STATUS_LABELS,
  MEDICAL_STATUS_COLORS,
  CHECKUP_STATUS_LABELS,
  CHECKUP_STATUS_COLORS,
} from '@/types/medical-checkup';
import { getMedicalCheckups } from '@/lib/medical-checkup-actions';
import { formatDate } from '@/lib/utils/format';
import { Plus, Search, Loader2, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

const MEDICAL_STATUS_OPTIONS: { value: MedicalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status Medis' },
  { value: 'fit', label: 'Layak Kerja' },
  { value: 'conditional_fit', label: 'Layak Bersyarat' },
  { value: 'temporary_unfit', label: 'Tidak Layak Sementara' },
  { value: 'unfit', label: 'Tidak Layak Kerja' },
];

const CHECKUP_TYPE_OPTIONS: { value: CheckupType | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Jenis' },
  { value: 'pre_employment', label: 'Pra-Kerja' },
  { value: 'annual', label: 'Tahunan' },
  { value: 'periodic', label: 'Berkala' },
  { value: 'follow_up', label: 'Tindak Lanjut' },
  { value: 'exit', label: 'Akhir Masa Kerja' },
];

export default function MedicalCheckupsPage() {
  const [records, setRecords] = useState<MedicalCheckup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [medicalStatus, setMedicalStatus] = useState<MedicalStatus | 'all'>('all');
  const [checkupType, setCheckupType] = useState<CheckupType | 'all'>('all');

  useEffect(() => {
    loadRecords();
  }, [medicalStatus, checkupType]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (medicalStatus !== 'all') {
        filters.medical_status = medicalStatus;
      }
      if (checkupType !== 'all') {
        filters.checkup_type = checkupType;
      }
      const data = await getMedicalCheckups(filters);
      setRecords(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat data MCU');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      record.employee_name?.toLowerCase().includes(searchLower) ||
      record.employee_code?.toLowerCase().includes(searchLower) ||
      record.clinic_name?.toLowerCase().includes(searchLower) ||
      record.doctor_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Checkup (MCU)</h1>
          <p className="text-muted-foreground">
            Kelola data pemeriksaan kesehatan karyawan
          </p>
        </div>
        <Link href="/hse/medical-checkups/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah MCU
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari karyawan, klinik, atau dokter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={checkupType}
          onValueChange={(value) => setCheckupType(value as CheckupType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHECKUP_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={medicalStatus}
          onValueChange={(value) => setMedicalStatus(value as MedicalStatus | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEDICAL_STATUS_OPTIONS.map((opt) => (
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
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Stethoscope className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Belum ada data MCU</h3>
          <p className="text-muted-foreground">
            Data pemeriksaan kesehatan akan muncul di sini setelah ditambahkan
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Klinik</TableHead>
                <TableHead>Status Medis</TableHead>
                <TableHead>Berlaku Sampai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{record.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{record.employee_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {CHECKUP_TYPE_LABELS[record.checkup_type] || record.checkup_type}
                  </TableCell>
                  <TableCell>{formatDate(record.checkup_date)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{record.clinic_name}</p>
                      <p className="text-xs text-muted-foreground">{record.doctor_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={MEDICAL_STATUS_COLORS[record.medical_status] || ''}
                    >
                      {MEDICAL_STATUS_LABELS[record.medical_status] || record.medical_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(record.valid_to)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={CHECKUP_STATUS_COLORS[record.status] || ''}
                    >
                      {CHECKUP_STATUS_LABELS[record.status] || record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/hse/medical-checkups/${record.id}`}>
                      <Button variant="ghost" size="sm">
                        Detail
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
