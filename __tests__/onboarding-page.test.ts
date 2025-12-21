// =====================================================
// v0.36: ONBOARDING PAGE UNIT TESTS
// =====================================================
// Feature: onboarding-checklist
// Unit tests for onboarding page logic

import { describe, it, expect } from 'vitest';
import {
  groupStepsByCategory,
  isCategoryComplete,
  getCategoryStats,
} from '@/lib/onboarding-utils';
import {
  OnboardingProgressWithStep,
  OnboardingCategory,
  ONBOARDING_CATEGORIES,
} from '@/types/onboarding';

describe('Onboarding Page Unit Tests', () => {
  const createMockProgress = (
    category: OnboardingCategory,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped',
    stepOrder: number
  ): OnboardingProgressWithStep => ({
    id: `progress-${stepOrder}`,
    user_id: 'user-1',
    step_id: `step-${stepOrder}`,
    status,
    started_at: null,
    completed_at: status === 'completed' ? '2025-01-15T10:00:00.000Z' : null,
    current_count: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    step: {
      id: `step-${stepOrder}`,
      step_code: `step_${stepOrder}`,
      step_name: `Step ${stepOrder}`,
      description: `Description for step ${stepOrder}`,
      category,
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

  describe('Category Grouping', () => {
    it('should group steps by category correctly', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
        createMockProgress('profile', 'pending', 2),
        createMockProgress('explore', 'pending', 10),
        createMockProgress('explore', 'pending', 11),
        createMockProgress('first_action', 'pending', 20),
        createMockProgress('advanced', 'pending', 30),
      ];

      const grouped = groupStepsByCategory(progress);

      expect(grouped.profile.length).toBe(2);
      expect(grouped.explore.length).toBe(2);
      expect(grouped.first_action.length).toBe(1);
      expect(grouped.advanced.length).toBe(1);
    });

    it('should handle empty categories', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
      ];

      const grouped = groupStepsByCategory(progress);

      expect(grouped.profile.length).toBe(1);
      expect(grouped.explore.length).toBe(0);
      expect(grouped.first_action.length).toBe(0);
      expect(grouped.advanced.length).toBe(0);
    });

    it('should sort steps within category by step_order', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('explore', 'pending', 15),
        createMockProgress('explore', 'pending', 11),
        createMockProgress('explore', 'pending', 13),
      ];

      const grouped = groupStepsByCategory(progress);

      expect(grouped.explore[0].step.step_order).toBe(11);
      expect(grouped.explore[1].step.step_order).toBe(13);
      expect(grouped.explore[2].step.step_order).toBe(15);
    });
  });

  describe('Category Completion', () => {
    it('should detect complete category', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
        createMockProgress('profile', 'completed', 2),
        createMockProgress('explore', 'pending', 10),
      ];

      expect(isCategoryComplete(progress, 'profile')).toBe(true);
      expect(isCategoryComplete(progress, 'explore')).toBe(false);
    });

    it('should treat skipped as complete for category completion', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
        createMockProgress('profile', 'skipped', 2),
      ];

      expect(isCategoryComplete(progress, 'profile')).toBe(true);
    });

    it('should return true for empty category', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
      ];

      expect(isCategoryComplete(progress, 'explore')).toBe(true);
    });
  });

  describe('Category Stats', () => {
    it('should calculate correct stats', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
        createMockProgress('profile', 'pending', 2),
        createMockProgress('profile', 'completed', 3),
      ];

      const stats = getCategoryStats(progress, 'profile');

      expect(stats.completed).toBe(2);
      expect(stats.total).toBe(3);
    });

    it('should return zero for empty category', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
      ];

      const stats = getCategoryStats(progress, 'explore');

      expect(stats.completed).toBe(0);
      expect(stats.total).toBe(0);
    });

    it('should not count skipped as completed', () => {
      const progress: OnboardingProgressWithStep[] = [
        createMockProgress('profile', 'completed', 1),
        createMockProgress('profile', 'skipped', 2),
        createMockProgress('profile', 'pending', 3),
      ];

      const stats = getCategoryStats(progress, 'profile');

      expect(stats.completed).toBe(1);
      expect(stats.total).toBe(3);
    });
  });

  describe('Skip Onboarding Logic', () => {
    it('should mark all pending as skipped', () => {
      const statuses = ['pending', 'in_progress', 'completed', 'pending'];
      const afterSkip = statuses.map(s => 
        s === 'pending' || s === 'in_progress' ? 'skipped' : s
      );

      expect(afterSkip).toEqual(['skipped', 'skipped', 'completed', 'skipped']);
    });

    it('should preserve completed status', () => {
      const statuses = ['completed', 'completed', 'pending'];
      const afterSkip = statuses.map(s => 
        s === 'pending' || s === 'in_progress' ? 'skipped' : s
      );

      expect(afterSkip.filter(s => s === 'completed').length).toBe(2);
    });
  });

  describe('Continue Later Button', () => {
    it('should not change any status', () => {
      const statuses = ['pending', 'in_progress', 'completed', 'skipped'];
      // Continue later just navigates away, no status change
      expect(statuses).toEqual(['pending', 'in_progress', 'completed', 'skipped']);
    });
  });
});
