'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Plus, AlertTriangle } from 'lucide-react';
import { AuditScheduleItem } from '@/types/audit';
import { formatDate } from '@/lib/pjo-utils';

interface AuditScheduleViewProps {
  schedule: AuditScheduleItem[];
  onScheduleAudit: (auditTypeId: string, date: Date) => void;
}

export function AuditScheduleView({ schedule, onScheduleAudit }: AuditScheduleViewProps) {
  // Sort: overdue first, then by next_due
  const sortedSchedule = [...schedule].sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1;
    if (!a.is_overdue && b.is_overdue) return 1;
    if (!a.next_due || !b.next_due) return 0;
    return new Date(a.next_due).getTime() - new Date(b.next_due).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Audit Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedSchedule.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recurring audits configured
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Last Conducted</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSchedule.map((item) => (
                <TableRow key={item.audit_type_id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.type_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.type_code})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    Every {item.frequency_days} day{item.frequency_days !== 1 ? 's' : ''}
                  </TableCell>
                  <TableCell>
                    {item.last_conducted ? formatDate(item.last_conducted) : 'Never'}
                  </TableCell>
                  <TableCell>
                    {item.next_due ? (
                      <span className={item.is_overdue ? 'text-red-600 font-medium' : ''}>
                        {formatDate(item.next_due)}
                      </span>
                    ) : (
                      'Not scheduled'
                    )}
                  </TableCell>
                  <TableCell>
                    {item.is_overdue ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </Badge>
                    ) : item.next_due ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        On Track
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onScheduleAudit(item.audit_type_id, new Date())}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Schedule
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
