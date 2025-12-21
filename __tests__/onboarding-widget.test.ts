// =====================================================
// v0.36: ONBOARDING WIDGET UNIT TESTS
// =====================================================
// Feature: onboarding-checklist
// Unit tests for widget components

import { describe, it, expect } from 'vitest';
import {
  calculatePercentComplete,
  formatPoints,
  getStatusDisplay,
  getNextSteps,
} from '@/lib/onboarding-utils';
import {
  OnboardingProgressWithStep,
  ProgressStatus,
} from '@/types/onboarding';

describe('Onboarding Widget Unit Tests', () => {
  describe('Progress Bar Calculations', () => {
    it('should calculate 0% when no steps completed', () => {
      expect(calculatePercentComplete(0, 10)).toBe(0);
    });

    it('should calculate 100% when all steps completed', () => {
      expect(calculatePercentComplete(10, 10)).toBe(100);
    });

    it('should calculate correct percentage for partial completion', () => {
      expect(calculatePercentComplete(3, 10)).toBe(30);
      expect(calculatePercentComplete(5, 10)).toBe(50);
      expect(calculatePercentComplete(7, 10)).toBe(70);
    });

    it('should handle 0 total steps', () => {
      expect(calculatePercentComplete(0, 0)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculatePercentComplete(1, 3)).toBe(33);
      expect(calculatePercentComplete(2, 3)).toBe(67);
    });
  });

  describe('Points Formatting', () => {
    it('should format points with + prefix', () => {
      expect(formatPoints(10)).toBe('+10 pts');
      expect(formatPoints(20)).toBe('+20 pts');
      expect(formatPoints(100)).toBe('+100 pts');
    });

    it('should handle zero points', () => {
      expect(formatPoints(0)).toBe('+0 pts');
    });
  });

  describe('Status Display', () => {
    it('should return correct display for completed status', () => {
      const display = getStatusDisplay('completed');
      expect(display.icon).toBe('✅');
      expect(display.label).toBe('Completed');
      expect(display.className).toContain('green');
    });

    it('should return correct display for pending status', () => {
      const display = getStatusDisplay('pending');
      expect(display.icon).toBe('☐');
      expect(display.label).toBe('Pending');
    });

    it('should return correct display for in_progress status', () => {
      const display = getStatusDisplay('in_progress');
      expect(display.icon).toBe('🔄');
      expect(display.label).toBe('In Progress');
      expect(display.className).toContain('blue');
    });

    it('should return correct display for skipped status', () => {
      const display = getStatusDisplay('skipped');
      expect(display.icon).toBe('⏭️');
      expect(display.label).toBe('Skipped');
      expect(display.className).toContain('gray');
    });
  });

  describe('Next Steps Selection', () => {
    const createMockProgress = (
      status: ProgressStatus,
      stepOrder: number
    ): OnboardingProgressWithStep => ({
      id: `progress-${stepOrder}`,
      user_id: 'user-1',
      step_id: `step-${stepOrder}`,
      status,
      started_at: null,
      completed_at: null,
      current_count: 0,
      created_at: '2025-01-01T00:00:00.000Z',
      step: {
        id: `step-${stepOrder}`,
        step_code: `step_${stepOrder}`,
        step_name: `Step ${stepOrder}`,
        description: `Description for step ${stepOrder}`,
        category: 'explore',
        step_order: stepOrder,
        applicable_roles: ['admin'],
        completion_type: 'auto_route',
        completion_route: `/route-${stepOrder}`,
        completion_action: null,
        completion_count: 1,
        completion_table: null,
        icon: null,
        action_label: 'Go',
        action_route: `/route-${stepOrder}`,
        points: 10,
        badge_on_complete: null,
        is_required: false,
        is_active: true,
        created_at: '2025-01-01T00:00:00.000Z',
      },
    });

    it('should return only pending and in_progress steps', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('completed', 1),
        createMockProgress('pending', 2),
        createMockProgress('in_progress', 3),
        createMockProgress('skipped', 4),
        createMockProgress('pending', 5),
      ];

      const nextSteps = getNextSteps(progress, 10);
      
      expect(nextSteps.length).toBe(3);
      expect(nextSteps.every(s => s.status === 'pending' || s.status === 'in_progress')).toBe(true);
    });

    it('should respect the limit parameter', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('pending', 1),
        createMockProgress('pending', 2),
        createMockProgress('pending', 3),
        createMockProgress('pending', 4),
        createMockProgress('pending', 5),
      ];

      expect(getNextSteps(progress, 2).length).toBe(2);
      expect(getNextSteps(progress, 3).length).toBe(3);
    });

    it('should order by step_order', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('pending', 5),
        createMockProgress('pending', 2),
        createMockProgress('pending', 8),
        createMockProgress('pending', 1),
      ];

      const nextSteps = getNextSteps(progress, 4);
      
      expect(nextSteps[0].step.step_order).toBe(1);
      expect(nextSteps[1].step.step_order).toBe(2);
      expect(nextSteps[2].step.step_order).toBe(5);
      expect(nextSteps[3].step.step_order).toBe(8);
    });

    it('should return empty array when no pending steps', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('completed', 1),
        createMockProgress('completed', 2),
        createMockProgress('skipped', 3),
      ];

      const nextSteps = getNextSteps(progress, 3);
      expect(nextSteps.length).toBe(0);
    });
  });
});
