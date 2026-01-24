// =====================================================
// v0.85: TERMS & CONDITIONS - acceptTerms Action Tests
// =====================================================
// Feature: v0.85-terms-conditions
// Requirements: 4.4, 4.5, 4.6

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
import { acceptTerms } from '@/app/(main)/actions/accept-terms'
import { TERMS_VERSION } from '@/lib/terms-conditions'

describe('acceptTerms Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Test: Returns error when authentication fails with auth error
   * Validates: Requirement 4.4, 4.5
   * - 4.4: THE acceptTerms action SHALL verify the user is authenticated before updating
   * - 4.5: IF the user is not authenticated, THEN the acceptTerms action SHALL return an error
   */
  describe('Authentication Check', () => {
    it('should return error when auth.getUser returns an error', async () => {
      // Arrange: Mock auth error
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' },
      })

      // Act
      const result = await acceptTerms()

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
      const result = await acceptTerms()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  /**
   * Test: Returns success when update succeeds
   * Validates: Requirement 4.6
   * - 4.6: WHEN acceptance is recorded successfully, THEN the acceptTerms action SHALL return success
   */
  describe('Successful Acceptance', () => {
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
      const result = await acceptTerms()

      // Assert
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
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
      await acceptTerms()

      // Assert
      expect(revalidatePath).toHaveBeenCalledWith('/')
    })

    it('should update user_profiles with correct data', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-456', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock update chain to capture arguments
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      // Act
      await acceptTerms()

      // Assert: Verify update was called with correct structure
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          tc_accepted_at: expect.any(String),
          tc_version: TERMS_VERSION,
        })
      )
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUser.id)
    })

    it('should use ISO timestamp format for tc_accepted_at', async () => {
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
      await acceptTerms()

      // Assert: Verify tc_accepted_at is a valid ISO string
      const updateCall = mockUpdate.mock.calls[0][0]
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      expect(updateCall.tc_accepted_at).toMatch(isoDateRegex)
    })
  })

  /**
   * Test: Returns error when database update fails
   * Validates: Error handling for database operations
   */
  describe('Database Error Handling', () => {
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
      const result = await acceptTerms()

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to record acceptance')
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
      await acceptTerms()

      // Assert
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  /**
   * Test: Uses current TERMS_VERSION constant
   * Validates: Requirement 4.3
   * - 4.3: THE acceptTerms action SHALL use the current TERMS_VERSION constant for tc_version
   */
  describe('Version Handling', () => {
    it('should use the current TERMS_VERSION constant', async () => {
      // Arrange: Mock authenticated user
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock update chain to capture arguments
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      // Act
      await acceptTerms()

      // Assert: Verify tc_version matches TERMS_VERSION
      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.tc_version).toBe(TERMS_VERSION)
      expect(updateCall.tc_version).toBe('1.0.0') // Current version
    })
  })
})
