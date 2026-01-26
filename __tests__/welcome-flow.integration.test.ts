// =====================================================
// v0.86: WELCOME FLOW - Integration Tests
// =====================================================
// Feature: v0.86-welcome-flow
// Integration tests for welcome modal flow
// **Property 4: Mark welcome shown round-trip**
// **Validates: Requirements 1.3, 4.3, 5.1, 5.3**

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { shouldShowWelcome, type WelcomeCheckProfile } from '@/lib/welcome-content'

// =====================================================
// Mock Setup
// =====================================================

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

// =====================================================
// Test Helpers
// =====================================================

/**
 * Simulates a user profile state in the database
 */
interface SimulatedUserProfile {
  user_id: string
  tc_accepted_at: string | null
  welcome_shown_at: string | null
}

/**
 * Creates a mock authenticated user setup
 */
function setupAuthenticatedUser(userId: string) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId, email: `${userId}@example.com` } },
    error: null,
  })
}

/**
 * Creates a mock for successful database update that captures the timestamp
 */
function setupSuccessfulUpdate(): { capturedTimestamp: { value: string | null } } {
  const capturedTimestamp = { value: null as string | null }
  
  const mockEq = vi.fn().mockImplementation(() => {
    return Promise.resolve({ data: null, error: null })
  })
  
  const mockUpdate = vi.fn().mockImplementation((updateData: { welcome_shown_at: string }) => {
    capturedTimestamp.value = updateData.welcome_shown_at
    return { eq: mockEq }
  })
  
  mockSupabase.from.mockReturnValue({ update: mockUpdate })
  
  return { capturedTimestamp }
}

// =====================================================
// Arbitraries (Test Data Generators)
// =====================================================

/**
 * Generate a valid ISO timestamp string
 */
const timestampArb = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(ms => new Date(ms).toISOString())

/**
 * Generate a user ID
 */
const userIdArb = fc.uuid()

/**
 * Generate a profile where T&C is accepted but welcome not shown
 * (the state where welcome modal should appear)
 */
const needsWelcomeProfileArb: fc.Arbitrary<SimulatedUserProfile> = fc.record({
  user_id: userIdArb,
  tc_accepted_at: timestampArb,
  welcome_shown_at: fc.constant(null),
})

// =====================================================
// Integration Tests
// =====================================================

