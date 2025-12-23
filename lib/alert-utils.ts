// =====================================================
// v0.65: ALERT DETECTION UTILITIES
// =====================================================

import {
  AlertRule,
  AlertRuleDB,
  AlertInstance,
  AlertInstanceDB,
  AlertEvaluationResult,
  AlertSeverity,
  AlertStatus,
  ComparisonOperator,
  ValidationResult,
  AlertRuleFormData,
  SEVERITY_ORDER,
  VALID_RULE_TYPES,
  VALID_SEVERITIES,
  VALID_OPERATORS,
  VALID_FREQUENCIES,
  VALID_CHANNELS,
} from '@/types/alerts';

/**
 * Map AlertRule from database format to TypeScript format
 */
export function mapAlertRuleFromDB(row: AlertRuleDB): AlertRule {
  return {
    id: row.id,
    ruleCode: row.rule_code,
    ruleName: row.rule_name,
    description: row.description,
    ruleType: row.rule_type as AlertRule['ruleType'],
    kpiId: row.kpi_id,
    comparisonOperator: row.comparison_operator as ComparisonOperator | undefined,
    thresholdValue: row.threshold_value ? Number(row.threshold_value) : undefined,
    trendDirection: row.trend_direction as AlertRule['trendDirection'],
    trendPeriods: row.trend_periods,
    trendThresholdPct: row.trend_threshold_pct ? Number(row.trend_threshold_pct) : undefined,
    anomalyStdDeviations: row.anomaly_std_deviations ? Number(row.anomaly_std_deviations) : undefined,
    customConditionSql: row.custom_condition_sql,
    severity: row.severity as AlertSeverity,
    notifyRoles: row.notify_roles || [],
    notifyUsers: row.notify_users || [],
    notificationChannels: row.notification_channels as AlertRule['notificationChannels'] || [],
    checkFrequency: row.check_frequency as AlertRule['checkFrequency'],
    cooldownMinutes: row.cooldown_minutes,
    isActive: row.is_active,
    createdAt: row.created_at,
    kpiName: row.kpi_definitions?.kpi_name,
  };
}

/**
 * Map AlertInstance from database format to TypeScript format
 */
export function mapAlertInstanceFromDB(row: AlertInstanceDB): AlertInstance {
  return {
    id: row.id,
    ruleId: row.rule_id,
    triggeredAt: row.triggered_at,
    currentValue: row.current_value ? Number(row.current_value) : undefined,
    thresholdValue: row.threshold_value ? Number(row.threshold_value) : undefined,
    alertMessage: row.alert_message,
    contextData: row.context_data,
    status: row.status as AlertStatus,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
    notificationsSent: row.notifications_sent || [],
    createdAt: row.created_at,
    rule: row.alert_rules ? mapAlertRuleFromDB(row.alert_rules) : undefined,
    acknowledgedByUser: row.user_profiles,
  };
}

/**
 * Evaluate a comparison between two values
 */
export function evaluateComparison(
  currentValue: number,
  operator: ComparisonOperator,
  threshold: number
): boolean {
  switch (operator) {
    case '>':
      return currentValue > threshold;
    case '<':
      return currentValue < threshold;
    case '>=':
      return currentValue >= threshold;
    case '<=':
      return currentValue <= threshold;
    case '=':
      return currentValue === threshold;
    case '!=':
      return currentValue !== threshold;
    default:
      return false;
  }
}

/**
 * Evaluate a threshold-based alert rule
 */
export function evaluateThresholdRule(
  rule: AlertRule,
  currentValue: number
): AlertEvaluationResult {
  if (!rule.comparisonOperator || rule.thresholdValue === undefined) {
    return {
      shouldTrigger: false,
      message: 'Invalid threshold rule configuration',
    };
  }

  const shouldTrigger = evaluateComparison(
    currentValue,
    rule.comparisonOperator,
    rule.thresholdValue
  );

  return {
    shouldTrigger,
    currentValue,
    message: shouldTrigger
      ? `${rule.ruleName}: Current value ${currentValue} ${rule.comparisonOperator} threshold ${rule.thresholdValue}`
      : `${rule.ruleName}: Current value ${currentValue} does not trigger alert`,
    contextData: {
      operator: rule.comparisonOperator,
      threshold: rule.thresholdValue,
      currentValue,
    },
  };
}

/**
 * Calculate trend percentage from historical values
 */
export function calculateTrendPercentage(values: number[]): number {
  if (values.length < 2) return 0;
  
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  
  if (firstValue === 0) return lastValue > 0 ? 100 : 0;
  
  return ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
}

