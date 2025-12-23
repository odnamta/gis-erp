// =====================================================
// v0.65: SCHEDULED REPORTS TYPES
// =====================================================

import { AlertSeverity } from './alerts';

// Report Types
export type ReportType = 'executive_summary' | 'financial' | 'operations' | 'sales' | 'hse' | 'custom';
export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type AttachmentFormat = 'pdf' | 'excel' | 'both';
export type DeliveryChannel = 'email' | 'in_app' | 'download';
export type DeliveryStatus = 'pending' | 'sent' | 'partial' | 'failed';
export type ReportSectionType = 'kpi_summary' | 'chart' | 'table' | 'alerts' | 'pl_summary' | 'budget_vs_actual' | 'cash_flow' | 'ar_aging' | 'customer_profitability';

// Valid values arrays for validation
export const VALID_REPORT_TYPES: ReportType[] = ['executive_summary', 'financial', 'operations', 'sales', 'hse', 'custom'];
export const VALID_SCHEDULE_TYPES: ScheduleType[] = ['daily', 'weekly', 'monthly', 'quarterly'];
export const VALID_ATTACHMENT_FORMATS: AttachmentFormat[] = ['pdf', 'excel', 'both'];
export const VALID_DELIVERY_CHANNELS: DeliveryChannel[] = ['email', 'in_app', 'download'];
export const VALID_DELIVERY_STATUSES: DeliveryStatus[] = ['pending', 'sent', 'partial', 'failed'];
export const VALID_SECTION_TYPES: ReportSectionType[] = ['kpi_summary', 'chart', 'table', 'alerts', 'pl_summary', 'budget_vs_actual', 'cash_flow', 'ar_aging', 'customer_profitability'];

// Report Section
export interface ReportSection {
  type: ReportSectionType;
  kpiCodes?: string[];
  chartType?: string;
  content?: string;
  limit?: number;
  filters?: Record<string, unknown>;
  severity?: AlertSeverity[];
  periods?: number;
}

// Report Config
export interface ReportConfig {
  sections: ReportSection[];
}

// Report Recipient
export interface ReportRecipient {
  userId?: string;
  email: string;
  name: string;
}

// Scheduled Report (TypeScript interface)
export interface ScheduledReport {
  id: string;
  reportCode: string;
  reportName: string;
  description?: string;
  reportType: ReportType;
  reportConfig: ReportConfig;
  scheduleType: ScheduleType;
  scheduleDay?: number;
  scheduleTime: string;
  timezone: string;
  recipients: ReportRecipient[];
  deliveryChannels: DeliveryChannel[];
  emailSubjectTemplate?: string;
  includeAttachments: boolean;
  attachmentFormat: AttachmentFormat;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdBy?: string;
  createdAt: string;
}

// Scheduled Report from database (snake_case)
export interface ScheduledReportDB {
  id: string;
  report_code: string;
  report_name: string;
  description?: string;
  report_type: string;
  report_config: ReportConfig;
  schedule_type: string;
  schedule_day?: number;
  schedule_time: string;
  timezone: string;
  recipients: ReportRecipient[];
  delivery_channels: string[];
  email_subject_template?: string;
  include_attachments: boolean;
  attachment_format: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_by?: string;
  created_at: string;
}

// Delivery Detail
export interface DeliveryDetail {
  recipientEmail: string;
  status: 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

// Report History (TypeScript interface)
export interface ReportHistory {
  id: string;
  scheduledReportId?: string;
  generatedAt: string;
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  pdfUrl?: string;
  excelUrl?: string;
  recipientsCount: number;
  deliveryStatus: DeliveryStatus;
  deliveryDetails?: DeliveryDetail[];
  errorMessage?: string;
  createdAt: string;
  // Joined fields
  scheduledReport?: ScheduledReport;
}

// Report History from database (snake_case)
export interface ReportHistoryDB {
  id: string;
  scheduled_report_id?: string;
  generated_at: string;
  report_period_start?: string;
  report_period_end?: string;
  pdf_url?: string;
  excel_url?: string;
  recipients_count: number;
  delivery_status: string;
  delivery_details?: DeliveryDetail[];
  error_message?: string;
  created_at: string;
  // Joined fields
  scheduled_reports?: ScheduledReportDB;
}

// Scheduled Report Form Data
export interface ScheduledReportFormData {
  reportCode: string;
  reportName: string;
  description?: string;
  reportType: ReportType;
  reportConfig: ReportConfig;
  scheduleType: ScheduleType;
  scheduleDay?: number;
  scheduleTime: string;
  timezone: string;
  recipients: ReportRecipient[];
  deliveryChannels: DeliveryChannel[];
  emailSubjectTemplate?: string;
  includeAttachments: boolean;
  attachmentFormat: AttachmentFormat;
  isActive: boolean;
}

// Report Filters
export interface ReportFilters {
  reportType?: ReportType | 'all';
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// Report History Filters
export interface ReportHistoryFilters {
  scheduledReportId?: string;
  deliveryStatus?: DeliveryStatus | 'all';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Upcoming Report Display
export interface UpcomingReport {
  id: string;
  reportName: string;
  reportType: ReportType;
  nextRunAt: string;
  recipientsCount: number;
  scheduleType: ScheduleType;
}

// Validation Result
export interface ReportValidationResult {
  valid: boolean;
  errors: string[];
}
