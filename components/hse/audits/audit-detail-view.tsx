'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChecklistForm } from './checklist-form';
import { Audit, AuditType, AuditFinding } from '@/types/audit';
import { formatDate } from '@/lib/pjo-utils';
import {
  formatAuditStatus,
  formatAuditRating,
  formatSeverity,
  getAuditStatusColor,
  getAuditRatingColor,
  getSeverityColor,
  getFindingStatusColor,
  formatFindingStatus,
} from '@/lib/audit-utils';

interface AuditDetailViewProps {
  audit: Audit;
  auditType?: AuditType;
  findings?: AuditFinding[];
}

export function AuditDetailView({ audit, auditType, findings = [] }: AuditDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{audit.audit_number}</CardTitle>
            <Badge className={getAuditStatusColor(audit.status)}>
              {formatAuditStatus(audit.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Audit Type</p>
              <p className="font-medium">{auditType?.type_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{audit.location || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auditor</p>
              <p className="font-medium">{audit.auditor_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conducted Date</p>
              <p className="font-medium">
                {audit.conducted_date ? formatDate(audit.conducted_date) : '-'}
              </p>
            </div>
          </div>

          {audit.status === 'completed' && (
            <>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className="text-2xl font-bold">
                    {audit.overall_score !== null ? `${audit.overall_score.toFixed(0)}%` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  {audit.overall_rating && (
                    <Badge className={`${getAuditRatingColor(audit.overall_rating)} mt-1`}>
                      {formatAuditRating(audit.overall_rating)}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Findings</p>
                  <div className="flex gap-2 mt-1">
                    {audit.critical_findings > 0 && (
                      <Badge variant="destructive">{audit.critical_findings} Critical</Badge>
                    )}
                    {audit.major_findings > 0 && (
                      <Badge className="bg-orange-100 text-orange-800">{audit.major_findings} Major</Badge>
                    )}
                    {audit.minor_findings > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800">{audit.minor_findings} Minor</Badge>
                    )}
                    {audit.observations > 0 && (
                      <Badge variant="secondary">{audit.observations} Obs</Badge>
                    )}
                    {audit.critical_findings === 0 && audit.major_findings === 0 && 
                     audit.minor_findings === 0 && audit.observations === 0 && (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-medium">
                    {audit.completed_at ? formatDate(audit.completed_at) : '-'}
                  </p>
                </div>
              </div>
            </>
          )}

          {audit.summary && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Summary</p>
                <p className="text-sm">{audit.summary}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Checklist Responses */}
      {auditType && audit.checklist_responses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Checklist Responses</h3>
          <ChecklistForm
            template={auditType.checklist_template}
            responses={audit.checklist_responses}
            onResponseChange={() => {}}
            onAddFinding={() => {}}
            readOnly
          />
        </div>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Findings ({findings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(finding.severity)}>
                      {formatSeverity(finding.severity)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Finding #{finding.finding_number}
                    </span>
                  </div>
                  <Badge className={getFindingStatusColor(finding.status)}>
                    {formatFindingStatus(finding.status)}
                  </Badge>
                </div>
                <p className="text-sm">{finding.finding_description}</p>
                {finding.corrective_action && (
                  <div>
                    <p className="text-xs text-muted-foreground">Corrective Action:</p>
                    <p className="text-sm">{finding.corrective_action}</p>
                  </div>
                )}
                {finding.due_date && (
                  <p className="text-xs text-muted-foreground">
                    Due: {formatDate(finding.due_date)}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