/**
 * Determine trend direction from historical values
 */
export function determineTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const trendPct = calculateTrendPercentage(values);
  
  if (trendPct > 5) return 'increasing';
  if (trendPct < -5) return 'decreasing';
  return 'stable';
}

/**
 * Evaluate a trend-based alert rule
 */
export function evaluateTrendRule(
  rule: AlertRule,
  historicalValues: number[]
): AlertEvaluationResult {
  if (!rule.trendDirection || !rule.trendPeriods || rule.trendThresholdPct === undefined) {
    return {
      shouldTrigger: false,
      message: 'Invalid trend rule configuration',
    };
  }

  // Need at least trendPeriods values
  if (historicalValues.length < rule.trendPeriods) {
    return {
      shouldTrigger: false,
      message: `Insufficient data: need ${rule.trendPeriods} periods, have ${historicalValues.length}`,
    };
  }

  // Take the last N periods
  const relevantValues = historicalValues.slice(-rule.trendPeriods);
  const trendPct = calculateTrendPercentage(relevantValues);
  const actualDirection = determineTrendDirection(relevantValues);

  const shouldTrigger =
    actualDirection === rule.trendDirection &&
    Math.abs(trendPct) >= rule.trendThresholdPct;

  return {
    shouldTrigger,
    currentValue: relevantValues[relevantValues.length - 1],
    message: shouldTrigger
      ? `${rule.ruleName}: ${rule.trendDirection} trend of ${trendPct.toFixed(1)}% over ${rule.trendPeriods} periods`
      : `${rule.ruleName}: No significant ${rule.trendDirection} trend detected`,
    contextData: {
      trendDirection: actualDirection,
      trendPercentage: trendPct,
      periods: rule.trendPeriods,
      values: relevantValues,
    },
  };
}

/**
 * Calculate mean of values
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation of values
 */
export function calculateStdDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Evaluate an anomaly detection rule
 */
export function evaluateAnomalyRule(
  rule: AlertRule,
  currentValue: number,
  historicalValues: number[]
): AlertEvaluationResult {
  const stdDeviations = rule.anomalyStdDeviations ?? 2;

  if (historicalValues.length < 3) {
    return {
      shouldTrigger: false,
      message: 'Insufficient historical data for anomaly detection',
    };
  }

  const mean = calculateMean(historicalValues);
  const stdDev = calculateStdDeviation(historicalValues);

  if (stdDev === 0) {
    return {
      shouldTrigger: currentValue !== mean,
      currentValue,
      message: currentValue !== mean
        ? `${rule.ruleName}: Value ${currentValue} differs from constant ${mean}`
        : `${rule.ruleName}: Value matches historical constant`,
      contextData: { mean, stdDev: 0, deviations: 0 },
    };
  }

  const deviationsFromMean = Math.abs(currentValue - mean) / stdDev;
  const shouldTrigger = deviationsFromMean > stdDeviations;

  return {
    shouldTrigger,
    currentValue,
    message: shouldTrigger
      ? `${rule.ruleName}: Anomaly detected - value ${currentValue} is ${deviationsFromMean.toFixed(1)} std deviations from mean ${mean.toFixed(1)}`
      : `${rule.ruleName}: Value ${currentValue} is within normal range`,
    contextData: {
      mean,
      stdDev,
      deviationsFromMean,
      threshold: stdDeviations,
    },
  };
}

/**
 * Check if an alert is within the cooldown period
 */
export function isWithinCooldown(
  cooldownMinutes: number,
  lastTriggeredAt: string | null | undefined
): boolean {
  if (!lastTriggeredAt) return false;
  
  const lastTriggered = new Date(lastTriggeredAt);
  const now = new Date();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  return now.getTime() - lastTriggered.getTime() < cooldownMs;
}

/**
 * Format alert message with context
 */
export function formatAlertMessage(
  rule: AlertRule,
  result: AlertEvaluationResult
): string {
  const severityEmoji = {
    critical: '🔴',
    warning: '🟠',
    info: '🔵',
  };

  return `${severityEmoji[rule.severity]} ${result.message}`;
}

/**
 * Sort alerts by severity and timestamp
 */
export function sortAlertsBySeverityAndTime(alerts: AlertInstance[]): AlertInstance[] {
  return [...alerts].sort((a, b) => {
    // First sort by severity (critical > warning > info)
    const severityA = a.rule?.severity || 'info';
    const severityB = b.rule?.severity || 'info';
    const severityDiff = SEVERITY_ORDER[severityB] - SEVERITY_ORDER[severityA];
    
    if (severityDiff !== 0) return severityDiff;
    
    // Then sort by triggered time (newest first)
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });
}

