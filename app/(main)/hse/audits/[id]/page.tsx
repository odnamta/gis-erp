'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AuditDetailView } from '@/components/hse/audits/audit-detail-view';
import { AuditForm } from '@/components/hse/audits/audit-form';
import { ArrowLeft, Edit } from 'lucide-react';
import { getAudit, getAuditType, getFindingsByAudit } from '@/lib/audit-actions';
import { Audit, AuditType, AuditFinding } from '@/types/audit';

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [auditType, setAuditType] = useState<AuditType | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [editMode, setEditMode] = useState(false);

  const auditId = params.id as string;

  useEffect(() => {
    loadAudit();
  }, [auditId]);

  async function loadAudit() {
    setLoading(true);
    const { data: auditData, error } = await getAudit(auditId);
    
    if (error || !auditData) {
      router.push('/hse/audits');
      return;
    }

    setAudit(auditData);

    // Load audit type
    const { data: typeData } = await getAuditType(auditData.audit_type_id);
    if (typeData) {
      setAuditType(typeData);
    }

    // Load findings
    const { data: findingsData } = await getFindingsByAudit(auditId);
    setFindings(findingsData);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!audit) {
    return null;
  }

  const canEdit = audit.status !== 'completed' && audit.status !== 'cancelled';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/hse/audits')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {editMode ? 'Edit Audit' : 'Audit Details'}
          </h1>
        </div>
        {canEdit && !editMode && (
          <Button onClick={() => setEditMode(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {editMode ? (
        <AuditForm audit={audit} auditType={auditType || undefined} />
      ) : (
        <AuditDetailView
          audit={audit}
          auditType={auditType || undefined}
          findings={findings}
        />
      )}
    </div>
  );
}
