// =====================================================
// v0.65: AI INSIGHTS - AUTOMATED ALERTS & REPORTS TYPES
// =====================================================

// Alert Rule Types
export type AlertRuleType = 'threshold' | 'trend' | 'anomaly' | 'schedule' | 'prediction' | 'realtime';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
export type CheckFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';
export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'slack';
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '=' | '!=';
export type TrendDirection = 'increasing' | 'decreasing';

// Valid values arrays for validation
export const VALID_RULE_TYPES: AlertRuleType[] = ['threshold', 'trend', 'anomaly', 'schedule', 'prediction', 'realtime'];
export const VALID_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];
export const VALID_STATUSES: AlertStatus[] = ['active', 'acknowledged', 'resolved', 'dismissed'];
export const VALID_FREQUENCIES: CheckFrequency[] = ['realtime', 'hourly', 'daily', 'weekly'];
export const VALID_CHANNELS: NotificationChannel[] = ['in_app', 'email', 'whatsapp', 'slack'];
export const VALID_OPERATORS: ComparisonOperator[] = ['>', '<', '>=', '<=', '=', '!='];
export const VALID_TREND_DIRECTIONS: TrendDirection[] = ['increasing', 'decreasing'];

// Severity order for sorting (higher = more severe)
export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

// Alert Rule (TypeScript interface)
export interface AlertRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  description?: string;
  ruleType: AlertRuleType;
  // Threshold rule fields
  kpiId?: string;
  comparisonOperator?: ComparisonOperator;
  thresholdValue?: number;
  // Trend rule fields
  trendDirection?: TrendDirection;
  trendPeriods?: number;
  trendThresholdPct?: number;
  // Anomaly detection fields
  anomalyStdDeviations?: number;
  // Custom condition
  customConditionSql?: string;
  // Alert settings
  severity: AlertSeverity;
  // Notification settings
  notifyRoles: string[];
  notifyUsers: string[];
  notificationChannels: NotificationChannel[];
  // Frequency settings
  checkFrequency: CheckFrequency;
  cooldownMinutes: number;
  isActive: boolean;
  createdAt: string;
  // Joined fields
  kpiName?: string;
  lastTriggeredAt?: string;
}

// Alert Rule from database (snake_case)
export interface AlertRuleDB {
  id: string;
  rule_code: string;
  rule_name: string;
  description?: string;
  rule_type: string;
  kpi_id?: string;
  comparison_operator?: string;
  threshold_value?: number;
  trend_direction?: string;
  trend_periods?: number;
  trend_threshold_pct?: number;
  anomaly_std_deviations?: number;
  custom_condition_sql?: string;
  severity: string;
  notify_roles: string[];
  notify_users: string[];
  notification_channels: string[];
  check_frequency: string;
  cooldown_minutes: number;
  is_active: boolean;
  created_at: string;
  // Joined fields
  kpi_definitions?: { kpi_name: string };
}

// Notification sent record
export interface NotificationSentRecord {
  channel: NotificationChannel;
  recipientId?: string;
  recipientEmail?: string;
  sentAt: string;
  status: 'sent' | 'failed';
  error?: string;
}

// Alert Instance (TypeScript interface)
export interface AlertInstance {
  id: string;
  ruleId: string;
  triggeredAt: string;
  currentValue?: number;
  thresholdValue?: number;
  alertMessage: string;
  contextData?: Record<string, unknown>;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  notificationsSent: NotificationSentRecord[];
  createdAt: string;
  // Joined fields
  rule?: AlertRule;
  acknowledgedByUser?: { full_name: string };
}

// Alert Instance from database (snake_case)
export interface AlertInstanceDB {
  id: string;
  rule_id: string;
  triggered_at: string;
  current_value?: number;
  threshold_value?: number;
  alert_message: string;
  context_data?: Record<string, unknown>;
  status: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  notifications_sent: NotificationSentRecord[];
  created_at: string;
  // Joined fields
  alert_rules?: AlertRuleDB;
  user_profiles?: { full_name: string };
}

// Alert Rule Form Data
export interface AlertRuleFormData {
  ruleCode: string;
  ruleName: string;
  description?: string;
  ruleType: AlertRuleType;
  kpiId?: string;
  comparisonOperator?: ComparisonOperator;
  thresholdValue?: number;
  trendDirection?: TrendDirection;
  trendPeriods?: number;
  trendThresholdPct?: number;
  anomalyStdDeviations?: number;
  customConditionSql?: string;
  severity: AlertSeverity;
  notifyRoles: string[];
  notifyUsers: string[];
  notificationChannels: NotificationChannel[];
  checkFrequency: CheckFrequency;
  cooldownMinutes: number;
  isActive: boolean;
}

// Alert Filters
export interface AlertFilters {
  status?: AlertStatus | 'all';
  severity?: AlertSeverity | 'all';
  ruleType?: AlertRuleType | 'all';
  ruleId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// Alert Summary
export interface AlertSummary {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  activeRulesCount: number;
  resolvedMtdCount: number;
  totalActiveCount: number;
}

// Alert Evaluation Result
export interface AlertEvaluationResult {
  shouldTrigger: boolean;
  currentValue?: number;
  message: string;
  contextData?: Record<string, unknown>;
}

// Validation Result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
