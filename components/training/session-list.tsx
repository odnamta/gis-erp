'use client';

import { TrainingSession } from '@/types/training';
import { SessionCard } from './session-card';
import { CalendarDays } from 'lucide-react';

interface SessionListProps {
  sessions: TrainingSession[];
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Belum ada sesi pelatihan</h3>
        <p className="text-muted-foreground">
          Sesi pelatihan akan muncul di sini setelah dijadwalkan
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
