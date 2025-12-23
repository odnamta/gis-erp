// =====================================================
// v0.65: SCHEDULED REPORT UTILITIES
// =====================================================

import {
  ScheduledReport,
  ScheduledReportDB,
  ReportHistory,
  ReportHistoryDB,
  ScheduledReportFormData,
  ScheduleType,
  ReportValidationResult,
  VALID_REPORT_TYPES,
  VALID_SCHEDULE_TYPES,
  VALID_ATTACHMENT_FORMATS,
  VALID_DELIVERY_CHANNELS,
  VALID_SECTION_TYPES,
} from '@/types/scheduled-reports';

/**
 * Map ScheduledReport from database format to TypeScript format
 */
export function mapScheduledReportFromDB(row: ScheduledReportDB): ScheduledReport {
  return {
    id: row.id,
    reportCode: row.report_code,
    reportName: row.report_name,
    description: row.description,
    reportType: row.report_type as ScheduledReport['reportType'],
    reportConfig: row.report_config,
    scheduleType: row.schedule_type as ScheduleType,
    scheduleDay: row.schedule_day,
    scheduleTime: row.schedule_time,
    timezone: row.timezone,
    recipients: row.recipients || [],
    deliveryChannels: row.delivery_channels as ScheduledReport['deliveryChannels'],
    emailSubjectTemplate: row.email_subject_template,
    includeAttachments: row.include_attachments,
    attachmentFormat: row.attachment_format as ScheduledReport['attachmentFormat'],
    isActive: row.is_active,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * Map ReportHistory from database format to TypeScript format
 */
export function mapReportHistoryFromDB(row: ReportHistoryDB): ReportHistory {
  return {
    id: row.id,
    scheduledReportId: row.scheduled_report_id,
    generatedAt: row.generated_at,
    reportPeriodStart: row.report_period_start,
    reportPeriodEnd: row.report_period_end,
    pdfUrl: row.pdf_url,
    excelUrl: row.excel_url,
    recipientsCount: row.recipients_count,
    deliveryStatus: row.delivery_status as ReportHistory['deliveryStatus'],
    deliveryDetails: row.delivery_details,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    scheduledReport: row.scheduled_reports 
      ? mapScheduledReportFromDB(row.scheduled_reports) 
      : undefined,
  };
}

/**
 * Calculate the next run time for a scheduled report
 */
export function calculateNextRunTime(
  scheduleType: ScheduleType,
  scheduleTime: string,
  scheduleDay?: number,
  fromDate: Date = new Date()
): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const nextRun = new Date(fromDate);
  
  // Set the time
  nextRun.setHours(hours, minutes, 0, 0);

  switch (scheduleType) {
    case 'daily':
      // If time has passed today, schedule for tomorrow
      if (nextRun <= fromDate) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      // scheduleDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const targetDay = scheduleDay ?? 1; // Default to Monday
      const currentDay = nextRun.getDay();
      let daysUntilTarget = targetDay - currentDay;
      
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= fromDate)) {
        daysUntilTarget += 7;
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      // scheduleDay: 1-31 for day of month
      const targetDayOfMonth = scheduleDay ?? 1; // Default to 1st
      nextRun.setDate(targetDayOfMonth);
      
      // If the date has passed this month, move to next month
      if (nextRun <= fromDate) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(targetDayOfMonth);
      }
      
      // Handle months with fewer days
      const maxDays = new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate();
      if (targetDayOfMonth > maxDays) {
        nextRun.setDate(maxDays);
      }
      break;

    case 'quarterly':
      // scheduleDay: 1-31 for day of quarter start month
      const targetQuarterDay = scheduleDay ?? 1;
      const currentMonth = nextRun.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      
      nextRun.setMonth(quarterStartMonth);
      nextRun.setDate(targetQuarterDay);
      
      // If the date has passed this quarter, move to next quarter
      if (nextRun <= fromDate) {
        nextRun.setMonth(quarterStartMonth + 3);
        nextRun.setDate(targetQuarterDay);
      }
      break;
  }

  return nextRun;
}

/**
 * Get the report period for a scheduled report
 */
