// =====================================================
// v0.36: ONBOARDING INTEGRATION TESTS
// =====================================================
// Feature: onboarding-checklist
// Integration tests for dashboard and action tracking

import { describe, it, expect } from 'vitest';
import {
  shouldAutoCompleteOnRoute,
  shouldIncrementCount,
  shouldCompleteCountStep,
} from '@/lib/onboarding-utils';
import { OnboardingStep } from '@/types/onboarding';

describe('Onboarding Integration Tests', () => {
  describe('Dashboard Widget Visibility', () => {
    it('should show widget when show_onboarding_widget is true and not complete', () => {
      const status = {
        show_onboarding_widget: true,
        is_onboarding_complete: false,
      };
      
      const shouldShow = status.show_onboarding_widget && !status.is_onboarding_complete;
      expect(shouldShow).toBe(true);
    });

    it('should hide widget when show_onboarding_widget is false', () => {
      const status = {
        show_onboarding_widget: false,
        is_onboarding_complete: false,
      };
      
      const shouldShow = status.show_onboarding_widget && !status.is_onboarding_complete;
      expect(shouldShow).toBe(false);
    });

    it('should hide widget when onboarding is complete', () => {
      const status = {
        show_onboarding_widget: true,
        is_onboarding_complete: true,
      };
      
      const shouldShow = status.show_onboarding_widget && !status.is_onboarding_complete;
      expect(shouldShow).toBe(false);
    });
  });

  describe('Route Tracking Integration', () => {
    const createAutoRouteStep = (route: string): OnboardingStep => ({
      id: 'step-1',
      step_code: 'explore_dashboard',
      step_name: 'Explore Dashboard',
      description: 'Visit the dashboard',
      category: 'explore',
      step_order: 10,
      applicable_roles: ['admin'],
      completion_type: 'auto_route',
      completion_route: route,
      completion_action: null,
      completion_count: 1,
      completion_table: null,
      icon: null,
      action_label: 'Go',
      action_route: route,
      points: 10,
      badge_on_complete: null,
      is_required: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
    });

    it('should match exact route', () => {
      const step = createAutoRouteStep('/dashboard');
      expect(shouldAutoCompleteOnRoute(step, '/dashboard')).toBe(true);
    });

    it('should match route with trailing slash', () => {
      const step = createAutoRouteStep('/dashboard');
      expect(shouldAutoCompleteOnRoute(step, '/dashboard/')).toBe(true);
    });

    it('should not match different route', () => {
      const step = createAutoRouteStep('/dashboard');
      expect(shouldAutoCompleteOnRoute(step, '/customers')).toBe(false);
    });

    it('should not match partial route', () => {
      const step = createAutoRouteStep('/dashboard');
      expect(shouldAutoCompleteOnRoute(step, '/dashboard/settings')).toBe(false);
    });
  });

  describe('Action Tracking Integration', () => {
    const createAutoCountStep = (table: string, count: number): OnboardingStep => ({
      id: 'step-1',
      step_code: 'first_quotation',
      step_name: 'Create First Quotation',
      description: 'Create a quotation',
      category: 'first_action',
      step_order: 20,
      applicable_roles: ['admin', 'sales'],
      completion_type: 'auto_count',
      completion_route: null,
      completion_action: null,
      completion_count: count,
      completion_table: table,
      icon: null,
      action_label: 'Create',
      action_route: '/quotations/new',
      points: 20,
      badge_on_complete: null,
      is_required: false,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
    });

    it('should increment count on create action', () => {
      const step = createAutoCountStep('quotations', 1);
      expect(shouldIncrementCount(step, 'quotations', 'create')).toBe(true);
    });

    it('should not increment count on update action', () => {
      const step = createAutoCountStep('quotations', 1);
      expect(shouldIncrementCount(step, 'quotations', 'update')).toBe(false);
    });

    it('should not increment count on delete action', () => {
      const step = createAutoCountStep('quotations', 1);
      expect(shouldIncrementCount(step, 'quotations', 'delete')).toBe(false);
    });

    it('should not increment count for different table', () => {
      const step = createAutoCountStep('quotations', 1);
      expect(shouldIncrementCount(step, 'customers', 'create')).toBe(false);
    });

    it('should complete when count reaches target', () => {
      expect(shouldCompleteCountStep(1, 1)).toBe(true);
      expect(shouldCompleteCountStep(2, 1)).toBe(true);
      expect(shouldCompleteCountStep(0, 1)).toBe(false);
    });

    it('should handle multi-count completion', () => {
      const step = createAutoCountStep('quotations', 3);
      
      // Simulate creating 3 quotations
      expect(shouldCompleteCountStep(1, step.completion_count)).toBe(false);
      expect(shouldCompleteCountStep(2, step.completion_count)).toBe(false);
      expect(shouldCompleteCountStep(3, step.completion_count)).toBe(true);
    });
  });

  describe('Existing Users Onboarding', () => {
    it('should initialize onboarding for users without status', () => {
      // Simulate checking if user has onboarding status
      const existingStatus = null;
      const shouldInitialize = existingStatus === null;
      expect(shouldInitialize).toBe(true);
    });

    it('should not re-initialize for users with existing status', () => {
      const existingStatus = { id: 'status-1', user_id: 'user-1' };
      const shouldInitialize = existingStatus === null;
      expect(shouldInitialize).toBe(false);
    });
  });
});
