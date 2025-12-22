'use client';

// Revision History Component
// Displays all revisions for a drawing

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DrawingRevisionWithDetails, CHANGE_REASON_LABELS } from '@/types/drawing';
import { formatDrawingDate } from '@/lib/drawing-utils';
import { History, CheckCircle } from 'lucide-react';

interface RevisionHistoryProps {
  revisions: DrawingRevisionWithDetails[];
}

export function RevisionHistory({ revisions }: RevisionHistoryProps) {
  if (revisions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Revision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No revisions recorded yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Revision History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rev</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Change Description</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map((revision) => (
                <TableRow key={revision.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {revision.revision_number}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDrawingDate(revision.revision_date || revision.created_at)}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    {revision.change_description}
                  </TableCell>
                  <TableCell>
                    {revision.change_reason ? (
                      <Badge variant="secondary">
                        {CHANGE_REASON_LABELS[revision.change_reason]}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {revision.drafted_by_employee?.full_name || '-'}
                  </TableCell>
                  <TableCell>
                    {revision.is_current ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
