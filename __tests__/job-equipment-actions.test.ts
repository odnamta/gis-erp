// =====================================================
// v0.45: EQUIPMENT - JOB INTEGRATION SERVER ACTIONS TESTS
// Feature: v0.45-equipment-job-integration
// =====================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking
import {
  addEquipmentToJob,
  completeEquipmentUsage,
  getJobEquipmentUsage,
  updateJobEquipmentCost,
  getEquipmentRate,
  getJobEquipmentSummary,
  deleteEquipmentUsage,
} from '@/lib/job-equipment-actions';

describe('v0.45 Job Equipment Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
  });

  // Helper to create chainable mock
  const createChainableMock = (finalResult: unknown) => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.upsert = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.is = vi.fn().mockReturnValue(chain);
    chain.lte = vi.fn().mockReturnValue(chain);
    chain.gte = vi.fn().mockReturnValue(chain);
    chain.or = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(finalResult);
    return chain;
  };

  describe('addEquipmentToJob', () => {
    it('should reject missing job order ID', async () => {
      const result = await addEquipmentToJob({
        jobOrderId: '',
        assetId: 'asset-123',
        usageStart: '2025-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Job order');
    });

    it('should reject missing asset ID', async () => {
      const result = await addEquipmentToJob({
        jobOrderId: 'jo-123',
        assetId: '',
        usageStart: '2025-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Asset');
    });

    it('should reject missing usage start date', async () => {
      const result = await addEquipmentToJob({
        jobOrderId: 'jo-123',
        assetId: 'asset-123',
        usageStart: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('start date');
    });

    it('should check if asset exists', async () => {
      const assetChain = createChainableMock({ data: null, error: { message: 'Not found' } });
      mockSupabaseClient.from.mockReturnValue(assetChain);

      const result = await addEquipmentToJob({
        jobOrderId: 'jo-123',
        assetId: 'non-existent-asset',
        usageStart: '2025-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Asset not found');
    });

    it('should reject unavailable asset', async () => {
      const assetChain = createChainableMock({
        data: { id: 'asset-123', status: 'maintenance', book_value: 100000000, useful_life_years: 10 },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(assetChain);

      const result = await addEquipmentToJob({
        jobOrderId: 'jo-123',
        assetId: 'asset-123',
        usageStart: '2025-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });
  });

  describe('completeEquipmentUsage', () => {
    it('should reject non-existent usage record', async () => {
      const usageChain = createChainableMock({ data: null, error: { message: 'Not found' } });
      mockSupabaseClient.from.mockReturnValue(usageChain);

      const result = await completeEquipmentUsage({
        usageId: 'non-existent',
        usageEnd: '2025-01-10',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject end date before start date', async () => {
      const usageChain = createChainableMock({
        data: {
          id: 'usage-123',
          usage_start: '2025-01-15',
          start_km: 10000,
          start_hours: 100,
          job_order_id: 'jo-123',
          asset_id: 'asset-123',
          assets: { id: 'asset-123', book_value: 100000000, useful_life_years: 10 },
        },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(usageChain);

      const result = await completeEquipmentUsage({
        usageId: 'usage-123',
        usageEnd: '2025-01-10', // Before start date
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('before');
    });

    it('should reject end km less than start km', async () => {
      const usageChain = createChainableMock({
        data: {
          id: 'usage-123',
          usage_start: '2025-01-01',
          start_km: 10000,
          start_hours: 100,
          job_order_id: 'jo-123',
          asset_id: 'asset-123',
          assets: { id: 'asset-123', book_value: 100000000, useful_life_years: 10 },
        },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(usageChain);

      const result = await completeEquipmentUsage({
        usageId: 'usage-123',
        usageEnd: '2025-01-10',
        endKm: 9000, // Less than start km
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('km');
    });

    it('should reject end hours less than start hours', async () => {
      const usageChain = createChainableMock({
        data: {
          id: 'usage-123',
          usage_start: '2025-01-01',
          start_km: null,
          start_hours: 100,
          job_order_id: 'jo-123',
          asset_id: 'asset-123',
          assets: { id: 'asset-123', book_value: 100000000, useful_life_years: 10 },
        },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(usageChain);

      const result = await completeEquipmentUsage({
        usageId: 'usage-123',
        usageEnd: '2025-01-10',
        endHours: 50, // Less than start hours
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('hours');
    });
  });

  describe('getJobEquipmentUsage', () => {
    it('should return empty array for job with no equipment', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await getJobEquipmentUsage('jo-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

      const result = await getJobEquipmentUsage('jo-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateJobEquipmentCost', () => {
    it('should calculate total equipment cost correctly', async () => {
      const usages = [
        { total_cost: 1000000 },
        { total_cost: 2000000 },
        { total_cost: 500000 },
      ];

      let updateCalled = false;
      let updatedCost = 0;

      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: usages, error: null }),
      };

      const updateChain = {
        update: vi.fn().mockImplementation((data) => {
          updateCalled = true;
          updatedCost = data.equipment_cost;
          return updateChain;
        }),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'job_equipment_usage') return selectChain;
        if (table === 'job_orders') return updateChain;
        return selectChain;
      });

      const result = await updateJobEquipmentCost('jo-123');

      expect(result.success).toBe(true);
      expect(updateCalled).toBe(true);
      expect(updatedCost).toBe(3500000); // Sum of all costs
    });

    it('should handle empty usage list', async () => {
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'job_equipment_usage') return selectChain;
        if (table === 'job_orders') return updateChain;
        return selectChain;
      });

      const result = await updateJobEquipmentCost('jo-123');

      expect(result.success).toBe(true);
    });
  });

  describe('getEquipmentRate - Property 5: Rate Lookup Priority', () => {
    it('should return asset-specific rate when available', async () => {
      const assetRate = {
        id: 'rate-1',
        asset_id: 'asset-123',
        category_id: null,
        rate_type: 'daily',
        rate_amount: 5000000,
        min_days: null,
        includes_operator: true,
        includes_fuel: false,
        effective_from: '2025-01-01',
        effective_to: null,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
      };

      const chain = createChainableMock({ data: assetRate, error: null });
      mockSupabaseClient.from.mockReturnValue(chain);

      const result = await getEquipmentRate('asset-123', 'daily');

      expect(result.success).toBe(true);
      expect(result.data?.assetId).toBe('asset-123');
      expect(result.data?.rateAmount).toBe(5000000);
    });

    it('should fall back to category rate when no asset rate exists', async () => {
      const categoryRate = {
        id: 'rate-2',
        asset_id: null,
        category_id: 'cat-123',
        rate_type: 'daily',
        rate_amount: 3000000,
        min_days: null,
        includes_operator: false,
        includes_fuel: false,
        effective_from: '2025-01-01',
        effective_to: null,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
      };

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'equipment_rates' && callCount === 1) {
          // First call - asset rate lookup (not found)
          return createChainableMock({ data: null, error: { code: 'PGRST116' } });
        }
        if (table === 'assets') {
          // Asset lookup for category
          return createChainableMock({ data: { category_id: 'cat-123' }, error: null });
        }
        if (table === 'equipment_rates' && callCount > 2) {
          // Category rate lookup
          return createChainableMock({ data: categoryRate, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await getEquipmentRate('asset-123', 'daily');

      expect(result.success).toBe(true);
      expect(result.data?.categoryId).toBe('cat-123');
      expect(result.data?.rateAmount).toBe(3000000);
    });

    it('should return error when no rate is configured', async () => {
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'equipment_rates') {
          return createChainableMock({ data: null, error: { code: 'PGRST116' } });
        }
        if (table === 'assets') {
          return createChainableMock({ data: { category_id: 'cat-123' }, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await getEquipmentRate('asset-123', 'daily');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No rate configured');
    });
  });

  describe('getJobEquipmentSummary', () => {
    it('should return correct summary for job with equipment', async () => {
      const jobOrder = {
        id: 'jo-123',
        jo_number: 'JO-0001/CARGO/XII/2025',
        customers: { name: 'Test Customer' },
      };

      const usages = [
        {
          id: 'usage-1',
          usage_start: '2025-01-01',
          usage_end: '2025-01-05',
          km_used: 500,
          hours_used: 40,
          total_cost: 2000000,
          is_billable: true,
          billing_amount: 2500000,
        },
        {
          id: 'usage-2',
          usage_start: '2025-01-01',
          usage_end: '2025-01-03',
          km_used: 200,
          hours_used: 20,
          total_cost: 1000000,
          is_billable: true,
          billing_amount: 1500000,
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'job_orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: jobOrder, error: null }),
          };
        }
        if (table === 'job_equipment_usage') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: usages, error: null }),
          };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await getJobEquipmentSummary('jo-123');

      expect(result.success).toBe(true);
      expect(result.data?.equipmentCount).toBe(2);
      expect(result.data?.totalKm).toBe(700);
      expect(result.data?.totalHours).toBe(60);
      expect(result.data?.totalEquipmentCost).toBe(3000000);
      expect(result.data?.totalBilling).toBe(4000000);
      expect(result.data?.equipmentMargin).toBe(1000000);
    });

    it('should return error for non-existent job', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const result = await getJobEquipmentSummary('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deleteEquipmentUsage', () => {
    it('should delete usage and update job cost', async () => {
      const usage = {
        job_order_id: 'jo-123',
        asset_id: 'asset-123',
      };

      let deleteCalled = false;

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'job_equipment_usage') {
          return {
            select: vi.fn().mockReturnThis(),
            delete: vi.fn().mockImplementation(() => {
              deleteCalled = true;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: usage, error: null }),
          };
        }
        if (table === 'job_orders') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return createChainableMock({ data: [], error: null });
      });

      const result = await deleteEquipmentUsage('usage-123');

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent usage', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Not found' } })
      );

      const result = await deleteEquipmentUsage('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
