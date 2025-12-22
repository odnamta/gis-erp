'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingSession, SESSION_STATUS_LABELS, SessionStatus } from '@/types/training';
import { Calendar, Clock, MapPin, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface SessionCardProps {
  session: TrainingSession;
}

const STATUS_COLORS: Record<SessionStatus, string> = {
  scheduled: 'border-blue-500 text-blue-700 bg-blue-50',
  in_progress: 'border-yellow-500 text-yellow-700 bg-yellow-50',
  completed: 'border-green-500 text-green-700 bg-green-50',
  cancelled: 'border-gray-500 text-gray-700 bg-gray-50',
};

export function SessionCard({ session }: SessionCardProps) {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'EEEE, d MMMM yyyy', { locale: localeId });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  return (
    <Link href={`/hse/training/sessions/${session.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{session.courseName}</CardTitle>
              <p className="text-sm text-muted-foreground">{session.sessionCode}</p>
            </div>
            <Badge variant="outline" className={STATUS_COLORS[session.status]}>
              {SESSION_STATUS_LABELS[session.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(session.sessionDate)}</span>
          </div>

          {(session.startTime || session.endTime) && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {session.startTime && formatTime(session.startTime)}
                {session.startTime && session.endTime && ' - '}
                {session.endTime && formatTime(session.endTime)}
              </span>
            </div>
          )}

          {session.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{session.location}</span>
            </div>
          )}

          {(session.trainerName || session.trainerEmployeeName) && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Trainer: {session.trainerEmployeeName || session.trainerName}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.participantCount || 0} peserta
              {session.maxParticipants && ` / ${session.maxParticipants} maks`}
            </span>
            {session.maxParticipants && session.participantCount && 
             session.participantCount >= session.maxParticipants && (
              <Badge variant="secondary">Penuh</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
