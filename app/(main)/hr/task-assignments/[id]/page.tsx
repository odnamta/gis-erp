import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTaskAssignment } from '@/lib/task-assignment-actions';
import { getUserProfile } from '@/lib/permissions-server';
import {
  TaskAssignmentStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
} from '@/types/task-assignment';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { ArrowLeft } from 'lucide-react';
import { TaskAssignmentActions } from './actions-client';

function StatusBadge({ status }: { status: TaskAssignmentStatus }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={`${colorClass} hover:${colorClass}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

export default async function TaskAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [assignment, profile] = await Promise.all([
    getTaskAssignment(id),
    getUserProfile(),
  ]);

  if (!assignment) notFound();

  const APPROVE_ROLES = ['owner', 'director', 'sysadmin'];
  const canManage = APPROVE_ROLES.includes(profile?.role || '');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hr/task-assignments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{assignment.request_number}</h1>
            <StatusBadge status={assignment.status} />
          </div>
          <p className="text-muted-foreground">Surat Tugas</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detail Penugasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">No. Surat</p>
              <p className="font-medium">{assignment.request_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Karyawan yang Ditugaskan</p>
              <p className="font-medium">{assignment.employee?.full_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Judul Tugas</p>
              <p className="font-medium">{assignment.task_title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deskripsi Tugas</p>
              <p className="font-medium whitespace-pre-wrap">{assignment.task_description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tujuan Penugasan</p>
              <p className="font-medium whitespace-pre-wrap">{assignment.purpose}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lokasi</p>
              <p className="font-medium">{assignment.location}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Periode Penugasan</p>
              <p className="font-medium">{formatDate(assignment.start_date)} - {formatDate(assignment.end_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alokasi Anggaran</p>
              <p className="font-medium">{assignment.budget_allocation ? formatCurrency(assignment.budget_allocation) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prioritas</p>
              <Badge variant="outline">{PRIORITY_LABELS[assignment.priority] || assignment.priority}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dibuat oleh</p>
              <p className="font-medium">{assignment.requester?.full_name || '-'}</p>
            </div>
            {assignment.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Catatan</p>
                <p className="font-medium whitespace-pre-wrap">{assignment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Persetujuan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={assignment.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tanggal Pengajuan</p>
              <p className="font-medium">{formatDate(assignment.created_at)}</p>
            </div>
            {assignment.approved_by && assignment.approver && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {assignment.status === 'rejected' ? 'Ditolak oleh' : 'Disetujui oleh'}
                </p>
                <p className="font-medium">{assignment.approver.full_name}</p>
                {assignment.approved_at && (
                  <p className="text-xs text-muted-foreground">{formatDate(assignment.approved_at)}</p>
                )}
              </div>
            )}
            {assignment.rejection_reason && (
              <div>
                <p className="text-sm text-muted-foreground">Alasan Penolakan</p>
                <p className="font-medium text-red-600">{assignment.rejection_reason}</p>
              </div>
            )}
            {assignment.completed_at && (
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Selesai</p>
                <p className="font-medium">{formatDate(assignment.completed_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {canManage && (assignment.status === 'pending' || assignment.status === 'approved') && (
        <TaskAssignmentActions
          assignmentId={assignment.id}
          status={assignment.status}
        />
      )}
    </div>
  );
}
