/**
 * Property-Based Tests for Activity Logger (v0.13.1)
 * 
 * Property 2: Activity Logging Consistency
 * Validates: Requirements 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Supabase client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn((table: string) => {
      if (table === 'user_activity_log') {
        return { insert: mockInsert };
      }
      if (table === 'user_profiles') {
        return { select: mockSelect };
      }
      return {};
    }),
  })),
}));

// Import after mocking
import { logActivity } from '@/lib/activity-logger';
import type { ActionType, ResourceType } from '@/types/activity';

describe('Feature: v0.13.1-user-activity-tracking, Property 2: Activity Logging Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock chain for user_profiles
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: { email: 'test@example.com' }, error: null });
    
    // Setup mock for insert
    mockInsert.mockResolvedValue({ error: null });
  });

  // Arbitraries for generating test data
  const actionTypeArb = fc.constantFrom<ActionType>(
    'create', 'update', 'delete', 'approve', 'reject'
  );

  const resourceTypeArb = fc.constantFrom<ResourceType>(
    'customer', 'pjo', 'job_order', 'invoice', 'disbursement', 'employee'
  );

  const uuidArb = fc.uuid();
  
  const metadataArb = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean())
  );

  it('should insert activity with correct action_type for any valid action', async () => {
    /**
     * Validates: Requirements 2.2
     * For any successful action, calling logActivity SHALL result in a record
     * being inserted with correct action_type matching the action performed.
     */
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        actionTypeArb,
        resourceTypeArb,
        uuidArb,
        metadataArb,
        async (userId, actionType, resourceType, resourceId, metadata) => {
          mockInsert.mockClear();
          mockInsert.mockResolvedValue({ error: null });

          await logActivity(userId, actionType, resourceType, resourceId, metadata);

          expect(mockInsert).toHaveBeenCalledTimes(1);
          const insertedData = mockInsert.mock.calls[0][0];
          expect(insertedData.action_type).toBe(actionType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should insert activity with correct resource_type for any valid resource', async () => {
    /**
     * Validates: Requirements 2.2
     * For any successful action, the record SHALL have correct resource_type
     * matching the resource affected.
     */
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        actionTypeArb,
        resourceTypeArb,
        uuidArb,
        async (userId, actionType, resourceType, resourceId) => {
          mockInsert.mockClear();
          mockInsert.mockResolvedValue({ error: null });

          await logActivity(userId, actionType, resourceType, resourceId);

          expect(mockInsert).toHaveBeenCalledTimes(1);
          const insertedData = mockInsert.mock.calls[0][0];
          expect(insertedData.resource_type).toBe(resourceType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should insert activity with correct resource_id for any valid resource', async () => {
    /**
     * Validates: Requirements 2.2
     * For any successful action, the record SHALL have correct resource_id
     * matching the affected record.
     */
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        actionTypeArb,
        resourceTypeArb,
        uuidArb,
        async (userId, actionType, resourceType, resourceId) => {
          mockInsert.mockClear();
          mockInsert.mockResolvedValue({ error: null });

          await logActivity(userId, actionType, resourceType, resourceId);

          expect(mockInsert).toHaveBeenCalledTimes(1);
          const insertedData = mockInsert.mock.calls[0][0];
          expect(insertedData.resource_id).toBe(resourceId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include metadata in activity log for any valid metadata object', async () => {
    /**
     * Validates: Requirements 2.2
     * For any successful action, the record SHALL have metadata containing
     * the resource identifier.
     */
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        actionTypeArb,
        resourceTypeArb,
        uuidArb,
        metadataArb,
        async (userId, actionType, resourceType, resourceId, metadata) => {
          mockInsert.mockClear();
          mockInsert.mockResolvedValue({ error: null });

          await logActivity(userId, actionType, resourceType, resourceId, metadata);

          expect(mockInsert).toHaveBeenCalledTimes(1);
          const insertedData = mockInsert.mock.calls[0][0];
          expect(insertedData.metadata).toEqual(metadata);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should populate user_email from user profile lookup', async () => {
    /**
     * Validates: Requirements 2.3
     * The Activity_Logger SHALL automatically capture user_email from the user profile.
     */
    const testEmail = 'user@gama-group.co';
    mockSingle.mockResolvedValue({ data: { email: testEmail }, error: null });

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        actionTypeArb,
        async (userId, actionType) => {
          mockInsert.mockClear();
          mockInsert.mockResolvedValue({ error: null });

          await logActivity(userId, actionType);

          expect(mockInsert).toHaveBeenCalledTimes(1);
          const insertedData = mockInsert.mock.calls[0][0];
          expect(insertedData.user_email).toBe(testEmail);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not throw when database insert fails', async () => {
    /**
     * Validates: Requirements 2.6
     * IF logActivity fails THEN the Activity_Logger SHALL log the error
     * but NOT throw an exception.
     */
    mockInsert.mockResolvedValue({ error: { message: 'Database error' } });

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        actionTypeArb,
        async (userId, actionType) => {
          // Should not throw
          await expect(logActivity(userId, actionType)).resolves.not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });
});
