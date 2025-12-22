'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, CheckCircle, Search } from 'lucide-react';
import { AuditFinding, FINDING_SEVERITIES, FINDING_STATUSES } from '@/types/audit';
import { formatDate } from '@/lib/pjo-utils';
import {
  formatSeverity,
  formatFindingStatus,
  getSeverityColor,
  getFindingStatusColor,
} from '@/lib/audit-utils';

interface FindingListProps {
  findings: AuditFinding[];
  onView: (id: string) => void;
  onClose: (id: string) => void;
}

export function FindingList({ findings, onView, onClose }: FindingListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredFindings = findings.filter((finding) => {
    const matchesSearch = finding.finding_description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || finding.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Findings</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {FINDING_SEVERITIES.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {formatSeverity(severity)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {FINDING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatFindingStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFindings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No findings found
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Audit</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFindings.map((finding) => (
                <TableRow key={finding.id}>
                  <TableCell>
                    <Badge className={getSeverityColor(finding.severity)}>
                      {formatSeverity(finding.severity)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="truncate">{finding.finding_description}</p>
                  </TableCell>
                  <TableCell>
                    {(finding as any).audits?.audit_number || '-'}
                  </TableCell>
                  <TableCell>
                    {finding.due_date ? formatDate(finding.due_date) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getFindingStatusColor(finding.status)}>
                      {formatFindingStatus(finding.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(finding.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {finding.status === 'open' || finding.status === 'in_progress' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onClose(finding.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
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
