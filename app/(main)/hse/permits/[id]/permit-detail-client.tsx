'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Loader2, MapPin, Calendar, User, FileText, AlertTriangle, HardHat } from 'lucide-react';
import { SafetyPermit } from '@/types/safety-document';
import {
  PermitStatusBadge,
  PermitTypeBadge,
  PermitApprovalPanel,
  PermitClosureDialog,
} from '@/components/safety-permits';
import { activatePermit } from '@/lib/safety-permit-actions';
import { formatDate } from '@/lib/utils/format';
import { useToast } from '@/hooks/use-toast';
import { AttachmentsSection } from '@/components/attachments';
import { PDFButtons } from '@/components/pdf/pdf-buttons';

interface PermitDetailClientProps {
  permit: SafetyPermit;
  readOnly?: boolean;
}

const PPE_LABELS: Record<string, string> = {
  helmet: 'Helm Keselamatan',
  safety_glasses: 'Kacamata Keselamatan',
  face_shield: 'Pelindung Wajah',
  ear_plugs: 'Pelindung Telinga',
  respirator: 'Respirator',
  gloves: 'Sarung Tangan',
  safety_shoes: 'Sepatu Keselamatan',
  safety_vest: 'Rompi Keselamatan',
  harness: 'Full Body Harness',
  fire_blanket: 'Selimut Api',
};

export function PermitDetailClient({ permit, readOnly }: PermitDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleActivate = async () => {
    if (readOnly) return;
    setLoading('activate');
    const result = await activatePermit(permit.id);
    setLoading(null);

    if (result.success) {
      toast({ title: 'Berhasil', description: 'Izin kerja diaktifkan' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const canActivate = !readOnly && permit.status === 'approved';
  const canClose = !readOnly && permit.status === 'active';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hse/permits">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{permit.permitNumber}</h1>
              <PermitStatusBadge status={permit.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <PermitTypeBadge type={permit.permitType} />
              {permit.jobOrderNumber && (
                <Badge variant="outline">{permit.jobOrderNumber}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <PDFButtons
            documentType="permit"
            documentId={permit.id}
            documentNumber={permit.permitNumber}
            size="sm"
            variant="outline"
          />
          {canActivate && (
            <Button onClick={handleActivate} disabled={loading === 'activate'}>
              {loading === 'activate' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Aktifkan Izin
            </Button>
          )}
          {canClose && (
            <PermitClosureDialog
              permitId={permit.id}
              onSuccess={() => router.refresh()}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pekerjaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Deskripsi Pekerjaan</p>
                <p className="font-medium">{permit.workDescription}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Lokasi</p>
                    <p className="font-medium">{permit.workLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Masa Berlaku</p>
                    <p className="font-medium">
                      {formatDate(permit.validFrom)} - {formatDate(permit.validTo)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                Persyaratan Keselamatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {permit.requiredPPE && permit.requiredPPE.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">APD yang Diperlukan</p>
                  <div className="flex flex-wrap gap-2">
                    {permit.requiredPPE.map((ppe) => (
                      <Badge key={ppe} variant="secondary">
                        {PPE_LABELS[ppe] || ppe}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {permit.specialPrecautions && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tindakan Pencegahan Khusus</p>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm">{permit.specialPrecautions}</p>
                    </div>
                  </div>
                </div>
              )}

              {permit.emergencyProcedures && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Prosedur Darurat</p>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm">{permit.emergencyProcedures}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {permit.status === 'completed' && permit.closureNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan Penutupan</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{permit.closureNotes}</p>
                {permit.closedByName && permit.closedAt && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Ditutup oleh {permit.closedByName} pada {formatDate(permit.closedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <PermitApprovalPanel
            permit={permit}
            onUpdate={() => router.refresh()}
            readOnly={readOnly}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {permit.requestedByName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Diajukan oleh</p>
                    <p className="font-medium">{permit.requestedByName}</p>
                    {permit.requestedAt && (
                      <p className="text-xs text-muted-foreground">{formatDate(permit.requestedAt)}</p>
                    )}
                  </div>
                </div>
              )}
              {permit.documentTitle && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dokumen Terkait</p>
                    <p className="font-medium">{permit.documentTitle}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dibuat</p>
                  <p className="font-medium">{formatDate(permit.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dokumen Pendukung */}
      <AttachmentsSection
        entityType="safety_permit"
        entityId={permit.id}
        title="Dokumen Pendukung"
        maxFiles={5}
      />
    </div>
  );
}
