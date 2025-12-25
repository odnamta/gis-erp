/**
 * Property-based tests for IP Blocker utilities
 * Feature: v0.79-security-hardening
 * Tests Properties 12, 13 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isBlockedSync,
  createBlockRecord,
  isValidIPAddress,
  normalizeIPAddress,
  isIPInRange,
} from '@/lib/security/ip-blocker';
import type { BlockedIP, BlockIPParams } from '@/lib/security/types';

// Helper to generate valid IPv4 addresses
const ipv4Arb = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// Helper to generate block reasons
const blockReasonArb = fc.string({ minLength: 1, maxLength: 200 });

// Helper to generate block duration in seconds (1 minute to 1 year)
const durationArb = fc.integer({ min: 60, max: 365 * 24 * 60 * 60 });

describe('IP Blocker Property Tests', () => {
  describe('Property 12: IP Blocking Round-Trip', () => {
    /**
     * Property: For any blocked IP address, isBlocked() SHALL return true.
     * After unblocking, isBlocked() SHALL return false.
     *
     * Validates: Requirements 6.1, 6.2
     */
    it('should correctly identify blocked IPs', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          blockReasonArb,
          (ipAddress, reason) => {
            // Create a block record
            const blockParams: BlockIPParams = {
              ipAddress,
              reason,
            };
            const blockRecord = createBlockRecord(blockParams);

            // Create a list with the blocked IP
            const blockedIPs: BlockedIP[] = [blockRecord];

            // Check if IP is blocked
            const result = isBlockedSync(ipAddress, blockedIPs);

            // IP should be blocked
            expect(result.blocked).toBe(true);
            expect(result.blockInfo).toBeDefined();
            expect(result.blockInfo?.ip_address).toBe(ipAddress);
            expect(result.blockInfo?.reason).toBe(reason);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Non-blocked IPs should return blocked=false
     * Validates: Requirements 6.1
     */
    it('should correctly identify non-blocked IPs', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          ipv4Arb,
          blockReasonArb,
          (blockedIP, checkIP, reason) => {
            // Skip if IPs are the same
            fc.pre(blockedIP !== checkIP);

            // Create a block record for a different IP
            const blockParams: BlockIPParams = {
              ipAddress: blockedIP,
              reason,
            };
            const blockRecord = createBlockRecord(blockParams);

            // Create a list with the blocked IP
            const blockedIPs: BlockedIP[] = [blockRecord];

            // Check if the different IP is blocked
            const result = isBlockedSync(checkIP, blockedIPs);

            // IP should NOT be blocked
            expect(result.blocked).toBe(false);
            expect(result.blockInfo).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Unblocked (inactive) IPs should return blocked=false
     * Validates: Requirements 6.2
     */
    it('should correctly identify unblocked IPs', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          blockReasonArb,
          (ipAddress, reason) => {
            // Create a block record and mark it as inactive (unblocked)
            const blockParams: BlockIPParams = {
              ipAddress,
              reason,
            };
            const blockRecord = createBlockRecord(blockParams);
            const unblockedRecord: BlockedIP = {
              ...blockRecord,
              is_active: false, // Unblocked
            };

            // Create a list with the unblocked IP
            const blockedIPs: BlockedIP[] = [unblockedRecord];

            // Check if IP is blocked
            const result = isBlockedSync(ipAddress, blockedIPs);

            // IP should NOT be blocked (it was unblocked)
            expect(result.blocked).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Block record should contain all required fields
     * Validates: Requirements 6.1
     */
    it('should create complete block records', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          blockReasonArb,
          fc.option(fc.uuid(), { nil: undefined }),
          fc.option(durationArb, { nil: undefined }),
          (ipAddress, reason, blockedBy, durationSeconds) => {
            const blockParams: BlockIPParams = {
              ipAddress,
              reason,
              blockedBy,
              durationSeconds,
            };
            const blockRecord = createBlockRecord(blockParams);

            // Verify all required fields are present
            expect(blockRecord.id).toBeDefined();
            expect(blockRecord.ip_address).toBe(ipAddress);
            expect(blockRecord.reason).toBe(reason);
            expect(blockRecord.blocked_at).toBeDefined();
            expect(blockRecord.is_active).toBe(true);

            // Verify optional fields
            expect(blockRecord.blocked_by).toBe(blockedBy || null);

            // Verify expiration
            if (durationSeconds) {
              expect(blockRecord.expires_at).toBeDefined();
              const expiresAt = new Date(blockRecord.expires_at!);
              const blockedAt = new Date(blockRecord.blocked_at);
              const expectedExpiry = blockedAt.getTime() + durationSeconds * 1000;
              // Allow 1 second tolerance for timing
              expect(Math.abs(expiresAt.getTime() - expectedExpiry)).toBeLessThan(1000);
            } else {
              expect(blockRecord.expires_at).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Multiple blocks should all be checked correctly
     * Validates: Requirements 6.1
     */
    it('should handle multiple blocked IPs correctly', () => {
      fc.assert(
        fc.property(
          fc.array(ipv4Arb, { minLength: 1, maxLength: 10 }),
          blockReasonArb,
          (ipAddresses, reason) => {
            // Create unique IPs
            const uniqueIPs = [...new Set(ipAddresses)];
            
            // Create block records for all IPs
            const blockedIPs: BlockedIP[] = uniqueIPs.map(ip => 
              createBlockRecord({ ipAddress: ip, reason })
            );

            // Each blocked IP should be identified as blocked
            for (const ip of uniqueIPs) {
              const result = isBlockedSync(ip, blockedIPs);
              expect(result.blocked).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Expired Block Automatic Lift', () => {
    /**
     * Property: For any IP block with an expiration time in the past,
     * isBlocked() SHALL return false.
     *
     * Validates: Requirements 6.4
     */
    it('should not block IPs with expired blocks', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          blockReasonArb,
          // Generate expiration times in the past (1 second to 1 year ago)
          fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
          (ipAddress, reason, msInPast) => {
            // Create a block record with expiration in the past
            const blockRecord: BlockedIP = {
              id: crypto.randomUUID(),
              ip_address: ipAddress,
              reason,
              blocked_at: new Date(Date.now() - msInPast - 1000).toISOString(),
              blocked_by: null,
              expires_at: new Date(Date.now() - msInPast).toISOString(), // Expired
              is_active: true, // Still marked active but expired
            };

            const blockedIPs: BlockedIP[] = [blockRecord];

            // Check if IP is blocked
            const result = isBlockedSync(ipAddress, blockedIPs);

            // IP should NOT be blocked (block has expired)
            expect(result.blocked).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Non-expired temporary blocks should still block
     * Validates: Requirements 6.2, 6.4
     */
    it('should block IPs with non-expired temporary blocks', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          blockReasonArb,
          // Generate expiration times in the future (1 second to 1 year from now)
          fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
          (ipAddress, reason, msInFuture) => {
            // Create a block record with expiration in the future
            const blockRecord: BlockedIP = {
              id: crypto.randomUUID(),
              ip_address: ipAddress,
              reason,
              blocked_at: new Date().toISOString(),
              blocked_by: null,
              expires_at: new Date(Date.now() + msInFuture).toISOString(), // Not expired
              is_active: true,
            };

            const blockedIPs: BlockedIP[] = [blockRecord];

            // Check if IP is blocked
            const result = isBlockedSync(ipAddress, blockedIPs);

            // IP should be blocked (block has not expired)
            expect(result.blocked).toBe(true);
            expect(result.blockInfo?.ip_address).toBe(ipAddress);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Permanent blocks (no expiration) should always block
     * Validates: Requirements 6.2
     */
    it('should always block IPs with permanent blocks', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          blockReasonArb,
          (ipAddress, reason) => {
            // Create a permanent block record (no expiration)
            const blockRecord: BlockedIP = {
              id: crypto.randomUUID(),
              ip_address: ipAddress,
              reason,
              blocked_at: new Date().toISOString(),
              blocked_by: null,
              expires_at: null, // Permanent block
              is_active: true,
            };

            const blockedIPs: BlockedIP[] = [blockRecord];

            // Check if IP is blocked
            const result = isBlockedSync(ipAddress, blockedIPs);

            // IP should be blocked (permanent block)
            expect(result.blocked).toBe(true);
            expect(result.blockInfo?.expires_at).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Expired blocks should be distinguishable from active blocks
     * Validates: Requirements 6.4
     */
    it('should distinguish between expired and active blocks', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          ipv4Arb,
          blockReasonArb,
          fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }),
          (expiredIP, activeIP, reason, msOffset) => {
            // Skip if IPs are the same
            fc.pre(expiredIP !== activeIP);

            // Create an expired block
            const expiredBlock: BlockedIP = {
              id: crypto.randomUUID(),
              ip_address: expiredIP,
              reason,
              blocked_at: new Date(Date.now() - msOffset - 1000).toISOString(),
              blocked_by: null,
              expires_at: new Date(Date.now() - msOffset).toISOString(), // Expired
              is_active: true,
            };

            // Create an active block
            const activeBlock: BlockedIP = {
              id: crypto.randomUUID(),
              ip_address: activeIP,
              reason,
              blocked_at: new Date().toISOString(),
              blocked_by: null,
              expires_at: new Date(Date.now() + msOffset).toISOString(), // Not expired
              is_active: true,
            };

            const blockedIPs: BlockedIP[] = [expiredBlock, activeBlock];

            // Expired IP should not be blocked
            const expiredResult = isBlockedSync(expiredIP, blockedIPs);
            expect(expiredResult.blocked).toBe(false);

            // Active IP should be blocked
            const activeResult = isBlockedSync(activeIP, blockedIPs);
            expect(activeResult.blocked).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('IP Address Validation Properties', () => {
    /**
     * Property: Valid IPv4 addresses should pass validation
     */
    it('should accept valid IPv4 addresses', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          (ipAddress) => {
            expect(isValidIPAddress(ipAddress)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Invalid IP addresses should fail validation
     */
    it('should reject invalid IP addresses', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
            // Filter out strings that look like valid IPs
            const parts = s.split('.');
            if (parts.length !== 4) return true;
            return parts.some(p => {
              const num = parseInt(p, 10);
              return isNaN(num) || num < 0 || num > 255 || p !== num.toString();
            });
          }),
          (invalidIP) => {
            expect(isValidIPAddress(invalidIP)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty or null values should fail validation
     */
    it('should reject empty or null IP addresses', () => {
      expect(isValidIPAddress('')).toBe(false);
      expect(isValidIPAddress(null as unknown as string)).toBe(false);
      expect(isValidIPAddress(undefined as unknown as string)).toBe(false);
    });

    /**
     * Property: IP addresses with out-of-range octets should fail
     */
    it('should reject IP addresses with invalid octets', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 256, max: 999 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ),
          ([a, b, c, d]) => {
            const invalidIP = `${a}.${b}.${c}.${d}`;
            expect(isValidIPAddress(invalidIP)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('IP Normalization Properties', () => {
    /**
     * Property: Normalized IPs should be valid
     */
    it('should produce valid normalized IPs', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          (ipAddress) => {
            const normalized = normalizeIPAddress(ipAddress);
            expect(isValidIPAddress(normalized)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Normalization should remove leading zeros
     */
    it('should remove leading zeros from octets', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ),
          ([a, b, c, d]) => {
            // Create IP with leading zeros
            const paddedIP = `${a.toString().padStart(3, '0')}.${b.toString().padStart(3, '0')}.${c.toString().padStart(3, '0')}.${d.toString().padStart(3, '0')}`;
            const normalized = normalizeIPAddress(paddedIP);
            const expected = `${a}.${b}.${c}.${d}`;
            expect(normalized).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Normalization should be idempotent
     */
    it('should be idempotent', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          (ipAddress) => {
            const normalized1 = normalizeIPAddress(ipAddress);
            const normalized2 = normalizeIPAddress(normalized1);
            expect(normalized1).toBe(normalized2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CIDR Range Properties', () => {
    /**
     * Property: IP should be in its own /32 range
     */
    it('should match IP in its own /32 range', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          (ipAddress) => {
            const cidr = `${ipAddress}/32`;
            expect(isIPInRange(ipAddress, cidr)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: All IPs should be in 0.0.0.0/0 range
     */
    it('should match all IPs in 0.0.0.0/0 range', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          (ipAddress) => {
            expect(isIPInRange(ipAddress, '0.0.0.0/0')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: IPs in same /24 subnet should match
     */
    it('should match IPs in same /24 subnet', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          ([a, b, c], d1, d2) => {
            const ip1 = `${a}.${b}.${c}.${d1}`;
            const cidr = `${a}.${b}.${c}.0/24`;
            expect(isIPInRange(ip1, cidr)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: IPs in different /24 subnets should not match
     */
    it('should not match IPs in different /24 subnets', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 254 }) // Leave room for different subnet
          ),
          fc.integer({ min: 0, max: 255 }),
          ([a, b, c], d) => {
            const ip = `${a}.${b}.${c}.${d}`;
            const differentSubnet = `${a}.${b}.${c + 1}.0/24`;
            expect(isIPInRange(ip, differentSubnet)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    /**
     * Property: Empty block list should not block any IP
     */
    it('should not block any IP with empty block list', () => {
      fc.assert(
        fc.property(
          ipv4Arb,
          (ipAddress) => {
            const result = isBlockedSync(ipAddress, []);
            expect(result.blocked).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Invalid IP should not be blocked
     */
    it('should not block invalid IP addresses', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !isValidIPAddress(s)),
          ipv4Arb,
          blockReasonArb,
          (invalidIP, validIP, reason) => {
            const blockRecord = createBlockRecord({ ipAddress: validIP, reason });
            const blockedIPs: BlockedIP[] = [blockRecord];

            const result = isBlockedSync(invalidIP, blockedIPs);
            expect(result.blocked).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
