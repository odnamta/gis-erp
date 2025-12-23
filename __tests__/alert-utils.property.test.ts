/**
 * Property-based tests for alert detection utilities
 * Feature: automated-alerts-reports
 * Tests Properties 2-8, 14 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  evaluateComparison,
  evaluateThresholdRule,
  evaluateAnomalyRule,
  isWithinCooldown,
  sortAlertsBySeverityAndTime,
  filterAlerts,
  calculateMean,
  calculateStdDeviation,
  calculateTrendPercentage,
  calculateAlertSummary,
} from '@/lib/alert-utils';
import {
  AlertRule,
  AlertInstance,
  AlertSeverity,
  AlertStatus,
  ComparisonOperator,
  SEVERITY_ORDER,
} from '@/types/alerts';

const dateStringArb = fc.integer({ min: 1704067200000, max: 1735689600000 })
  .map(ts => new Date(ts).toISOString());

const comparisonOperatorArb = fc.constantFrom<ComparisonOperator>('>', '<', '>=', '<=', '=', '!=');
const severityArb = fc.constantFrom<AlertSeverity>('critical', 'warning', 'info');
const statusArb = fc.constantFrom<AlertStatus>('active', 'acknowledged', 'resolved', 'dismissed');

describe('Alert Utils Property Tests', () => {
  describe('Property 2: Threshold Alert Detection', () => {
    it('should trigger alert iff threshold comparison is true', () => {
      fc.assert(
        fc.property(
          comparisonOperatorArb,
          fc.integer({ min: -10000, max: 10000 }),
          fc.integer({ min: -10000, max: 10000 }),
          severityArb,
          (operator, threshold, currentValue, severity) => {
            const rule: AlertRule = {
              id: 'test-rule',
              ruleCode: 'TEST',
              ruleName: 'Test Rule',
              ruleType: 'threshold',
              comparisonOperator: operator,
              thresholdValue: threshold,
              severity,
              notifyRoles: [],
              notifyUsers: [],
              notificationChannels: [],
              checkFrequency: 'hourly',
              cooldownMinutes: 60,
              isActive: true,
              createdAt: new Date().toISOString(),
            };
            const expectedTrigger = evaluateComparison(currentValue, operator, threshold);
            const result = evaluateThresholdRule(rule, currentValue);
            expect(result.shouldTrigger).toBe(expectedTrigger);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Trend Alert Detection', () => {
    it('should detect increasing trends correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 101, max: 200 }),
          fc.integer({ min: 3, max: 10 }),
          (startValue, growthPct, periods) => {
            const growthFactor = growthPct / 100;
            const values = Array.from({ length: periods }, (_, i) =>
              Math.round(startValue * Math.pow(growthFactor, i))
            );
            const trendPct = calculateTrendPercentage(values);
            if (growthFactor > 1) {
              expect(trendPct).toBeGreaterThan(0);
            } else if (growthFactor < 1) {
              expect(trendPct).toBeLessThan(0);
            } else {
              expect(Math.abs(trendPct)).toBeLessThan(0.001);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Anomaly Alert Detection', () => {
    it('should detect anomalies based on standard deviations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 40 }).map(x => x / 10),
          fc.array(fc.integer({ min: 90, max: 110 }), { minLength: 10, maxLength: 50 }),
          fc.integer({ min: -1000, max: 1000 }),
          (stdDeviations, historicalValues, currentValue) => {
            const rule: AlertRule = {
              id: 'test-rule',
              ruleCode: 'TEST',
              ruleName: 'Test Rule',
              ruleType: 'anomaly',
              anomalyStdDeviations: stdDeviations,
              severity: 'warning',
              notifyRoles: [],
              notifyUsers: [],
              notificationChannels: [],
              checkFrequency: 'hourly',
              cooldownMinutes: 60,
              isActive: true,
              createdAt: new Date().toISOString(),
            };
            const mean = calculateMean(historicalValues);
            const stdDev = calculateStdDeviation(historicalValues);
            const result = evaluateAnomalyRule(rule, currentValue, historicalValues);
            if (stdDev === 0) {
              expect(result.shouldTrigger).toBe(currentValue !== mean);
            } else {
              const deviations = Math.abs(currentValue - mean) / stdDev;
              expect(result.shouldTrigger).toBe(deviations > stdDeviations);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Cooldown Period Enforcement', () => {
    it('should respect cooldown period', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1440 }),
          fc.integer({ min: 0, max: 2880 }),
          (cooldownMinutes, minutesSinceLastTrigger) => {
            const lastTriggeredAt = new Date(Date.now() - minutesSinceLastTrigger * 60 * 1000).toISOString();
            const withinCooldown = isWithinCooldown(cooldownMinutes, lastTriggeredAt);
            expect(withinCooldown).toBe(minutesSinceLastTrigger < cooldownMinutes);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not be in cooldown if no previous trigger', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1440 }), (cooldownMinutes) => {
          const result = isWithinCooldown(cooldownMinutes, null);
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Alert Sorting Order', () => {
    it('should sort by severity then timestamp', () => {
      const alertArb = fc.record({
        id: fc.uuid(),
        ruleId: fc.uuid(),
        triggeredAt: dateStringArb,
        alertMessage: fc.string(),
        status: fc.constant('active' as const),
        notificationsSent: fc.constant([]),
        createdAt: dateStringArb,
        rule: fc.record({
          id: fc.uuid(),
          ruleCode: fc.string(),
          ruleName: fc.string(),
          ruleType: fc.constant('threshold' as const),
          severity: severityArb,
          notifyRoles: fc.constant([]),
          notifyUsers: fc.constant([]),
          notificationChannels: fc.constant([]),
          checkFrequency: fc.constant('hourly' as const),
          cooldownMinutes: fc.constant(60),
          isActive: fc.constant(true),
          createdAt: dateStringArb,
        }),
      });

      fc.assert(
        fc.property(
          fc.array(alertArb, { minLength: 0, maxLength: 20 }),
          (alerts) => {
            const sorted = sortAlertsBySeverityAndTime(alerts as AlertInstance[]);
            for (let i = 1; i < sorted.length; i++) {
              const prevSev = SEVERITY_ORDER[sorted[i - 1].rule?.severity || 'info'];
              const currSev = SEVERITY_ORDER[sorted[i].rule?.severity || 'info'];
              if (prevSev < currSev) {
                expect(prevSev).toBeGreaterThanOrEqual(currSev);
              }
              if (prevSev === currSev) {
                const prevTime = new Date(sorted[i - 1].triggeredAt).getTime();
                const currTime = new Date(sorted[i].triggeredAt).getTime();
                expect(prevTime).toBeGreaterThanOrEqual(currTime);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Alert Filtering Correctness', () => {
    it('should filter by status correctly', () => {
      const alertArb = fc.record({
        id: fc.uuid(),
        ruleId: fc.uuid(),
        triggeredAt: dateStringArb,
        alertMessage: fc.string(),
        status: statusArb,
        notificationsSent: fc.constant([]),
        createdAt: dateStringArb,
      });

      fc.assert(
        fc.property(
          fc.array(alertArb, { minLength: 0, maxLength: 20 }),
          statusArb,
          (alerts, filterStatus) => {
            const filtered = filterAlerts(alerts as AlertInstance[], { status: filterStatus });
            filtered.forEach(a => {
              expect(a.status).toBe(filterStatus);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Alert Summary Calculation', () => {
    it('should calculate summary counts correctly', () => {
      const alertArb = fc.record({
        id: fc.uuid(),
        ruleId: fc.uuid(),
        triggeredAt: dateStringArb,
        alertMessage: fc.string(),
        status: statusArb,
        notificationsSent: fc.constant([]),
        createdAt: dateStringArb,
        rule: fc.record({
          id: fc.uuid(),
          ruleCode: fc.string(),
          ruleName: fc.string(),
          ruleType: fc.constant('threshold' as const),
          severity: severityArb,
          notifyRoles: fc.constant([]),
          notifyUsers: fc.constant([]),
          notificationChannels: fc.constant([]),
          checkFrequency: fc.constant('hourly' as const),
          cooldownMinutes: fc.constant(60),
          isActive: fc.constant(true),
          createdAt: dateStringArb,
        }),
      });

      const ruleArb = fc.record({
        id: fc.uuid(),
        ruleCode: fc.string(),
        ruleName: fc.string(),
        ruleType: fc.constant('threshold' as const),
        severity: severityArb,
        notifyRoles: fc.constant([]),
        notifyUsers: fc.constant([]),
        notificationChannels: fc.constant([]),
        checkFrequency: fc.constant('hourly' as const),
        cooldownMinutes: fc.constant(60),
        isActive: fc.boolean(),
        createdAt: dateStringArb,
      });

      fc.assert(
        fc.property(
          fc.array(alertArb, { minLength: 0, maxLength: 30 }),
          fc.array(ruleArb, { minLength: 0, maxLength: 10 }),
          (alerts, rules) => {
            const summary = calculateAlertSummary(alerts as AlertInstance[], rules as AlertRule[]);
            const activeAlerts = alerts.filter(a => a.status === 'active');
            const expectedCritical = activeAlerts.filter(a => a.rule?.severity === 'critical').length;
            const expectedWarning = activeAlerts.filter(a => a.rule?.severity === 'warning').length;
            const expectedInfo = activeAlerts.filter(a => a.rule?.severity === 'info').length;
            expect(summary.criticalCount).toBe(expectedCritical);
            expect(summary.warningCount).toBe(expectedWarning);
            expect(summary.infoCount).toBe(expectedInfo);
            expect(summary.totalActiveCount).toBe(activeAlerts.length);
            const expectedActiveRules = rules.filter(r => r.isActive).length;
            expect(summary.activeRulesCount).toBe(expectedActiveRules);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