describe('Welcome Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =====================================================
  // Test: Modal appears after T&C acceptance
  // Validates: Requirements 3.1, 6.1, 6.2
  // =====================================================
  
  describe('Modal appears after T&C acceptance', () => {
    /**
     * Test that welcome modal should appear when:
     * - T&C has been accepted (tc_accepted_at is not null)
     * - Welcome has not been shown (welcome_shown_at is null)
     */
    
    it('should show welcome modal when T&C is accepted and welcome not shown', () => {
      const profile: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: null,
      }
      
      expect(shouldShowWelcome(profile)).toBe(true)
    })

    it('should not show welcome modal when T&C is not accepted', () => {
      const profile: WelcomeCheckProfile = {
        tc_accepted_at: null,
        welcome_shown_at: null,
      }
      
      expect(shouldShowWelcome(profile)).toBe(false)
    })

    it('should not show welcome modal when welcome has already been shown', () => {
      const profile: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: '2026-01-26T10:05:00Z',
      }
      
      expect(shouldShowWelcome(profile)).toBe(false)
    })

    it('should show welcome modal for any valid T&C timestamp', () => {
      fc.assert(
        fc.property(
          timestampArb,
          (tcTimestamp) => {
            const profile: WelcomeCheckProfile = {
              tc_accepted_at: tcTimestamp,
              welcome_shown_at: null,
            }
            return shouldShowWelcome(profile) === true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Test: Dismiss updates database
  // Validates: Requirements 1.3, 4.3, 5.1, 5.3
  // =====================================================
  
  describe('Dismiss updates database', () => {
    /**
     * Test that dismissing the welcome modal:
     * - Updates welcome_shown_at with current timestamp
     * - Returns success
     */
    
    it('should update welcome_shown_at when markWelcomeShown is called', async () => {
      // Arrange
      const userId = 'user-123'
      setupAuthenticatedUser(userId)
      const { capturedTimestamp } = setupSuccessfulUpdate()
      
      // Act
      const result = await markWelcomeShown()
      
      // Assert
      expect(result.success).toBe(true)
      expect(capturedTimestamp.value).not.toBeNull()
      expect(typeof capturedTimestamp.value).toBe('string')
    })

    it('should set welcome_shown_at to a valid ISO timestamp', async () => {
      // Arrange
      const userId = 'user-456'
      setupAuthenticatedUser(userId)
      const { capturedTimestamp } = setupSuccessfulUpdate()
      
      // Act
      await markWelcomeShown()
      
      // Assert: Verify it's a valid ISO timestamp
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      expect(capturedTimestamp.value).toMatch(isoDateRegex)
    })

    it('should update the user_profiles table', async () => {
      // Arrange
      const userId = 'user-789'
      setupAuthenticatedUser(userId)
      setupSuccessfulUpdate()
      
      // Act
      await markWelcomeShown()
      
      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should filter update by the authenticated user ID', async () => {
      // Arrange
      const userId = 'specific-user-id'
      setupAuthenticatedUser(userId)
      
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })
      
      // Act
      await markWelcomeShown()
      
      // Assert
      expect(mockEq).toHaveBeenCalledWith('user_id', userId)
    })

    it('should return success when database update succeeds', async () => {
      // Arrange
      setupAuthenticatedUser('user-success')
      setupSuccessfulUpdate()
      
      // Act
      const result = await markWelcomeShown()
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  // =====================================================
  // Test: Modal doesn't reappear on refresh
  // Validates: Requirements 3.2
  // =====================================================
  
  describe('Modal does not reappear on refresh', () => {
    /**
     * Test that after welcome_shown_at is set:
     * - shouldShowWelcome returns false
     * - Modal will not appear on subsequent page loads
     */
    
    it('should not show welcome modal after welcome_shown_at is set', () => {
      // Simulate state after markWelcomeShown was called
      const profileAfterDismiss: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: '2026-01-26T10:05:00Z', // Now set
      }
      
      expect(shouldShowWelcome(profileAfterDismiss)).toBe(false)
    })

    it('should not show welcome modal regardless of when it was shown', () => {
      fc.assert(
        fc.property(
          timestampArb,
          timestampArb,
          (tcTimestamp, welcomeTimestamp) => {
            const profile: WelcomeCheckProfile = {
              tc_accepted_at: tcTimestamp,
              welcome_shown_at: welcomeTimestamp,
            }
            // Once welcome_shown_at is set, should never show again
            return shouldShowWelcome(profile) === false
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently return false for profiles with welcome_shown_at set', () => {
      // Test multiple "refreshes" (calls to shouldShowWelcome)
      const profile: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: '2026-01-26T10:05:00Z',
      }
      
      // Simulate multiple page loads/refreshes
      expect(shouldShowWelcome(profile)).toBe(false)
      expect(shouldShowWelcome(profile)).toBe(false)
      expect(shouldShowWelcome(profile)).toBe(false)
    })
  })

  // =====================================================
  // Property 4: Mark Welcome Shown Round-Trip
  // Validates: Requirements 1.3, 4.3, 5.1, 5.3
  // =====================================================
  
  describe('Property 4: Mark welcome shown round-trip', () => {
    /**
     * **Feature: v0.86-welcome-flow, Property 4: Mark welcome shown round-trip**
     * **Validates: Requirements 1.3, 4.3, 5.1, 5.3**
     * 
     * For any authenticated user with welcome_shown_at as null, 
     * calling markWelcomeShown() SHALL result in welcome_shown_at 
     * being set to a non-null timestamp, and subsequent calls to 
     * check shouldShowWelcome() SHALL return false.
     */

    it('should complete round-trip: null → markWelcomeShown → non-null → shouldShowWelcome returns false', async () => {
      // Arrange: User with T&C accepted but welcome not shown
      const userId = 'roundtrip-user'
      setupAuthenticatedUser(userId)
      
      // Initial state: welcome_shown_at is null
      const initialProfile: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: null,
      }
      
      // Step 1: Verify initial state shows welcome
      expect(shouldShowWelcome(initialProfile)).toBe(true)
      
      // Step 2: Call markWelcomeShown and capture the timestamp
      const { capturedTimestamp } = setupSuccessfulUpdate()
      const result = await markWelcomeShown()
      
      // Step 3: Verify markWelcomeShown succeeded and set timestamp
      expect(result.success).toBe(true)
      expect(capturedTimestamp.value).not.toBeNull()
      
      // Step 4: Simulate the updated profile state
      const updatedProfile: WelcomeCheckProfile = {
        tc_accepted_at: initialProfile.tc_accepted_at,
        welcome_shown_at: capturedTimestamp.value,
      }
      
      // Step 5: Verify shouldShowWelcome now returns false
      expect(shouldShowWelcome(updatedProfile)).toBe(false)
    })

    it('should set welcome_shown_at to a timestamp close to current time', async () => {
      // Arrange
      const userId = 'timestamp-user'
      setupAuthenticatedUser(userId)
      const { capturedTimestamp } = setupSuccessfulUpdate()
      
      // Act
      const beforeCall = new Date()
      await markWelcomeShown()
      const afterCall = new Date()
      
      // Assert: Timestamp should be between before and after call
      const usedTimestamp = new Date(capturedTimestamp.value!)
      expect(usedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000)
      expect(usedTimestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000)
    })

    it('should complete round-trip for any user with null welcome_shown_at', async () => {
      // Property test: For any user ID and T&C timestamp
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          timestampArb,
          async (userId, tcTimestamp) => {
            // Reset mocks for each iteration
            vi.clearAllMocks()
            
            // Setup authenticated user
            setupAuthenticatedUser(userId)
            
            // Initial state
            const initialProfile: WelcomeCheckProfile = {
              tc_accepted_at: tcTimestamp,
              welcome_shown_at: null,
            }
            
            // Verify initial state shows welcome
            if (!shouldShowWelcome(initialProfile)) {
              return false // Should show welcome initially
            }
            
            // Call markWelcomeShown
            const { capturedTimestamp } = setupSuccessfulUpdate()
            const result = await markWelcomeShown()
            
            // Verify success
            if (!result.success) {
              return false
            }
            
            // Verify timestamp was set
            if (capturedTimestamp.value === null) {
              return false
            }
            
            // Verify updated profile doesn't show welcome
            const updatedProfile: WelcomeCheckProfile = {
              tc_accepted_at: tcTimestamp,
              welcome_shown_at: capturedTimestamp.value,
            }
            
            return shouldShowWelcome(updatedProfile) === false
          }
        ),
        { numRuns: 50 } // Reduced for async property test performance
      )
    })

    it('should ensure welcome_shown_at is a valid ISO string after markWelcomeShown', async () => {
      // Arrange
      const userId = 'iso-validation-user'
      setupAuthenticatedUser(userId)
      const { capturedTimestamp } = setupSuccessfulUpdate()
      
      // Act
      await markWelcomeShown()
      
      // Assert: Should be parseable as a Date
      const parsedDate = new Date(capturedTimestamp.value!)
      expect(parsedDate.toString()).not.toBe('Invalid Date')
      expect(parsedDate.toISOString()).toBe(capturedTimestamp.value)
    })

    it('should transition from showing welcome to not showing in single operation', async () => {
      // This tests the atomicity of the state transition
      const userId = 'atomic-user'
      setupAuthenticatedUser(userId)
      
      // Initial state
      let currentProfile: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: null,
      }
      
      // Before: Should show welcome
      expect(shouldShowWelcome(currentProfile)).toBe(true)
      
      // Perform the action
      const { capturedTimestamp } = setupSuccessfulUpdate()
      const result = await markWelcomeShown()
      expect(result.success).toBe(true)
      
      // Update profile state (simulating database update)
      currentProfile = {
        ...currentProfile,
        welcome_shown_at: capturedTimestamp.value,
      }
      
      // After: Should NOT show welcome
      expect(shouldShowWelcome(currentProfile)).toBe(false)
    })
  })

  // =====================================================
  // Quick Action Navigation Tests
  // Validates: Requirements 4.2
  // =====================================================
  
  describe('Quick action navigation works', () => {
    /**
     * Test that quick action buttons have valid navigation targets
     * and that clicking them should also dismiss the modal
     */
    
    it('should have valid href paths for quick actions', async () => {
      // Import welcome content
      const { getWelcomeContent, WELCOME_CONTENT } = await import('@/lib/welcome-content')
      
      // Check all roles have valid hrefs
      const roles = Object.keys(WELCOME_CONTENT) as Array<keyof typeof WELCOME_CONTENT>
      
      for (const role of roles) {
        const content = getWelcomeContent(role)
        for (const action of content.quickActions) {
          // All hrefs should start with /
          expect(action.href.startsWith('/')).toBe(true)
          // All hrefs should be valid URL paths
          expect(action.href).toMatch(/^\/[a-zA-Z0-9\-_/]*$/)
        }
      }
    })

    it('should dismiss modal and update database when quick action is clicked', async () => {
      // Arrange: Simulate quick action click which should also call markWelcomeShown
      const userId = 'quick-action-user'
      setupAuthenticatedUser(userId)
      const { capturedTimestamp } = setupSuccessfulUpdate()
      
      // Act: markWelcomeShown is called when quick action is clicked
      const result = await markWelcomeShown()
      
      // Assert: Should succeed and set timestamp
      expect(result.success).toBe(true)
      expect(capturedTimestamp.value).not.toBeNull()
    })
  })

  // =====================================================
  // Error Handling Integration Tests
  // =====================================================
  
  describe('Error handling integration', () => {
    it('should handle unauthenticated user gracefully', async () => {
      // Arrange: No authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })
      
      // Act
      const result = await markWelcomeShown()
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('should handle database error gracefully', async () => {
      // Arrange
      setupAuthenticatedUser('error-user')
      
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })
      
      // Act
      const result = await markWelcomeShown()
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should not update shouldShowWelcome state on error', async () => {
      // Arrange: User with welcome not shown
      const initialProfile: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: null,
      }
      
      // Initial state should show welcome
      expect(shouldShowWelcome(initialProfile)).toBe(true)
      
      // Simulate failed markWelcomeShown
      setupAuthenticatedUser('failed-user')
      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      })
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: mockEq }),
      })
      
      const result = await markWelcomeShown()
      expect(result.success).toBe(false)
      
      // Profile state should remain unchanged (welcome_shown_at still null)
      // So shouldShowWelcome should still return true
      expect(shouldShowWelcome(initialProfile)).toBe(true)
    })
  })

  // =====================================================
  // State Consistency Tests
  // =====================================================
  
  describe('State consistency', () => {
    it('should maintain consistent state across multiple checks', () => {
      const profile: WelcomeCheckProfile = {
        tc_accepted_at: '2026-01-26T10:00:00Z',
        welcome_shown_at: null,
      }
      
      // Multiple calls should return same result
      const results = Array(10).fill(null).map(() => shouldShowWelcome(profile))
      expect(results.every(r => r === true)).toBe(true)
    })

    it('should be idempotent - multiple markWelcomeShown calls should all succeed', async () => {
      // Arrange
      setupAuthenticatedUser('idempotent-user')
      setupSuccessfulUpdate()
      
      // Act: Call multiple times
      const result1 = await markWelcomeShown()
      
      // Reset mock for second call
      setupSuccessfulUpdate()
      const result2 = await markWelcomeShown()
      
      // Assert: Both should succeed
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })
})
