'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye, CheckCircle } from 'lucide-react';
import { OpenFindingView } from '@/types/audit';
import { formatDate } from '@/lib/pjo-utils';
import { getSeverityColor, formatSeverity } from '@/lib/audit-utils';

interface CriticalFindingsListProps {
  findings: OpenFindingView[];
  onViewFinding: (id: string) => void;
  onMarkComplete: (id: string) => void;
}

export function CriticalFindingsList({
  findings,
  onViewFinding,
  onMarkComplete,
}: CriticalFindingsListProps) {
  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Critical & Major Open Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No critical or major findings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Critical & Major Open Findings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {findings.map((finding) => (
          <div
            key={finding.id}
            className="flex items-start justify-between p-3 rounded-lg border border-gray-200"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getSeverityColor(finding.severity)}>
                  {formatSeverity(finding.severity).toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {finding.audit_number} Finding #{finding.finding_number}
                </span>
              </div>
              <p className="text-sm font-medium mb-1">
                {finding.finding_description}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {finding.due_date && (
                  <span className={finding.days_overdue && finding.days_overdue > 0 ? 'text-red-600' : ''}>
                    Due: {formatDate(finding.due_date)}
                    {finding.days_overdue && finding.days_overdue > 0 && (
                      <span className="ml-1">({finding.days_overdue} days overdue)</span>
                    )}
                  </span>
                )}
                {finding.responsible_name && (
                  <span>Responsible: {finding.responsible_name}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewFinding(finding.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkComplete(finding.id)}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
