'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Incident } from '@/types/incident';
import { canCloseIncident, getPendingActionsCount } from '@/lib/incident-utils';

interface CloseIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onClose: (closureNotes: string) => Promise<void>;
}

export function CloseIncidentDialog({
  open,
  onOpenChange,
  incident,
  onClose,
}: CloseIncidentDialogProps) {
  const [closureNotes, setClosureNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const closeValidation = canCloseIncident(incident);
  const pendingCount = getPendingActionsCount(incident);

  const handleSubmit = async () => {
    if (!closureNotes.trim()) return;

    setSubmitting(true);
    try {
      await onClose(closureNotes);
      setClosureNotes('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tutup Insiden</DialogTitle>
          <DialogDescription>
            Pastikan semua tindakan telah selesai sebelum menutup insiden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!closeValidation.canClose && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{closeValidation.reason}</AlertDescription>
            </Alert>
          )}

          {pendingCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Masih ada {pendingCount} tindakan yang belum selesai.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Catatan Penutupan</Label>
            <Textarea
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              placeholder="Jelaskan kesimpulan dan tindak lanjut..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!closeValidation.canClose || !closureNotes.trim() || submitting}
          >
            {submitting ? 'Menutup...' : 'Tutup Insiden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
