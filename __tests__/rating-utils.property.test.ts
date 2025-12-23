/**
 * Property-based tests for rating-utils.ts
 * Feature: v0.71-agency-shipping-line-agent-management
 * 
 * Tests Properties 9 and 10 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateRating,
  calculateAverageRating,
  calculateAverageFromArray,
  MIN_RATING,
  MAX_RATING,
  clampRating,
  ratingToStars,
  formatRating,
} from '@/lib/rating-utils';

// =====================================================
// GENERATORS
// =====================================================

const validRatingArb = fc.double({ min: MIN_RATING, max: MAX_RATING, noNaN: true });

const invalidRatingArb = fc.oneof(
  fc.double({ min: -100, max: MIN_RATING - 0.01, noNaN: true }),
  fc.double({ min: MAX_RATING + 0.01, max: 100, noNaN: true })
);

const ratingCountArb = fc.integer({ min: 0, max: 1000 });

const ratingsArrayArb = fc.array(validRatingArb, { minLength: 1, maxLength: 50 });

// =====================================================
// PROPERTY 9: RATING AVERAGE CALCULATION
// =====================================================

describe('Property 9: Rating Average Calculation', () => {
  /**
   * For any sequence of ratings submitted for an agent, the service_rating
   * SHALL equal the arithmetic mean of all submitted ratings, rounded to 2 decimal places.
   * Validates: Requirements 8.1
   */

  it('calculateAverageRating with no previous ratings returns the new rating', () => {
    fc.assert(
      fc.property(validRatingArb, (newRating) => {
        const result = calculateAverageRating(null, 0, newRating);
        expect(result).toBeCloseTo(Math.round(newRating * 100) / 100, 2);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('calculateAverageRating computes correct arithmetic mean', () => {
    fc.assert(
      fc.property(
        validRatingArb,
        ratingCountArb.filter(c => c > 0),
        validRatingArb,
        (currentRating, currentCount, newRating) => {
          const result = calculateAverageRating(currentRating, currentCount, newRating);
          
          // Calculate expected average
          const totalPrevious = currentRating * currentCount;
          const expectedAverage = (totalPrevious + newRating) / (currentCount + 1);
          const expectedRounded = Math.round(expectedAverage * 100) / 100;
          
          expect(result).toBeCloseTo(expectedRounded, 2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateAverageFromArray computes correct mean of all ratings', () => {
    fc.assert(
      fc.property(ratingsArrayArb, (ratings) => {
        const result = calculateAverageFromArray(ratings);
        
        const sum = ratings.reduce((acc, r) => acc + r, 0);
        const expectedAverage = sum / ratings.length;
        const expectedRounded = Math.round(expectedAverage * 100) / 100;
        
        expect(result).toBeCloseTo(expectedRounded, 2);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('calculateAverageFromArray returns 0 for empty array', () => {
    const result = calculateAverageFromArray([]);
    expect(result).toBe(0);
  });

  it('calculateAverageRating result is always within valid range', () => {
    fc.assert(
      fc.property(
        validRatingArb,
        ratingCountArb,
        validRatingArb,
        (currentRating, currentCount, newRating) => {
          const result = calculateAverageRating(
            currentCount > 0 ? currentRating : null,
            currentCount,
            newRating
          );
          
          expect(result).toBeGreaterThanOrEqual(MIN_RATING);
          expect(result).toBeLessThanOrEqual(MAX_RATING);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateAverageRating is rounded to 2 decimal places', () => {
    fc.assert(
      fc.property(
        validRatingArb,
        ratingCountArb.filter(c => c > 0),
        validRatingArb,
        (currentRating, currentCount, newRating) => {
          const result = calculateAverageRating(currentRating, currentCount, newRating);
          
          // Check that result has at most 2 decimal places
          const decimalPlaces = (result.toString().split('.')[1] || '').length;
          expect(decimalPlaces).toBeLessThanOrEqual(2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('adding same rating multiple times converges to that rating', () => {
    fc.assert(
      fc.property(
        validRatingArb,
        fc.integer({ min: 10, max: 100 }),
        (rating, iterations) => {
          let currentRating: number | null = null;
          let count = 0;
          
          for (let i = 0; i < iterations; i++) {
            currentRating = calculateAverageRating(currentRating, count, rating);
            count++;
          }
          
          // After many iterations of the same rating, average should be close to that rating
          expect(currentRating).toBeCloseTo(rating, 1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 10: RATING RANGE VALIDATION
// =====================================================

describe('Property 10: Rating Range Validation', () => {
  /**
   * For any rating value, the system SHALL only accept values between
   * 1.0 and 5.0 inclusive, and reject values outside this range.
   * Validates: Requirements 8.2
   */

  it('validateRating accepts all values between 1.0 and 5.0', () => {
    fc.assert(
      fc.property(validRatingArb, (rating) => {
        expect(validateRating(rating)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('validateRating rejects values below 1.0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 0.99, noNaN: true }),
        (rating) => {
          expect(validateRating(rating)).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateRating rejects values above 5.0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5.01, max: 100, noNaN: true }),
        (rating) => {
          expect(validateRating(rating)).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateRating accepts boundary values 1.0 and 5.0', () => {
    expect(validateRating(1.0)).toBe(true);
    expect(validateRating(5.0)).toBe(true);
  });

  it('validateRating rejects NaN', () => {
    expect(validateRating(NaN)).toBe(false);
  });

  it('calculateAverageRating throws for invalid new rating', () => {
    fc.assert(
      fc.property(invalidRatingArb, (invalidRating) => {
        expect(() => calculateAverageRating(null, 0, invalidRating)).toThrow();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('clampRating brings values into valid range', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 100, noNaN: true }),
        (rating) => {
          const clamped = clampRating(rating);
          expect(clamped).toBeGreaterThanOrEqual(MIN_RATING);
          expect(clamped).toBeLessThanOrEqual(MAX_RATING);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clampRating preserves valid ratings', () => {
    fc.assert(
      fc.property(validRatingArb, (rating) => {
        const clamped = clampRating(rating);
        expect(clamped).toBeCloseTo(rating, 5);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// ADDITIONAL RATING UTILITY TESTS
// =====================================================

describe('Rating Display Utilities', () => {
  it('ratingToStars returns correct number of stars', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (rating) => {
          const stars = ratingToStars(rating);
          const filledCount = (stars.match(/⭐/g) || []).length;
          expect(filledCount).toBe(rating);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ratingToStars returns 5 empty stars for null', () => {
    const stars = ratingToStars(null);
    expect(stars).toBe('☆☆☆☆☆');
  });

  it('formatRating returns N/A for null', () => {
    expect(formatRating(null)).toBe('N/A');
    expect(formatRating(undefined)).toBe('N/A');
  });

  it('formatRating returns correct format for valid ratings', () => {
    fc.assert(
      fc.property(validRatingArb, (rating) => {
        const formatted = formatRating(rating);
        expect(formatted).toMatch(/^\d+\.\d\/5$/);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
