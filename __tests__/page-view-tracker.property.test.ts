/**
 * Property-Based Tests for Page View Tracker (v0.13.1)
 * 
 * Property 3: Page View Rate Limiting
 * Property 4: Page View Exclusion
 * Validates: Requirements 3.2, 3.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  shouldLogPageView,
  shouldExcludePath,
  clearPageViewCache,
  EXCLUDED_PATHS,
} from '@/lib/page-view-tracker';

describe('Feature: v0.13.1-user-activity-tracking, Property 3: Page View Rate Limiting', () => {
  beforeEach(() => {
    clearPageViewCache();
  });

  // Arbitraries for generating test data
  const userIdArb = fc.uuid();
  const pagePathArb = fc.stringMatching(/^\/[a-z0-9\-\/]{1,50}$/);

  it('should allow first page view for any user-page combination', () => {
    /**
     * Validates: Requirements 3.3
     * The first page view for any user-page combination should always be logged.
     */
    fc.assert(
      fc.property(userIdArb, pagePathArb, (userId, pagePath) => {
        clearPageViewCache();
        const result = shouldLogPageView(userId, pagePath);
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should rate limit repeated page views within 60 seconds', () => {
    /**
     * Validates: Requirements 3.3
     * For any user visiting the same page path multiple times within a 60-second window,
     * the system SHALL log at most one page_view activity.
     */
    fc.assert(
      fc.property(userIdArb, pagePathArb, (userId, pagePath) => {
        clearPageViewCache();
        
        // First view should be allowed
        const first = shouldLogPageView(userId, pagePath);
        expect(first).toBe(true);
        
        // Immediate second view should be rate limited
        const second = shouldLogPageView(userId, pagePath);
        expect(second).toBe(false);
        
        // Third view should also be rate limited
        const third = shouldLogPageView(userId, pagePath);
        expect(third).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should allow different pages for the same user', () => {
    /**
     * Validates: Requirements 3.3
     * Different pages should be tracked independently for the same user.
     */
    fc.assert(
      fc.property(
        userIdArb,
        fc.tuple(pagePathArb, pagePathArb).filter(([a, b]) => a !== b),
        (userId, [page1, page2]) => {
          clearPageViewCache();
          
          // First page should be allowed
          const first = shouldLogPageView(userId, page1);
          expect(first).toBe(true);
          
          // Different page should also be allowed
          const second = shouldLogPageView(userId, page2);
          expect(second).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow same page for different users', () => {
    /**
     * Validates: Requirements 3.3
     * Same page should be tracked independently for different users.
     */
    fc.assert(
      fc.property(
        fc.tuple(userIdArb, userIdArb).filter(([a, b]) => a !== b),
        pagePathArb,
        ([user1, user2], pagePath) => {
          clearPageViewCache();
          
          // First user should be allowed
          const first = shouldLogPageView(user1, pagePath);
          expect(first).toBe(true);
          
          // Different user should also be allowed
          const second = shouldLogPageView(user2, pagePath);
          expect(second).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: v0.13.1-user-activity-tracking, Property 4: Page View Exclusion', () => {
  it('should exclude all paths starting with excluded prefixes', () => {
    /**
     * Validates: Requirements 3.2
     * For any request to a path matching the exclusion patterns,
     * the system SHALL NOT log a page_view activity.
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...EXCLUDED_PATHS),
        fc.stringMatching(/^[a-z0-9\-\/]{0,20}$/),
        (excludedPrefix, suffix) => {
          const path = `${excludedPrefix}${suffix}`;
          const result = shouldExcludePath(path);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not exclude valid application paths', () => {
    /**
     * Validates: Requirements 3.2
     * Valid application paths should NOT be excluded.
     */
    const validPaths = [
      '/dashboard',
      '/customers',
      '/proforma-jo',
      '/job-orders',
      '/invoices',
      '/settings/activity',
      '/hr/employees',
    ];

    fc.assert(
      fc.property(fc.constantFrom(...validPaths), (path) => {
        const result = shouldExcludePath(path);
        expect(result).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it('should exclude /_next paths', () => {
    /**
     * Validates: Requirements 3.2
     * Static asset paths should be excluded.
     */
    fc.assert(
      fc.property(
        fc.stringMatching(/^\/_next\/[a-z0-9\-\/]{1,30}$/),
        (path) => {
          const result = shouldExcludePath(path);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should exclude /api paths', () => {
    /**
     * Validates: Requirements 3.2
     * API routes should be excluded.
     */
    fc.assert(
      fc.property(
        fc.stringMatching(/^\/api\/[a-z0-9\-\/]{1,30}$/),
        (path) => {
          const result = shouldExcludePath(path);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});
