'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { AuditFinding } from '@/types/audit';
import { verifyFinding } from '@/lib/audit-actions';
import { formatSeverity, getSeverityColor } from '@/lib/audit-utils';
import { formatDate } from '@/lib/pjo-utils';

interface FindingVerificationProps {
  finding: AuditFinding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

export function FindingVerification({
  finding,
  open,
  onOpenChange,
  onVerified,
}: FindingVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await verifyFinding(finding.id);

      if (verifyError) {
        setError(verifyError);
        return;
      }

      onVerified();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Verify Finding Closure</DialogTitle>
          <DialogDescription>
            Review the closure evidence and verify that the finding has been properly addressed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={getSeverityColor(finding.severity)}>
                {formatSeverity(finding.severity)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Finding #{finding.finding_number}
              </span>
            </div>
            <p className="text-sm">{finding.finding_description}</p>
          </div>

          {finding.corrective_action && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Required Corrective Action:</p>
              <p className="text-sm text-muted-foreground">{finding.corrective_action}</p>
            </div>
          )}

          <div className="p-3 bg-green-50 border border-green-200 rounded-md space-y-2">
            <p className="text-sm font-medium text-green-800">Closure Evidence:</p>
            <p className="text-sm text-green-700">{finding.closure_evidence}</p>
            {finding.closed_at && (
              <p className="text-xs text-green-600">
                Closed on {formatDate(finding.closed_at)}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              By verifying this finding, you confirm that the corrective action has been 
              properly implemented and the issue has been resolved.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            {loading ? 'Verifying...' : 'Verify Closure'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
