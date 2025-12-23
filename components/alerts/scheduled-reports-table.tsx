'use client';

// =====================================================
// v0.65: SCHEDULED REPORTS TABLE COMPONENT
// =====================================================

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, Play, History, Users } from 'lucide-react';
import { ScheduledReport } from '@/types/scheduled-reports';
import { formatScheduleDescription, getTimeUntilNextRun } from '@/lib/scheduled-report-utils';

interface ScheduledReportsTableProps {
  reports: ScheduledReport[];
  onEdit?: (report: ScheduledReport) => void;
  onDelete?: (reportId: string) => Promise<void>;
  onToggleStatus?: (reportId: string) => Promise<void>;
  onRunNow?: (reportId: string) => Promise<void>;
  onViewHistory?: (reportId: string) => void;
}

const reportTypeColors: Record<string, string> = {
  executive_summary: 'bg-purple-100 text-purple-800',
  financial: 'bg-green-100 text-green-800',
  operations: 'bg-blue-100 text-blue-800',
  sales: 'bg-orange-100 text-orange-800',
  hse: 'bg-red-100 text-red-800',
  custom: 'bg-gray-100 text-gray-800',
};

export function ScheduledReportsTable({
  reports,
  onEdit,
  onDelete,
  onToggleStatus,
  onRunNow,
  onViewHistory,
}: ScheduledReportsTableProps) {
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteReportId || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteReportId);
    } finally {
      setIsDeleting(false);
      setDeleteReportId(null);
    }
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scheduled reports configured. Create your first report to automate delivery.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Report</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{report.reportName}</div>
                  <div className="text-xs text-muted-foreground">{report.reportCode}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={reportTypeColors[report.reportType] || reportTypeColors.custom}
                >
                  {report.reportType.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatScheduleDescription(report.scheduleType, report.scheduleTime, report.scheduleDay)}
                </div>
              </TableCell>
              <TableCell>
                {report.nextRunAt ? (
                  <div className="text-sm">
                    {getTimeUntilNextRun(report.nextRunAt)}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {report.recipients.length}
                </div>
              </TableCell>
              <TableCell>
                <Switch
                  checked={report.isActive}
                  onCheckedChange={() => onToggleStatus?.(report.id)}
                />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onRunNow?.(report.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewHistory?.(report.id)}>
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(report)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteReportId(report.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteReportId} onOpenChange={() => setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scheduled report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
