/**
 * Property-Based Tests for User Activity Utils (v0.13.1)
 * 
 * Property 6: Filter Correctness
 * Property 8: Resource Navigation URL Generation
 * Validates: Requirements 10.4, 11.5, 12.4, 12.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getResourceUrl,
  getActionTypeLabel,
  getResourceTypeLabel,
  getDateRangeFilter,
} from '@/lib/user-activity-utils';
import type { ResourceType, ActionType } from '@/types/activity';

describe('Feature: v0.13.1-user-activity-tracking, Property 8: Resource Navigation URL Generation', () => {
  const resourceTypes: ResourceType[] = [
    'customer',
    'pjo',
    'job_order',
    'invoice',
    'disbursement',
    'employee',
    'project',
    'quotation',
  ];

  const expectedUrlPatterns: Record<ResourceType, string> = {
    customer: '/customers/',
    pjo: '/proforma-jo/',
    job_order: '/job-orders/',
    invoice: '/invoices/',
    disbursement: '/disbursements/',
    employee: '/hr/employees/',
    project: '/projects/',
    quotation: '/quotations/',
  };

  it('should generate correct URL pattern for any resource type and ID', () => {
    /**
     * Validates: Requirements 11.5
     * For any activity with a resource_type and resource_id, the generated
     * navigation URL SHALL follow the correct pattern.
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...resourceTypes),
        fc.uuid(),
        (resourceType, resourceId) => {
          const url = getResourceUrl(resourceType, resourceId);
          
          expect(url).not.toBeNull();
          expect(url).toBe(`${expectedUrlPatterns[resourceType]}${resourceId}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null for null resource type', () => {
    /**
     * Validates: Requirements 11.5
     * If resource_type is null, URL should be null.
     */
    fc.assert(
      fc.property(fc.uuid(), (resourceId) => {
        const url = getResourceUrl(null, resourceId);
        expect(url).toBeNull();
      }),
      { numRuns: 50 }
    );
  });

  it('should return null for null resource ID', () => {
    /**
     * Validates: Requirements 11.5
     * If resource_id is null, URL should be null.
     */
    fc.assert(
      fc.property(fc.constantFrom(...resourceTypes), (resourceType) => {
        const url = getResourceUrl(resourceType, null);
        expect(url).toBeNull();
      }),
      { numRuns: 50 }
    );
  });
});

describe('Feature: v0.13.1-user-activity-tracking, Property 6: Filter Correctness', () => {
  const actionTypes: ActionType[] = [
    'page_view',
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'approve',
    'reject',
  ];

  it('should return human-readable label for any action type', () => {
    /**
     * Validates: Requirements 12.2
     * Action type filter should have readable labels.
     */
    fc.assert(
      fc.property(fc.constantFrom(...actionTypes), (actionType) => {
        const label = getActionTypeLabel(actionType);
        
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 }
    );
  });

  it('should return human-readable label for any resource type', () => {
    /**
     * Validates: Requirements 12.1
     * Resource type should have readable labels.
     */
    const resourceTypes: ResourceType[] = [
      'customer',
      'pjo',
      'job_order',
      'invoice',
      'disbursement',
      'employee',
    ];

    fc.assert(
      fc.property(fc.constantFrom(...resourceTypes), (resourceType) => {
        const label = getResourceTypeLabel(resourceType);
        
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 }
    );
  });

  it('should calculate correct date range for today filter', () => {
    /**
     * Validates: Requirements 12.3
     * Date range filter should calculate correct boundaries.
     */
    const { start, end } = getDateRangeFilter('today');
    const now = new Date();
    
    // Start should be beginning of today
    expect(start.getDate()).toBe(now.getDate());
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    
    // End should be end of today
    expect(end.getDate()).toBe(now.getDate());
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('should calculate correct date range for last 7 days filter', () => {
    /**
     * Validates: Requirements 12.3
     * Date range filter should calculate correct boundaries.
     */
    const { start, end } = getDateRangeFilter('last_7_days');
    const now = new Date();
    
    // Start should be 7 days ago
    const expectedStart = new Date(now);
    expectedStart.setDate(expectedStart.getDate() - 7);
    
    expect(start.getDate()).toBe(expectedStart.getDate());
    expect(start.getHours()).toBe(0);
    
    // End should be end of today
    expect(end.getDate()).toBe(now.getDate());
    expect(end.getHours()).toBe(23);
  });

  it('should calculate correct date range for last 30 days filter', () => {
    /**
     * Validates: Requirements 12.3
     * Date range filter should calculate correct boundaries.
     */
    const { start, end } = getDateRangeFilter('last_30_days');
    const now = new Date();
    
    // Start should be 30 days ago
    const expectedStart = new Date(now);
    expectedStart.setDate(expectedStart.getDate() - 30);
    
    expect(start.getDate()).toBe(expectedStart.getDate());
    expect(start.getHours()).toBe(0);
    
    // End should be end of today
    expect(end.getDate()).toBe(now.getDate());
    expect(end.getHours()).toBe(23);
  });
});
