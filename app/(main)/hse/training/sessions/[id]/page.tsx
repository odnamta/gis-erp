'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ParticipantList } from '@/components/training/participant-list';
import { AddParticipantDialog } from '@/components/training/add-participant-dialog';
import {
  TrainingSession,
  SessionParticipant,
  SESSION_STATUS_LABELS,
  SessionStatus,
} from '@/types/training';
import {
  getSessionById,
  getSessionParticipants,
  completeSession,
  cancelSession,
} from '@/lib/training-actions';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

const STATUS_COLORS: Record<SessionStatus, string> = {
  scheduled: 'border-blue-500 text-blue-700 bg-blue-50',
  in_progress: 'border-yellow-500 text-yellow-700 bg-yellow-50',
  completed: 'border-green-500 text-green-700 bg-green-50',
  cancelled: 'border-gray-500 text-gray-700 bg-gray-50',
};

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sessionData, participantsData] = await Promise.all([
        getSessionById(params.id as string),
        getSessionParticipants(params.id as string),
      ]);
      setSession(sessionData);
      setParticipants(participantsData);

      const supabase = createClient();
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, employee_code, full_name')
        .eq('status', 'active')
        .order('full_name');
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Gagal memuat data sesi');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleComplete = async () => {
    if (!confirm('Yakin ingin menyelesaikan sesi ini? Catatan pelatihan akan dibuat untuk peserta yang hadir.')) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await completeSession(params.id as string);
      toast.success(`Sesi selesai. ${result.recordsCreated} catatan pelatihan dibuat.`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyelesaikan sesi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Yakin ingin membatalkan sesi ini?')) {
      return;
    }

    setActionLoading(true);
    try {
      await cancelSession(params.id as string);
      toast.success('Sesi dibatalkan');
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membatalkan sesi');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sesi tidak ditemukan</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'EEEE, d MMMM yyyy', { locale: localeId });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const canEdit = session.status === 'scheduled' || session.status === 'in_progress';
  const existingParticipantIds = participants.map((p) => p.employeeId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{session.courseName}</h1>
            <Badge variant="outline" className={STATUS_COLORS[session.status]}>
              {SESSION_STATUS_LABELS[session.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">{session.sessionCode}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Link href={`/hse/training/sessions/${session.id}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Batalkan
              </Button>
              <Button onClick={handleComplete} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Selesaikan Sesi
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detail Sesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>{formatDate(session.sessionDate)}</span>
            </div>

            {(session.startTime || session.endTime) && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>
                  {session.startTime && formatTime(session.startTime)}
                  {session.startTime && session.endTime && ' - '}
                  {session.endTime && formatTime(session.endTime)}
                </span>
              </div>
            )}

            {session.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{session.location}</span>
              </div>
            )}

            {(session.trainerName || session.trainerEmployeeName) && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>Trainer: {session.trainerEmployeeName || session.trainerName}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>
                {participants.length} peserta
                {session.maxParticipants && ` / ${session.maxParticipants} maks`}
              </span>
            </div>

            {session.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Catatan:</p>
                  <p className="text-sm text-muted-foreground">{session.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Peserta</CardTitle>
            {canEdit && (
              <AddParticipantDialog
                sessionId={session.id}
                employees={employees}
                existingParticipantIds={existingParticipantIds}
                onSuccess={loadData}
              />
            )}
          </CardHeader>
          <CardContent>
            <ParticipantList
              participants={participants}
              sessionId={session.id}
              sessionStatus={session.status}
              onRefresh={loadData}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
