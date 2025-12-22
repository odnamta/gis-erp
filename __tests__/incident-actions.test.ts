// =====================================================
// v0.46: HSE - INCIDENT REPORTING SERVER ACTIONS TESTS
// Feature: v0.46-hse-incident-reporting
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
  getIncidentCategories,
  reportIncident,
  getIncident,
  getIncidents,
  startInvestigation,
  updateRootCause,
  addCorrectiveAction,
  addPreventiveAction,
  completeAction,
  closeIncident,
  addPersonToIncident,
  getIncidentHistory,
  getIncidentStatistics,
  getIncidentDashboardSummary,
} from '@/lib/incident-actions';

describe('v0.46 Incident Actions', () => {
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
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.is = vi.fn().mockReturnValue(chain);
    chain.lte = vi.fn().mockReturnValue(chain);
    chain.gte = vi.fn().mockReturnValue(chain);
    chain.or = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(finalResult);
    return chain;
  };

  // =====================================================
  // GET INCIDENT CATEGORIES
  // =====================================================
  describe('getIncidentCategories', () => {
    it('should return active categories ordered by display_order', async () => {
      const categories = [
        { id: 'cat-1', category_code: 'injury', category_name: 'Personal Injury', display_order: 1, is_active: true },
        { id: 'cat-2', category_code: 'near_miss', category_name: 'Near Miss', display_order: 2, is_active: true },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: categories, error: null }),
      });

      const result = await getIncidentCategories();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].categoryCode).toBe('injury');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

      const result = await getIncidentCategories();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // =====================================================
  // REPORT INCIDENT
  // =====================================================
  describe('reportIncident', () => {
    it('should reject missing category ID', async () => {
      const result = await reportIncident({
        categoryId: '',
        severity: 'medium',
        incidentType: 'near_miss',
        incidentDate: '2024-06-15',
        locationType: 'office',
        title: 'Test Incident',
        description: 'This is a test incident description',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Kategori');
    });

    it('should reject missing title', async () => {
      const result = await reportIncident({
        categoryId: 'cat-123',
        severity: 'medium',
        incidentType: 'near_miss',
        incidentDate: '2024-06-15',
        locationType: 'office',
        title: '',
        description: 'This is a test incident description',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Judul');
    });

    it('should reject description less than 10 characters', async () => {
      const result = await reportIncident({
        categoryId: 'cat-123',
        severity: 'medium',
        incidentType: 'near_miss',
        incidentDate: '2024-06-15',
        locationType: 'office',
        title: 'Test Incident',
        description: 'Short',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('10');
    });

    it('should reject future incident dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const result = await reportIncident({
        categoryId: 'cat-123',
        severity: 'medium',
        incidentType: 'near_miss',
        incidentDate: futureDate.toISOString().split('T')[0],
        locationType: 'office',
        title: 'Test Incident',
        description: 'This is a test incident description',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('masa depan');
    });

    it('should create incident with persons when valid input provided', async () => {
      const employee = { id: 'emp-123' };
      const category = { requires_investigation: true };
      const incident = {
        id: 'inc-123',
        incident_number: 'INC-2024-00001',
        category_id: 'cat-123',
        severity: 'medium',
        incident_type: 'near_miss',
        incident_date: '2024-06-15',
        location_type: 'office',
        title: 'Test Incident',
        description: 'This is a test incident description',
        reported_by: 'emp-123',
        reported_at: '2024-06-15T10:00:00Z',
        status: 'reported',
        investigation_required: true,
        contributing_factors: [],
        corrective_actions: [],
        preventive_actions: [],
        reported_to_authority: false,
        photos: [],
        documents: [],
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'employees') {
          return createChainableMock({ data: employee, error: null });
        }
        if (table === 'incident_categories') {
          return createChainableMock({ data: category, error: null });
        }
        if (table === 'incidents') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: incident, error: null }),
          };
        }
        if (table === 'incident_persons') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'incident_history') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await reportIncident(
        {
          categoryId: 'cat-123',
          severity: 'medium',
          incidentType: 'near_miss',
          incidentDate: '2024-06-15',
          locationType: 'office',
          title: 'Test Incident',
          description: 'This is a test incident description',
        },
        [{ personType: 'witness', employeeId: 'emp-456' }]
      );

      expect(result.success).toBe(true);
      expect(result.data?.incidentNumber).toBe('INC-2024-00001');
    });
  });

  // =====================================================
  // START INVESTIGATION
  // =====================================================
  describe('startInvestigation', () => {
    it('should update status to under_investigation', async () => {
      let updatedStatus = '';

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            update: vi.fn().mockImplementation((data) => {
              updatedStatus = data.status;
              return {
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
            eq: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'incident_history') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await startInvestigation('inc-123', 'investigator-456');

      expect(result.success).toBe(true);
      expect(updatedStatus).toBe('under_investigation');
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      });

      const result = await startInvestigation('inc-123', 'investigator-456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // =====================================================
  // UPDATE ROOT CAUSE
  // =====================================================
  describe('updateRootCause', () => {
    it('should update root cause and contributing factors', async () => {
      let updatedRootCause = '';
      let updatedFactors: string[] = [];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            update: vi.fn().mockImplementation((data) => {
              updatedRootCause = data.root_cause;
              updatedFactors = data.contributing_factors;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'incident_history') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await updateRootCause('inc-123', {
        rootCause: 'Equipment malfunction due to lack of maintenance',
        contributingFactors: ['equipment_failure', 'procedure_not_followed'],
      });

      expect(result.success).toBe(true);
      expect(updatedRootCause).toBe('Equipment malfunction due to lack of maintenance');
      expect(updatedFactors).toContain('equipment_failure');
    });
  });

  // =====================================================
  // ADD CORRECTIVE ACTION
  // =====================================================
  describe('addCorrectiveAction', () => {
    it('should add action to corrective_actions array', async () => {
      const existingActions = [
        { id: 'action-1', description: 'Existing action', responsibleId: 'emp-1', dueDate: '2024-07-01', status: 'pending' },
      ];

      let updatedActions: unknown[] = [];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockImplementation((data) => {
              updatedActions = data.corrective_actions;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { corrective_actions: existingActions }, error: null }),
          };
        }
        if (table === 'employees') {
          return createChainableMock({ data: { full_name: 'John Doe' }, error: null });
        }
        if (table === 'incident_history') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await addCorrectiveAction('inc-123', {
        description: 'New corrective action',
        responsibleId: 'emp-456',
        dueDate: '2024-07-15',
      });

      expect(result.success).toBe(true);
      expect(updatedActions).toHaveLength(2);
    });

    it('should return error for non-existent incident', async () => {
      mockSupabaseClient.from.mockReturnValue(
        createChainableMock({ data: null, error: { message: 'Not found' } })
      );

      const result = await addCorrectiveAction('non-existent', {
        description: 'Action',
        responsibleId: 'emp-456',
        dueDate: '2024-07-15',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // =====================================================
  // COMPLETE ACTION
  // =====================================================
  describe('completeAction', () => {
    it('should mark action as completed', async () => {
      const actions = [
        { id: 'action-1', description: 'Action 1', responsibleId: 'emp-1', dueDate: '2024-07-01', status: 'pending' },
        { id: 'action-2', description: 'Action 2', responsibleId: 'emp-2', dueDate: '2024-07-15', status: 'pending' },
      ];

      let updatedActions: { id: string; status: string }[] = [];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockImplementation((data) => {
              updatedActions = data.corrective_actions;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { corrective_actions: actions }, error: null }),
          };
        }
        if (table === 'incident_history') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await completeAction('inc-123', 'action-1', 'corrective');

      expect(result.success).toBe(true);
      const completedAction = updatedActions.find((a) => a.id === 'action-1');
      expect(completedAction?.status).toBe('completed');
    });

    it('should return error for non-existent action', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { corrective_actions: [] }, error: null }),
          };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await completeAction('inc-123', 'non-existent', 'corrective');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // =====================================================
  // CLOSE INCIDENT
  // =====================================================
  describe('closeIncident', () => {
    it('should close incident when all actions completed', async () => {
      const incident = {
        id: 'inc-123',
        incident_number: 'INC-2024-00001',
        category_id: 'cat-123',
        severity: 'medium',
        incident_type: 'near_miss',
        incident_date: '2024-06-15',
        location_type: 'office',
        title: 'Test',
        description: 'Test description',
        reported_by: 'emp-123',
        reported_at: '2024-06-15T10:00:00Z',
        status: 'pending_actions',
        investigation_required: false,
        contributing_factors: [],
        corrective_actions: [{ id: 'a1', status: 'completed' }],
        preventive_actions: [],
        reported_to_authority: false,
        photos: [],
        documents: [],
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      };

      let closedStatus = '';

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockImplementation((data) => {
              closedStatus = data.status;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: incident, error: null }),
          };
        }
        if (table === 'incident_persons') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'incident_history') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await closeIncident('inc-123', { closureNotes: 'All actions completed' });

      expect(result.success).toBe(true);
      expect(closedStatus).toBe('closed');
    });

    it('should reject closing when pending actions exist', async () => {
      const incident = {
        id: 'inc-123',
        incident_number: 'INC-2024-00001',
        category_id: 'cat-123',
        severity: 'medium',
        incident_type: 'near_miss',
        incident_date: '2024-06-15',
        location_type: 'office',
        title: 'Test',
        description: 'Test description',
        reported_by: 'emp-123',
        reported_at: '2024-06-15T10:00:00Z',
        status: 'pending_actions',
        investigation_required: false,
        contributing_factors: [],
        corrective_actions: [{ id: 'a1', status: 'pending' }],
        preventive_actions: [],
        reported_to_authority: false,
        photos: [],
        documents: [],
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return createChainableMock({ data: incident, error: null });
        }
        if (table === 'incident_persons') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await closeIncident('inc-123', { closureNotes: 'Closing' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('tindakan');
    });
  });

  // =====================================================
  // GET INCIDENT STATISTICS
  // =====================================================
  describe('getIncidentStatistics', () => {
    it('should return correct statistics', async () => {
      const incidents = [
        {
          id: 'inc-1',
          incident_number: 'INC-2024-00001',
          category_id: 'cat-1',
          severity: 'medium',
          incident_type: 'near_miss',
          incident_date: '2024-06-15',
          location_type: 'office',
          title: 'Near Miss 1',
          description: 'Description',
          reported_by: 'emp-1',
          reported_at: '2024-06-15T10:00:00Z',
          status: 'closed',
          investigation_required: false,
          contributing_factors: [],
          corrective_actions: [],
          preventive_actions: [],
          reported_to_authority: false,
          photos: [],
          documents: [],
          created_at: '2024-06-15T10:00:00Z',
          updated_at: '2024-06-15T10:00:00Z',
          incident_persons: [],
        },
        {
          id: 'inc-2',
          incident_number: 'INC-2024-00002',
          category_id: 'cat-2',
          severity: 'high',
          incident_type: 'accident',
          incident_date: '2024-06-20',
          location_type: 'warehouse',
          title: 'Accident 1',
          description: 'Description',
          reported_by: 'emp-2',
          reported_at: '2024-06-20T10:00:00Z',
          status: 'under_investigation',
          investigation_required: true,
          contributing_factors: [],
          corrective_actions: [],
          preventive_actions: [],
          reported_to_authority: false,
          photos: [],
          documents: [],
          created_at: '2024-06-20T10:00:00Z',
          updated_at: '2024-06-20T10:00:00Z',
          incident_persons: [{ person_type: 'injured', days_lost: 5 }],
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ data: incidents, error: null }),
      });

      const result = await getIncidentStatistics(2024);

      expect(result.success).toBe(true);
      expect(result.data?.totalIncidents).toBe(2);
      expect(result.data?.nearMisses).toBe(1);
      expect(result.data?.openInvestigations).toBe(1);
      expect(result.data?.bySeverity.medium).toBe(1);
      expect(result.data?.bySeverity.high).toBe(1);
    });

    it('should handle empty incident list', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await getIncidentStatistics(2024);

      expect(result.success).toBe(true);
      expect(result.data?.totalIncidents).toBe(0);
      expect(result.data?.nearMisses).toBe(0);
      expect(result.data?.injuries).toBe(0);
    });
  });

  // =====================================================
  // GET INCIDENT DASHBOARD SUMMARY
  // =====================================================
  describe('getIncidentDashboardSummary', () => {
    it('should return dashboard summary counts', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            neq: vi.fn().mockResolvedValue({ 
              count: 5, 
              data: [{ id: 'inc-1', incident_persons: [] }], 
              error: null 
            }),
          };
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await getIncidentDashboardSummary();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  // =====================================================
  // ADD PERSON TO INCIDENT
  // =====================================================
  describe('addPersonToIncident', () => {
    it('should add person to incident', async () => {
      const newPerson = {
        id: 'person-123',
        incident_id: 'inc-123',
        person_type: 'witness',
        employee_id: 'emp-456',
        person_name: null,
        person_company: null,
        person_phone: null,
        injury_type: null,
        injury_description: null,
        body_part: null,
        treatment: null,
        days_lost: 0,
        statement: null,
        created_at: '2024-06-15T10:00:00Z',
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newPerson, error: null }),
      });

      const result = await addPersonToIncident('inc-123', {
        personType: 'witness',
        employeeId: 'emp-456',
      });

      expect(result.success).toBe(true);
      expect(result.data?.personType).toBe('witness');
    });
  });

  // =====================================================
  // GET INCIDENT HISTORY
  // =====================================================
  describe('getIncidentHistory', () => {
    it('should return history entries ordered by date', async () => {
      const history = [
        {
          id: 'h-1',
          incident_id: 'inc-123',
          action_type: 'created',
          description: 'Insiden dilaporkan',
          previous_value: null,
          new_value: 'reported',
          performed_by: 'user-1',
          performed_at: '2024-06-15T10:00:00Z',
          user_profiles: { full_name: 'John Doe' },
        },
        {
          id: 'h-2',
          incident_id: 'inc-123',
          action_type: 'investigation_started',
          description: 'Investigasi dimulai',
          previous_value: 'reported',
          new_value: 'under_investigation',
          performed_by: 'user-2',
          performed_at: '2024-06-16T10:00:00Z',
          user_profiles: { full_name: 'Jane Smith' },
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: history, error: null }),
      });

      const result = await getIncidentHistory('inc-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].actionType).toBe('created');
      expect(result.data?.[0].performedByName).toBe('John Doe');
    });
  });
});