export function getReportPeriod(
  scheduleType: ScheduleType,
  runDate: Date = new Date()
): { start: Date; end: Date } {
  const end = new Date(runDate);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(runDate);
  start.setHours(0, 0, 0, 0);

  switch (scheduleType) {
    case 'daily':
      // Previous day
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;

    case 'weekly':
      // Previous 7 days
      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() - 1);
      break;

    case 'monthly':
      // Previous month
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0); // Last day of previous month
      break;

    case 'quarterly':
      // Previous quarter
      const currentQuarter = Math.floor(end.getMonth() / 3);
      const prevQuarterStart = (currentQuarter - 1 + 4) % 4 * 3;
      const prevQuarterYear = currentQuarter === 0 ? end.getFullYear() - 1 : end.getFullYear();
      
      start.setFullYear(prevQuarterYear);
      start.setMonth(prevQuarterStart);
      start.setDate(1);
      
      end.setFullYear(prevQuarterYear);
      end.setMonth(prevQuarterStart + 3);
      end.setDate(0); // Last day of quarter
      break;
  }

  return { start, end };
}

/**
 * Validate scheduled report form data
 */
export function validateScheduledReport(report: ScheduledReportFormData): ReportValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!report.reportCode || report.reportCode.length > 30) {
    errors.push('Report code is required and must be <= 30 characters');
  }

  if (!report.reportName || report.reportName.length > 100) {
    errors.push('Report name is required and must be <= 100 characters');
  }

  if (!report.reportType || !VALID_REPORT_TYPES.includes(report.reportType)) {
    errors.push('Valid report type is required');
  }

  if (!report.scheduleType || !VALID_SCHEDULE_TYPES.includes(report.scheduleType)) {
    errors.push('Valid schedule type is required');
  }

  // Schedule time validation
  if (!report.scheduleTime || !/^\d{2}:\d{2}$/.test(report.scheduleTime)) {
    errors.push('Schedule time must be in HH:MM format');
  }

  // Schedule day validation
  if (report.scheduleType === 'weekly') {
    if (report.scheduleDay === undefined || report.scheduleDay < 0 || report.scheduleDay > 6) {
      errors.push('Schedule day must be 0-6 for weekly reports');
    }
  } else if (report.scheduleType === 'monthly' || report.scheduleType === 'quarterly') {
    if (report.scheduleDay === undefined || report.scheduleDay < 1 || report.scheduleDay > 31) {
      errors.push('Schedule day must be 1-31 for monthly/quarterly reports');
    }
  }

  // Recipients validation
  if (!report.recipients || report.recipients.length === 0) {
    errors.push('At least one recipient is required');
  }

  // Delivery channels validation
  if (!report.deliveryChannels || report.deliveryChannels.length === 0) {
    errors.push('At least one delivery channel is required');
  } else {
    for (const channel of report.deliveryChannels) {
      if (!VALID_DELIVERY_CHANNELS.includes(channel)) {
        errors.push(`Invalid delivery channel: ${channel}`);
      }
    }
  }

  // Attachment format validation
  if (report.includeAttachments && !VALID_ATTACHMENT_FORMATS.includes(report.attachmentFormat)) {
    errors.push('Valid attachment format is required when attachments are enabled');
  }

  // Report config validation
  if (!report.reportConfig || !report.reportConfig.sections || report.reportConfig.sections.length === 0) {
    errors.push('At least one report section is required');
  } else {
    for (const section of report.reportConfig.sections) {
      if (!VALID_SECTION_TYPES.includes(section.type)) {
        errors.push(`Invalid section type: ${section.type}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format schedule description for display
 */
export function formatScheduleDescription(
  scheduleType: ScheduleType,
  scheduleTime: string,
  scheduleDay?: number
): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  switch (scheduleType) {
    case 'daily':
      return `Daily at ${scheduleTime}`;
    case 'weekly':
      return `Every ${dayNames[scheduleDay ?? 1]} at ${scheduleTime}`;
    case 'monthly':
      return `Monthly on day ${scheduleDay ?? 1} at ${scheduleTime}`;
    case 'quarterly':
      return `Quarterly on day ${scheduleDay ?? 1} at ${scheduleTime}`;
    default:
      return `${scheduleType} at ${scheduleTime}`;
  }
}

/**
 * Get relative time until next run
 */
export function getTimeUntilNextRun(nextRunAt: string | Date): string {
  const nextRun = new Date(nextRunAt);
  const now = new Date();
  const diffMs = nextRun.getTime() - now.getTime();
  
  if (diffMs < 0) return 'Overdue';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  if (diffDays < 7) return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  
  return nextRun.toLocaleDateString('id-ID');
}

/**
 * Check if a report is due to run
 */
export function isReportDue(nextRunAt: string | Date): boolean {
  const nextRun = new Date(nextRunAt);
  const now = new Date();
  return nextRun <= now;
}
