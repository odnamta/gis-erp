'use client';

// =====================================================
// v0.65: SCHEDULED REPORTS CLIENT COMPONENT
// =====================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { ScheduledReport } from '@/types/scheduled-reports';
import { ScheduledReportsTable } from '@/components/alerts/scheduled-reports-table';
import { deleteScheduledReport, toggleScheduledReportStatus } from '@/lib/scheduled-report-actions';
import { useToast } from '@/hooks/use-toast';

interface ScheduledReportsClientProps {
  initialReports: ScheduledReport[];
}

export function ScheduledReportsClient({ initialReports }: ScheduledReportsClientProps) {
  const [reports, setReports] = useState(initialReports);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleEdit = (report: ScheduledReport) => {
    toast({
      title: 'Edit Report',
      description: `Editing ${report.reportName}`,
    });
  };

  const handleDelete = async (reportId: string) => {
    const { success, error } = await deleteScheduledReport(reportId);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (success) {
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({
        title: 'Report Deleted',
        description: 'The scheduled report has been deleted.',
      });
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleToggleStatus = async (reportId: string) => {
    const { data, error } = await toggleScheduledReportStatus(reportId);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setReports(prev => prev.map(r => r.id === reportId ? data : r));
      toast({
        title: data.isActive ? 'Report Enabled' : 'Report Disabled',
        description: `${data.reportName} is now ${data.isActive ? 'active' : 'inactive'}.`,
      });
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleRunNow = async (reportId: string) => {
    toast({
      title: 'Running Report',
      description: 'The report is being generated...',
    });
  };

  const handleViewHistory = (reportId: string) => {
    router.push(`/dashboard/reports/scheduled/${reportId}/history`);
  };

  const handleCreateReport = () => {
    toast({
      title: 'Create Report',
      description: 'Report creation form coming soon',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Scheduled Reports
        </CardTitle>
        <Button onClick={handleCreateReport}>
          <Plus className="h-4 w-4 mr-2" />
          Create Report
        </Button>
      </CardHeader>
      <CardContent>
        <ScheduledReportsTable
          reports={reports}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          onRunNow={handleRunNow}
          onViewHistory={handleViewHistory}
        />
      </CardContent>
    </Card>
  );
}
