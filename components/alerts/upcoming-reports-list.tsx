'use client';

// =====================================================
// v0.65: UPCOMING REPORTS LIST COMPONENT
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, Users, Play, Calendar } from 'lucide-react';
import { ScheduledReport } from '@/types/scheduled-reports';
import { getTimeUntilNextRun, formatScheduleDescription } from '@/lib/scheduled-report-utils';

interface UpcomingReportsListProps {
  reports: ScheduledReport[];
  onRunNow?: (reportId: string) => Promise<void>;
  onViewDetails?: (reportId: string) => void;
  title?: string;
  maxItems?: number;
}

const reportTypeColors: Record<string, string> = {
  executive_summary: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  financial: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  operations: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  sales: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  hse: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export function UpcomingReportsList({
  reports,
  onRunNow,
  onViewDetails,
  title = 'Upcoming Reports',
  maxItems = 5,
}: UpcomingReportsListProps) {
  // Sort by next run time and filter active reports
  const activeReports = reports
    .filter(r => r.isActive && r.nextRunAt)
    .sort((a, b) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime())
    .slice(0, maxItems);

  if (activeReports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No scheduled reports</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a scheduled report to automate delivery
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
          <Calendar className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeReports.map((report) => (
          <div
            key={report.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{report.reportName}</span>
                <Badge
                  variant="secondary"
                  className={reportTypeColors[report.reportType] || reportTypeColors.custom}
                >
                  {report.reportType.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {report.nextRunAt ? getTimeUntilNextRun(report.nextRunAt) : 'Not scheduled'}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                </div>
                <div>
                  {formatScheduleDescription(report.scheduleType, report.scheduleTime, report.scheduleDay)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {onRunNow && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRunNow(report.id)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run Now
                </Button>
              )}
              {onViewDetails && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewDetails(report.id)}
                >
                  View
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
