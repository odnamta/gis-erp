import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEquipmentRequestById } from '@/lib/equipment-request-actions';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';
import { PRIORITY_LABELS, EquipmentRequestStatus } from '@/types/equipment-request';
import { formatDate } from '@/lib/utils/format';
import { ArrowLeft } from 'lucide-react';
import { EquipmentRequestActions } from './actions-client';

function StatusBadge({ status }: { status: EquipmentRequestStatus }) {
  switch (status) {
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    case 'checked':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Diperiksa</Badge>;
    case 'approved':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disetujui</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Ditolak</Badge>;
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Dibatalkan</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function EquipmentRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [request, profile] = await Promise.all([
    getEquipmentRequestById(id),
    getUserProfile(),
  ]);

  if (!request) notFound();

  const canManage = canAccessFeature(profile, 'assets.edit');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/equipment/requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{request.request_number}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-muted-foreground">Permintaan Peralatan</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detail Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Pemohon</p>
              <p className="font-medium">{request.requester?.full_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Peralatan</p>
              <p className="font-medium">{request.equipment_name || request.asset?.asset_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Periode Penggunaan</p>
              <p className="font-medium">{formatDate(request.usage_start_date)} - {formatDate(request.usage_end_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prioritas</p>
              <Badge variant="outline">{PRIORITY_LABELS[request.priority] || request.priority}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Justifikasi</p>
              <p className="font-medium whitespace-pre-wrap">{request.business_justification}</p>
            </div>
            {request.job_order && (
              <div>
                <p className="text-sm text-muted-foreground">Job Order</p>
                <Link href={`/job-orders/${request.job_order.id}`} className="font-medium text-blue-600 hover:underline">
                  {request.job_order.jo_number}
                </Link>
              </div>
            )}
            {request.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Catatan</p>
                <p className="font-medium whitespace-pre-wrap">{request.notes}</p>
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
              <p className="text-sm text-muted-foreground">Tanggal Pengajuan</p>
              <p className="font-medium">{formatDate(request.created_at)}</p>
            </div>
            {request.checked_by && request.checker && (
              <div>
                <p className="text-sm text-muted-foreground">Diperiksa oleh</p>
                <p className="font-medium">{request.checker.full_name}</p>
                {request.checked_at && (
                  <p className="text-xs text-muted-foreground">{formatDate(request.checked_at)}</p>
                )}
              </div>
            )}
            {request.approved_by && request.approver && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {request.status === 'rejected' ? 'Ditolak oleh' : 'Disetujui oleh'}
                </p>
                <p className="font-medium">{request.approver.full_name}</p>
                {request.approved_at && (
                  <p className="text-xs text-muted-foreground">{formatDate(request.approved_at)}</p>
                )}
              </div>
            )}
            {request.rejection_reason && (
              <div>
                <p className="text-sm text-muted-foreground">Alasan Penolakan</p>
                <p className="font-medium text-red-600">{request.rejection_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {canManage && (request.status === 'pending' || request.status === 'checked') && (
        <EquipmentRequestActions
          requestId={request.id}
          status={request.status}
        />
      )}
    </div>
  );
}
