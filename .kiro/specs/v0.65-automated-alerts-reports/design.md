# Design Document: AI Insights - Automated Alerts & Reports

## Overview

This feature implements an automated alerting and scheduled reporting system for Gama ERP. The system monitors KPIs against configurable thresholds, detects trends and anomalies, and triggers alerts with multi-channel notifications. It also provides scheduled report generation with PDF/Excel delivery to stakeholders.

The design integrates with existing infrastructure:
- KPI definitions from v0.61 Executive Dashboard
- Notification service from v0.40 Notification Center
- PDF generation utilities from lib/pdf

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Alert & Report System                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   Alert Rules    │    │  Alert Detector  │    │ Alert Instances  │      │
│  │   Management     │───▶│   (Evaluator)    │───▶│   (Storage)      │      │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│           │                       │                       │                 │
│           │                       ▼                       │                 │
│           │              ┌──────────────────┐             │                 │
│           │              │   Notification   │◀────────────┘                 │
│           │              │   Dispatcher     │                               │
│           │              └──────────────────┘                               │
│           │                       │                                         │
│           │                       ▼                                         │
│           │              ┌──────────────────┐                               │
│           │              │  In-App / Email  │                               │
│           │              │   Channels       │                               │
│           │              └──────────────────┘                               │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │ Scheduled Report │    │ Report Generator │    │ Report History   │      │
│  │   Configuration  │───▶│   (Builder)      │───▶│   (Storage)      │      │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│                                   │                                         │
│                                   ▼                                         │
│                          ┌──────────────────┐                               │
│                          │  PDF / Excel     │                               │
│                          │  Generation      │                               │
│                          └──────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Alert Rule Types

```typescript
// types/alerts.ts

export type AlertRuleType = 'threshold' | 'trend' | 'anomaly' | 'schedule' | 'prediction';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
export type CheckFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';
export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'slack';
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '=' | '!=';
export type TrendDirection = 'increasing' | 'decreasing';

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
}

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

export interface NotificationSentRecord {
  channel: NotificationChannel;
  recipientId?: string;
  recipientEmail?: string;
  sentAt: string;
  status: 'sent' | 'failed';
  error?: string;
}
```

### 2. Scheduled Report Types

```typescript
// types/scheduled-reports.ts

export type ReportType = 'executive_summary' | 'financial' | 'operations' | 'sales' | 'hse' | 'custom';
export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type AttachmentFormat = 'pdf' | 'excel' | 'both';
export type DeliveryChannel = 'email' | 'in_app' | 'download';
export type DeliveryStatus = 'pending' | 'sent' | 'partial' | 'failed';

export interface ReportSection {
  type: 'kpi_summary' | 'chart' | 'table' | 'alerts' | 'pl_summary' | 'budget_vs_actual' | 'cash_flow' | 'ar_aging' | 'customer_profitability';
  kpiCodes?: string[];
  chartType?: string;
  content?: string;
  limit?: number;
  filters?: Record<string, unknown>;
  severity?: AlertSeverity[];
  periods?: number;
}

export interface ReportConfig {
  sections: ReportSection[];
}

export interface ReportRecipient {
  userId?: string;
  email: string;
  name: string;
}

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

export interface DeliveryDetail {
  recipientEmail: string;
  status: 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}
```

### 3. Alert Detection Service

```typescript
// lib/alert-detection-utils.ts

export interface AlertEvaluationResult {
  shouldTrigger: boolean;
  currentValue?: number;
  message: string;
  contextData?: Record<string, unknown>;
}

export function evaluateThresholdRule(
  rule: AlertRule,
  currentValue: number
): AlertEvaluationResult;

export function evaluateTrendRule(
  rule: AlertRule,
  historicalValues: number[]
): AlertEvaluationResult;

export function evaluateAnomalyRule(
  rule: AlertRule,
  currentValue: number,
  historicalValues: number[]
): AlertEvaluationResult;

export function isWithinCooldown(
  rule: AlertRule,
  lastTriggeredAt: string | null
): boolean;

export function formatAlertMessage(
  rule: AlertRule,
  result: AlertEvaluationResult
): string;
```

### 4. Alert Dashboard Components

