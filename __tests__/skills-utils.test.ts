import { describe, it, expect } from 'vitest';
import {
  getGapStatus,
  getDaysUntilExpiry,
  getExpiryStatus,
  formatDaysUntilExpiry,
  calculateCoveragePercent,
  sortByCriticality,
  filterSkillsWithGaps,
  getCoverageBarWidth,
  getCoverageBarColor,
  validateCertificationDates,
  generateRecommendations,
} from '@/lib/skills-utils';
import { SkillGapAnalysis, ExpiringCertification } from '@/types/skills';

describe('skills-utils', () => {
  describe('getGapStatus', () => {
    it('returns met when gap is 0 or negative', () => {
      const gap: SkillGapAnalysis = {
        skill_id: '1',
        skill_code: 'test',
        skill_name: 'Test Skill',
        criticality: 'high',
        target_coverage_percent: 80,
        requires_certification: true,
        category_name: 'Test',
        ops_staff_count: 10,
        staff_with_skill: 10,
        current_coverage_percent: 100,
        gap_percent: -20,
      };
      expect(getGapStatus(gap).status).toBe('met');
    });

    it('returns warning when gap is between 1-15%', () => {
      const gap: SkillGapAnalysis = {
        skill_id: '1',
        skill_code: 'test',
        skill_name: 'Test Skill',
        criticality: 'high',
        target_coverage_percent: 80,
        requires_certification: true,
        category_name: 'Test',
        ops_staff_count: 10,
        staff_with_skill: 7,
        current_coverage_percent: 70,
        gap_percent: 10,
      };
      expect(getGapStatus(gap).status).toBe('warning');
    });

    it('returns critical when gap is > 15%', () => {
      const gap: SkillGapAnalysis = {
        skill_id: '1',
        skill_code: 'test',
        skill_name: 'Test Skill',
        criticality: 'high',
        target_coverage_percent: 80,
        requires_certification: true,
        category_name: 'Test',
        ops_staff_count: 10,
        staff_with_skill: 5,
        current_coverage_percent: 50,
        gap_percent: 30,
      };
      expect(getGapStatus(gap).status).toBe('critical');
    });
  });

  describe('getDaysUntilExpiry', () => {
    it('returns null for null input', () => {
      expect(getDaysUntilExpiry(null)).toBeNull();
    });

    it('returns positive days for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const result = getDaysUntilExpiry(futureDate.toISOString());
      expect(result).toBe(30);
    });

    it('returns negative days for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const result = getDaysUntilExpiry(pastDate.toISOString());
      expect(result).toBe(-10);
    });
  });

  describe('getExpiryStatus', () => {
    it('returns ok for null', () => {
      expect(getExpiryStatus(null)).toBe('ok');
    });

    it('returns expired for negative days', () => {
      expect(getExpiryStatus(-5)).toBe('expired');
    });

    it('returns critical for 0-30 days', () => {
      expect(getExpiryStatus(15)).toBe('critical');
      expect(getExpiryStatus(30)).toBe('critical');
    });

    it('returns warning for 31-60 days', () => {
      expect(getExpiryStatus(45)).toBe('warning');
      expect(getExpiryStatus(60)).toBe('warning');
    });

    it('returns ok for > 60 days', () => {
      expect(getExpiryStatus(90)).toBe('ok');
    });
  });

  describe('formatDaysUntilExpiry', () => {
    it('formats positive days correctly', () => {
      expect(formatDaysUntilExpiry(1)).toBe('1 day');
      expect(formatDaysUntilExpiry(5)).toBe('5 days');
    });

    it('formats negative days as overdue', () => {
      expect(formatDaysUntilExpiry(-1)).toBe('1 day overdue');
      expect(formatDaysUntilExpiry(-10)).toBe('10 days overdue');
    });
  });

  describe('calculateCoveragePercent', () => {
    it('returns 0 for zero total staff', () => {
      expect(calculateCoveragePercent(5, 0)).toBe(0);
    });

    it('calculates percentage correctly', () => {
      expect(calculateCoveragePercent(8, 10)).toBe(80);
      expect(calculateCoveragePercent(3, 10)).toBe(30);
    });
  });

  describe('sortByCriticality', () => {
    it('sorts critical first, then high, medium, low', () => {
      const items = [
        { criticality: 'low' as const },
        { criticality: 'critical' as const },
        { criticality: 'medium' as const },
        { criticality: 'high' as const },
      ];
      const sorted = sortByCriticality(items);
      expect(sorted[0].criticality).toBe('critical');
      expect(sorted[1].criticality).toBe('high');
      expect(sorted[2].criticality).toBe('medium');
      expect(sorted[3].criticality).toBe('low');
    });
  });

  describe('filterSkillsWithGaps', () => {
    it('filters out skills with no gap', () => {
      const gaps: SkillGapAnalysis[] = [
        { skill_id: '1', skill_code: 'a', skill_name: 'A', criticality: 'high', target_coverage_percent: 80, requires_certification: false, category_name: 'Test', ops_staff_count: 10, staff_with_skill: 10, current_coverage_percent: 100, gap_percent: 0 },
        { skill_id: '2', skill_code: 'b', skill_name: 'B', criticality: 'high', target_coverage_percent: 80, requires_certification: false, category_name: 'Test', ops_staff_count: 10, staff_with_skill: 5, current_coverage_percent: 50, gap_percent: 30 },
      ];
      const filtered = filterSkillsWithGaps(gaps);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].skill_id).toBe('2');
    });
  });

  describe('getCoverageBarWidth', () => {
    it('returns 0 for null', () => {
      expect(getCoverageBarWidth(null)).toBe(0);
    });

    it('caps at 100', () => {
      expect(getCoverageBarWidth(150)).toBe(100);
    });

    it('returns actual value when under 100', () => {
      expect(getCoverageBarWidth(75)).toBe(75);
    });
  });

  describe('getCoverageBarColor', () => {
    it('returns gray for null', () => {
      expect(getCoverageBarColor(null, 80)).toBe('bg-gray-300');
    });

    it('returns green when at or above target', () => {
      expect(getCoverageBarColor(80, 80)).toBe('bg-green-500');
      expect(getCoverageBarColor(100, 80)).toBe('bg-green-500');
    });

    it('returns yellow when 70-99% of target', () => {
      expect(getCoverageBarColor(60, 80)).toBe('bg-yellow-500');
    });

    it('returns red when below 70% of target', () => {
      expect(getCoverageBarColor(40, 80)).toBe('bg-red-500');
    });
  });

  describe('validateCertificationDates', () => {
    it('returns valid for both null', () => {
      expect(validateCertificationDates(null, null).valid).toBe(true);
    });

    it('returns invalid when expiry set without cert date', () => {
      const result = validateCertificationDates(null, '2025-12-31');
      expect(result.valid).toBe(false);
    });

    it('returns invalid when expiry before cert date', () => {
      const result = validateCertificationDates('2025-06-01', '2025-01-01');
      expect(result.valid).toBe(false);
    });

    it('returns valid when expiry after cert date', () => {
      const result = validateCertificationDates('2025-01-01', '2025-12-31');
      expect(result.valid).toBe(true);
    });
  });

  describe('generateRecommendations', () => {
    it('generates recommendations for critical gaps', () => {
      const gaps: SkillGapAnalysis[] = [
        { skill_id: '1', skill_code: 'test', skill_name: 'Critical Skill', criticality: 'critical', target_coverage_percent: 80, requires_certification: true, category_name: 'Test', ops_staff_count: 10, staff_with_skill: 5, current_coverage_percent: 50, gap_percent: 30 },
      ];
      const recommendations = generateRecommendations(gaps, []);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toContain('Critical Skill');
    });

    it('generates recommendations for expiring certs', () => {
      const expiring: ExpiringCertification[] = [
        { id: '1', employee_id: '1', employee_name: 'John', employee_code: 'E001', skill_id: '1', skill_name: 'Test', skill_code: 'test', certification_number: '123', certification_date: '2023-01-01', expiry_date: '2025-01-15', days_until_expiry: 25, expiry_status: 'critical' },
      ];
      const recommendations = generateRecommendations([], expiring);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toContain('certification');
    });

    it('limits to 5 recommendations', () => {
      const gaps: SkillGapAnalysis[] = Array(10).fill(null).map((_, i) => ({
        skill_id: String(i),
        skill_code: `skill${i}`,
        skill_name: `Skill ${i}`,
        criticality: 'critical' as const,
        target_coverage_percent: 80,
        requires_certification: true,
        category_name: 'Test',
        ops_staff_count: 10,
        staff_with_skill: 2,
        current_coverage_percent: 20,
        gap_percent: 60,
      }));
      const recommendations = generateRecommendations(gaps, []);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });
});
