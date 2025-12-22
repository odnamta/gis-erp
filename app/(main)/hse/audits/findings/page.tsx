'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { FindingList } from '@/components/hse/audits/finding-list';
import { FindingClosureDialog } from '@/components/hse/audits/finding-closure-dialog';
import { FindingVerification } from '@/components/hse/audits/finding-verification';
import { AuditFinding } from '@/types/audit';
import { getFindings } from '@/lib/audit-actions';

export default function FindingsPage() {
  const router = useRouter();
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  useEffect(() => {
    loadFindings();
  }, []);

  async function loadFindings() {
    setLoading(true);
    const { data } = await getFindings();
    setFindings(data);
    setLoading(false);
  }

  function handleView(id: string) {
    const finding = findings.find((f) => f.id === id);
    if (finding) {
      // Navigate to the audit detail page
      router.push(`/hse/audits/${finding.audit_id}`);
    }
  }

  function handleClose(id: string) {
    const finding = findings.find((f) => f.id === id);
    if (finding) {
      if (finding.status === 'closed') {
        // Show verification dialog
        setSelectedFinding(finding);
        setShowVerificationDialog(true);
      } else {
        // Show closure dialog
        setSelectedFinding(finding);
        setShowClosureDialog(true);
      }
    }
  }

  function handleClosed() {
    loadFindings();
    setSelectedFinding(null);
  }

  function handleVerified() {
    loadFindings();
    setSelectedFinding(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/hse/audits')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">All Findings</h1>
          <p className="text-muted-foreground">
            View and manage all audit findings across all audits
          </p>
        </div>
      </div>

      <FindingList
        findings={findings}
        onView={handleView}
        onClose={handleClose}
      />

      {selectedFinding && showClosureDialog && (
        <FindingClosureDialog
          finding={selectedFinding}
          open={showClosureDialog}
          onOpenChange={setShowClosureDialog}
          onClosed={handleClosed}
        />
      )}

      {selectedFinding && showVerificationDialog && (
        <FindingVerification
          finding={selectedFinding}
          open={showVerificationDialog}
          onOpenChange={setShowVerificationDialog}
          onVerified={handleVerified}
        />
      )}
    </div>
  );
}