```typescript
// components/alerts/alert-dashboard.tsx
export function AlertDashboard(): JSX.Element;

// components/alerts/alert-summary-cards.tsx
export interface AlertSummaryCardsProps {
  criticalCount: number;
  warningCount: number;
  activeRulesCount: number;
  resolvedMtdCount: number;
}
export function AlertSummaryCards(props: AlertSummaryCardsProps): JSX.Element;

// components/alerts/active-alerts-list.tsx
export interface ActiveAlertsListProps {
  alerts: AlertInstance[];
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve: (alertId: string, notes: string) => Promise<void>;
  onDismiss: (alertId: string) => Promise<void>;
}
export function ActiveAlertsList(props: ActiveAlertsListProps): JSX.Element;

// components/alerts/alert-card.tsx
export interface AlertCardProps {
  alert: AlertInstance;
  onAcknowledge: () => void;
  onResolve: (notes: string) => void;
  onDismiss: () => void;
}
export function AlertCard(props: AlertCardProps): JSX.Element;

// components/alerts/upcoming-reports-list.tsx
export interface UpcomingReportsListProps {
  reports: ScheduledReport[];
}
export function UpcomingReportsList(props: UpcomingReportsListProps): JSX.Element;
```

### 5. Alert Rule Management Components

```typescript
// components/alerts/alert-rules-page.tsx
export function AlertRulesPage(): JSX.Element;

// components/alerts/alert-rule-form.tsx
export interface AlertRuleFormProps {
  rule?: AlertRule;
  kpiDefinitions: KPIDefinition[];
  onSubmit: (data: AlertRuleFormData) => Promise<void>;
  onCancel: () => void;
}
export function AlertRuleForm(props: AlertRuleFormProps): JSX.Element;

// components/alerts/alert-rules-table.tsx
export interface AlertRulesTableProps {
  rules: AlertRule[];
  onEdit: (rule: AlertRule) => void;
  onToggle: (ruleId: string, isActive: boolean) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
}
export function AlertRulesTable(props: AlertRulesTableProps): JSX.Element;
```

### 6. Scheduled Report Components

```typescript
// components/reports/scheduled-reports-page.tsx
export function ScheduledReportsPage(): JSX.Element;

// components/reports/scheduled-report-form.tsx
export interface ScheduledReportFormProps {
  report?: ScheduledReport;
  onSubmit: (data: ScheduledReportFormData) => Promise<void>;
  onCancel: () => void;
}
export function ScheduledReportForm(props: ScheduledReportFormProps): JSX.Element;

// components/reports/report-history-table.tsx
export interface ReportHistoryTableProps {
  history: ReportHistory[];
  onDownload: (historyId: string, format: 'pdf' | 'excel') => void;
  onResend: (historyId: string) => Promise<void>;
}
export function ReportHistoryTable(props: ReportHistoryTableProps): JSX.Element;
```

## Data Models

### Database Schema

```sql
-- Alert rules table
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(30) UNIQUE NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  description TEXT,
  rule_type VARCHAR(30) NOT NULL,
  kpi_id UUID REFERENCES kpi_definitions(id),
  comparison_operator VARCHAR(10),
  threshold_value DECIMAL(18,2),
  trend_direction VARCHAR(20),
  trend_periods INTEGER,
  trend_threshold_pct DECIMAL(5,2),
  anomaly_std_deviations DECIMAL(3,1) DEFAULT 2,
  custom_condition_sql TEXT,
  severity VARCHAR(20) DEFAULT 'warning',
  notify_roles JSONB DEFAULT '["owner", "admin"]',
  notify_users JSONB DEFAULT '[]',
  notification_channels JSONB DEFAULT '["in_app", "email"]',
  check_frequency VARCHAR(20) DEFAULT 'hourly',
  cooldown_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert instances table
CREATE TABLE alert_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_value DECIMAL(18,2),
  threshold_value DECIMAL(18,2),
  alert_message TEXT NOT NULL,
  context_data JSONB,
  status VARCHAR(20) DEFAULT 'active',
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  notifications_sent JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled reports table
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code VARCHAR(30) UNIQUE NOT NULL,
  report_name VARCHAR(100) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,
  report_config JSONB NOT NULL,
  schedule_type VARCHAR(20) NOT NULL,
  schedule_day INTEGER,
  schedule_time TIME DEFAULT '08:00',
  timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
  recipients JSONB DEFAULT '[]',
  delivery_channels JSONB DEFAULT '["email"]',
  email_subject_template VARCHAR(200),
  include_attachments BOOLEAN DEFAULT TRUE,
  attachment_format VARCHAR(10) DEFAULT 'pdf',
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report history table
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_period_start DATE,
  report_period_end DATE,
  pdf_url VARCHAR(500),
  excel_url VARCHAR(500),
  recipients_count INTEGER,
  delivery_status VARCHAR(20),
  delivery_details JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX idx_alert_instances_rule ON alert_instances(rule_id);
CREATE INDEX idx_alert_instances_status ON alert_instances(status);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at);
CREATE INDEX idx_report_history_report ON report_history(scheduled_report_id);
```

### Type Mappings (DB to TypeScript)

