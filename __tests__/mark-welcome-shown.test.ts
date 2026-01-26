// =====================================================
// v0.86: WELCOME FLOW - markWelcomeShown Action Tests
// =====================================================
// Feature: v0.86-welcome-flow
// Requirements: 5.1, 5.2, 5.3, 5.4

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revalidatePath } from 'next/cache'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import after mocking
import { markWelcomeShown } from '@/app/(main)/actions/mark-welcome-shown'

describe('markWelcomeShown Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Test: Authentication Check
   * Validates: Requirement 5.2
   * - 5.2: WHEN the user is not authenticated, THE markWelcomeShown action SHALL return an error
   */
  describe('Authentication Check', () => {
    it('should return error when auth.getUser returns an error', async () => {
      // Arrange: Mock auth error
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' },
      })

      // Act
      const result = await markWelcomeShown()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should return error when user is null', async () => {
      // Arrange: Mock null user (no auth error but no user)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act
      const result = await markWelcomeShown()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should not call database update when not authenticated', async () => {
      // Arrange: Mock unauthenticated state
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' },
      })

      // Act
      await markWelcomeShown()

      // Assert: Database should not be touched
      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  /**
   * Test: Successful Update
   * Validates: Requirements 5.1, 5.3
   * - 5.1: THE markWelcomeShown server action SHALL update the welcome_shown_at column with the current server timestamp
   * - 5.3: WHEN the database update succeeds, THE markWelcomeShown action SHALL return success
   */
  describe('Successful Update', () => {
    it('should return success when database update succeeds', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock successful database update
      const mockUpdateBuilder = {
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateBuilder),
      })

      // Act
      const result = await markWelcomeShown()

      // Assert
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should update user_profiles table', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-456', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock successful database update
      const mockUpdateBuilder = {
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateBuilder),
      })

      // Act
      await markWelcomeShown()

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should update welcome_shown_at with ISO timestamp', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-789', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock update chain to capture arguments
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      // Act
      await markWelcomeShown()

      // Assert: Verify welcome_shown_at is a valid ISO string
      const updateCall = mockUpdate.mock.calls[0][0]
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      expect(updateCall.welcome_shown_at).toMatch(isoDateRegex)
    })

    it('should filter update by user_id', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-specific-id', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock update chain to capture arguments
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      // Act
      await markWelcomeShown()

      // Assert: Verify eq was called with correct user_id
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUser.id)
    })

    it('should call revalidatePath on success', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock successful database update
      const mockUpdateBuilder = {
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateBuilder),
      })

      // Act
      await markWelcomeShown()

      // Assert
      expect(revalidatePath).toHaveBeenCalledWith('/')
    })
  })

  /**
   * Test: Error Handling
   * Validates: Requirement 5.4
   * - 5.4: WHEN the database update fails, THE markWelcomeShown action SHALL return an error with a descriptive message
   */
  describe('Error Handling', () => {
    it('should return error when database update fails', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock database update failure
      const mockUpdateBuilder = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateBuilder),
      })

      // Act
      const result = await markWelcomeShown()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to record welcome shown status')
    })

    it('should return descriptive error message on failure', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock database update failure with specific error
      const mockUpdateBuilder = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Column does not exist', code: '42703' },
        }),
      }
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateBuilder),
      })

      // Act
      const result = await markWelcomeShown()

      // Assert: Error message should be user-friendly, not raw DB error
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).not.toContain('42703') // Should not expose DB error codes
    })

    it('should not call revalidatePath when database update fails', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock database update failure
      const mockUpdateBuilder = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      }
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateBuilder),
      })

      // Act
      await markWelcomeShown()

      // Assert
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should handle network errors gracefully', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock network error
      const mockUpdateBuilder = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Network request failed', code: 'NETWORK_ERROR' },
        }),
      }
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateBuilder),
      })

      // Act
      const result = await markWelcomeShown()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  /**
   * Test: Timestamp Accuracy
   * Validates: Requirement 5.1
   * - 5.1: THE markWelcomeShown server action SHALL update the welcome_shown_at column with the current server timestamp
   */
  describe('Timestamp Accuracy', () => {
    it('should use current timestamp (within reasonable tolerance)', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Capture the timestamp used
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      // Act
      const beforeCall = new Date()
      await markWelcomeShown()
      const afterCall = new Date()

      // Assert: Timestamp should be between before and after call
      const updateCall = mockUpdate.mock.calls[0][0]
      const usedTimestamp = new Date(updateCall.welcome_shown_at)
      
      expect(usedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000) // 1s tolerance
      expect(usedTimestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000) // 1s tolerance
    })
  })
})
