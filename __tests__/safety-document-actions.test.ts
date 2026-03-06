// =====================================================
// v0.47: HSE - SAFETY DOCUMENTATION ACTIONS UNIT TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/permissions-server', () => ({
  getUserProfile: vi.fn(() => Promise.resolve({ role: 'owner', roles: ['owner'], is_active: true })),
}));

vi.mock('@/lib/permissions', () => ({
  canAccessFeature: vi.fn(() => true),
}));

// Import after mocking
import {
  getDocumentCategories,
  createSafetyDocument,
  getSafetyDocument,
  getSafetyDocuments,
  submitForReview,
  approveDocument,
  acknowledgeDocument,
  getDocumentAcknowledgments,
  addJSAHazard,
  updateJSAHazard,
  deleteJSAHazard,
  getJSAHazards,
  getDocumentStatistics,
} from '@/lib/safety-document-actions';

// Helper to create mock query builder
function createMockQueryBuilder(data: unknown = null, error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  // For non-single queries
  builder.select.mockImplementation(() => {
    const newBuilder = { ...builder };
    newBuilder.single = vi.fn().mockResolvedValue({ data, error });
    return newBuilder;
  });
  return builder;
}

describe('Safety Document Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocumentCategories', () => {
    it('should return categories successfully', async () => {
      const mockCategories = [
        {
          id: '1',
          category_code: 'jsa',
          category_name: 'Job Safety Analysis',
          description: 'Test',
          requires_expiry: true,
          default_validity_days: 365,
          requires_approval: true,
          is_active: true,
          display_order: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockBuilder = createMockQueryBuilder(mockCategories);
      mockBuilder.order = vi.fn().mockResolvedValue({ data: mockCategories, error: null });
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await getDocumentCategories();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].categoryCode).toBe('jsa');
    });

    it('should handle errors', async () => {
      const mockBuilder = createMockQueryBuilder(null, { message: 'Database error' });
      mockBuilder.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await getDocumentCategories();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });


  describe('createSafetyDocument', () => {
    it('should reject invalid input', async () => {
      const result = await createSafetyDocument({
        categoryId: '',
        title: 'Test',
        effectiveDate: '2024-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Kategori');
    });

    it('should reject when category not found', async () => {
      const mockBuilder = createMockQueryBuilder(null);
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await createSafetyDocument({
        categoryId: 'non-existent-id',
        title: 'Test Document',
        effectiveDate: '2024-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('tidak ditemukan');
    });
  });

  describe('submitForReview', () => {
    it('should update document status to pending_review', async () => {
      const mockBuilder = createMockQueryBuilder({ id: '1' });
      mockBuilder.eq = vi.fn().mockReturnThis();
      mockBuilder.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
        }),
      });
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await submitForReview('doc-1');

      expect(result.success).toBe(true);
    });
  });

  describe('approveDocument', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const mockBuilder = createMockQueryBuilder();
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await approveDocument('doc-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('terautentikasi');
    });
  });

  describe('acknowledgeDocument', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await acknowledgeDocument('doc-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('terautentikasi');
    });

    it('should prevent duplicate acknowledgments', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: { id: 'user-1' } }, 
        error: null 
      });

      // Mock user profile lookup
      const profileBuilder = createMockQueryBuilder({ id: 'profile-1' });

      // Mock employee lookup
      const employeeBuilder = createMockQueryBuilder({ id: 'emp-1' });

      // Mock existing acknowledgment
      const ackBuilder = createMockQueryBuilder({ id: 'ack-1' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') return profileBuilder;
        if (table === 'employees') return employeeBuilder;
        if (table === 'safety_document_acknowledgments') return ackBuilder;
        return createMockQueryBuilder();
      });

      const result = await acknowledgeDocument('doc-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('sudah diakui');
    });
  });
});

describe('JSA Hazard Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addJSAHazard', () => {
    it('should reject invalid input - missing work step', async () => {
      const result = await addJSAHazard('doc-1', {
        stepNumber: 1,
        workStep: '',
        hazards: 'Test hazard',
        controlMeasures: 'Test control',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Langkah kerja');
    });

    it('should reject invalid input - missing hazards', async () => {
      const result = await addJSAHazard('doc-1', {
        stepNumber: 1,
        workStep: 'Test step',
        hazards: '',
        controlMeasures: 'Test control',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bahaya');
    });

    it('should reject invalid input - missing control measures', async () => {
      const result = await addJSAHazard('doc-1', {
        stepNumber: 1,
        workStep: 'Test step',
        hazards: 'Test hazard',
        controlMeasures: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('pengendalian');
    });

    it('should reject invalid step number', async () => {
      const result = await addJSAHazard('doc-1', {
        stepNumber: 0,
        workStep: 'Test step',
        hazards: 'Test hazard',
        controlMeasures: 'Test control',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('langkah');
    });

    it('should create hazard with valid input', async () => {
      const mockHazard = {
        id: 'hazard-1',
        document_id: 'doc-1',
        step_number: 1,
        work_step: 'Test step',
        hazards: 'Test hazard',
        consequences: null,
        risk_level: 'medium',
        control_measures: 'Test control',
        responsible: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockBuilder = createMockQueryBuilder(mockHazard);
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await addJSAHazard('doc-1', {
        stepNumber: 1,
        workStep: 'Test step',
        hazards: 'Test hazard',
        controlMeasures: 'Test control',
        riskLevel: 'medium',
      });

      expect(result.success).toBe(true);
      expect(result.data?.stepNumber).toBe(1);
    });
  });

  describe('updateJSAHazard', () => {
    it('should reject invalid input', async () => {
      const result = await updateJSAHazard('hazard-1', {
        stepNumber: 1,
        workStep: '',
        hazards: 'Test',
        controlMeasures: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('deleteJSAHazard', () => {
    it('should delete hazard successfully', async () => {
      const mockBuilder = createMockQueryBuilder();
      mockBuilder.delete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await deleteJSAHazard('hazard-1');

      expect(result.success).toBe(true);
    });
  });

  describe('getJSAHazards', () => {
    it('should return hazards for document', async () => {
      const mockHazards = [
        {
          id: 'hazard-1',
          document_id: 'doc-1',
          step_number: 1,
          work_step: 'Step 1',
          hazards: 'Hazard 1',
          consequences: null,
          risk_level: 'low',
          control_measures: 'Control 1',
          responsible: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockBuilder = createMockQueryBuilder();
      mockBuilder.order = vi.fn().mockResolvedValue({ data: mockHazards, error: null });
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await getJSAHazards('doc-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].stepNumber).toBe(1);
    });
  });
});

describe('Document Statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocumentStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const mockDocuments = [
        { id: '1', status: 'approved', category_id: 'cat-1', expiry_date: null, safety_document_categories: { category_code: 'jsa' } },
        { id: '2', status: 'draft', category_id: 'cat-1', expiry_date: null, safety_document_categories: { category_code: 'jsa' } },
        { id: '3', status: 'pending_review', category_id: 'cat-2', expiry_date: null, safety_document_categories: { category_code: 'sop' } },
      ];

      const mockBuilder = createMockQueryBuilder();
      mockBuilder.select = vi.fn().mockResolvedValue({ data: mockDocuments, error: null });
      mockSupabase.from.mockReturnValue(mockBuilder);

      const result = await getDocumentStatistics();

      expect(result.success).toBe(true);
      expect(result.data?.totalDocuments).toBe(3);
      expect(result.data?.approvedDocuments).toBe(1);
      expect(result.data?.pendingReview).toBe(1);
    });
  });
});
