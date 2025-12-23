'use server';

// =====================================================
// v0.65: ALERT LIFECYCLE MANAGEMENT - SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AlertRule,
  AlertInstance,
  AlertRuleFormData,
  AlertFilters,
  AlertRuleDB,
  AlertInstanceDB,
} from '@/types/alerts';
import {
  mapAlertRuleFromDB,
  mapAlertInstanceFromDB,
  validateAlertRule,
} from '@/lib/alert-utils';

// =====================================================
// ALERT RULES CRUD
// =====================================================

export async function getAlertRules(activeOnly = false): Promise<{
  data: AlertRule[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('alert_rules')
    .select(`*, kpi_definitions (kpi_name)`)
    .order('severity', { ascending: false })
    .order('rule_name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching alert rules:', error);
    return { data: null, error: error.message };
  }

  return {
    data: (data as AlertRuleDB[])?.map(mapAlertRuleFromDB) || [],
    error: null,
  };
}

export async function getAlertRule(id: string): Promise<{
  data: AlertRule | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_rules')
    .select(`*, kpi_definitions (kpi_name)`)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching alert rule:', error);
    return { data: null, error: error.message };
  }

  return {
    data: mapAlertRuleFromDB(data as AlertRuleDB),
    error: null,
  };
}

export async function createAlertRule(formData: AlertRuleFormData): Promise<{
  data: AlertRule | null;
  error: string | null;
}> {
  const validation = validateAlertRule(formData);
  if (!validation.valid) {
    return { data: null, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_rules')
    .insert({
      rule_code: formData.ruleCode,
      rule_name: formData.ruleName,
      description: formData.description,
      rule_type: formData.ruleType,
      kpi_id: formData.kpiId,
      comparison_operator: formData.comparisonOperator,
      threshold_value: formData.thresholdValue,
      trend_direction: formData.trendDirection,
      trend_periods: formData.trendPeriods,
      trend_threshold_pct: formData.trendThresholdPct,
      anomaly_std_deviations: formData.anomalyStdDeviations,
      custom_condition_sql: formData.customConditionSql,
      severity: formData.severity,
      notify_roles: formData.notifyRoles,
      notify_users: formData.notifyUsers,
      notification_channels: formData.notificationChannels,
      check_frequency: formData.checkFrequency,
      cooldown_minutes: formData.cooldownMinutes,
      is_active: formData.isActive,
    })
    .select(`*, kpi_definitions (kpi_name)`)
    .single();

  if (error) {
    console.error('Error creating alert rule:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/alerts');
  revalidatePath('/dashboard/alerts/rules');

  return {
    data: mapAlertRuleFromDB(data as AlertRuleDB),
    error: null,
  };
}

export async function updateAlertRule(
  id: string,
  formData: Partial<AlertRuleFormData>
): Promise<{
  data: AlertRule | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (formData.ruleCode !== undefined) updateData.rule_code = formData.ruleCode;
  if (formData.ruleName !== undefined) updateData.rule_name = formData.ruleName;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.ruleType !== undefined) updateData.rule_type = formData.ruleType;
  if (formData.kpiId !== undefined) updateData.kpi_id = formData.kpiId;
  if (formData.comparisonOperator !== undefined) updateData.comparison_operator = formData.comparisonOperator;
  if (formData.thresholdValue !== undefined) updateData.threshold_value = formData.thresholdValue;
  if (formData.trendDirection !== undefined) updateData.trend_direction = formData.trendDirection;
  if (formData.trendPeriods !== undefined) updateData.trend_periods = formData.trendPeriods;
  if (formData.trendThresholdPct !== undefined) updateData.trend_threshold_pct = formData.trendThresholdPct;
  if (formData.anomalyStdDeviations !== undefined) updateData.anomaly_std_deviations = formData.anomalyStdDeviations;
  if (formData.customConditionSql !== undefined) updateData.custom_condition_sql = formData.customConditionSql;
  if (formData.severity !== undefined) updateData.severity = formData.severity;
  if (formData.notifyRoles !== undefined) updateData.notify_roles = formData.notifyRoles;
  if (formData.notifyUsers !== undefined) updateData.notify_users = formData.notifyUsers;
  if (formData.notificationChannels !== undefined) updateData.notification_channels = formData.notificationChannels;
  if (formData.checkFrequency !== undefined) updateData.check_frequency = formData.checkFrequency;
  if (formData.cooldownMinutes !== undefined) updateData.cooldown_minutes = formData.cooldownMinutes;
  if (formData.isActive !== undefined) updateData.is_active = formData.isActive;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_rules')
    .update(updateData)
    .eq('id', id)
    .select(`*, kpi_definitions (kpi_name)`)
    .single();

  if (error) {
    console.error('Error updating alert rule:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/alerts');
  revalidatePath('/dashboard/alerts/rules');

  return {
    data: mapAlertRuleFromDB(data as AlertRuleDB),
    error: null,
  };
}

export async function deleteAlertRule(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('alert_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting alert rule:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/alerts');
  revalidatePath('/dashboard/alerts/rules');

  return { success: true, error: null };
}

export async function toggleAlertRuleStatus(id: string): Promise<{
  data: AlertRule | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: fetchError } = await (supabase as any)
    .from('alert_rules')
    .select('is_active')
    .eq('id', id)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_rules')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select(`*, kpi_definitions (kpi_name)`)
    .single();

  if (error) {
    console.error('Error toggling alert rule status:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/alerts');
  revalidatePath('/dashboard/alerts/rules');

  return {
    data: mapAlertRuleFromDB(data as AlertRuleDB),
    error: null,
  };
}


// =====================================================
// ALERT INSTANCES CRUD
// =====================================================

export async function getAlertInstances(filters?: AlertFilters): Promise<{
  data: AlertInstance[] | null;
  error: string | null;
  count: number;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('alert_instances')
    .select(`
      *,
      alert_rules (*, kpi_definitions (kpi_name)),
      user_profiles!acknowledged_by (full_name)
    `, { count: 'exact' });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.ruleId) {
    query = query.eq('rule_id', filters.ruleId);
  }
  if (filters?.startDate) {
    query = query.gte('triggered_at', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte('triggered_at', filters.endDate.toISOString());
  }

  query = query.order('triggered_at', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching alert instances:', error);
    return { data: null, error: error.message, count: 0 };
  }

  return {
    data: (data as AlertInstanceDB[])?.map(mapAlertInstanceFromDB) || [],
    error: null,
    count: count || 0,
  };
}

export async function getAlertInstance(id: string): Promise<{
  data: AlertInstance | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_instances')
    .select(`
      *,
      alert_rules (*, kpi_definitions (kpi_name)),
      user_profiles!acknowledged_by (full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching alert instance:', error);
    return { data: null, error: error.message };
  }

  return {
    data: mapAlertInstanceFromDB(data as AlertInstanceDB),
    error: null,
  };
}

export async function createAlertInstance(
  ruleId: string,
  alertMessage: string,
  currentValue?: number,
  thresholdValue?: number,
  contextData?: Record<string, unknown>
): Promise<{
  data: AlertInstance | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_instances')
    .insert({
      rule_id: ruleId,
      triggered_at: new Date().toISOString(),
      current_value: currentValue,
      threshold_value: thresholdValue,
      alert_message: alertMessage,
      context_data: contextData,
      status: 'active',
      notifications_sent: [],
    })
    .select(`*, alert_rules (*, kpi_definitions (kpi_name))`)
    .single();

  if (error) {
    console.error('Error creating alert instance:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/alerts');

  return {
    data: mapAlertInstanceFromDB(data as AlertInstanceDB),
    error: null,
  };
}

// =====================================================
// ALERT LIFECYCLE TRANSITIONS
// =====================================================

export async function acknowledgeAlert(
  alertId: string,
  userId: string
): Promise<{
  data: AlertInstance | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: fetchError } = await (supabase as any)
    .from('alert_instances')
    .select('status')
    .eq('id', alertId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  if (current.status !== 'active') {
    return { data: null, error: `Cannot acknowledge alert with status '${current.status}'` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_instances')
    .update({
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .select(`
      *,
      alert_rules (*, kpi_definitions (kpi_name)),
      user_profiles!acknowledged_by (full_name)
    `)
    .single();

  if (error) {
    console.error('Error acknowledging alert:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/alerts');

  return {
    data: mapAlertInstanceFromDB(data as AlertInstanceDB),
    error: null,
  };
}

export async function resolveAlert(
  alertId: string,
  resolutionNotes?: string
): Promise<{
  data: AlertInstance | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: fetchError } = await (supabase as any)
    .from('alert_instances')
    .select('status')
    .eq('id', alertId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  if (current.status !== 'active' && current.status !== 'acknowledged') {
    return { data: null, error: `Cannot resolve alert with status '${current.status}'` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_instances')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes,
    })
    .eq('id', alertId)
    .select(`
      *,
      alert_rules (*, kpi_definitions (kpi_name)),
      user_profiles!acknowledged_by (full_name)
    `)
    .single();

  if (error) {
    console.error('Error resolving alert:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/alerts');

  return {
    data: mapAlertInstanceFromDB(data as AlertInstanceDB),
    error: null,
  };
}

export async function dismissAlert(alertId: string): Promise<{
  data: AlertInstance | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: fetchError } = await (supabase as any)
    .from('alert_instances')
    .select('status')
    .eq('id', alertId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  if (current.status !== 'active' && current.status !== 'acknowledged') {
    return { data: null, error: `Cannot dismiss alert with status '${current.status}'` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('alert_instances')
    .update({ status: 'dismissed' })
    .eq('id', alertId)
    .select(`
      *,
      alert_rules (*, kpi_definitions (kpi_name)),
      user_profiles!acknowledged_by (full_name)
    `)
    .single();

  if (error) {
    console.error('Error dismissing alert:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard/alerts');

  return {
    data: mapAlertInstanceFromDB(data as AlertInstanceDB),
    error: null,
  };
}

export async function updateAlertNotifications(
  alertId: string,
  notificationsSent: Array<{
    channel: string;
    recipientId?: string;
    recipientEmail?: string;
    sentAt: string;
    status: 'sent' | 'failed';
    error?: string;
  }>
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('alert_instances')
    .update({ notifications_sent: notificationsSent })
    .eq('id', alertId);

  if (error) {
    console.error('Error updating alert notifications:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// =====================================================
// ALERT SUMMARY & STATS
// =====================================================

export async function getAlertSummary(): Promise<{
  data: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    activeRulesCount: number;
    resolvedMtdCount: number;
    totalActiveCount: number;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeAlerts, error: alertsError } = await (supabase as any)
    .from('alert_instances')
    .select(`id, status, alert_rules (severity)`)
    .eq('status', 'active');

  if (alertsError) {
    return { data: null, error: alertsError.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: activeRulesCount, error: rulesError } = await (supabase as any)
    .from('alert_rules')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (rulesError) {
    return { data: null, error: rulesError.message };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: resolvedMtdCount, error: resolvedError } = await (supabase as any)
    .from('alert_instances')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'resolved')
    .gte('resolved_at', startOfMonth.toISOString());

  if (resolvedError) {
    return { data: null, error: resolvedError.message };
  }

  type AlertWithRule = { id: string; status: string; alert_rules: { severity: string } | null };
  const alerts = activeAlerts as AlertWithRule[];

  const criticalCount = alerts?.filter(a => a.alert_rules?.severity === 'critical').length || 0;
  const warningCount = alerts?.filter(a => a.alert_rules?.severity === 'warning').length || 0;
  const infoCount = alerts?.filter(a => a.alert_rules?.severity === 'info').length || 0;

  return {
    data: {
      criticalCount,
      warningCount,
      infoCount,
      activeRulesCount: activeRulesCount || 0,
      resolvedMtdCount: resolvedMtdCount || 0,
      totalActiveCount: alerts?.length || 0,
    },
    error: null,
  };
}
