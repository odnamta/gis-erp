/**
 * Property-based tests for API Key Manager utilities
 * Feature: v0.79-security-hardening
 * Tests Properties 7, 8 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateKeySync,
  validateKeySync,
  hashKey,
  generateSecureRandomBytes,
  isValidKeyFormat,
  hasPermission,
} from '@/lib/security/api-key-manager';
import type { GenerateAPIKeyParams, APIKey } from '@/lib/security/types';

describe('API Key Manager Property Tests', () => {
  describe('Property 7: API Key Round-Trip', () => {
    /**
     * Property: For any generated API key, validating the key immediately after
     * generation SHALL return valid=true with the correct userId and permissions.
     * The stored key_hash SHALL NOT equal the original key string.
     *
     * Validates: Requirements 4.1, 4.2, 4.5
     */
    it('should validate generated keys with correct user and permissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random key names
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate random user IDs (UUID-like)
          fc.uuid(),
          // Generate random permissions
          fc.array(
            fc.constantFrom(
              'read:customers',
              'write:customers',
              'read:projects',
              'write:projects',
              'read:quotations',
              'write:quotations',
              'read:pjo',
              'write:pjo',
              'read:jo',
              'write:jo',
              'read:invoices',
              'write:invoices',
              'read:reports',
              'admin:all'
            ),
            { minLength: 0, maxLength: 5 }
          ),
          // Generate optional rate limits
          fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
          async (name, userId, permissions, rateLimitPerMinute) => {
            const params: GenerateAPIKeyParams = {
              name,
              userId,
              permissions,
              rateLimitPerMinute,
            };

            // Generate the key
            const result = await generateKeySync(params);

            // Validate the generated key
            const validationResult = await validateKeySync(
              result.key,
              result.keyData.key_hash,
              result.keyData
            );

            // Key should be valid
            expect(validationResult.valid).toBe(true);

            // User ID should match
            expect(validationResult.userId).toBe(userId);

            // Permissions should match
            expect(validationResult.permissions).toEqual(permissions);

            // Rate limit should match (or default)
            const expectedRateLimit = rateLimitPerMinute ?? 60;
            expect(validationResult.rateLimitPerMinute).toBe(expectedRateLimit);

            // Key hash should NOT equal the original key
            expect(result.keyData.key_hash).not.toBe(result.key);

            // Key hash should be a valid SHA-256 hash (64 hex chars)
            expect(result.keyData.key_hash).toMatch(/^[0-9a-f]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Generated keys should have valid format
     * Validates: Requirements 4.1
     */
    it('should generate keys with valid format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          async (name, userId, permissions) => {
            const params: GenerateAPIKeyParams = {
              name,
              userId,
              permissions,
            };

            const result = await generateKeySync(params);

            // Key should start with prefix
            expect(result.key.startsWith('gama_')).toBe(true);

            // Key should have valid format
            expect(isValidKeyFormat(result.key)).toBe(true);

            // Key prefix stored should match beginning of key
            expect(result.key.startsWith(result.keyData.key_prefix)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Same key should always produce same hash
     * Validates: Requirements 4.2
     */
    it('should produce deterministic hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (keyString) => {
            const hash1 = await hashKey(keyString);
            const hash2 = await hashKey(keyString);

            expect(hash1).toBe(hash2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Different keys should produce different hashes (with high probability)
     * Validates: Requirements 4.2
     */
    it('should produce different hashes for different keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (key1, key2) => {
            fc.pre(key1 !== key2); // Only test when keys are different

            const hash1 = await hashKey(key1);
            const hash2 = await hashKey(key2);

            expect(hash1).not.toBe(hash2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Wrong key should fail validation
     * Validates: Requirements 4.2
     */
    it('should reject wrong keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          async (name, userId, permissions) => {
            const params: GenerateAPIKeyParams = {
              name,
              userId,
              permissions,
            };

            const result = await generateKeySync(params);

            // Modify the key slightly
            const wrongKey = result.key + 'x';

            // Validation should fail
            const validationResult = await validateKeySync(
              wrongKey,
              result.keyData.key_hash,
              result.keyData
            );

            // Should be invalid due to format or hash mismatch
            expect(validationResult.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Expired API Key Rejection', () => {
    /**
     * Property: For any API key with an expiration date in the past,
     * validation SHALL return valid=false.
     *
     * Validates: Requirements 4.6
     */
    it('should reject expired keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          // Generate expiration dates in the past (1 second to 1 year ago)
          fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
          async (name, userId, permissions, msInPast) => {
            const expiresAt = new Date(Date.now() - msInPast);

            const params: GenerateAPIKeyParams = {
              name,
              userId,
              permissions,
              expiresAt,
            };

            const result = await generateKeySync(params);

            // Validate the expired key
            const validationResult = await validateKeySync(
              result.key,
              result.keyData.key_hash,
              result.keyData
            );

            // Key should be invalid due to expiration
            expect(validationResult.valid).toBe(false);
            expect(validationResult.invalidReason).toBe('expired');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Non-expired keys should be valid
     * Validates: Requirements 4.6
     */
    it('should accept non-expired keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          // Generate expiration dates in the future (1 second to 1 year from now)
          fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
          async (name, userId, permissions, msInFuture) => {
            const expiresAt = new Date(Date.now() + msInFuture);

            const params: GenerateAPIKeyParams = {
              name,
              userId,
              permissions,
              expiresAt,
            };

            const result = await generateKeySync(params);

            // Validate the non-expired key
            const validationResult = await validateKeySync(
              result.key,
              result.keyData.key_hash,
              result.keyData
            );

            // Key should be valid
            expect(validationResult.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Keys without expiration should always be valid (if active)
     * Validates: Requirements 4.6
     */
    it('should accept keys without expiration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          async (name, userId, permissions) => {
            const params: GenerateAPIKeyParams = {
              name,
              userId,
              permissions,
              // No expiresAt - key never expires
            };

            const result = await generateKeySync(params);

            // Validate the key
            const validationResult = await validateKeySync(
              result.key,
              result.keyData.key_hash,
              result.keyData
            );

            // Key should be valid
            expect(validationResult.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Revoked keys should be rejected regardless of expiration
     * Validates: Requirements 4.6
     */
    it('should reject revoked keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
          async (name, userId, permissions) => {
            const params: GenerateAPIKeyParams = {
              name,
              userId,
              permissions,
            };

            const result = await generateKeySync(params);

            // Mark the key as revoked
            const revokedKeyData: APIKey = {
              ...result.keyData,
              is_active: false,
            };

            // Validate the revoked key
            const validationResult = await validateKeySync(
              result.key,
              revokedKeyData.key_hash,
              revokedKeyData
            );

            // Key should be invalid due to revocation
            expect(validationResult.valid).toBe(false);
            expect(validationResult.invalidReason).toBe('revoked');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Permission Checking Properties', () => {
    /**
     * Property: admin:all permission should grant access to everything
     */
    it('should grant all access with admin:all permission', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'read:customers',
            'write:customers',
            'read:projects',
            'write:projects',
            'read:quotations',
            'write:quotations',
            'read:pjo',
            'write:pjo',
            'read:jo',
            'write:jo',
            'read:invoices',
            'write:invoices',
            'read:reports',
            'admin:all'
          ),
          (requiredPermission) => {
            const permissions = ['admin:all'];
            expect(hasPermission(permissions, requiredPermission)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Exact permission match should grant access
     */
    it('should grant access with exact permission match', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'read:customers',
            'write:customers',
            'read:projects',
            'write:projects',
            'read:quotations',
            'write:quotations'
          ),
          (permission) => {
            const permissions = [permission];
            expect(hasPermission(permissions, permission)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Missing permission should deny access
     */
    it('should deny access without required permission', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('read:customers', 'write:customers', 'read:projects'),
          fc.constantFrom('read:invoices', 'write:invoices', 'read:reports'),
          (havePermission, needPermission) => {
            // These sets are disjoint, so no permission overlap
            const permissions = [havePermission];
            expect(hasPermission(permissions, needPermission)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Secure Random Generation Properties', () => {
    /**
     * Property: Generated random bytes should have correct length
     */
    it('should generate correct length random bytes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 64 }),
          (length) => {
            const bytes = generateSecureRandomBytes(length);
            // Each byte becomes 2 hex characters
            expect(bytes.length).toBe(length * 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Generated random bytes should be valid hex
     */
    it('should generate valid hex strings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 64 }),
          (length) => {
            const bytes = generateSecureRandomBytes(length);
            expect(bytes).toMatch(/^[0-9a-f]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Different calls should produce different values (with high probability)
     */
    it('should generate unique values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 16, max: 64 }),
          (length) => {
            const bytes1 = generateSecureRandomBytes(length);
            const bytes2 = generateSecureRandomBytes(length);
            // With 16+ bytes, collision probability is negligible
            expect(bytes1).not.toBe(bytes2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Key Format Validation Properties', () => {
    /**
     * Property: Valid keys should pass format validation
     */
    it('should accept valid key formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          async (name, userId) => {
            const result = await generateKeySync({ name, userId, permissions: [] });
            expect(isValidKeyFormat(result.key)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Keys without prefix should fail validation
     */
    it('should reject keys without correct prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.startsWith('gama_')),
          (invalidKey) => {
            expect(isValidKeyFormat(invalidKey)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty or null keys should fail validation
     */
    it('should reject empty or invalid keys', () => {
      expect(isValidKeyFormat('')).toBe(false);
      expect(isValidKeyFormat('gama_')).toBe(false);
      expect(isValidKeyFormat('gama_short')).toBe(false);
    });
  });
});
