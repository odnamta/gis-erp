/**
 * Property-Based Tests for Changelog Navigation
 * Task 5.5: Write property tests for navigation
 * 
 * Property 7: Navigation Visibility - verify menu visible for all roles
 * 
 * Validates: Requirements 5.2
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

vi.mock('@/lib/permissions-server', () => ({
  getUserProfile: vi.fn(() => Promise.resolve({ role: 'owner', roles: ['owner'], is_active: true })),
}));

vi.mock('@/lib/permissions', () => ({
  canAccessFeature: vi.fn(() => true),
}));
import { NAV_ITEMS, filterNavItems } from '@/lib/navigation';
import type { UserRole } from '@/types/permissions';

// All valid user roles in the system
const ALL_ROLES: UserRole[] = [
  'owner',
  'director',
  'marketing_manager',
  'finance_manager',
  'operations_manager',
  'sysadmin',
  'administration',
  'finance',
  'marketing',
  'ops',
  'engineer',
  'hr',
  'hse',
  'agency',
  'customs',
];

// Arbitrary for generating valid user roles
const roleArb = fc.constantFrom<UserRole>(...ALL_ROLES);

// Mock permissions object (empty - no special permissions)
const mockPermissions = {};

describe('Feature: v0.82-changelog-feature, Property 7: Navigation Visibility', () => {
  /**
   * **Validates: Requirements 5.2**
   * 
   * *For any* authenticated user with any role in the system, the "What's New" menu item
   * SHALL be visible in the navigation sidebar.
   */
  it('should show Help menu (containing What\'s New) for all authenticated users', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const filteredNav = filterNavItems(NAV_ITEMS, role, mockPermissions);
        
        // Find the Help menu item
        const helpItem = filteredNav.find(item => item.title === 'Help');
        
        // Help menu should be visible for all roles
        expect(helpItem).toBeDefined();
        expect(helpItem?.href).toBe('/help/tours');
      }),
      { numRuns: 100 }
    );
  });

  it('should include What\'s New as a child of Help menu for all roles', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const filteredNav = filterNavItems(NAV_ITEMS, role, mockPermissions);
        
        // Find the Help menu item
        const helpItem = filteredNav.find(item => item.title === 'Help');
        
        // Help menu should have children
        expect(helpItem?.children).toBeDefined();
        expect(helpItem?.children?.length).toBeGreaterThan(0);
        
        // What's New should be in the children
        const whatsNewItem = helpItem?.children?.find(child => child.title === "What's New");
        expect(whatsNewItem).toBeDefined();
        expect(whatsNewItem?.href).toBe('/changelog');
      }),
      { numRuns: 100 }
    );
  });

  it('should have correct href for What\'s New menu item', () => {
    // Check that the raw NAV_ITEMS has the correct structure
    const helpItem = NAV_ITEMS.find(item => item.title === 'Help');
    expect(helpItem).toBeDefined();
    
    const whatsNewItem = helpItem?.children?.find(child => child.title === "What's New");
    expect(whatsNewItem).toBeDefined();
    expect(whatsNewItem?.href).toBe('/changelog');
  });

  it('should include all roles in Help menu access', () => {
    const helpItem = NAV_ITEMS.find(item => item.title === 'Help');
    expect(helpItem).toBeDefined();
    
    // Verify all roles have access to Help menu
    for (const role of ALL_ROLES) {
      expect(helpItem?.roles).toContain(role);
    }
  });
});

describe('Navigation structure', () => {
  it('should have Help menu with SparklesIcon import available', () => {
    // Verify the Help menu exists and has the expected structure
    const helpItem = NAV_ITEMS.find(item => item.title === 'Help');
    expect(helpItem).toBeDefined();
    expect(helpItem?.icon).toBeDefined();
  });

  it('should filter navigation correctly for each role', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const filteredNav = filterNavItems(NAV_ITEMS, role, mockPermissions);
        
        // Should return an array
        expect(Array.isArray(filteredNav)).toBe(true);
        
        // Each item should have required properties
        for (const item of filteredNav) {
          expect(item.title).toBeTruthy();
          expect(item.href).toBeTruthy();
          expect(item.icon).toBeDefined();
          expect(Array.isArray(item.roles)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
