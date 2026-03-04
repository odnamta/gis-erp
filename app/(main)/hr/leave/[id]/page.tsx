import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner';
import { AttachmentsSection } from '@/components/attachments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, FileText, Phone, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LeaveRequest, LeaveRequestStatus } from '@/types/leave';
import { formatDays } from '@/lib/leave-utils';

interface LeaveDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<LeaveRequestStatus, {
  label: string;
  className: string;
}> = {
  pending: {
    label: 'Menunggu',
    className: 'border-yellow-500 text-yellow-600 bg-yellow-50',
  },
  approved: {
    label: 'Disetujui',
    className: 'border-green-500 text-green-600 bg-green-50',
  },
  rejected: {
    label: 'Ditolak',
    className: 'border-red-500 text-red-600 bg-red-50',
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'border-gray-400 text-gray-500 bg-gray-50',
  },
};

function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMMM yyyy', { locale: localeId });
}

export default async function LeaveDetailPage({ params }: LeaveDetailPageProps) {
  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(true);

  const { id } = await params;
  const supabase = await createClient();

  const result = await supabase
    .from('leave_requests')
    .select(`
      *,
      employee:employees!leave_requests_employee_id_fkey(
        id, employee_code, full_name,
        department:departments(id, department_name)
      ),
      leave_type:leave_types!leave_requests_leave_type_id_fkey(
        id, type_code, type_name
      ),
      handover_employee:employees!leave_requests_handover_to_fkey(
        id, full_name
      ),
      approver:user_profiles!leave_requests_approved_by_fkey(
        id, full_name
      )
    `)
    .eq('id', id)
    .single();

  const record = result.data as (LeaveRequest & { employee: any; leave_type: any }) | null;

  if (!record) {
    notFound();
  }

  const status = statusConfig[record.status];
  const startDate = formatDate(record.start_date);
  const endDate = formatDate(record.end_date);
  const isSameDay = record.start_date === record.end_date;

  return (
    <div className="space-y-6">
      {explorerReadOnly && <ExplorerReadOnlyBanner />}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/hr/leave">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Detail Pengajuan Cuti</h1>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            {record.request_number}
          </p>
        </div>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Employee & Leave Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Karyawan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{record.employee?.full_name || '-'}</p>
                <p className="text-sm text-muted-foreground">
                  {record.employee?.employee_code || ''}
                  {record.employee?.department?.department_name
                    ? ` - ${record.employee.department.department_name}`
                    : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Cuti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Jenis Cuti</p>
                <p className="font-medium">{record.leave_type?.type_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hari</p>
                <p className="font-medium">
                  {formatDays(record.total_days)}
                  {record.is_half_day && (
                    <span className="text-sm text-muted-foreground ml-1">
                      ({record.half_day_type === 'morning' ? 'Pagi' : 'Siang'})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Tanggal</p>
                <p className="font-medium">
                  {isSameDay ? startDate : `${startDate} - ${endDate}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {record.reason && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Alasan</p>
                <p>{record.reason}</p>
              </div>
            </div>
          )}

          {record.emergency_contact && (
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Kontak Darurat</p>
                <p>{record.emergency_contact}</p>
              </div>
            </div>
          )}

          {record.handover_employee && (
            <div className="flex items-start gap-3">
              <UserCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Serah Terima Ke</p>
                <p>{record.handover_employee.full_name}</p>
                {record.handover_notes && (
                  <p className="text-sm text-muted-foreground mt-1">{record.handover_notes}</p>
                )}
              </div>
            </div>
          )}

          {!record.reason && !record.emergency_contact && !record.handover_employee && (
            <p className="text-sm text-muted-foreground italic">Tidak ada informasi tambahan.</p>
          )}
        </CardContent>
      </Card>

      {/* Approval Info */}
      {(record.status === 'approved' || record.status === 'rejected') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {record.status === 'approved' ? 'Informasi Persetujuan' : 'Informasi Penolakan'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {record.approver && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {record.status === 'approved' ? 'Disetujui oleh' : 'Ditolak oleh'}
                  </p>
                  <p className="font-medium">
                    {record.approver.full_name}
                    {record.approved_at && (
                      <span className="text-sm text-muted-foreground ml-2">
                        pada {formatDate(record.approved_at)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {record.rejection_reason && (
              <div className="p-3 bg-red-50 rounded-md text-sm text-red-700 mt-2">
                <strong>Alasan penolakan:</strong> {record.rejection_reason}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dokumen Pendukung */}
      <AttachmentsSection
        entityType="leave_request"
        entityId={id}
        title="Dokumen Pendukung"
        maxFiles={5}
      />
    </div>
  );
}
