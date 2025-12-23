'use server';

// =====================================================
// v0.65: SCHEDULED REPORT SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  ScheduledReport,
  ReportHistory,
  ScheduledReportFormData,
  ReportFilters,
  ReportHistoryFilters,
  ScheduledReportDB,
  ReportHistoryDB,
} from '@/types/scheduled-reports';
import {
  mapScheduledReportFromDB,
  mapReportHistoryFromDB,
  validateScheduledReport,
  calculateNextRunTime,
} from '@/lib/scheduled-report-utils';

// =====================================================
// SCHEDULED REPORTS CRUD
// =====================================================

export async function getScheduledReports(filters?: ReportFilters): Promise<{
  data: ScheduledReport[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('scheduled_reports')
    .select('*')
    .order('report_name');

  if (filters?.reportType && filters.reportType !== 'all') {
    query = query.eq('report_type', filters.reportType);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching scheduled reports:', error);
    return { data: null, error: error.message };
  }

  return {
    data: (data as ScheduledReportDB[])?.map(mapScheduledReportFromDB) || [],
    error: null,
  };
}

export async function getScheduledReport(id: string): Promise<{
  data: ScheduledReport | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching scheduled report:', error);
    return { data: null, error: error.message };
  }

  return {
    data: mapScheduledReportFromDB(data as ScheduledReportDB),
    error: null,
  };
}

