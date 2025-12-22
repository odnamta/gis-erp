'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, Play } from 'lucide-react';
import { AuditScheduleItem } from '@/types/audit';
import { formatDate } from '@/lib/pjo-utils';

interface UpcomingAuditsListProps {
  audits: AuditScheduleItem[];
  onStartAudit: (auditTypeId: string) => void;
}

export function UpcomingAuditsList({ audits, onStartAudit }: UpcomingAuditsListProps) {
  if (audits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No audits due soon</p>
        </CardContent>
      </Card>
    );
  }

  // Sort: overdue first, then by next_due date
  const sortedAudits = [...audits].sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1;
    if (!a.is_overdue && b.is_overdue) return 1;
    if (!a.next_due || !b.next_due) return 0;
    return new Date(a.next_due).getTime() - new Date(b.next_due).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upcoming Audits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAudits.map((audit) => (
          <div
            key={audit.audit_type_id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              audit.is_overdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {audit.is_overdue ? (
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              ) : (
                <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{audit.type_name}</span>
                  {audit.is_overdue && (
                    <Badge variant="destructive" className="text-xs">
                      OVERDUE
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {audit.next_due ? (
                    <>
                      Due: {formatDate(audit.next_due)}
                      {audit.is_overdue && (
                        <span className="text-red-600 ml-1">
                          ({Math.abs(Math.floor((new Date().getTime() - new Date(audit.next_due).getTime()) / (1000 * 60 * 60 * 24)))} days overdue)
                        </span>
                      )}
                    </>
                  ) : (
                    'No due date'
                  )}
                </p>
                {audit.last_conducted && (
                  <p className="text-xs text-muted-foreground">
                    Last conducted: {formatDate(audit.last_conducted)}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onStartAudit(audit.audit_type_id)}
            >
              <Play className="h-4 w-4 mr-1" />
              Start Audit
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
