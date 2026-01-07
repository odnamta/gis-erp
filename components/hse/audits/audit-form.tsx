'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChecklistForm } from './checklist-form';
import { FindingFormDialog } from './finding-form-dialog';
import { Save, Play, CheckCircle, X } from 'lucide-react';
import {
  AuditType,
  Audit,
  ChecklistResponse,
  CreateAuditInput,
  CompleteAuditInput,
} from '@/types/audit';
import {
  createAudit,
  updateAudit,
  startAudit,
  completeAudit,
  getActiveAuditTypes,
} from '@/lib/audit-actions';

interface AuditFormProps {
  audit?: Audit;
  auditType?: AuditType;
  preselectedTypeId?: string;
}

export function AuditForm({ audit, auditType, preselectedTypeId }: AuditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState(
    audit?.audit_type_id || preselectedTypeId || ''
  );
  const [selectedType, setSelectedType] = useState<AuditType | undefined>(auditType);
  
  // Form fields
  const [location, setLocation] = useState(audit?.location || '');
  const [auditorName, setAuditorName] = useState(audit?.auditor_name || '');
  const [summary, setSummary] = useState(audit?.summary || '');
  const [responses, setResponses] = useState<ChecklistResponse[]>(
    audit?.checklist_responses || []
  );
  
  // Finding dialog
  const [showFindingDialog, setShowFindingDialog] = useState(false);
  const [findingContext, setFindingContext] = useState<{
    itemIndex: number;
    section: string;
    question: string;
  } | null>(null);

  const isNew = !audit;
  const isScheduled = audit?.status === 'scheduled';
  const isInProgress = audit?.status === 'in_progress';
  const isCompleted = audit?.status === 'completed';

  useEffect(() => {
    loadAuditTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId && auditTypes.length > 0) {
      const type = auditTypes.find((t) => t.id === selectedTypeId);
      setSelectedType(type);
    }
  }, [selectedTypeId, auditTypes]);

  async function loadAuditTypes() {
    const { data } = await getActiveAuditTypes();
    setAuditTypes(data);
    
    if (preselectedTypeId && data.length > 0) {
      const type = data.find((t) => t.id === preselectedTypeId);
      if (type) {
        setSelectedType(type);
      }
    }
  }

  function handleResponseChange(response: ChecklistResponse) {
    setResponses((prev) => {
      const existing = prev.findIndex(
        (r) => r.section === response.section && r.item_index === response.item_index
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = response;
        return updated;
      }
      return [...prev, response];
    });
  }

  function handleAddFinding(itemIndex: number, section: string, question: string) {
    setFindingContext({ itemIndex, section, question });
    setShowFindingDialog(true);
  }

  function handleFindingCreated() {
    if (findingContext) {
      // Mark the response as having a finding
      const existing = responses.find(
        (r) => r.section === findingContext.section && r.item_index === findingContext.itemIndex
      );
      handleResponseChange({
        section: findingContext.section,
        item_index: findingContext.itemIndex,
        question: findingContext.question,
        response: existing?.response ?? null,
        notes: existing?.notes ?? undefined,
        finding_created: true,
      });
    }
    setShowFindingDialog(false);
    setFindingContext(null);
  }

  async function handleSave() {
    if (!selectedTypeId) return;
    
    setLoading(true);
    try {
      if (isNew) {
        const input: CreateAuditInput = {
          audit_type_id: selectedTypeId,
          location: location || undefined,
          auditor_name: auditorName || undefined,
        };
        const { data, error } = await createAudit(input);
        if (error) {
          alert(error);
          return;
        }
        router.push(`/hse/audits/${data?.id}`);
      } else if (audit) {
        const { error } = await updateAudit(audit.id, {
          location: location || undefined,
          auditor_name: auditorName || undefined,
          checklist_responses: responses,
          summary: summary || undefined,
        });
        if (error) {
          alert(error);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!audit) return;
    
    setLoading(true);
    try {
      const { error } = await startAudit(audit.id);
      if (error) {
        alert(error);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (!audit) return;
    
    setLoading(true);
    try {
      const input: CompleteAuditInput = {
        checklist_responses: responses,
        summary: summary || undefined,
      };
      const { error } = await completeAudit(audit.id, input);
      if (error) {
        alert(error);
        return;
      }
      router.push(`/hse/audits/${audit.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'New Audit' : `Audit ${audit?.audit_number}`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Audit Type</Label>
              <Select
                value={selectedTypeId}
                onValueChange={setSelectedTypeId}
                disabled={!isNew}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audit type" />
                </SelectTrigger>
                <SelectContent>
                  {auditTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                disabled={isCompleted}
              />
            </div>

            <div className="space-y-2">
              <Label>Auditor Name</Label>
              <Input
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder="Enter auditor name"
                disabled={isCompleted}
              />
            </div>
          </div>

          {!isNew && (
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Enter audit summary..."
                rows={3}
                disabled={isCompleted}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedType && (isInProgress || isCompleted) && (
        <ChecklistForm
          template={selectedType.checklist_template}
          responses={responses}
          onResponseChange={handleResponseChange}
          onAddFinding={handleAddFinding}
          readOnly={isCompleted}
        />
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>

        {isNew && (
          <Button onClick={handleSave} disabled={loading || !selectedTypeId}>
            <Save className="h-4 w-4 mr-2" />
            Create Audit
          </Button>
        )}

        {isScheduled && (
          <>
            <Button variant="outline" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleStart} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Start Audit
            </Button>
          </>
        )}

        {isInProgress && (
          <>
            <Button variant="outline" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Progress
            </Button>
            <Button onClick={handleComplete} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Audit
            </Button>
          </>
        )}
      </div>

      {showFindingDialog && audit && findingContext && (
        <FindingFormDialog
          auditId={audit.id}
          defaultDescription={`Issue found during checklist item: ${findingContext.question}`}
          onClose={() => setShowFindingDialog(false)}
          onCreated={handleFindingCreated}
        />
      )}
    </div>
  );
}
