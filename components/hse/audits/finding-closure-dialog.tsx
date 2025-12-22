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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
import { AuditFinding } from '@/types/audit';
import { closeFinding } from '@/lib/audit-actions';
import { formatSeverity, getSeverityColor } from '@/lib/audit-utils';
import { Badge } from '@/components/ui/badge';

interface FindingClosureDialogProps {
  finding: AuditFinding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
}

export function FindingClosureDialog({
  finding,
  open,
  onOpenChange,
  onClosed,
}: FindingClosureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closureEvidence, setClosureEvidence] = useState('');

  async function handleClose() {
    if (!closureEvidence.trim()) {
      setError('Closure evidence is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: closeError } = await closeFinding(finding.id, {
        closure_evidence: closureEvidence,
      });

      if (closeError) {
        setError(closeError);
        return;
      }

      onClosed();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Close Finding</DialogTitle>
          <DialogDescription>
            Provide evidence that this finding has been addressed.
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
            {finding.corrective_action && (
              <div className="text-sm">
                <span className="font-medium">Required Action: </span>
                {finding.corrective_action}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="closureEvidence">Closure Evidence *</Label>
            <Textarea
              id="closureEvidence"
              value={closureEvidence}
              onChange={(e) => setClosureEvidence(e.target.value)}
              placeholder="Describe what was done to address this finding..."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Provide details of the corrective actions taken and any supporting evidence.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={loading || !closureEvidence.trim()}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading ? 'Closing...' : 'Close Finding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
