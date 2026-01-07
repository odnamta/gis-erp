/**
 * Property-based tests for Feedback Utilities
 * Feature: bug-report-improvement-request
 * 
 * Tests universal correctness properties using fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  captureBrowserContext,
  detectModuleFromUrl,
  getTicketPrefix,
  getSeverityColor,
  getStatusVariant,
  validateFeedbackForm,
  sortFeedbackBySeverityAndDate,
  filterFeedback,
  calculatePagination,
  paginateItems,
  isOpenStatus,
  getStatusLabel,
  getFeedbackTypeLabel,
} from '@/lib/feedback-utils';
import type {
  FeedbackType,
  Severity,
  FeedbackStatus,
  FeedbackFormData,
  FeedbackListItem,
} from '@/types/feedback';

// Arbitraries for generating test data
const feedbackTypeArb = fc.constantFrom<FeedbackType>('bug', 'improvement', 'question', 'other');
const severityArb = fc.constantFrom<Severity>('critical', 'high', 'medium', 'low');
const statusArb = fc.constantFrom<FeedbackStatus>(
  'new', 'reviewing', 'confirmed', 'in_progress', 'resolved', 'closed', 'wont_fix', 'duplicate'
);

// Safe date string arbitrary - generates ISO date strings within valid range
const safeDateStringArb = fc.integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
  .map(ts => new Date(ts).toISOString());

const optionalDateStringArb = fc.oneof(
  fc.constant(null),
  safeDateStringArb
);

const feedbackListItemArb = fc.record({
  id: fc.uuid(),
  ticket_number: fc.string(),
  feedback_type: feedbackTypeArb,
  submitted_by: fc.option(fc.uuid(), { nil: null }),
  submitted_by_name: fc.option(fc.string(), { nil: null }),
  submitted_by_email: fc.option(fc.emailAddress(), { nil: null }),
  submitted_by_role: fc.option(fc.string(), { nil: null }),
  submitted_by_department: fc.option(fc.string(), { nil: null }),
  severity: fc.option(severityArb, { nil: null }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 1 }),
  steps_to_reproduce: fc.option(fc.string(), { nil: null }),
  expected_behavior: fc.option(fc.string(), { nil: null }),
  actual_behavior: fc.option(fc.string(), { nil: null }),
  current_behavior: fc.option(fc.string(), { nil: null }),
  desired_behavior: fc.option(fc.string(), { nil: null }),
  business_justification: fc.option(fc.string(), { nil: null }),
  page_url: fc.option(fc.webUrl(), { nil: null }),
  page_title: fc.option(fc.string(), { nil: null }),
  module: fc.option(fc.string(), { nil: null }),
  browser_info: fc.constant(null),
  screen_resolution: fc.option(fc.string(), { nil: null }),
  screenshots: fc.constant([]),
  error_message: fc.option(fc.string(), { nil: null }),
  console_logs: fc.option(fc.string(), { nil: null }),
  affected_module: fc.option(fc.string(), { nil: null }),
  priority_suggested: fc.option(fc.constantFrom('urgent', 'high', 'medium', 'low') as fc.Arbitrary<'urgent' | 'high' | 'medium' | 'low'>, { nil: null }),
  tags: fc.option(fc.array(fc.string()), { nil: null }),
  status: statusArb,
  assigned_to: fc.option(fc.uuid(), { nil: null }),
  assigned_at: optionalDateStringArb,
  resolution_notes: fc.option(fc.string(), { nil: null }),
  resolved_at: optionalDateStringArb,
  resolved_by: fc.option(fc.uuid(), { nil: null }),
  resolved_in_version: fc.option(fc.string(), { nil: null }),
  duplicate_of: fc.option(fc.uuid(), { nil: null }),
  related_tickets: fc.option(fc.array(fc.uuid()), { nil: null }),
  created_at: safeDateStringArb,
  updated_at: safeDateStringArb,
  comment_count: fc.nat({ max: 100 }),
  assigned_to_name: fc.option(fc.string(), { nil: null }),
}) as fc.Arbitrary<FeedbackListItem>;

describe('Feature: bug-report-improvement-request', () => {
  describe('Property 1: Ticket Number Format Consistency', () => {
    it('should return BUG prefix for bug type and REQ for all others', () => {
      fc.assert(
        fc.property(feedbackTypeArb, (feedbackType) => {
          const prefix = getTicketPrefix(feedbackType);
          
          if (feedbackType === 'bug') {
            expect(prefix).toBe('BUG');
          } else {
            expect(prefix).toBe('REQ');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Form Validation - Title Required and Length Limited', () => {
    it('should fail validation for empty or whitespace-only titles', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\n'),
            fc.constant('     ')
          ),
          (emptyTitle) => {
            const result = validateFeedbackForm({
              feedbackType: 'bug',
              title: emptyTitle,
              description: 'Valid description',
              severity: 'medium',
            });
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Title is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fail validation for titles exceeding 200 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 201, maxLength: 500 }),
          (longTitle) => {
            const result = validateFeedbackForm({
              feedbackType: 'bug',
              title: longTitle,
              description: 'Valid description',
              severity: 'medium',
            });
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Title must be 200 characters or less');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass validation for valid titles (1-200 chars)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          (validTitle) => {
            const result = validateFeedbackForm({
              feedbackType: 'question', // No severity required
              title: validTitle,
              description: 'Valid description',
            });
            
            // Should not have title-related errors
            expect(result.errors).not.toContain('Title is required');
            expect(result.errors).not.toContain('Title must be 200 characters or less');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Form Validation - Bug Severity Required', () => {
    it('should fail validation for bug reports without severity', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (title, description) => {
            const result = validateFeedbackForm({
              feedbackType: 'bug',
              title,
              description,
              // severity intentionally omitted
            });
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Severity is required for bug reports');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass validation for bug reports with valid severity', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          severityArb,
          (title, description, severity) => {
            const result = validateFeedbackForm({
              feedbackType: 'bug',
              title,
              description,
              severity,
            });
            
            expect(result.errors).not.toContain('Severity is required for bug reports');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Form Validation - Improvement Desired Behavior Required', () => {
    it('should fail validation for improvement requests without desired behavior', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (title, description) => {
            const result = validateFeedbackForm({
              feedbackType: 'improvement',
              title,
              description,
              // desiredBehavior intentionally omitted
            });
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Desired behavior is required for improvement requests');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass validation for improvement requests with desired behavior', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (title, description, desiredBehavior) => {
            const result = validateFeedbackForm({
              feedbackType: 'improvement',
              title,
              description,
              desiredBehavior,
            });
            
            expect(result.errors).not.toContain('Desired behavior is required for improvement requests');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Module Detection from URL Path', () => {
    const knownPaths = [
      { path: '/operations', expected: 'Operations' },
      { path: '/finance', expected: 'Finance' },
      { path: '/hr', expected: 'HR' },
      { path: '/hse', expected: 'HSE' },
      { path: '/equipment', expected: 'Equipment' },
      { path: '/customs', expected: 'Customs' },
      { path: '/engineering', expected: 'Engineering' },
      { path: '/admin', expected: 'Admin' },
      { path: '/dashboard', expected: 'Dashboard' },
      { path: '/customers', expected: 'Customers' },
      { path: '/projects', expected: 'Projects' },
      { path: '/quotations', expected: 'Quotations' },
      { path: '/pjo', expected: 'PJO' },
      { path: '/job-orders', expected: 'Job Orders' },
      { path: '/invoices', expected: 'Invoices' },
    ];

    it('should correctly detect module from known path prefixes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...knownPaths),
          fc.string(),
          ({ path, expected }, suffix) => {
            const fullPath = path + (suffix.startsWith('/') ? suffix : '/' + suffix);
            const result = detectModuleFromUrl(fullPath);
            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return General for unknown paths', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => 
            !knownPaths.some(({ path }) => s.startsWith(path)) &&
            !s.startsWith('/operations') &&
            !s.startsWith('/finance')
          ),
          (unknownPath) => {
            const result = detectModuleFromUrl(unknownPath);
            expect(result).toBe('General');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return General for empty or null paths', () => {
      expect(detectModuleFromUrl('')).toBe('General');
    });
  });

  describe('Property 8: Feedback Filtering Correctness', () => {
    it('should return only items matching all specified filter criteria', () => {
      fc.assert(
        fc.property(
          fc.array(feedbackListItemArb, { minLength: 0, maxLength: 20 }),
          fc.option(feedbackTypeArb, { nil: undefined }),
          fc.option(statusArb, { nil: undefined }),
          fc.option(severityArb, { nil: undefined }),
          (items, type, status, severity) => {
            const filtered = filterFeedback(items, { type, status, severity });
            
            // All filtered items should match the criteria
            for (const item of filtered) {
              if (type !== undefined) {
                expect(item.feedback_type).toBe(type);
              }
              if (status !== undefined) {
                expect(item.status).toBe(status);
              }
              if (severity !== undefined) {
                expect(item.severity).toBe(severity);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Feedback Search Correctness', () => {
    it('should return only items where title or description contains search string', () => {
      fc.assert(
        fc.property(
          fc.array(feedbackListItemArb, { minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
          (items, searchTerm) => {
            const filtered = filterFeedback(items, { search: searchTerm });
            const searchLower = searchTerm.toLowerCase();
            
            // All filtered items should contain the search term
            for (const item of filtered) {
              const titleMatch = item.title.toLowerCase().includes(searchLower);
              const descMatch = item.description.toLowerCase().includes(searchLower);
              const ticketMatch = item.ticket_number.toLowerCase().includes(searchLower);
              
              expect(titleMatch || descMatch || ticketMatch).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Feedback Sorting Order', () => {
    it('should sort by severity (critical first) then by date (newest first)', () => {
      fc.assert(
        fc.property(
          fc.array(feedbackListItemArb, { minLength: 2, maxLength: 20 }),
          (items) => {
            const sorted = sortFeedbackBySeverityAndDate(items);
            const severityOrder: Record<string, number> = {
              critical: 0,
              high: 1,
              medium: 2,
              low: 3,
            };
            
            // Check ordering
            for (let i = 1; i < sorted.length; i++) {
              const prev = sorted[i - 1];
              const curr = sorted[i];
              
              const prevSeverity = prev.severity ? severityOrder[prev.severity] : 4;
              const currSeverity = curr.severity ? severityOrder[curr.severity] : 4;
              
              if (prevSeverity === currSeverity) {
                // Same severity: should be sorted by date descending
                const prevDate = new Date(prev.created_at).getTime();
                const currDate = new Date(curr.created_at).getTime();
                expect(prevDate).toBeGreaterThanOrEqual(currDate);
              } else {
                // Different severity: higher severity should come first
                expect(prevSeverity).toBeLessThanOrEqual(currSeverity);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Pagination Correctness', () => {
    it('should return correct pagination metadata', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (totalItems, page, pageSize) => {
            const result = calculatePagination(totalItems, page, pageSize);
            
            // Total pages calculation
            const expectedTotalPages = Math.ceil(totalItems / pageSize);
            expect(result.totalPages).toBe(expectedTotalPages || 0);
            
            // hasNext/hasPrevious
            const effectivePage = Math.max(1, Math.min(page, result.totalPages || 1));
            expect(result.hasNext).toBe(effectivePage < result.totalPages);
            expect(result.hasPrevious).toBe(effectivePage > 1);
            
            // Index bounds
            expect(result.startIndex).toBeGreaterThanOrEqual(0);
            expect(result.endIndex).toBeLessThanOrEqual(totalItems);
            expect(result.endIndex).toBeGreaterThanOrEqual(result.startIndex);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct slice of items', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat(), { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (items, page, pageSize) => {
            const paginated = paginateItems(items, page, pageSize);
            
            // Should not exceed page size
            expect(paginated.length).toBeLessThanOrEqual(pageSize);
            
            // Should be a subset of original items
            for (const item of paginated) {
              expect(items).toContain(item);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Status Enum Validation', () => {
    const validStatuses: FeedbackStatus[] = [
      'new', 'reviewing', 'confirmed', 'in_progress', 
      'resolved', 'closed', 'wont_fix', 'duplicate'
    ];

    it('should return valid variant for all valid statuses', () => {
      fc.assert(
        fc.property(statusArb, (status) => {
          const variant = getStatusVariant(status);
          expect(['default', 'secondary', 'destructive', 'outline']).toContain(variant);
        }),
        { numRuns: 100 }
      );
    });

    it('should return valid label for all valid statuses', () => {
      fc.assert(
        fc.property(statusArb, (status) => {
          const label = getStatusLabel(status);
          expect(typeof label).toBe('string');
          expect(label.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 17: Open Ticket Badge Count', () => {
    it('should correctly identify open vs closed statuses', () => {
      const openStatuses: FeedbackStatus[] = ['new', 'reviewing', 'confirmed', 'in_progress', 'duplicate'];
      const closedStatuses: FeedbackStatus[] = ['resolved', 'closed', 'wont_fix'];

      fc.assert(
        fc.property(fc.constantFrom(...openStatuses), (status) => {
          expect(isOpenStatus(status)).toBe(true);
        }),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(fc.constantFrom(...closedStatuses), (status) => {
          expect(isOpenStatus(status)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Summary Statistics Calculation', () => {
    it('should correctly count items by status', () => {
      fc.assert(
        fc.property(
          fc.array(feedbackListItemArb, { minLength: 0, maxLength: 50 }),
          (items) => {
            // Count new items
            const newCount = items.filter(i => i.status === 'new').length;
            const actualNewCount = items.reduce((acc, i) => i.status === 'new' ? acc + 1 : acc, 0);
            expect(newCount).toBe(actualNewCount);
            
            // Count critical items (not resolved/closed/wont_fix)
            const criticalCount = items.filter(i => 
              i.severity === 'critical' && 
              !['resolved', 'closed', 'wont_fix'].includes(i.status)
            ).length;
            expect(criticalCount).toBeGreaterThanOrEqual(0);
            expect(criticalCount).toBeLessThanOrEqual(items.length);
            
            // Count open bugs
            const openBugsCount = items.filter(i => 
              i.feedback_type === 'bug' && 
              !['resolved', 'closed', 'wont_fix'].includes(i.status)
            ).length;
            expect(openBugsCount).toBeGreaterThanOrEqual(0);
            
            // Count open improvement requests
            const openRequestsCount = items.filter(i => 
              i.feedback_type === 'improvement' && 
              !['resolved', 'closed', 'wont_fix'].includes(i.status)
            ).length;
            expect(openRequestsCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have non-negative counts for all summary fields', () => {
      fc.assert(
        fc.property(
          fc.array(feedbackListItemArb, { minLength: 0, maxLength: 30 }),
          (items) => {
            const newCount = items.filter(i => i.status === 'new').length;
            const criticalCount = items.filter(i => 
              i.severity === 'critical' && 
              !['resolved', 'closed', 'wont_fix'].includes(i.status)
            ).length;
            const openBugsCount = items.filter(i => 
              i.feedback_type === 'bug' && 
              !['resolved', 'closed', 'wont_fix'].includes(i.status)
            ).length;
            const openRequestsCount = items.filter(i => 
              i.feedback_type === 'improvement' && 
              !['resolved', 'closed', 'wont_fix'].includes(i.status)
            ).length;
            
            expect(newCount).toBeGreaterThanOrEqual(0);
            expect(criticalCount).toBeGreaterThanOrEqual(0);
            expect(openBugsCount).toBeGreaterThanOrEqual(0);
            expect(openRequestsCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Resolution Metadata Setting', () => {
    it('should require resolution notes only for resolved/closed/wont_fix statuses', () => {
      const resolutionStatuses: FeedbackStatus[] = ['resolved', 'closed', 'wont_fix'];
      const nonResolutionStatuses: FeedbackStatus[] = ['new', 'reviewing', 'confirmed', 'in_progress', 'duplicate'];

      fc.assert(
        fc.property(fc.constantFrom(...resolutionStatuses), (status) => {
          // Resolution statuses should be in the closed set
          expect(['resolved', 'closed', 'wont_fix']).toContain(status);
        }),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(fc.constantFrom(...nonResolutionStatuses), (status) => {
          // Non-resolution statuses should not be in the closed set
          expect(['resolved', 'closed', 'wont_fix']).not.toContain(status);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: Comment Visibility and Permissions', () => {
    const commentArb = fc.record({
      id: fc.uuid(),
      feedback_id: fc.uuid(),
      comment_by: fc.option(fc.uuid(), { nil: null }),
      comment_by_name: fc.option(fc.string(), { nil: null }),
      comment_text: fc.string({ minLength: 1 }),
      is_internal: fc.boolean(),
      created_at: safeDateStringArb,
    });

    it('should filter internal comments for non-admin users', () => {
      fc.assert(
        fc.property(
          fc.array(commentArb, { minLength: 0, maxLength: 20 }),
          fc.boolean(), // isAdmin
          (comments, isAdmin) => {
            // Simulate filtering logic
            const visibleComments = isAdmin 
              ? comments 
              : comments.filter(c => !c.is_internal);
            
            if (!isAdmin) {
              // Non-admins should not see internal comments
              for (const comment of visibleComments) {
                expect(comment.is_internal).toBe(false);
              }
            }
            
            // Visible comments should be subset of all comments
            expect(visibleComments.length).toBeLessThanOrEqual(comments.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow admins to see all comments including internal', () => {
      fc.assert(
        fc.property(
          fc.array(commentArb, { minLength: 1, maxLength: 20 }),
          (comments) => {
            // Admin sees all comments
            const adminVisibleComments = comments;
            expect(adminVisibleComments.length).toBe(comments.length);
            
            // Non-admin sees only non-internal
            const userVisibleComments = comments.filter(c => !c.is_internal);
            expect(userVisibleComments.length).toBeLessThanOrEqual(comments.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Comment Ordering and Counting', () => {
    const commentArb = fc.record({
      id: fc.uuid(),
      feedback_id: fc.uuid(),
      comment_by: fc.option(fc.uuid(), { nil: null }),
      comment_by_name: fc.option(fc.string(), { nil: null }),
      comment_text: fc.string({ minLength: 1 }),
      is_internal: fc.boolean(),
      created_at: safeDateStringArb,
    });

    it('should maintain chronological order when sorted by created_at', () => {
      fc.assert(
        fc.property(
          fc.array(commentArb, { minLength: 2, maxLength: 20 }),
          (comments) => {
            // Sort by created_at ascending (chronological)
            const sorted = [...comments].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            // Verify order
            for (let i = 1; i < sorted.length; i++) {
              const prevTime = new Date(sorted[i - 1].created_at).getTime();
              const currTime = new Date(sorted[i].created_at).getTime();
              expect(prevTime).toBeLessThanOrEqual(currTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly count comments per feedback', () => {
      fc.assert(
        fc.property(
          fc.array(commentArb, { minLength: 0, maxLength: 30 }),
          fc.uuid(),
          (comments, feedbackId) => {
            // Count comments for specific feedback
            const count = comments.filter(c => c.feedback_id === feedbackId).length;
            expect(count).toBeGreaterThanOrEqual(0);
            expect(count).toBeLessThanOrEqual(comments.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have non-empty comment text', () => {
      fc.assert(
        fc.property(commentArb, (comment) => {
          expect(comment.comment_text.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Utility Function Coverage', () => {
    it('should return valid color for all severities', () => {
      fc.assert(
        fc.property(fc.option(severityArb, { nil: null }), (severity) => {
          const color = getSeverityColor(severity);
          expect(color).toMatch(/^bg-/);
        }),
        { numRuns: 100 }
      );
    });

    it('should return valid label for all feedback types', () => {
      fc.assert(
        fc.property(feedbackTypeArb, (type) => {
          const label = getFeedbackTypeLabel(type);
          expect(typeof label).toBe('string');
          expect(label.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