```typescript
// Database row to TypeScript conversion
export function mapAlertRuleFromDB(row: AlertRuleDB): AlertRule {
  return {
    id: row.id,
    ruleCode: row.rule_code,
    ruleName: row.rule_name,
    description: row.description,
    ruleType: row.rule_type as AlertRuleType,
    kpiId: row.kpi_id,
    comparisonOperator: row.comparison_operator as ComparisonOperator,
    thresholdValue: row.threshold_value,
    trendDirection: row.trend_direction as TrendDirection,
    trendPeriods: row.trend_periods,
    trendThresholdPct: row.trend_threshold_pct,
    anomalyStdDeviations: row.anomaly_std_deviations,
    customConditionSql: row.custom_condition_sql,
    severity: row.severity as AlertSeverity,
    notifyRoles: row.notify_roles || [],
    notifyUsers: row.notify_users || [],
    notificationChannels: row.notification_channels || [],
    checkFrequency: row.check_frequency as CheckFrequency,
    cooldownMinutes: row.cooldown_minutes,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Alert Rule Storage Completeness

*For any* valid alert rule configuration (threshold, trend, or anomaly type), when stored and retrieved, the rule SHALL contain all type-specific fields with correct values matching the input.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Threshold Alert Detection

*For any* threshold rule with comparison operator and threshold value, and *for any* KPI value, the alert detector SHALL trigger an alert if and only if the comparison (value operator threshold) evaluates to true.

**Validates: Requirements 2.1, 2.5**

### Property 3: Trend Alert Detection

*For any* trend rule with direction and threshold percentage, and *for any* sequence of historical values, the alert detector SHALL trigger an alert if and only if the trend matches the configured direction and exceeds the threshold percentage.

**Validates: Requirements 2.2, 2.5**

### Property 4: Anomaly Alert Detection

*For any* anomaly rule with standard deviation threshold, and *for any* current value and historical values, the alert detector SHALL trigger an alert if and only if the current value deviates from the mean by more than the configured standard deviations.

**Validates: Requirements 2.3, 2.5**

### Property 5: Cooldown Period Enforcement

*For any* alert rule with a cooldown period, and *for any* previous alert triggered within the cooldown window, the alert detector SHALL NOT create a new alert instance even if the trigger condition is met.

**Validates: Requirements 2.4**

### Property 6: Alert Lifecycle State Transitions

*For any* alert instance, the status transitions SHALL follow the valid state machine: active → acknowledged → resolved, or active → dismissed, with appropriate metadata (user, timestamp, notes) recorded for each transition.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 7: Alert Sorting Order

*For any* list of active alerts, when sorted for display, alerts SHALL be ordered by severity (critical > warning > info) first, then by triggered timestamp (newest first) within the same severity.

**Validates: Requirements 4.4**

### Property 8: Alert Filtering Correctness

*For any* filter combination (status, severity, rule type, date range), the filtered alert list SHALL contain only alerts that match ALL specified filter criteria.

**Validates: Requirements 4.5**

### Property 9: Notification Dispatch Completeness

*For any* triggered alert with configured notification channels and recipients, the notification dispatcher SHALL attempt to send notifications to ALL recipients through ALL configured channels, recording each attempt's status.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 10: Notification Failure Isolation

*For any* notification dispatch where one or more notifications fail, the dispatcher SHALL continue processing remaining notifications and record individual failure statuses without stopping the entire dispatch.

**Validates: Requirements 3.4**

### Property 11: Scheduled Report Next Run Calculation

*For any* scheduled report with a schedule type (daily, weekly, monthly, quarterly) and schedule day/time, the calculated next run time SHALL be the correct future occurrence based on the schedule configuration and timezone.

**Validates: Requirements 5.3**

### Property 12: Report Configuration Storage

*For any* valid scheduled report configuration with sections, recipients, and delivery settings, when stored and retrieved, the report SHALL contain all configuration fields with correct values matching the input.

**Validates: Requirements 5.1, 5.2, 5.4, 5.5**

### Property 13: Report History Creation

*For any* report generation (successful or failed), a history record SHALL be created with the generation timestamp, delivery status, and either file URLs (on success) or error message (on failure).

**Validates: Requirements 6.6, 6.7**

### Property 14: Alert Summary Calculation

*For any* set of alert instances and rules, the summary counts SHALL accurately reflect: count of critical alerts, count of warning alerts, count of active rules, and count of resolved alerts in the current month.

**Validates: Requirements 7.1, 7.4**

## Error Handling

### Alert Detection Errors

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| KPI value fetch fails | Log error, skip rule evaluation, retry on next check cycle |
| Invalid rule configuration | Mark rule as inactive, notify admin |
| Database write fails | Retry with exponential backoff, log after 3 failures |
| Cooldown check fails | Default to allowing alert (fail-open for critical alerts) |

### Notification Dispatch Errors

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Email service unavailable | Queue for retry, mark as pending |
| Invalid recipient email | Skip recipient, log error, continue with others |
| Rate limit exceeded | Implement backoff, queue remaining notifications |
| Template rendering fails | Use fallback plain text message |

### Report Generation Errors

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Data fetch fails | Include partial data with error note in report |
| PDF generation fails | Retry once, fall back to Excel only |
| Storage upload fails | Retry with exponential backoff |
| Email delivery fails | Mark as partial delivery, allow manual resend |

### Validation Rules

```typescript
// Alert rule validation
export function validateAlertRule(rule: AlertRuleFormData): ValidationResult {
  const errors: string[] = [];
  
  if (!rule.ruleCode || rule.ruleCode.length > 30) {
    errors.push('Rule code is required and must be <= 30 characters');
  }
  
  if (!rule.ruleName || rule.ruleName.length > 100) {
    errors.push('Rule name is required and must be <= 100 characters');
  }
  
  if (rule.ruleType === 'threshold') {
    if (!rule.kpiId) errors.push('KPI is required for threshold rules');
    if (!rule.comparisonOperator) errors.push('Comparison operator is required');
    if (rule.thresholdValue === undefined) errors.push('Threshold value is required');
  }
  
  if (rule.ruleType === 'trend') {
    if (!rule.trendDirection) errors.push('Trend direction is required');
    if (!rule.trendPeriods || rule.trendPeriods < 2) {
      errors.push('Trend periods must be at least 2');
    }
  }
  
  if (rule.cooldownMinutes !== undefined && rule.cooldownMinutes < 0) {
    errors.push('Cooldown minutes cannot be negative');
  }
  
  return { valid: errors.length === 0, errors };
}

