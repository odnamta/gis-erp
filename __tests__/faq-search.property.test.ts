/**
 * FAQ Search Property Tests
 * v0.38.1: Help Center Enhancement
 * 
 * Property-based tests using fast-check to validate universal correctness properties
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterFAQsByQuery } from '@/components/help-center/faq-search';
import { groupFAQsByCategory } from '@/lib/help-center-utils';
import { HelpFAQ, HelpArticleCategory, HELP_ARTICLE_CATEGORIES } from '@/types/help-center';

// Arbitrary for generating valid FAQ categories
const faqCategoryArb = fc.constantFrom<HelpArticleCategory>(...HELP_ARTICLE_CATEGORIES);

// Arbitrary for generating valid HelpFAQ objects
const helpFAQArb = fc.record({
  id: fc.uuid(),
  question: fc.string({ minLength: 1, maxLength: 200 }),
  answer: fc.string({ minLength: 1, maxLength: 500 }),
  category: faqCategoryArb,
  applicableRoles: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  displayOrder: fc.integer({ min: 1, max: 100 }),
  createdAt: fc.constant('2026-01-26T00:00:00Z'),
});

// Arbitrary for generating arrays of FAQs
const faqArrayArb = fc.array(helpFAQArb, { minLength: 0, maxLength: 50 });

// Arbitrary for generating non-empty search queries
const searchQueryArb = fc.string({ minLength: 1, maxLength: 50 });

describe('FAQ Search Property Tests', () => {
  /**
   * Property 1: FAQ Search Filter Correctness
   * 
   * For any non-empty search query and any FAQ item returned by the filter,
   * the item's question or answer SHALL contain the search query (case-insensitive match).
   * 
   * Validates: Requirements 4.2
   */
  describe('Property 1: FAQ Search Filter Correctness', () => {
    it('every returned FAQ should contain the search query in question or answer', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          searchQueryArb,
          (faqs, query) => {
            const trimmedQuery = query.trim();
            if (!trimmedQuery) return true; // Skip empty queries
            
            const results = filterFAQsByQuery(faqs, query);
            const lowerQuery = trimmedQuery.toLowerCase();
            
            // Every result must contain the query in question or answer
            return results.every(faq => 
              faq.question.toLowerCase().includes(lowerQuery) ||
              faq.answer.toLowerCase().includes(lowerQuery)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not return FAQs that do not match the query', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          searchQueryArb,
          (faqs, query) => {
            const trimmedQuery = query.trim();
            if (!trimmedQuery) return true;
            
            const results = filterFAQsByQuery(faqs, query);
            const lowerQuery = trimmedQuery.toLowerCase();
            
            // Count FAQs that should match
            const expectedMatches = faqs.filter(faq =>
              faq.question.toLowerCase().includes(lowerQuery) ||
              faq.answer.toLowerCase().includes(lowerQuery)
            );
            
            // Results should equal expected matches
            return results.length === expectedMatches.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Category Grouping Completeness
   * 
   * For any call to display FAQs grouped by category, every FAQ in the input
   * SHALL appear exactly once in the grouped result.
   * 
   * Validates: Requirements 1.2
   */
  describe('Property 2: Category Grouping Completeness', () => {
    it('grouping should preserve all FAQs (no items lost)', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          (faqs) => {
            const grouped = groupFAQsByCategory(faqs);
            
            // Count total items in grouped result
            let totalGrouped = 0;
            for (const category of HELP_ARTICLE_CATEGORIES) {
              totalGrouped += grouped[category].length;
            }
            
            // Total should equal input length
            return totalGrouped === faqs.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('every FAQ should appear in exactly one category group', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          (faqs) => {
            const grouped = groupFAQsByCategory(faqs);
            
            // Collect all IDs from grouped result
            const groupedIds: string[] = [];
            for (const category of HELP_ARTICLE_CATEGORIES) {
              for (const faq of grouped[category]) {
                groupedIds.push(faq.id);
              }
            }
            
            // Every input FAQ ID should appear exactly once
            const inputIds = faqs.map(f => f.id);
            
            // Check same length (no duplicates or missing)
            if (groupedIds.length !== inputIds.length) return false;
            
            // Check all input IDs are present
            return inputIds.every(id => groupedIds.includes(id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('FAQs should be grouped into their correct category', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          (faqs) => {
            const grouped = groupFAQsByCategory(faqs);
            
            // Every FAQ in a category group should have that category
            for (const category of HELP_ARTICLE_CATEGORIES) {
              for (const faq of grouped[category]) {
                if (faq.category !== category) return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Empty Query Returns All
   * 
   * When the search query is empty or whitespace-only,
   * all FAQs should be returned unchanged.
   */
  describe('Property: Empty Query Returns All', () => {
    it('empty query should return all FAQs', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          (faqs) => {
            const results = filterFAQsByQuery(faqs, '');
            return results.length === faqs.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('whitespace-only query should return all FAQs', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          fc.array(fc.constant(' '), { minLength: 1, maxLength: 10 }).map(arr => arr.join('')),
          (faqs, whitespace) => {
            const results = filterFAQsByQuery(faqs, whitespace);
            return results.length === faqs.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Filter Idempotence
   * 
   * Filtering with the same query twice should produce the same result.
   */
  describe('Property: Filter Idempotence', () => {
    it('filtering twice with same query should produce same result', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          searchQueryArb,
          (faqs, query) => {
            const result1 = filterFAQsByQuery(faqs, query);
            const result2 = filterFAQsByQuery(faqs, query);
            
            if (result1.length !== result2.length) return false;
            
            return result1.every((faq, index) => faq.id === result2[index].id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Case Insensitivity
   * 
   * Search should be case-insensitive - same query in different cases
   * should return the same results.
   */
  describe('Property: Case Insensitivity', () => {
    it('uppercase and lowercase queries should return same results', () => {
      fc.assert(
        fc.property(
          faqArrayArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          (faqs, query) => {
            const lowerResults = filterFAQsByQuery(faqs, query.toLowerCase());
            const upperResults = filterFAQsByQuery(faqs, query.toUpperCase());
            
            if (lowerResults.length !== upperResults.length) return false;
            
            const lowerIds = lowerResults.map(f => f.id).sort();
            const upperIds = upperResults.map(f => f.id).sort();
            
            return lowerIds.every((id, index) => id === upperIds[index]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
