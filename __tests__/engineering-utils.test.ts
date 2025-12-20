import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  checkEngineeringRequired,
  determineRequiredAssessments,
  calculateEngineeringStatus,
  canApprovePJO,
  calculateTotalAdditionalCosts,
  canWaiveEngineeringReview,
  getHighestRiskLevel,
  getAssessmentCompletionPercentage,
} from '@/lib/engineering-utils';
import {
  ENGINEERING_REQUIRED_THRESHOLD,
  ROUTE_ASSESSMENT_FACTORS,
  PERMIT_ASSESSMENT_FACTORS,
  JMP_ASSESSMENT_FACTORS,
  ComplexityFactor,
  AssessmentStatus,
} from '@/types/engineering';

describe('Engineering Utils', () => {
  // Feature: engineering-flag-system, Property 1: Engineering flag based on complexity score
  // Validates: Requirements 2.1
  describe('checkEngineeringRequired', () => {
    it('should return true for complexity score >= 20', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: ENGINEERING_REQUIRED_THRESHOLD, max: 100 }),
          (score) => {
            expect(checkEngineeringRequired(score)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for complexity score < 20', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: ENGINEERING_REQUIRED_THRESHOLD - 1 }),
          (score) => {
            expect(checkEngineeringRequired(score)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for null or undefined', () => {
      expect(checkEngineeringRequired(null)).toBe(false);
      expect(checkEngineeringRequired(undefined)).toBe(false);
    });

    it('should handle boundary value exactly at threshold', () => {
      expect(checkEngineeringRequired(ENGINEERING_REQUIRED_THRESHOLD)).toBe(true);
      expect(checkEngineeringRequired(ENGINEERING_REQUIRED_THRESHOLD - 1)).toBe(false);
    });
  });

  // Feature: engineering-flag-system, Property 5: Assessment creation based on complexity factors
  // Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6
  describe('determineRequiredAssessments', () => {
    const complexityFactorArb = fc.record({
      criteria_code: fc.constantFrom(
        'new_route', 'challenging_terrain', 'special_permits',
        'over_length', 'over_width', 'over_height',
        'heavy_cargo', 'hazardous', 'high_value'
      ),
      criteria_name: fc.string(),
      weight: fc.integer({ min: 1, max: 10 }),
    });

    it('should always include technical_review', () => {
      fc.assert(
        fc.property(
          fc.array(complexityFactorArb, { minLength: 0, maxLength: 5 }),
          (factors) => {
            const assessments = determineRequiredAssessments(factors);
            expect(assessments).toContain('technical_review');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include route_survey when new_route or challenging_terrain present', () => {
      fc.assert(
        fc.property(
          fc.array(complexityFactorArb, { minLength: 1, maxLength: 5 }),
          (factors) => {
            const hasRouteFactors = factors.some(f => 
              ROUTE_ASSESSMENT_FACTORS.includes(f.criteria_code)
            );
            const assessments = determineRequiredAssessments(factors);
            
            if (hasRouteFactors) {
              expect(assessments).toContain('route_survey');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include permit_check when special_permits present', () => {
      fc.assert(
        fc.property(
          fc.array(complexityFactorArb, { minLength: 1, maxLength: 5 }),
          (factors) => {
            const hasPermitFactors = factors.some(f => 
              PERMIT_ASSESSMENT_FACTORS.includes(f.criteria_code)
            );
            const assessments = determineRequiredAssessments(factors);
            
            if (hasPermitFactors) {
              expect(assessments).toContain('permit_check');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include jmp_creation when dimension factors present', () => {
      fc.assert(
        fc.property(
          fc.array(complexityFactorArb, { minLength: 1, maxLength: 5 }),
          (factors) => {
            const hasJmpFactors = factors.some(f => 
              JMP_ASSESSMENT_FACTORS.includes(f.criteria_code)
            );
            const assessments = determineRequiredAssessments(factors);
            
            if (hasJmpFactors) {
              expect(assessments).toContain('jmp_creation');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null or empty factors', () => {
      expect(determineRequiredAssessments(null)).toEqual(['technical_review']);
      expect(determineRequiredAssessments(undefined)).toEqual(['technical_review']);
      expect(determineRequiredAssessments([])).toEqual(['technical_review']);
    });
  });

  // Feature: engineering-flag-system, Property 8: Engineering status calculation from assessments
  // Validates: Requirements 4.4, 4.5, 4.6
  describe('calculateEngineeringStatus', () => {
    const assessmentStatusArb = fc.constantFrom<AssessmentStatus>(
      'pending', 'in_progress', 'completed', 'cancelled'
    );

    it('should return completed when all assessments are completed', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ status: fc.constant<AssessmentStatus>('completed') }),
            { minLength: 1, maxLength: 5 }
          ),
          (assessments) => {
            expect(calculateEngineeringStatus(assessments)).toBe('completed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return in_progress when any is in_progress and none pending', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.array(
              fc.record({ status: fc.constant<AssessmentStatus>('completed') }),
              { minLength: 0, maxLength: 3 }
            ),
            fc.array(
              fc.record({ status: fc.constant<AssessmentStatus>('in_progress') }),
              { minLength: 1, maxLength: 2 }
            )
          ),
          ([completed, inProgress]) => {
            const assessments = [...completed, ...inProgress];
            expect(calculateEngineeringStatus(assessments)).toBe('in_progress');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return pending when any assessment is pending', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.array(
              fc.record({ status: fc.constantFrom<AssessmentStatus>('completed', 'in_progress') }),
              { minLength: 0, maxLength: 3 }
            ),
            fc.array(
              fc.record({ status: fc.constant<AssessmentStatus>('pending') }),
              { minLength: 1, maxLength: 2 }
            )
          ),
          ([others, pending]) => {
            const assessments = [...others, ...pending];
            expect(calculateEngineeringStatus(assessments)).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ignore cancelled assessments', () => {
      const assessments = [
        { status: 'completed' as AssessmentStatus },
        { status: 'cancelled' as AssessmentStatus },
      ];
      expect(calculateEngineeringStatus(assessments)).toBe('completed');
    });

    it('should return pending for empty or null assessments', () => {
      expect(calculateEngineeringStatus(null)).toBe('pending');
      expect(calculateEngineeringStatus(undefined)).toBe('pending');
      expect(calculateEngineeringStatus([])).toBe('pending');
    });
  });

  // Feature: engineering-flag-system, Property 15: Approval blocking logic
  // Validates: Requirements 7.1, 7.2, 7.3, 7.4
  describe('canApprovePJO', () => {
    it('should allow approval when engineering not required', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('not_required', 'pending', 'in_progress', 'completed', 'waived', null),
          (status) => {
            const result = canApprovePJO({
              requires_engineering: false,
              engineering_status: status,
            });
            expect(result.canApprove).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow approval when engineering is completed or waived', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('completed', 'waived'),
          (status) => {
            const result = canApprovePJO({
              requires_engineering: true,
              engineering_status: status,
            });
            expect(result.canApprove).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block approval when engineering is pending or in_progress', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('pending', 'in_progress', 'not_required'),
          (status) => {
            const result = canApprovePJO({
              requires_engineering: true,
              engineering_status: status,
            });
            expect(result.canApprove).toBe(false);
            expect(result.reason).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide a reason when blocking approval', () => {
      const result = canApprovePJO({
        requires_engineering: true,
        engineering_status: 'pending',
      });
      expect(result.canApprove).toBe(false);
      expect(result.reason).toContain('Engineering review');
    });
  });

  describe('calculateTotalAdditionalCosts', () => {
    it('should sum costs from completed assessments only', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: fc.constantFrom<AssessmentStatus>('pending', 'in_progress', 'completed'),
              additional_cost_estimate: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (assessments) => {
            const result = calculateTotalAdditionalCosts(assessments);
            const expected = assessments
              .filter(a => a.status === 'completed')
              .reduce((sum, a) => sum + (a.additional_cost_estimate || 0), 0);
            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for empty or null assessments', () => {
      expect(calculateTotalAdditionalCosts(null)).toBe(0);
      expect(calculateTotalAdditionalCosts(undefined)).toBe(0);
      expect(calculateTotalAdditionalCosts([])).toBe(0);
    });
  });

  describe('canWaiveEngineeringReview', () => {
    it('should allow managers and above to waive', () => {
      const managerRoles = ['manager', 'super_admin', 'owner', 'admin'];
      managerRoles.forEach(role => {
        expect(canWaiveEngineeringReview(role)).toBe(true);
      });
    });

    it('should not allow non-managers to waive', () => {
      const nonManagerRoles = ['sales', 'ops', 'engineer', 'user'];
      nonManagerRoles.forEach(role => {
        expect(canWaiveEngineeringReview(role)).toBe(false);
      });
    });

    it('should return false for null or undefined', () => {
      expect(canWaiveEngineeringReview(null)).toBe(false);
      expect(canWaiveEngineeringReview(undefined)).toBe(false);
    });
  });

  describe('getHighestRiskLevel', () => {
    it('should return the highest risk level from completed assessments', () => {
      const assessments = [
        { status: 'completed' as AssessmentStatus, risk_level: 'low' as const },
        { status: 'completed' as AssessmentStatus, risk_level: 'high' as const },
        { status: 'completed' as AssessmentStatus, risk_level: 'medium' as const },
      ];
      expect(getHighestRiskLevel(assessments)).toBe('high');
    });

    it('should return critical as highest', () => {
      const assessments = [
        { status: 'completed' as AssessmentStatus, risk_level: 'critical' as const },
        { status: 'completed' as AssessmentStatus, risk_level: 'high' as const },
      ];
      expect(getHighestRiskLevel(assessments)).toBe('critical');
    });

    it('should return null for empty assessments', () => {
      expect(getHighestRiskLevel(null)).toBe(null);
      expect(getHighestRiskLevel([])).toBe(null);
    });
  });

  describe('getAssessmentCompletionPercentage', () => {
    it('should calculate correct percentage', () => {
      const assessments = [
        { status: 'completed' as AssessmentStatus },
        { status: 'completed' as AssessmentStatus },
        { status: 'pending' as AssessmentStatus },
        { status: 'in_progress' as AssessmentStatus },
      ];
      expect(getAssessmentCompletionPercentage(assessments)).toBe(50);
    });

    it('should return 100 when all completed', () => {
      const assessments = [
        { status: 'completed' as AssessmentStatus },
        { status: 'completed' as AssessmentStatus },
      ];
      expect(getAssessmentCompletionPercentage(assessments)).toBe(100);
    });

    it('should return 0 for empty assessments', () => {
      expect(getAssessmentCompletionPercentage(null)).toBe(0);
      expect(getAssessmentCompletionPercentage([])).toBe(0);
    });

    it('should ignore cancelled assessments', () => {
      const assessments = [
        { status: 'completed' as AssessmentStatus },
        { status: 'cancelled' as AssessmentStatus },
      ];
      expect(getAssessmentCompletionPercentage(assessments)).toBe(100);
    });
  });
});
