'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import {
  AuditFinding,
  CreateFindingInput,
  UpdateFindingInput,
  FINDING_SEVERITIES,
  RISK_LEVELS,
} from '@/types/audit';
import { createFinding, updateFinding } from '@/lib/audit-actions';
import { formatSeverity, formatRiskLevel } from '@/lib/audit-utils';

interface FindingFormProps {
  auditId: string;
  finding?: AuditFinding;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FindingForm({ auditId, finding, onSuccess, onCancel }: FindingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [severity, setSeverity] = useState(finding?.severity || 'minor');
  const [category, setCategory] = useState(finding?.category || '');
  const [description, setDescription] = useState(finding?.finding_description || '');
  const [locationDetail, setLocationDetail] = useState(finding?.location_detail || '');
  const [riskLevel, setRiskLevel] = useState(finding?.risk_level || '');
  const [potentialConsequence, setPotentialConsequence] = useState(finding?.potential_consequence || '');
  const [correctiveAction, setCorrectiveAction] = useState(finding?.corrective_action || '');
  const [dueDate, setDueDate] = useState(finding?.due_date || '');

  const isEdit = !!finding;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Finding description is required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const input: UpdateFindingInput = {
          severity: severity as UpdateFindingInput['severity'],
          category: category || undefined,
          finding_description: description,
          location_detail: locationDetail || undefined,
          risk_level: (riskLevel || undefined) as UpdateFindingInput['risk_level'],
          potential_consequence: potentialConsequence || undefined,
          corrective_action: correctiveAction || undefined,
          due_date: dueDate || undefined,
        };
        const { error: updateError } = await updateFinding(finding.id, input);
        if (updateError) {
          setError(updateError);
          return;
        }
      } else {
        const input: CreateFindingInput = {
          audit_id: auditId,
          severity: severity as CreateFindingInput['severity'],
          category: category || undefined,
          finding_description: description,
          location_detail: locationDetail || undefined,
          risk_level: (riskLevel || undefined) as CreateFindingInput['risk_level'],
          potential_consequence: potentialConsequence || undefined,
          corrective_action: correctiveAction || undefined,
          due_date: dueDate || undefined,
        };
        const { error: createError } = await createFinding(input);
        if (createError) {
          setError(createError);
          return;
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.back();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Finding' : 'New Finding'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select value={severity} onValueChange={(value) => setSeverity(value as typeof severity)}>
                <SelectTrigger id="severity">
                  <SelectValue placeholder="Select severity" />
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
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Fire Safety, PPE, Housekeeping"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the finding in detail..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationDetail">Location Detail</Label>
            <Input
              id="locationDetail"
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="e.g., Warehouse Zone B, Near Exit 3"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="riskLevel">Risk Level</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger id="riskLevel">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not specified</SelectItem>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {formatRiskLevel(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="potentialConsequence">Potential Consequence</Label>
            <Textarea
              id="potentialConsequence"
              value={potentialConsequence}
              onChange={(e) => setPotentialConsequence(e.target.value)}
              placeholder="What could happen if not addressed..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="correctiveAction">Corrective Action Required</Label>
            <Textarea
              id="correctiveAction"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="What needs to be done to fix this..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => router.back())}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEdit ? 'Update Finding' : 'Create Finding'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
