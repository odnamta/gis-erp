'use client';

import { TrainingRecord } from '@/types/training';
import { RecordCard } from './record-card';
import { FileText } from 'lucide-react';

interface RecordListProps {
  records: TrainingRecord[];
}

export function RecordList({ records }: RecordListProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Belum ada catatan pelatihan</h3>
        <p className="text-muted-foreground">
          Catatan pelatihan akan muncul di sini setelah ditambahkan
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => (
        <RecordCard key={record.id} record={record} />
      ))}
    </div>
  );
}
