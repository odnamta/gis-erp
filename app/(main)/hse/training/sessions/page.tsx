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
import { SessionList } from '@/components/training/session-list';
import { TrainingSession, SessionStatus, SessionFilters } from '@/types/training';
import { getSessions } from '@/lib/training-actions';
import { Plus, Search, Loader2 } from 'lucide-react';

const STATUS_OPTIONS: { value: SessionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'in_progress', label: 'Sedang Berlangsung' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export default function SessionsPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SessionStatus | 'all'>('all');

  useEffect(() => {
    loadSessions();
  }, [status]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const filters: SessionFilters = {};
      if (status !== 'all') {
        filters.status = status;
      }
      const data = await getSessions(filters);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      session.sessionCode.toLowerCase().includes(searchLower) ||
      session.courseName?.toLowerCase().includes(searchLower) ||
      session.location?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sesi Pelatihan</h1>
          <p className="text-muted-foreground">
            Kelola jadwal sesi pelatihan
          </p>
        </div>
        <Link href="/hse/training/sessions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Jadwalkan Sesi
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kode sesi, kursus, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as SessionStatus | 'all')}
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
        <SessionList sessions={filteredSessions} />
      )}
    </div>
  );
}
