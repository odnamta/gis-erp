'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeePPEStatus, EmployeeComplianceSummary } from '@/types/ppe';
import {
  getEmployeeComplianceSummary,
} from '@/lib/ppe-utils';
import { Search, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ComplianceTableProps {
  statuses: EmployeePPEStatus[];
}

export function ComplianceTable({ statuses }: ComplianceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const summaries = useMemo(() => {
    return getEmployeeComplianceSummary(statuses);
  }, [statuses]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter(summary => {
      const matchesSearch =
        summary.employeeName.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterStatus === 'all') return matchesSearch;
      if (filterStatus === 'compliant') return matchesSearch && summary.isCompliant;
      if (filterStatus === 'non-compliant') return matchesSearch && !summary.isCompliant;
      if (filterStatus === 'missing') return matchesSearch && summary.missing > 0;
      if (filterStatus === 'overdue') return matchesSearch && summary.overdue > 0;
      if (filterStatus === 'due_soon') return matchesSearch && summary.dueSoon > 0;

      return matchesSearch;
    });
  }, [summaries, searchTerm, filterStatus]);

  const getComplianceIcon = (summary: EmployeeComplianceSummary) => {
    if (summary.missing > 0 || summary.overdue > 0) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (summary.dueSoon > 0) {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="non-compliant">Non-Compliant</SelectItem>
            <SelectItem value="missing">Missing PPE</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="due_soon">Due Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Mandatory PPE</TableHead>
              <TableHead className="text-center">Issued</TableHead>
              <TableHead className="text-center">Missing</TableHead>
              <TableHead className="text-center">Overdue</TableHead>
              <TableHead className="text-center">Due Soon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSummaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No employees found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredSummaries.map(summary => (
                <TableRow key={summary.employeeId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getComplianceIcon(summary)}
                      <span className="font-medium">{summary.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {summary.isCompliant ? (
                      <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                    ) : (
                      <Badge variant="destructive">Non-Compliant</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {summary.totalMandatory}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-green-600">{summary.issued}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {summary.missing > 0 ? (
                      <Badge variant="destructive">{summary.missing}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {summary.overdue > 0 ? (
                      <Badge variant="destructive">{summary.overdue}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {summary.dueSoon > 0 ? (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                        {summary.dueSoon}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span>Compliant</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span>Due Soon</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-4 w-4 text-red-600" />
          <span>Missing/Overdue</span>
        </div>
      </div>
    </div>
  );
}
