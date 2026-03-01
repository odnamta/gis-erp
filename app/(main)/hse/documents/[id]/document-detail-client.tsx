'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, CheckCircle, Calendar, User, Loader2 } from 'lucide-react';
import { 
  SafetyDocument, 
  JSAHazard, 
  DocumentAcknowledgment, 
  AcknowledgmentStats 
} from '@/types/safety-document';
import { 
  DocumentStatusBadge, 
  ValidityBadge, 
  JSAHazardTable,
  AcknowledgmentList,
  AcknowledgmentButton,
  AcknowledgmentStatsCard,
} from '@/components/safety-documents';
import { submitForReview, approveDocument } from '@/lib/safety-document-actions';
import { formatDate } from '@/lib/pjo-utils';
import { useToast } from '@/hooks/use-toast';
import { PDFButtons } from '@/components/pdf/pdf-buttons';

interface DocumentDetailClientProps {
  document: SafetyDocument;
  hazards: JSAHazard[];
  acknowledgments: DocumentAcknowledgment[];
  acknowledgmentStats: AcknowledgmentStats;
}

export function DocumentDetailClient({
  document,
  hazards,
  acknowledgments,
  acknowledgmentStats,
}: DocumentDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubmitForReview = async () => {
    setLoading('submit');
    const result = await submitForReview(document.id);
    setLoading(null);

    if (result.success) {
      toast({ title: 'Berhasil', description: 'Dokumen dikirim untuk review' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    setLoading('approve');
    const result = await approveDocument(document.id);
    setLoading(null);

    if (result.success) {
      toast({ title: 'Berhasil', description: 'Dokumen disetujui' });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const isJSA = document.categoryCode?.toLowerCase() === 'jsa';
  const canSubmit = document.status === 'draft';
  const canApprove = document.status === 'pending_review';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hse/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{document.title}</h1>
              <DocumentStatusBadge status={document.status} />
            </div>
            <p className="text-muted-foreground font-mono">{document.documentNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <PDFButtons
            documentType="safety-document"
            documentId={document.id}
            documentNumber={document.documentNumber}
            size="sm"
            variant="outline"
          />
          {canSubmit && (
            <Button onClick={handleSubmitForReview} disabled={loading === 'submit'}>
              {loading === 'submit' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Kirim untuk Review
            </Button>
          )}
          {canApprove && (
            <Button onClick={handleApprove} disabled={loading === 'approve'}>
              {loading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Setujui
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p className="font-medium">{document.categoryName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Versi</p>
                  <p className="font-medium">{document.version} (Rev. {document.revisionNumber})</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Efektif</p>
                  <p className="font-medium">{formatDate(document.effectiveDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Kadaluarsa</p>
                  <div className="flex items-center gap-2">
                    {document.expiryDate ? (
                      <>
                        <span className="font-medium">{formatDate(document.expiryDate)}</span>
                        {document.validityStatus && (
                          <ValidityBadge 
                            status={document.validityStatus} 
                            daysUntilExpiry={document.daysUntilExpiry}
                          />
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              </div>

              {document.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Deskripsi</p>
                  <p>{document.description}</p>
                </div>
              )}

              {document.content && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Konten</p>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {document.content}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {isJSA && (
            <JSAHazardTable
              documentId={document.id}
              hazards={hazards}
              onUpdate={() => router.refresh()}
              readOnly={document.status !== 'draft'}
            />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.preparedByName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Disiapkan oleh</p>
                    <p className="font-medium">{document.preparedByName}</p>
                  </div>
                </div>
              )}
              {document.approvedByName && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Disetujui oleh</p>
                    <p className="font-medium">{document.approvedByName}</p>
                    {document.approvedAt && (
                      <p className="text-xs text-muted-foreground">{formatDate(document.approvedAt)}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dibuat</p>
                  <p className="font-medium">{formatDate(document.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {document.requiresAcknowledgment && document.status === 'approved' && (
            <>
              <AcknowledgmentStatsCard stats={acknowledgmentStats} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pengakuan</CardTitle>
                </CardHeader>
                <CardContent>
                  <AcknowledgmentButton
                    documentId={document.id}
                    isAcknowledged={false}
                    onSuccess={() => router.refresh()}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {document.requiresAcknowledgment && acknowledgments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengakuan</CardTitle>
          </CardHeader>
          <CardContent>
            <AcknowledgmentList acknowledgments={acknowledgments} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
