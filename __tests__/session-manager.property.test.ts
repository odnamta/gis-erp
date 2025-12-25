/**
 * Property-based tests for Session Manager utilities
 * Feature: v0.79-security-hardening
 * Tests Properties 9, 10, 11 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createSessionSync,
  validateSessionSync,
  hashToken,
  generateSessionToken,
  isValidTokenFormat,
  enforceSessionLimitSync,
} from '@/lib/security/session-manager';
import type { SessionContext, UserSession, SessionConfig } from '@/lib/security/types';

// Default session config for testing
const DEFAULT_TEST_CONFIG: SessionConfig = {
  sessionDurationSeconds: 24 * 60 * 60, // 24 hours
  maxSessionsPerUser: 5,
  inactivityTimeoutSeconds: 30 * 60, // 30 minutes
};

// Helper to generate hex string
const hexStringArb = (minLength: number, maxLength: number) =>
  fc.array(fc.integer({ min: 0, max: 15 }), { minLength, maxLength })
    .map(arr => arr.map(n => n.toString(16)).join(''));

// Helper to generate valid session context
const sessionContextArb = fc.record({
  ipAddress: fc.ipV4(),
  userAgent: fc.string({ minLength: 1, maxLength: 200 }),
  deviceFingerprint: fc.option(hexStringArb(32, 64), { nil: undefined }),
});

describe('Session Manager Property Tests', () => {
  describe('Property 9: Session Token Round-Trip', () => {
    /**
     * Property: For any created session, validating the session token immediately
     * after creation SHALL return valid=true with the correct session data.
     * The stored session_token_hash SHALL NOT equal the original token.
     *
     * Validates: Requirements 5.1, 5.2
     */
    it('should validate created sessions with correct data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionContextArb,
          async (userId, context) => {
            // Create the session
            const result = await createSessionSync(userId, context as SessionContext, DEFAULT_TEST_CONFIG);

            // Validate the created session
            const validationResult = await validateSessionSync(
              result.token,
              result.tokenHash,
              result.session
            );

            // Session should be valid
            expect(validationResult.valid).toBe(true);

            // Session data should be present
            expect(validationResult.session).toBeDefined();
            expect(validationResult.session?.user_id).toBe(userId);
            expect(validationResult.session?.ip_address).toBe(context.ipAddress);
            expect(validationResult.session?.user_agent).toBe(context.userAgent);

            // Token hash should NOT equal the original token
            expect(result.tokenHash).not.toBe(result.token);

            // Token hash should be a valid SHA-256 hash (64 hex chars)
            expect(result.tokenHash).toMatch(/^[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Generated tokens should have valid format
     * Validates: Requirements 5.1
     */
    it('should generate tokens with valid format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionContextArb,
          async (userId, context) => {
            const result = await createSessionSync(userId, context as SessionContext, DEFAULT_TEST_CONFIG);

            // Token should start with prefix
            expect(result.token.startsWith('sess_')).toBe(true);

            // Token should have valid format
            expect(isValidTokenFormat(result.token)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Same token should always produce same hash
     * Validates: Requirements 5.2
     */
    it('should produce deterministic hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (tokenString) => {
            const hash1 = await hashToken(tokenString);
            const hash2 = await hashToken(tokenString);

            expect(hash1).toBe(hash2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Different tokens should produce different hashes
     * Validates: Requirements 5.2
     */
    it('should produce different hashes for different tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (token1, token2) => {
            fc.pre(token1 !== token2); // Only test when tokens are different

            const hash1 = await hashToken(token1);
            const hash2 = await hashToken(token2);

            expect(hash1).not.toBe(hash2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Wrong token should fail validation
     * Validates: Requirements 5.2
     */
    it('should reject wrong tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionContextArb,
          async (userId, context) => {
            const result = await createSessionSync(userId, context as SessionContext, DEFAULT_TEST_CONFIG);

            // Modify the token slightly
            const wrongToken = result.token + 'x';

            // Validation should fail
            const validationResult = await validateSessionSync(
              wrongToken,
              result.tokenHash,
              result.session
            );

            // Should be invalid due to format or hash mismatch
            expect(validationResult.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Session Limit Enforcement', () => {
    /**
     * Property: For any user, when creating a new session that would exceed 5 active
     * sessions, the oldest sessions SHALL be invalidated such that at most 5 sessions
     * remain active.
     *
     * Validates: Requirements 5.3
     */
    it('should identify sessions to invalidate when limit exceeded', () => {
      fc.assert(
        fc.property(
          // Generate between 5 and 15 sessions
          fc.integer({ min: 5, max: 15 }),
          fc.integer({ min: 1, max: 10 }), // max sessions limit
          (sessionCount, maxSessions) => {
            // Create mock sessions with different creation times
            const sessions: UserSession[] = [];
            const baseTime = Date.now();

            for (let i = 0; i < sessionCount; i++) {
              sessions.push({
                id: crypto.randomUUID(),
                user_id: 'test-user',
                session_token_hash: `hash_${i}`,
                created_at: new Date(baseTime + i * 1000).toISOString(), // Each session 1 second apart
                expires_at: new Date(baseTime + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24 hours
                last_activity: new Date(baseTime + i * 1000).toISOString(),
                ip_address: '127.0.0.1',
                user_agent: 'test',
                device_fingerprint: null,
                is_active: true,
                terminated_at: null,
                terminated_reason: null,
              });
            }

            // Get sessions to invalidate
            const toInvalidate = enforceSessionLimitSync(sessions, maxSessions);

            // After invalidation, remaining active sessions should be at most maxSessions - 1
            // (to make room for the new session)
            const remainingActive = sessionCount - toInvalidate.length;
            expect(remainingActive).toBeLessThanOrEqual(maxSessions);

            // If we had more sessions than limit, we should invalidate some
            if (sessionCount >= maxSessions) {
              expect(toInvalidate.length).toBeGreaterThan(0);
            }

            // Invalidated sessions should be the oldest ones
            if (toInvalidate.length > 0) {
              const invalidatedSessions = sessions.filter(s => toInvalidate.includes(s.id));
              const remainingSessions = sessions.filter(s => !toInvalidate.includes(s.id));

              // All invalidated sessions should be older than remaining sessions
              const oldestRemaining = Math.min(
                ...remainingSessions.map(s => new Date(s.created_at).getTime())
              );
              const newestInvalidated = Math.max(
                ...invalidatedSessions.map(s => new Date(s.created_at).getTime())
              );

              expect(newestInvalidated).toBeLessThanOrEqual(oldestRemaining);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When under the limit, no sessions should be invalidated
     * Validates: Requirements 5.3
     */
    it('should not invalidate sessions when under limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }), // 0-4 sessions (under default limit of 5)
          (sessionCount) => {
            const sessions: UserSession[] = [];
            const baseTime = Date.now();

            for (let i = 0; i < sessionCount; i++) {
              sessions.push({
                id: crypto.randomUUID(),
                user_id: 'test-user',
                session_token_hash: `hash_${i}`,
                created_at: new Date(baseTime + i * 1000).toISOString(),
                expires_at: new Date(baseTime + 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(baseTime + i * 1000).toISOString(),
                ip_address: '127.0.0.1',
                user_agent: 'test',
                device_fingerprint: null,
                is_active: true,
                terminated_at: null,
                terminated_reason: null,
              });
            }

            // With default limit of 5, no sessions should be invalidated
            const toInvalidate = enforceSessionLimitSync(sessions, 5);
            expect(toInvalidate.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Inactive sessions should not count toward the limit
     * Validates: Requirements 5.3
     */
    it('should not count inactive sessions toward limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }), // active sessions
          fc.integer({ min: 0, max: 10 }), // inactive sessions
          (activeCount, inactiveCount) => {
            const sessions: UserSession[] = [];
            const baseTime = Date.now();

            // Create active sessions
            for (let i = 0; i < activeCount; i++) {
              sessions.push({
                id: crypto.randomUUID(),
                user_id: 'test-user',
                session_token_hash: `hash_active_${i}`,
                created_at: new Date(baseTime + i * 1000).toISOString(),
                expires_at: new Date(baseTime + 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(baseTime + i * 1000).toISOString(),
                ip_address: '127.0.0.1',
                user_agent: 'test',
                device_fingerprint: null,
                is_active: true,
                terminated_at: null,
                terminated_reason: null,
              });
            }

            // Create inactive sessions
            for (let i = 0; i < inactiveCount; i++) {
              sessions.push({
                id: crypto.randomUUID(),
                user_id: 'test-user',
                session_token_hash: `hash_inactive_${i}`,
                created_at: new Date(baseTime + i * 1000).toISOString(),
                expires_at: new Date(baseTime + 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(baseTime + i * 1000).toISOString(),
                ip_address: '127.0.0.1',
                user_agent: 'test',
                device_fingerprint: null,
                is_active: false, // Inactive
                terminated_at: new Date().toISOString(),
                terminated_reason: 'test',
              });
            }

            const toInvalidate = enforceSessionLimitSync(sessions, 5);

            // Only active sessions should be considered
            // If activeCount < 5, nothing should be invalidated
            if (activeCount < 5) {
              expect(toInvalidate.length).toBe(0);
            }

            // Inactive sessions should never be in the invalidation list
            const inactiveIds = sessions.filter(s => !s.is_active).map(s => s.id);
            for (const id of toInvalidate) {
              expect(inactiveIds).not.toContain(id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Expired sessions should not count toward the limit
     * Validates: Requirements 5.3
     */
    it('should not count expired sessions toward limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }), // valid sessions
          fc.integer({ min: 0, max: 10 }), // expired sessions
          (validCount, expiredCount) => {
            const sessions: UserSession[] = [];
            const baseTime = Date.now();

            // Create valid (non-expired) sessions
            for (let i = 0; i < validCount; i++) {
              sessions.push({
                id: crypto.randomUUID(),
                user_id: 'test-user',
                session_token_hash: `hash_valid_${i}`,
                created_at: new Date(baseTime + i * 1000).toISOString(),
                expires_at: new Date(baseTime + 24 * 60 * 60 * 1000).toISOString(), // Future
                last_activity: new Date(baseTime + i * 1000).toISOString(),
                ip_address: '127.0.0.1',
                user_agent: 'test',
                device_fingerprint: null,
                is_active: true,
                terminated_at: null,
                terminated_reason: null,
              });
            }

            // Create expired sessions
            for (let i = 0; i < expiredCount; i++) {
              sessions.push({
                id: crypto.randomUUID(),
                user_id: 'test-user',
                session_token_hash: `hash_expired_${i}`,
                created_at: new Date(baseTime - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
                expires_at: new Date(baseTime - 24 * 60 * 60 * 1000).toISOString(), // Expired 1 day ago
                last_activity: new Date(baseTime - 48 * 60 * 60 * 1000).toISOString(),
                ip_address: '127.0.0.1',
                user_agent: 'test',
                device_fingerprint: null,
                is_active: true, // Still marked active but expired
                terminated_at: null,
                terminated_reason: null,
              });
            }

            const toInvalidate = enforceSessionLimitSync(sessions, 5);

            // Only valid (non-expired) sessions should be considered
            if (validCount < 5) {
              expect(toInvalidate.length).toBe(0);
            }

            // Expired sessions should never be in the invalidation list
            const expiredIds = sessions
              .filter(s => new Date(s.expires_at) <= new Date())
              .map(s => s.id);
            for (const id of toInvalidate) {
              expect(expiredIds).not.toContain(id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Expired Session Rejection', () => {
    /**
     * Property: For any session with an expiration time in the past,
     * validation SHALL return valid=false.
     *
     * Validates: Requirements 5.4
     */
    it('should reject expired sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionContextArb,
          // Generate expiration times in the past (1 second to 1 year ago)
          fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
          async (userId, context, msInPast) => {
            // Create session with custom config for short duration
            const result = await createSessionSync(userId, context as SessionContext, {
              ...DEFAULT_TEST_CONFIG,
              sessionDurationSeconds: 1, // Very short duration
            });

            // Manually set expiration to past
            const expiredSession: UserSession = {
              ...result.session,
              expires_at: new Date(Date.now() - msInPast).toISOString(),
            };

            // Validate the expired session
            const validationResult = await validateSessionSync(
              result.token,
              result.tokenHash,
              expiredSession
            );

            // Session should be invalid due to expiration
            expect(validationResult.valid).toBe(false);
            expect(validationResult.invalidReason).toBe('expired');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Non-expired sessions should be valid
     * Validates: Requirements 5.4
     */
    it('should accept non-expired sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionContextArb,
          // Generate expiration times in the future (1 second to 1 year from now)
          fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
          async (userId, context, msInFuture) => {
            const result = await createSessionSync(userId, context as SessionContext, DEFAULT_TEST_CONFIG);

            // Manually set expiration to future
            const validSession: UserSession = {
              ...result.session,
              expires_at: new Date(Date.now() + msInFuture).toISOString(),
            };

            // Validate the non-expired session
            const validationResult = await validateSessionSync(
              result.token,
              result.tokenHash,
              validSession
            );

            // Session should be valid
            expect(validationResult.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Terminated sessions should be rejected regardless of expiration
     * Validates: Requirements 5.4, 5.5
     */
    it('should reject terminated sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionContextArb,
          fc.string({ minLength: 1, maxLength: 100 }), // termination reason
          async (userId, context, reason) => {
            const result = await createSessionSync(userId, context as SessionContext, DEFAULT_TEST_CONFIG);

            // Mark the session as terminated
            const terminatedSession: UserSession = {
              ...result.session,
              is_active: false,
              terminated_at: new Date().toISOString(),
              terminated_reason: reason,
            };

            // Validate the terminated session
            const validationResult = await validateSessionSync(
              result.token,
              result.tokenHash,
              terminatedSession
            );

            // Session should be invalid due to termination
            expect(validationResult.valid).toBe(false);
            expect(validationResult.invalidReason).toBe('terminated');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Generation Properties', () => {
    /**
     * Property: Generated tokens should have correct length
     */
    it('should generate tokens with correct length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          () => {
            const token = generateSessionToken();
            // Token should be prefix (5 chars) + 64 hex chars (32 bytes)
            expect(token.length).toBe(5 + 64);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Generated tokens should be valid hex after prefix
     */
    it('should generate valid hex tokens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          () => {
            const token = generateSessionToken();
            const hexPart = token.substring(5); // Remove 'sess_' prefix
            expect(hexPart).toMatch(/^[0-9a-f]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Different calls should produce different tokens
     */
    it('should generate unique tokens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          () => {
            const token1 = generateSessionToken();
            const token2 = generateSessionToken();
            // With 32 bytes of randomness, collision probability is negligible
            expect(token1).not.toBe(token2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Format Validation Properties', () => {
    /**
     * Property: Valid tokens should pass format validation
     */
    it('should accept valid token formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          sessionContextArb,
          async (userId, context) => {
            const result = await createSessionSync(userId, context as SessionContext, DEFAULT_TEST_CONFIG);
            expect(isValidTokenFormat(result.token)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Tokens without prefix should fail validation
     */
    it('should reject tokens without correct prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.startsWith('sess_')),
          (invalidToken) => {
            expect(isValidTokenFormat(invalidToken)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty or null tokens should fail validation
     */
    it('should reject empty or invalid tokens', () => {
      expect(isValidTokenFormat('')).toBe(false);
      expect(isValidTokenFormat('sess_')).toBe(false);
      expect(isValidTokenFormat('sess_short')).toBe(false);
    });
  });
});