export async function createScheduledReport(
  formData: ScheduledReportFormData,
  userId: string
): Promise<{
  data: ScheduledReport | null;
  error: string | null;
}> {
  const validation = validateScheduledReport(formData);
  if (!validation.valid) {
    return { data: null, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  const nextRunAt = calculateNextRunTime(
    formData.scheduleType,
    formData.scheduleTime,
    formData.scheduleDay
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_reports')
    .insert({
      report_code: formData.reportCode,
      report_name: formData.reportName,
      description: formData.description,
      report_type: formData.reportType,
      report_config: formData.reportConfig,
      schedule_type: formData.scheduleType,
      schedule_day: formData.scheduleDay,
      schedule_time: formData.scheduleTime,
      timezone: formData.timezone,
      recipients: formData.recipients,
      delivery_channels: formData.deliveryChannels,
      email_subject_template: formData.emailSubjectTemplate,
      include_attachments: formData.includeAttachments,
      attachment_format: formData.attachmentFormat,
      is_active: formData.isActive,
      next_run_at: nextRunAt.toISOString(),
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating scheduled report:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/reports/scheduled');

  return {
    data: mapScheduledReportFromDB(data as ScheduledReportDB),
    error: null,
  };
}


export async function updateScheduledReport(
  id: string,
  formData: Partial<ScheduledReportFormData>
): Promise<{
  data: ScheduledReport | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (formData.reportCode !== undefined) updateData.report_code = formData.reportCode;
  if (formData.reportName !== undefined) updateData.report_name = formData.reportName;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.reportType !== undefined) updateData.report_type = formData.reportType;
  if (formData.reportConfig !== undefined) updateData.report_config = formData.reportConfig;
  if (formData.scheduleType !== undefined) updateData.schedule_type = formData.scheduleType;
  if (formData.scheduleDay !== undefined) updateData.schedule_day = formData.scheduleDay;
  if (formData.scheduleTime !== undefined) updateData.schedule_time = formData.scheduleTime;
  if (formData.timezone !== undefined) updateData.timezone = formData.timezone;
  if (formData.recipients !== undefined) updateData.recipients = formData.recipients;
  if (formData.deliveryChannels !== undefined) updateData.delivery_channels = formData.deliveryChannels;
  if (formData.emailSubjectTemplate !== undefined) updateData.email_subject_template = formData.emailSubjectTemplate;
  if (formData.includeAttachments !== undefined) updateData.include_attachments = formData.includeAttachments;
  if (formData.attachmentFormat !== undefined) updateData.attachment_format = formData.attachmentFormat;
  if (formData.isActive !== undefined) updateData.is_active = formData.isActive;

  // Recalculate next run time if schedule changed
  if (formData.scheduleType || formData.scheduleTime || formData.scheduleDay) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current } = await (supabase as any)
      .from('scheduled_reports')
      .select('schedule_type, schedule_time, schedule_day')
      .eq('id', id)
      .single();

    if (current) {
      const scheduleType = formData.scheduleType || current.schedule_type;
      const scheduleTime = formData.scheduleTime || current.schedule_time;
      const scheduleDay = formData.scheduleDay ?? current.schedule_day;

      const nextRunAt = calculateNextRunTime(scheduleType, scheduleTime, scheduleDay);
      updateData.next_run_at = nextRunAt.toISOString();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_reports')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating scheduled report:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/reports/scheduled');

  return {
    data: mapScheduledReportFromDB(data as ScheduledReportDB),
    error: null,
  };
}

export async function deleteScheduledReport(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('scheduled_reports')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting scheduled report:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/reports/scheduled');

  return { success: true, error: null };
}

export async function toggleScheduledReportStatus(id: string): Promise<{
  data: ScheduledReport | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: fetchError } = await (supabase as any)
    .from('scheduled_reports')
    .select('is_active')
    .eq('id', id)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_reports')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error toggling scheduled report status:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/reports/scheduled');

  return {
    data: mapScheduledReportFromDB(data as ScheduledReportDB),
    error: null,
  };
}

// =====================================================
// REPORT HISTORY
// =====================================================

export async function getReportHistory(filters?: ReportHistoryFilters): Promise<{
  data: ReportHistory[] | null;
  error: string | null;
  count: number;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('report_history')
    .select(`
      *,
      scheduled_reports (*)
    `, { count: 'exact' })
    .order('generated_at', { ascending: false });

  if (filters?.scheduledReportId) {
    query = query.eq('scheduled_report_id', filters.scheduledReportId);
  }

  if (filters?.deliveryStatus && filters.deliveryStatus !== 'all') {
    query = query.eq('delivery_status', filters.deliveryStatus);
  }

  if (filters?.startDate) {
    query = query.gte('generated_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('generated_at', filters.endDate.toISOString());
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching report history:', error);
    return { data: null, error: error.message, count: 0 };
  }

  return {
    data: (data as ReportHistoryDB[])?.map(mapReportHistoryFromDB) || [],
    error: null,
    count: count || 0,
  };
}

export async function createReportHistory(
  scheduledReportId: string | null,
  reportPeriodStart: Date,
  reportPeriodEnd: Date,
  recipientsCount: number
): Promise<{
  data: ReportHistory | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('report_history')
    .insert({
      scheduled_report_id: scheduledReportId,
      generated_at: new Date().toISOString(),
      report_period_start: reportPeriodStart.toISOString(),
      report_period_end: reportPeriodEnd.toISOString(),
      recipients_count: recipientsCount,
      delivery_status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating report history:', error);
    return { data: null, error: error.message };
  }

  return {
    data: mapReportHistoryFromDB(data as ReportHistoryDB),
    error: null,
  };
}

export async function updateReportHistory(
  id: string,
  updates: {
    pdfUrl?: string;
    excelUrl?: string;
    deliveryStatus?: 'pending' | 'sent' | 'partial' | 'failed';
    deliveryDetails?: Array<{
      recipientEmail: string;
      status: 'sent' | 'failed';
      sentAt?: string;
      error?: string;
    }>;
    errorMessage?: string;
  }
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (updates.pdfUrl !== undefined) updateData.pdf_url = updates.pdfUrl;
  if (updates.excelUrl !== undefined) updateData.excel_url = updates.excelUrl;
  if (updates.deliveryStatus !== undefined) updateData.delivery_status = updates.deliveryStatus;
  if (updates.deliveryDetails !== undefined) updateData.delivery_details = updates.deliveryDetails;
  if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('report_history')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating report history:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/reports/scheduled');

  return { success: true, error: null };
}

/**
 * Update the last run time and calculate next run time for a scheduled report
 */
export async function updateReportRunTime(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get current schedule settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report, error: fetchError } = await (supabase as any)
    .from('scheduled_reports')
    .select('schedule_type, schedule_time, schedule_day')
    .eq('id', id)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const now = new Date();
  const nextRunAt = calculateNextRunTime(
    report.schedule_type,
    report.schedule_time,
    report.schedule_day,
    now
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('scheduled_reports')
    .update({
      last_run_at: now.toISOString(),
      next_run_at: nextRunAt.toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating report run time:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/reports/scheduled');

  return { success: true, error: null };
}
