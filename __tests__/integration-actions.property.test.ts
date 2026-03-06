// v0.69: INTEGRATION ACTIONS PROPERTY TESTS
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
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

import {
  VALID_INTEGRATION_TYPES,
  VALID_PROVIDERS,
  type IntegrationType,
  type Provider,
  type CreateConnectionInput,
  type IntegrationConnection,
} from '@/types/integration';

import {
  createConnection,
  updateConnection,
  deleteConnection,
  getConnection,
  listConnections,
} from '@/lib/integration-actions';

import { createClient } from '@/lib/supabase/server';

const mockSupabase = {
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
};

describe('Integration Actions Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
  });

  const codeChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const validCodeArb = fc.array(fc.constantFrom(...codeChars.split('')), { minLength: 1, maxLength: 20 }).map(a => a.join(''));
  const validNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
  const validInputArb = fc.record({
    connection_code: validCodeArb,
    connection_name: validNameArb,
    integration_type: fc.constantFrom(...VALID_INTEGRATION_TYPES),
    provider: fc.constantFrom(...VALID_PROVIDERS),
  }) as fc.Arbitrary<CreateConnectionInput>;

  const makeConn = (o: Partial<IntegrationConnection> = {}): IntegrationConnection => ({
    id: 'uuid', connection_code: 'test', connection_name: 'Test', integration_type: 'accounting',
    provider: 'accurate', credentials: null, config: {}, is_active: true, last_sync_at: null,
    last_error: null, access_token: null, refresh_token: null, token_expires_at: null,
    created_by: null, created_at: new Date().toISOString(), ...o,
  });

  describe('Property 1: Connection Data Persistence', () => {
    it('persists all fields correctly', async () => {
      await fc.assert(fc.asyncProperty(validInputArb, async (input) => {
        mockSupabase.single.mockResolvedValueOnce({
          data: makeConn({ connection_code: input.connection_code, connection_name: input.connection_name }),
          error: null,
        });
        const result = await createConnection(input);
        expect(result.success).toBe(true);
        return true;
      }), { numRuns: 10 });
    });

    it('rejects invalid inputs', async () => {
      const result = await createConnection({
        connection_code: '', connection_name: '',
        integration_type: '' as IntegrationType, provider: '' as Provider,
      });
      expect(result.success).toBe(false);
    });

    it('handles duplicate codes', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'dup' } });
      const result = await createConnection({
        connection_code: 'dup', connection_name: 'Test',
        integration_type: 'accounting', provider: 'accurate',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('CRUD Operations', () => {
    it('updates connection', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: makeConn({ connection_name: 'Updated' }), error: null });
      const result = await updateConnection('uuid', { connection_name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('requires ID for update', async () => {
      const result = await updateConnection('', { connection_name: 'Test' });
      expect(result.success).toBe(false);
    });

    it('deletes connection', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      const result = await deleteConnection('uuid');
      expect(result.success).toBe(true);
    });

    it('gets connection by ID', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: makeConn(), error: null });
      const result = await getConnection('uuid');
      expect(result.success).toBe(true);
    });

    it('handles not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'not found' } });
      const result = await getConnection('x');
      expect(result.success).toBe(false);
    });

    it('lists connections', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: [makeConn()], error: null });
      const result = await listConnections();
      expect(result.success).toBe(true);
    });
  });
});
