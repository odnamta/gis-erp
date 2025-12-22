'use client';

// Transmittal List Component
// Displays list of drawing transmittals

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DrawingTransmittalWithDetails,
  TransmittalStatus,
  PURPOSE_LABELS,
} from '@/types/drawing';
import { formatDrawingDate } from '@/lib/drawing-utils';
import { Send, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransmittalListProps {
  transmittals: DrawingTransmittalWithDetails[];
}

const STATUS_CONFIG: Record<TransmittalStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800' },
  acknowledged: { label: 'Acknowledged', color: 'bg-green-100 text-green-800' },
};

export function TransmittalList({ transmittals }: TransmittalListProps) {
  if (transmittals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Transmittals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No transmittals found.</p>
            <p className="text-sm mt-1">
              Create a transmittal to distribute drawings to external parties.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Transmittals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transmittal No.</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Drawings</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transmittals.map((transmittal) => {
                const statusConfig = STATUS_CONFIG[transmittal.status];
                const drawingCount = transmittal.drawings?.length || 0;

                return (
                  <TableRow key={transmittal.id}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/engineering/drawings/transmittals/${transmittal.id}`}
                        className="hover:underline text-primary"
                      >
                        {transmittal.transmittal_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transmittal.recipient_company}</p>
                        {transmittal.recipient_name && (
                          <p className="text-sm text-muted-foreground">
                            {transmittal.recipient_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PURPOSE_LABELS[transmittal.purpose]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{drawingCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {transmittal.project?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDrawingDate(transmittal.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/engineering/drawings/transmittals/${transmittal.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mt-4">
          Showing {transmittals.length} transmittal{transmittals.length !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
