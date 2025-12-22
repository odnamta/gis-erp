'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FINDING_SEVERITIES, RISK_LEVELS, FindingSeverity, RiskLevel } from '@/types/audit';
import { createFinding } from '@/lib/audit-actions';
import { formatSeverity } from '@/lib/audit-utils';

interface FindingFormDialogProps {
  auditId: string;
  defaultDescription?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function FindingFormDialog({
  auditId,
  defaultDescription = '',
  onClose,
  onCreated,
}: FindingFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState<FindingSeverity>('minor');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState(defaultDescription);
  const [locationDetail, setLocationDetail] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('');
  const [potentialConsequence, setPotentialConsequence] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function handleSubmit() {
    if (!description.trim()) {
      alert('Description is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await createFinding({
        audit_id: auditId,
        severity,
        category: category || undefined,
        finding_description: description,
        location_detail: locationDetail || undefined,
        risk_level: riskLevel || undefined,
        potential_consequence: potentialConsequence || undefined,
        corrective_action: correctiveAction || undefined,
        due_date: dueDate || undefined,
      });

      if (error) {
        alert(error);
        return;
      }

      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Finding</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as FindingSeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINDING_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatSeverity(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Fire Safety, PPE, Housekeeping"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the finding..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Location Detail</Label>
            <Input
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="Specific location of the finding"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Potential Consequence</Label>
            <Textarea
              value={potentialConsequence}
              onChange={(e) => setPotentialConsequence(e.target.value)}
              placeholder="What could happen if not addressed..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Corrective Action Required</Label>
            <Textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="What needs to be done to fix this..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Finding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
