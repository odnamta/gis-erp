/**
 * Unit tests for utilization server actions
 * Feature: equipment-utilization-tracking
 * **Validates: Requirements 1.2, 1.3, 1.6, 1.7**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAssignment, validateMeterReadings } from '@/lib/utilization-utils';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          is: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Utilization Actions Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Assignment Validation', () => {
    /**
     * Test assignment creation with valid data
     * **Validates: Requirements 1.2**
     */
    it('should accept assignment for active asset without existing assignment', () => {
      const result = validateAssignment('active', false);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    /**
     * Test assignment rejection for inactive assets
     * **Validates: Requirements 1.2**
     */
    it('should reject assignment for inactive asset', () => {
      const inactiveStatuses = ['maintenance', 'repair', 'idle', 'disposed', 'sold'];
      
      for (const status of inactiveStatuses) {
        const result = validateAssignment(status, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Asset is not active and cannot be assigned');
      }
    });

    /**
     * Test assignment rejection for already assigned assets
     * **Validates: Requirements 1.3**
     */
    it('should reject assignment for already assigned asset', () => {
      const result = validateAssignment('active', true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Asset already has an open assignment');
    });
  });

  describe('Meter Reading Validation', () => {
    /**
     * Test assignment completion with meter readings
     * **Validates: Requirements 1.6, 1.7**
     */
    it('should accept valid meter readings', () => {
      const result = validateMeterReadings(1000, 1500, 100, 150);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept when only km readings provided', () => {
      const result = validateMeterReadings(1000, 1500, undefined, undefined);
      expect(result.valid).toBe(true);
    });

    it('should accept when only hour readings provided', () => {
      const result = validateMeterReadings(undefined, undefined, 100, 150);
      expect(result.valid).toBe(true);
    });

    it('should reject when end km is less than start km', () => {
      const result = validateMeterReadings(1500, 1000, undefined, undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End odometer cannot be less than start odometer');
    });

    it('should reject when end hours is less than start hours', () => {
      const result = validateMeterReadings(undefined, undefined, 150, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('End hour meter cannot be less than start hour meter');
    });

    it('should accept equal start and end readings', () => {
      const result = validateMeterReadings(1000, 1000, 100, 100);
      expect(result.valid).toBe(true);
    });

    it('should accept when no readings provided', () => {
      const result = validateMeterReadings(undefined, undefined, undefined, undefined);
      expect(result.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values correctly', () => {
      const result = validateMeterReadings(0, 100, 0, 50);
      expect(result.valid).toBe(true);
    });

    it('should handle large values correctly', () => {
      const result = validateMeterReadings(999999, 1000000, 99999, 100000);
      expect(result.valid).toBe(true);
    });
  });
});