// Scheduled report validation
export function validateScheduledReport(report: ScheduledReportFormData): ValidationResult {
  const errors: string[] = [];
  
  if (!report.reportCode || report.reportCode.length > 30) {
    errors.push('Report code is required and must be <= 30 characters');
  }
  
  if (!report.reportName || report.reportName.length > 100) {
    errors.push('Report name is required and must be <= 100 characters');
  }
  
  if (!report.reportConfig?.sections?.length) {
    errors.push('At least one report section is required');
  }
  
  if (!report.recipients?.length) {
    errors.push('At least one recipient is required');
  }
  
  if (report.scheduleType === 'weekly' && (!report.scheduleDay || report.scheduleDay < 1 || report.scheduleDay > 7)) {
    errors.push('Schedule day must be 1-7 for weekly reports');
  }
  
  if (report.scheduleType === 'monthly' && (!report.scheduleDay || report.scheduleDay < 1 || report.scheduleDay > 31)) {
    errors.push('Schedule day must be 1-31 for monthly reports');
  }
  
  return { valid: errors.length === 0, errors };
}
```

## Testing Strategy

### Property-Based Testing

Property-based tests will use `fast-check` library to generate random inputs and verify properties hold across all valid inputs. Each property test should run minimum 100 iterations.

```typescript
// Example property test structure
import * as fc from 'fast-check';

describe('Alert Detection Properties', () => {
  // Property 2: Threshold Alert Detection
  it('should trigger alert iff threshold comparison is true', () => {
    fc.assert(
      fc.property(
        fc.record({
          operator: fc.constantFrom('>', '<', '>=', '<=', '=', '!='),
          threshold: fc.float({ min: -1000000, max: 1000000 }),
          currentValue: fc.float({ min: -1000000, max: 1000000 }),
        }),
        ({ operator, threshold, currentValue }) => {
          const shouldTrigger = evaluateComparison(currentValue, operator, threshold);
          const result = evaluateThresholdRule(
            { comparisonOperator: operator, thresholdValue: threshold } as AlertRule,
            currentValue
          );
          return result.shouldTrigger === shouldTrigger;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Tests

Unit tests will cover:
- Alert rule CRUD operations
- Alert instance lifecycle transitions
- Notification formatting
- Report configuration validation
- Next run time calculations
- Summary count calculations

### Integration Tests

Integration tests will verify:
- End-to-end alert detection and notification flow
- Report generation with actual data
- Database operations with RLS policies
- Email delivery integration (with mocked SMTP)

### Test Coverage Requirements

| Component | Minimum Coverage |
|-----------|------------------|
| Alert detection utils | 90% |
| Notification dispatcher | 85% |
| Report generator | 85% |
| Validation functions | 95% |
| UI components | 70% |
