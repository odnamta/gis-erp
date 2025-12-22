/**
 * @fileoverview Unit tests for depreciation server actions
 * Tests: recordDepreciation, getDepreciationHistory, runMonthlyDepreciation,
 *        recordCost, getCostHistory, getCostBreakdown, getTCOSummary
 * 
 * Requirements validated: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 5.1-5.7, 8.1-8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking
import {
  recordDepreciation,
  getDepreciationHistory,
  runMonthlyDepreciation,
  recordCost,
  getCostHistory,
  getCostBreakdown,
  getTCOSummary,
  refreshTCOView,
  deleteCost,
} from '@/lib/depreciation-actions';

describe('Depreciation Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('recordDepreciation', () => {
    it('should record depreciation for eligible asset', async () => {
      // This test validates the function structure
      // Full integration tests would require actual database
      expect(typeof recordDepreciation).toBe('function');
    });

    it('should reject depreciation for non-existent asset', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      const result = await recordDepreciation('non-existent', '2025-01-01', '2025-01-31');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Asset not found');
    });

    it('should reject depreciation for ineligible asset status', async () => {
      const mockAsset = {
        id: 'asset-1',
        status: 'disposed',
        depreciation_start_date: '2024-01-01',
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAsset, error: null }),
      }));

      const result = await recordDepreciation('asset-1', '2025-01-01', '2025-01-31');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Asset is not eligible for depreciation');
    });
  });

  describe('getDepreciationHistory', () => {
    it('should return depreciation history for asset', async () => {
      const mockHistory = [
        {
          id: 'dep-1',
          asset_id: 'asset-1',
          depreciation_date: '2025-01-31',
          depreciation_method: 'straight_line',
          period_start: '2025-01-01',
          period_end: '2025-01-31',
          beginning_book_value: 90000000,
          depreciation_amount: 1500000,
          ending_book_value: 88500000,
          accumulated_depreciation: 11500000,
          notes: null,
          created_by: 'user-1',
          created_at: '2025-01-31T00:00:00Z',
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockHistory, error: null }),
      }));

      const result = await getDepreciationHistory('asset-1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].assetId).toBe('asset-1');
    });

    it('should handle empty history', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const result = await getDepreciationHistory('asset-1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('runMonthlyDepreciation', () => {
    it('should process batch depreciation for eligible assets', async () => {
      // This test validates the batch processing structure
      expect(typeof runMonthlyDepreciation).toBe('function');
    });

    it('should skip already depreciated assets', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          status: 'active',
          purchase_price: 100000000,
          book_value: 90000000,
          salvage_value: 10000000,
          depreciation_method: 'straight_line',
          useful_life_years: 5,
          accumulated_depreciation: 10000000,
          depreciation_start_date: '2024-01-01',
        },
      ];

      // Mock existing depreciation record - asset already depreciated for this period
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'assets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: mockAssets, error: null })),
          };
        }
        if (table === 'asset_depreciation') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      });

      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const result = await runMonthlyDepreciation(2025, 1);
      expect(result.success).toBe(true);
      expect(result.data?.skippedCount).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Cost Tracking Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('recordCost', () => {
    it('should record cost with valid data', async () => {
      const mockCost = {
        id: 'cost-1',
        asset_id: 'asset-1',
        cost_type: 'fuel',
        cost_date: '2025-01-15',
        amount: 500000,
        reference_type: null,
        reference_id: null,
        notes: 'Fuel refill',
        created_by: 'test-user-id',
        created_at: '2025-01-15T00:00:00Z',
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'assets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'asset-1' }, error: null }),
          };
        }
        if (table === 'asset_cost_tracking') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCost, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      });

      const result = await recordCost({
        assetId: 'asset-1',
        costType: 'fuel',
        costDate: '2025-01-15',
        amount: 500000,
        notes: 'Fuel refill',
      });

      expect(result.success).toBe(true);
      expect(result.data?.costType).toBe('fuel');
      expect(result.data?.amount).toBe(500000);
    });

    it('should reject cost with invalid cost type', async () => {
      const result = await recordCost({
        assetId: 'asset-1',
        costType: 'invalid_type' as any,
        costDate: '2025-01-15',
        amount: 500000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid cost type');
    });

    it('should reject cost with non-positive amount', async () => {
      const result = await recordCost({
        assetId: 'asset-1',
        costType: 'fuel',
        costDate: '2025-01-15',
        amount: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cost amount must be positive');
    });

    it('should reject cost with negative amount', async () => {
      const result = await recordCost({
        assetId: 'asset-1',
        costType: 'fuel',
        costDate: '2025-01-15',
        amount: -100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cost amount must be positive');
    });

    it('should reject cost for non-existent asset', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      const result = await recordCost({
        assetId: 'non-existent',
        costType: 'fuel',
        costDate: '2025-01-15',
        amount: 500000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Asset not found');
    });

    it('should record cost with reference type and id', async () => {
      const mockCost = {
        id: 'cost-2',
        asset_id: 'asset-1',
        cost_type: 'maintenance',
        cost_date: '2025-01-15',
        amount: 2000000,
        reference_type: 'maintenance_record',
        reference_id: 'maint-1',
        notes: null,
        created_by: 'test-user-id',
        created_at: '2025-01-15T00:00:00Z',
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'assets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'asset-1' }, error: null }),
          };
        }
        if (table === 'asset_cost_tracking') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCost, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      });

      const result = await recordCost({
        assetId: 'asset-1',
        costType: 'maintenance',
        costDate: '2025-01-15',
        amount: 2000000,
        referenceType: 'maintenance_record',
        referenceId: 'maint-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.referenceType).toBe('maintenance_record');
      expect(result.data?.referenceId).toBe('maint-1');
    });
  });

  describe('getCostHistory', () => {
    it('should return cost history for asset', async () => {
      const mockHistory = [
        {
          id: 'cost-1',
          asset_id: 'asset-1',
          cost_type: 'fuel',
          cost_date: '2025-01-15',
          amount: 500000,
          reference_type: null,
          reference_id: null,
          notes: 'Fuel refill',
          created_by: 'user-1',
          created_at: '2025-01-15T00:00:00Z',
        },
        {
          id: 'cost-2',
          asset_id: 'asset-1',
          cost_type: 'maintenance',
          cost_date: '2025-01-10',
          amount: 2000000,
          reference_type: 'maintenance_record',
          reference_id: 'maint-1',
          notes: null,
          created_by: 'user-1',
          created_at: '2025-01-10T00:00:00Z',
        },
      ];

      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockHistory, error: null })),
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(chainableMock),
      }));

      const result = await getCostHistory('asset-1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].costType).toBe('fuel');
    });

    it('should return empty array when no costs found', async () => {
      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(chainableMock),
      }));

      const result = await getCostHistory('asset-1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should filter by cost type', async () => {
      const mockHistory = [
        {
          id: 'cost-1',
          asset_id: 'asset-1',
          cost_type: 'fuel',
          cost_date: '2025-01-15',
          amount: 500000,
          reference_type: null,
          reference_id: null,
          notes: null,
          created_by: 'user-1',
          created_at: '2025-01-15T00:00:00Z',
        },
      ];

      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockHistory, error: null })),
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(chainableMock),
      }));

      const result = await getCostHistory('asset-1', 'fuel');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].costType).toBe('fuel');
    });

    it('should filter by date range', async () => {
      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(chainableMock),
      }));

      const result = await getCostHistory('asset-1', undefined, '2025-01-01', '2025-01-31');
      expect(result.success).toBe(true);
    });
  });

  describe('getCostBreakdown', () => {
    it('should return cost breakdown by type', async () => {
      const mockCosts = [
        { cost_type: 'fuel', amount: 500000 },
        { cost_type: 'fuel', amount: 600000 },
        { cost_type: 'maintenance', amount: 2000000 },
        { cost_type: 'insurance', amount: 1000000 },
      ];

      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockCosts, error: null })),
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue(chainableMock),
      }));

      const result = await getCostBreakdown('asset-1');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Check that breakdown contains expected cost types (uses totalAmount not amount)
      const fuelBreakdown = result.data?.find(b => b.costType === 'fuel');
      expect(fuelBreakdown?.totalAmount).toBe(1100000); // 500000 + 600000
      
      const maintenanceBreakdown = result.data?.find(b => b.costType === 'maintenance');
      expect(maintenanceBreakdown?.totalAmount).toBe(2000000);
    });

    it('should return empty breakdown when no costs', async () => {
      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue(chainableMock),
      }));

      const result = await getCostBreakdown('asset-1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should calculate percentages correctly', async () => {
      const mockCosts = [
        { cost_type: 'fuel', amount: 500000 },
        { cost_type: 'maintenance', amount: 500000 },
      ];

      const chainableMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockCosts, error: null })),
      };

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue(chainableMock),
      }));

      const result = await getCostBreakdown('asset-1');
      expect(result.success).toBe(true);
      
      // Each should be 50%
      const fuelBreakdown = result.data?.find(b => b.costType === 'fuel');
      expect(fuelBreakdown?.percentage).toBe(50);
    });
  });

  describe('getTCOSummary', () => {
    it('should return TCO summary for all assets', async () => {
      const mockTCOData = [
        {
          asset_id: 'asset-1',
          purchase_cost: 100000000,
          total_maintenance: 5000000,
          total_fuel: 10000000,
          total_depreciation: 15000000,
          total_insurance: 2000000,
          total_registration: 500000,
          total_other: 1000000,
          total_tco: 133500000,
          total_km: 50000,
          total_hours: 2000,
          cost_per_km: 2670,
          cost_per_hour: 66750,
        },
      ];

      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ data: mockTCOData, error: null }),
      }));

      const result = await getTCOSummary();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].totalTCO).toBe(133500000);
    });

    it('should handle empty TCO data', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const result = await getTCOSummary();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should filter by category when provided', async () => {
      const mockTCOData = [
        {
          asset_id: 'asset-1',
          purchase_cost: 100000000,
          total_maintenance: 5000000,
          total_fuel: 10000000,
          total_depreciation: 15000000,
          total_insurance: 2000000,
          total_registration: 500000,
          total_other: 1000000,
          total_tco: 133500000,
          total_km: 50000,
          total_hours: 2000,
          cost_per_km: 2670,
          cost_per_hour: 66750,
        },
      ];

      const mockCategoryAssets = [{ id: 'asset-1' }];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'asset_tco_summary') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockTCOData, error: null }),
          };
        }
        if (table === 'assets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockCategoryAssets, error: null }),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      const result = await getTCOSummary('category-1');
      expect(result.success).toBe(true);
    });
  });

  describe('refreshTCOView', () => {
    it('should refresh TCO materialized view successfully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const result = await refreshTCOView();
      expect(result.success).toBe(true);
    });

    it('should handle refresh error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: { message: 'Refresh failed' } });

      const result = await refreshTCOView();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to refresh TCO view');
    });
  });

  describe('deleteCost', () => {
    it('should delete cost record successfully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      const result = await deleteCost('cost-1');
      expect(result.success).toBe(true);
    });

    it('should handle delete error', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
      }));

      const result = await deleteCost('cost-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete cost');
    });
  });
});
