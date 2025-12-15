import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { NAV_ITEMS, filterNavItems } from '@/lib/navigation'
import { UserRole, UserPermissions } from '@/types/permissions'
import { DEFAULT_PERMISSIONS } from '@/lib/permissions'

describe('Navigation Filtering', () => {
  /**
   * Property 7: Navigation filtering for ops role
   * For any user profile with role='ops', the navigation filter SHALL exclude
   * 'customers', 'invoices', and 'reports' menu items AND include
   * 'dashboard', 'projects', 'pjo', and 'job-orders'
   * Validates: Requirements 5.1, 5.2
   */
  describe('Property 7: Navigation filtering for ops role', () => {
    it('should exclude Customers, Invoices, and Settings for ops users', () => {
      const opsPermissions = DEFAULT_PERMISSIONS.ops
      const filteredNav = filterNavItems(NAV_ITEMS, 'ops', opsPermissions)

      const navTitles = filteredNav.map((item) => item.title)

      // Should NOT include these
      expect(navTitles).not.toContain('Customers')
      expect(navTitles).not.toContain('Invoices')
      expect(navTitles).not.toContain('Settings')
    })

    it('should include Dashboard, Projects, Proforma JO, and Job Orders for ops users', () => {
      const opsPermissions = DEFAULT_PERMISSIONS.ops
      const filteredNav = filterNavItems(NAV_ITEMS, 'ops', opsPermissions)

      const navTitles = filteredNav.map((item) => item.title)

      // Should include these
      expect(navTitles).toContain('Dashboard')
      expect(navTitles).toContain('Projects')
      expect(navTitles).toContain('Proforma JO')
      expect(navTitles).toContain('Job Orders')
    })

    it('should include all navigation items for admin users', () => {
      const adminPermissions = DEFAULT_PERMISSIONS.admin
      const filteredNav = filterNavItems(NAV_ITEMS, 'admin', adminPermissions)

      const navTitles = filteredNav.map((item) => item.title)

      // Admin should see everything
      expect(navTitles).toContain('Dashboard')
      expect(navTitles).toContain('Customers')
      expect(navTitles).toContain('Projects')
      expect(navTitles).toContain('Proforma JO')
      expect(navTitles).toContain('Job Orders')
      expect(navTitles).toContain('Invoices')
      expect(navTitles).toContain('Settings')
    })

    it('should filter navigation consistently for any ops user', () => {
      fc.assert(
        fc.property(
          fc.record({
            can_see_revenue: fc.constant(false),
            can_see_profit: fc.constant(false),
            can_approve_pjo: fc.constant(false),
            can_manage_invoices: fc.constant(false),
            can_manage_users: fc.constant(false),
            can_create_pjo: fc.constant(false),
            can_fill_costs: fc.constant(true),
          }),
          (permissions) => {
            const filteredNav = filterNavItems(NAV_ITEMS, 'ops', permissions)
            const navTitles = filteredNav.map((item) => item.title)

            // Ops should never see these regardless of other permissions
            expect(navTitles).not.toContain('Customers')
            expect(navTitles).not.toContain('Invoices')
            expect(navTitles).not.toContain('Settings')

            // Ops should always see these
            expect(navTitles).toContain('Dashboard')
            expect(navTitles).toContain('Projects')
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should respect permission requirements for navigation items', () => {
      // Finance user without can_manage_invoices should not see Invoices
      const financeNoInvoices: Partial<UserPermissions> = {
        ...DEFAULT_PERMISSIONS.finance,
        can_manage_invoices: false,
      }
      const filteredNav = filterNavItems(NAV_ITEMS, 'finance', financeNoInvoices)
      const navTitles = filteredNav.map((item) => item.title)

      expect(navTitles).not.toContain('Invoices')
    })
  })
})