/**
 * Filter alerts based on criteria
 */
export function filterAlerts(
  alerts: AlertInstance[],
  filters: {
    status?: AlertStatus | 'all';
    severity?: AlertSeverity | 'all';
    ruleId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): AlertInstance[] {
  return alerts.filter(alert => {
    // Status filter
    if (filters.status && filters.status !== 'all' && alert.status !== filters.status) {
      return false;
    }
    
    // Severity filter
    if (filters.severity && filters.severity !== 'all') {
      if (alert.rule?.severity !== filters.severity) {
        return false;
      }
    }
    
    // Rule ID filter
    if (filters.ruleId && alert.ruleId !== filters.ruleId) {
      return false;
    }
    
    // Date range filter
    const triggeredAt = new Date(alert.triggeredAt);
    if (filters.startDate && triggeredAt < filters.startDate) {
      return false;
    }
    if (filters.endDate && triggeredAt > filters.endDate) {
      return false;
    }
    
    return true;
  });
}

/**
 * Validate alert rule form data
 */
export function validateAlertRule(rule: AlertRuleFormData): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!rule.ruleCode || rule.ruleCode.length > 30) {
    errors.push('Rule code is required and must be <= 30 characters');
  }

  if (!rule.ruleName || rule.ruleName.length > 100) {
    errors.push('Rule name is required and must be <= 100 characters');
  }

  if (!rule.ruleType || !VALID_RULE_TYPES.includes(rule.ruleType)) {
    errors.push('Valid rule type is required');
  }

  if (!rule.severity || !VALID_SEVERITIES.includes(rule.severity)) {
    errors.push('Valid severity is required');
  }

  if (!rule.checkFrequency || !VALID_FREQUENCIES.includes(rule.checkFrequency)) {
    errors.push('Valid check frequency is required');
  }

  // Threshold rule validation
  if (rule.ruleType === 'threshold') {
    if (!rule.kpiId) {
      errors.push('KPI is required for threshold rules');
    }
    if (!rule.comparisonOperator || !VALID_OPERATORS.includes(rule.comparisonOperator)) {
      errors.push('Valid comparison operator is required for threshold rules');
    }
    if (rule.thresholdValue === undefined || rule.thresholdValue === null) {
      errors.push('Threshold value is required for threshold rules');
    }
  }

  // Trend rule validation
  if (rule.ruleType === 'trend') {
    if (!rule.trendDirection) {
      errors.push('Trend direction is required for trend rules');
    }
    if (!rule.trendPeriods || rule.trendPeriods < 2) {
      errors.push('Trend periods must be at least 2');
    }
    if (rule.trendThresholdPct === undefined || rule.trendThresholdPct < 0) {
      errors.push('Trend threshold percentage must be >= 0');
    }
  }

  // Anomaly rule validation
  if (rule.ruleType === 'anomaly') {
    if (rule.anomalyStdDeviations !== undefined && rule.anomalyStdDeviations <= 0) {
      errors.push('Anomaly standard deviations must be > 0');
    }
  }

  // Cooldown validation
  if (rule.cooldownMinutes !== undefined && rule.cooldownMinutes < 0) {
    errors.push('Cooldown minutes cannot be negative');
  }

  // Notification channels validation
  if (rule.notificationChannels && rule.notificationChannels.length > 0) {
    for (const channel of rule.notificationChannels) {
      if (!VALID_CHANNELS.includes(channel)) {
        errors.push(`Invalid notification channel: ${channel}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate alert summary counts
 */
export function calculateAlertSummary(
  alerts: AlertInstance[],
  rules: AlertRule[]
): {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  activeRulesCount: number;
  resolvedMtdCount: number;
  totalActiveCount: number;
} {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  
  const criticalCount = activeAlerts.filter(a => a.rule?.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.rule?.severity === 'warning').length;
  const infoCount = activeAlerts.filter(a => a.rule?.severity === 'info').length;
  
  const activeRulesCount = rules.filter(r => r.isActive).length;
  
  // Count resolved alerts this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const resolvedMtdCount = alerts.filter(a => 
    a.status === 'resolved' && 
    a.resolvedAt && 
    new Date(a.resolvedAt) >= startOfMonth
  ).length;

  return {
    criticalCount,
    warningCount,
    infoCount,
    activeRulesCount,
    resolvedMtdCount,
    totalActiveCount: activeAlerts.length,
  };
}

/**
 * Get relative time string for alert display
 */
export function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('id-ID');
}
