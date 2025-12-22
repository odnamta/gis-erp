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
import { Eye, Edit, Search } from 'lucide-react';
import { Audit, AUDIT_STATUSES } from '@/types/audit';
import { formatDate } from '@/lib/pjo-utils';
import { formatAuditStatus, getAuditStatusColor, getAuditRatingColor, formatAuditRating } from '@/lib/audit-utils';

interface AuditListProps {
  audits: Audit[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

export function AuditList({ audits, onView, onEdit }: AuditListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch = 
      audit.audit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Audits</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by audit number or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {AUDIT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatAuditStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAudits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No audits found
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">{audit.audit_number}</TableCell>
                  <TableCell>
                    {(audit as any).audit_types?.type_name || '-'}
                  </TableCell>
                  <TableCell>
                    {audit.conducted_date 
                      ? formatDate(audit.conducted_date)
                      : audit.scheduled_date 
                        ? formatDate(audit.scheduled_date)
                        : '-'}
                  </TableCell>
                  <TableCell>{audit.location || '-'}</TableCell>
                  <TableCell>
                    {audit.overall_score !== null ? (
                      <div className="flex items-center gap-2">
                        <span>{audit.overall_score.toFixed(0)}%</span>
                        {audit.overall_rating && (
                          <Badge className={getAuditRatingColor(audit.overall_rating)}>
                            {formatAuditRating(audit.overall_rating)}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getAuditStatusColor(audit.status)}>
                      {formatAuditStatus(audit.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(audit.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {audit.status !== 'completed' && audit.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(audit.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
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
