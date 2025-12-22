'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SessionParticipant,
  AttendanceStatus,
  ATTENDANCE_STATUS_LABELS,
} from '@/types/training';
import { updateAttendance, removeParticipant } from '@/lib/training-actions';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ParticipantListProps {
  participants: SessionParticipant[];
  sessionId: string;
  sessionStatus: string;
  onRefresh: () => void;
}

const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  registered: 'border-blue-500 text-blue-700 bg-blue-50',
  attended: 'border-green-500 text-green-700 bg-green-50',
  absent: 'border-red-500 text-red-700 bg-red-50',
  cancelled: 'border-gray-500 text-gray-700 bg-gray-50',
};

export function ParticipantList({
  participants,
  sessionId,
  sessionStatus,
  onRefresh,
}: ParticipantListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAttendanceChange = async (participantId: string, status: AttendanceStatus) => {
    setLoadingId(participantId);
    try {
      await updateAttendance(participantId, status);
      toast.success('Kehadiran berhasil diupdate');
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengupdate kehadiran');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (employeeId: string) => {
    if (!confirm('Yakin ingin menghapus peserta ini?')) return;
    
    setLoadingId(employeeId);
    try {
      await removeParticipant(sessionId, employeeId);
      toast.success('Peserta berhasil dihapus');
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus peserta');
    } finally {
      setLoadingId(null);
    }
  };

  const canEdit = sessionStatus === 'scheduled' || sessionStatus === 'in_progress';

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Belum ada peserta terdaftar
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kode</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Departemen</TableHead>
          <TableHead>Kehadiran</TableHead>
          {canEdit && <TableHead className="w-[50px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((participant) => (
          <TableRow key={participant.id}>
            <TableCell className="font-mono text-sm">
              {participant.employeeCode}
            </TableCell>
            <TableCell>{participant.employeeName}</TableCell>
            <TableCell>{participant.departmentName}</TableCell>
            <TableCell>
              {canEdit ? (
                <Select
                  value={participant.attendanceStatus}
                  onValueChange={(value) =>
                    handleAttendanceChange(participant.id, value as AttendanceStatus)
                  }
                  disabled={loadingId === participant.id}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={ATTENDANCE_COLORS[participant.attendanceStatus]}>
                  {ATTENDANCE_STATUS_LABELS[participant.attendanceStatus]}
                </Badge>
              )}
            </TableCell>
            {canEdit && (
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(participant.employeeId)}
                  disabled={loadingId === participant.employeeId}
                >
                  {loadingId === participant.employeeId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
