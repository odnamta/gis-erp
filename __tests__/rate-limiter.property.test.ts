/**
 * Property-based tests for rate limiting utilities
 * Feature: v0.79-security-hardening
 * Tests Properties 1, 2 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  checkRateLimitSync,
  getRateLimitHeaders,
  validateRateLimitHeaders,
  getWindowStart,
  getConfigForEndpoint,
} from '@/lib/security/rate-limiter';
import type { RateLimitConfig, RateLimitResult } from '@/lib/security/types';
import { DEFAULT_RATE_LIMITS } from '@/lib/security/types';

describe('Rate Limiter Property Tests', () => {
  describe('Property 1: Rate Limiting Enforcement', () => {
    /**
     * Property: For any identifier and endpoint combination, when the request count
     * within a time window exceeds the configured limit, subsequent requests SHALL
     * be rejected until the window resets.
     *
     * Validates: Requirements 1.1, 1.2
     */
    it('should reject requests when count exceeds limit', () => {
      fc.assert(
        fc.property(
          // Generate random identifiers
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate random endpoints
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate random limits (1-1000)
          fc.integer({ min: 1, max: 1000 }),
          // Generate request counts that exceed the limit
          fc.integer({ min: 0, max: 2000 }),
          (identifier, endpoint, limit, currentCount) => {
            const config: RateLimitConfig = {
              limit,
              windowSeconds: 60,
              blockDurationSeconds: 300,
            };

            const result = checkRateLimitSync(identifier, endpoint, currentCount, config);

            if (currentCount >= limit) {
              // When count exceeds or equals limit, request should be rejected
              expect(result.allowed).toBe(false);
              expect(result.remaining).toBe(0);
            } else {
              // When count is below limit, request should be allowed
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBe(limit - currentCount - 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Remaining count should always be non-negative and consistent
     * Validates: Requirements 1.1, 1.2
     */
    it('should always return non-negative remaining count', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 5000 }),
          (identifier, endpoint, limit, currentCount) => {
            const config: RateLimitConfig = {
              limit,
              windowSeconds: 60,
              blockDurationSeconds: 300,
            };

            const result = checkRateLimitSync(identifier, endpoint, currentCount, config);

            // Remaining should never be negative
            expect(result.remaining).toBeGreaterThanOrEqual(0);

            // If allowed, remaining should be limit - count - 1
            if (result.allowed) {
              expect(result.remaining).toBe(limit - currentCount - 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Rate limit should be enforced at exactly the limit boundary
     * Validates: Requirements 1.1, 1.2
     */
    it('should enforce limit at exact boundary', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 1000 }),
          (identifier, endpoint, limit) => {
            const config: RateLimitConfig = {
              limit,
              windowSeconds: 60,
              blockDurationSeconds: 300,
            };

            // At limit - 1, should be allowed with 0 remaining
            const resultAtLimitMinus1 = checkRateLimitSync(identifier, endpoint, limit - 1, config);
            expect(resultAtLimitMinus1.allowed).toBe(true);
            expect(resultAtLimitMinus1.remaining).toBe(0);

            // At exactly limit, should be rejected
            const resultAtLimit = checkRateLimitSync(identifier, endpoint, limit, config);
            expect(resultAtLimit.allowed).toBe(false);
            expect(resultAtLimit.remaining).toBe(0);

            // Above limit, should still be rejected
            const resultAboveLimit = checkRateLimitSync(identifier, endpoint, limit + 1, config);
            expect(resultAboveLimit.allowed).toBe(false);
            expect(resultAboveLimit.remaining).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Different endpoints should have independent rate limits
     * Validates: Requirements 1.1
     */
    it('should apply different configs for different endpoint types', () => {
      const endpoints = [
        { path: '/api/users', expectedConfig: DEFAULT_RATE_LIMITS.api },
        { path: '/auth/login', expectedConfig: DEFAULT_RATE_LIMITS.auth },
        { path: '/upload/files', expectedConfig: DEFAULT_RATE_LIMITS.upload },
        { path: '/dashboard', expectedConfig: DEFAULT_RATE_LIMITS.default },
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...endpoints),
          ({ path, expectedConfig }) => {
            const config = getConfigForEndpoint(path);
            expect(config.limit).toBe(expectedConfig.limit);
            expect(config.windowSeconds).toBe(expectedConfig.windowSeconds);
            expect(config.blockDurationSeconds).toBe(expectedConfig.blockDurationSeconds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Rate Limit Headers Consistency', () => {
    /**
     * Property: For any rate-limited response, the rate limit headers
     * (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) SHALL
     * accurately reflect the current rate limit state.
     *
     * Validates: Requirements 1.3
     */
    it('should generate consistent headers for any rate limit result', () => {
      fc.assert(
        fc.property(
          // Generate random limits
          fc.integer({ min: 1, max: 1000 }),
          // Generate random remaining counts
          fc.integer({ min: -100, max: 1000 }),
          // Generate random reset times (within next hour)
          fc.integer({ min: 0, max: 3600000 }),
          // Generate blocked status
          fc.boolean(),
          (limit, remaining, resetOffset, blocked) => {
            const config: RateLimitConfig = {
              limit,
              windowSeconds: 60,
              blockDurationSeconds: 300,
            };

            const resetAt = new Date(Date.now() + resetOffset);
            const result: RateLimitResult = {
              allowed: remaining > 0 && !blocked,
              remaining,
              resetAt,
              blocked,
            };

            const headers = getRateLimitHeaders(result, config);

            // X-RateLimit-Limit should match config
            expect(headers['X-RateLimit-Limit']).toBe(limit.toString());

            // X-RateLimit-Remaining should be max(0, remaining)
            expect(headers['X-RateLimit-Remaining']).toBe(Math.max(0, remaining).toString());

            // X-RateLimit-Reset should be Unix timestamp
            const expectedReset = Math.floor(resetAt.getTime() / 1000);
            expect(headers['X-RateLimit-Reset']).toBe(expectedReset.toString());

            // If not allowed, Retry-After should be present
            if (!result.allowed) {
              expect(headers['Retry-After']).toBeDefined();
              const retryAfter = parseInt(headers['Retry-After'], 10);
              expect(retryAfter).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Headers should be valid for validation function
     * Validates: Requirements 1.3
     */
    it('should generate headers that pass validation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1000, max: 60000 }),
          (limit, currentCount, resetOffset) => {
            const config: RateLimitConfig = {
              limit,
              windowSeconds: 60,
              blockDurationSeconds: 300,
            };

            const resetAt = new Date(Date.now() + resetOffset);
            const allowed = currentCount < limit;
            const remaining = allowed ? limit - currentCount - 1 : 0;

            const result: RateLimitResult = {
              allowed,
              remaining,
              resetAt,
              blocked: false,
            };

            const headers = getRateLimitHeaders(result, config);
            const isValid = validateRateLimitHeaders(headers, result, config);

            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: All required headers should be present
     * Validates: Requirements 1.3
     */
    it('should always include all required headers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: -100, max: 1000 }),
          fc.boolean(),
          (limit, remaining, allowed) => {
            const config: RateLimitConfig = {
              limit,
              windowSeconds: 60,
              blockDurationSeconds: 300,
            };

            const result: RateLimitResult = {
              allowed,
              remaining,
              resetAt: new Date(Date.now() + 60000),
              blocked: false,
            };

            const headers = getRateLimitHeaders(result, config);

            // Required headers should always be present
            expect(headers).toHaveProperty('X-RateLimit-Limit');
            expect(headers).toHaveProperty('X-RateLimit-Remaining');
            expect(headers).toHaveProperty('X-RateLimit-Reset');

            // Values should be valid numbers
            expect(parseInt(headers['X-RateLimit-Limit'], 10)).not.toBeNaN();
            expect(parseInt(headers['X-RateLimit-Remaining'], 10)).not.toBeNaN();
            expect(parseInt(headers['X-RateLimit-Reset'], 10)).not.toBeNaN();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Retry-After header should be present when request is not allowed
     * Validates: Requirements 1.3
     */
    it('should include Retry-After header when request is rejected', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1000, max: 60000 }),
          (limit, resetOffset) => {
            const config: RateLimitConfig = {
              limit,
              windowSeconds: 60,
              blockDurationSeconds: 300,
            };

            const resetAt = new Date(Date.now() + resetOffset);
            const result: RateLimitResult = {
              allowed: false,
              remaining: 0,
              resetAt,
              blocked: false,
            };

            const headers = getRateLimitHeaders(result, config);

            // Retry-After should be present for rejected requests
            expect(headers).toHaveProperty('Retry-After');
            const retryAfter = parseInt(headers['Retry-After'], 10);
            expect(retryAfter).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Window Calculation Properties', () => {
    /**
     * Property: Window start should always be aligned to window boundaries
     */
    it('should calculate window start aligned to boundaries', () => {
      fc.assert(
        fc.property(
          // Generate random timestamps
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          // Generate random window sizes (1-3600 seconds)
          fc.integer({ min: 1, max: 3600 }),
          (timestamp, windowSeconds) => {
            const now = new Date(timestamp);
            const windowStart = getWindowStart(now, windowSeconds);

            // Window start should be before or equal to now
            expect(windowStart.getTime()).toBeLessThanOrEqual(now.getTime());

            // Window start should be aligned to window boundary
            const windowMs = windowSeconds * 1000;
            expect(windowStart.getTime() % windowMs).toBe(0);

            // Now should be within the window
            const windowEnd = new Date(windowStart.getTime() + windowMs);
            expect(now.getTime()).toBeLessThan(windowEnd.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Same timestamp should always produce same window start
     */
    it('should be deterministic for same input', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          fc.integer({ min: 1, max: 3600 }),
          (timestamp, windowSeconds) => {
            const now = new Date(timestamp);
            const windowStart1 = getWindowStart(now, windowSeconds);
            const windowStart2 = getWindowStart(now, windowSeconds);

            expect(windowStart1.getTime()).toBe(windowStart2.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
