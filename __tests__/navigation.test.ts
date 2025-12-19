/**
 * Navigation Tests
 * Feature: v0.9.0-owner-dashboard-navigation
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { NAV_ITEMS, filterNavItems, getDashboardPath } from '@/lib/navigation'
import { DEFAULT_PERMISSIONS } from '@/lib/permissions'
import { UserRole } from '@/types/permissions'

const ALL_ROLES: UserRole[] = ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer']

describe('Navigation Properties', () => {
  /**
   * Property 13: Owner navigation completeness
   * **Feature: v0.9.0-owner-dashboard-navigation, Property 13: Owner navigation completeness**
   * **Validates: Requirements 4.1**
   */
  it('Property 13: Owner navigation completeness - owner sees all nav items', () => {
    const ownerPermissions = DEFAULT_PERMISSIONS.owner
    const filteredItems = filterNavItems(NAV_ITEMS, 'owner', ownerPermissions)
    
    // Owner should see all navigation items
    expect(filteredItems.length).toBe(NAV_ITEMS.length)
    
    // Verify all items are present
    const filteredTitles = filteredItems.map(item => item.title)
    const allTitles = NAV_ITEMS.map(item => item.title)
    expect(filteredTitles).toEqual(allTitles)
  })

  /**
   * Property 14: Role-based navigation filtering
   * **Feature: v0.9.0-owner-dashboard-navigation, Property 14: Role-based navigation filtering**
   * **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**
   */
  it('Property 14: Role-based navigation filtering', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_ROLES), (role) => {
        const permissions = DEFAULT_PERMISSIONS[role]
        const filteredItems = filterNavItems(NAV_ITEMS, role, permissions)
        
        // All filtered items should have the role in their roles array
        return filteredItems.every(item => item.roles.includes(role))
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 15: Dashboard path mapping
   * **Feature: v0.9.0-owner-dashboard-navigation, Property 15: Dashboard path mapping**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
   */
  it('Property 15: Dashboard path mapping', () => {
    const expectedPaths: Record<UserRole, string> = {
      owner: '/dashboard',
      admin: '/dashboard',
      manager: '/dashboard/manager',
      ops: '/dashboard/ops',
      finance: '/dashboard/finance',
      sales: '/dashboard/sales',
      viewer: '/dashboard',
    }

    fc.assert(
      fc.property(fc.constantFrom(...ALL_ROLES), (role) => {
        const path = getDashboardPath(role)
        return path === expectedPaths[role]
      }),
      { numRuns: 100 }
    )
  })
})

describe('Role-specific navigation', () => {
  it('admin sees Dashboard, Customers, Projects, Proforma JO, Cost Entry, Job Orders, Vendors, Invoices, Reports, Notifications, Settings', () => {
    const adminPermissions = DEFAULT_PERMISSIONS.admin
    const filteredItems = filterNavItems(NAV_ITEMS, 'admin', adminPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Dashboard')
    expect(titles).toContain('Customers')
    expect(titles).toContain('Projects')
    expect(titles).toContain('Proforma JO')
    expect(titles).toContain('Cost Entry')
    expect(titles).toContain('Job Orders')
    expect(titles).toContain('Vendors')
    expect(titles).toContain('Invoices')
    expect(titles).toContain('Reports')
    expect(titles).toContain('Notifications')
    expect(titles).toContain('Settings')
  })

  it('manager sees Dashboard, Customers, Projects, Proforma JO, Job Orders, Vendors, Reports, Notifications, Settings (no Cost Entry, no Invoices)', () => {
    const managerPermissions = DEFAULT_PERMISSIONS.manager
    const filteredItems = filterNavItems(NAV_ITEMS, 'manager', managerPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Dashboard')
    expect(titles).toContain('Customers')
    expect(titles).toContain('Projects')
    expect(titles).toContain('Proforma JO')
    expect(titles).toContain('Job Orders')
    expect(titles).toContain('Vendors')
    expect(titles).toContain('Reports')
    expect(titles).toContain('Notifications')
    expect(titles).toContain('Settings')
    expect(titles).not.toContain('Cost Entry')
    expect(titles).not.toContain('Invoices')
  })

  it('ops sees Dashboard, Projects, Proforma JO, Cost Entry, Job Orders, Vendors, Reports, Notifications, Settings (no Customers, no Invoices)', () => {
    const opsPermissions = DEFAULT_PERMISSIONS.ops
    const filteredItems = filterNavItems(NAV_ITEMS, 'ops', opsPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Dashboard')
    expect(titles).toContain('Projects')
    expect(titles).toContain('Proforma JO')
    expect(titles).toContain('Cost Entry')
    expect(titles).toContain('Job Orders')
    expect(titles).toContain('Vendors')
    expect(titles).toContain('Reports')
    expect(titles).toContain('Notifications')
    expect(titles).toContain('Settings')
    expect(titles).not.toContain('Customers')
    expect(titles).not.toContain('Invoices')
  })

  it('finance sees Dashboard, Customers, Projects, Proforma JO, Job Orders, Vendors, Invoices, Reports, Notifications, Settings (no Cost Entry)', () => {
    const financePermissions = DEFAULT_PERMISSIONS.finance
    const filteredItems = filterNavItems(NAV_ITEMS, 'finance', financePermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Dashboard')
    expect(titles).toContain('Customers')
    expect(titles).toContain('Projects')
    expect(titles).toContain('Proforma JO')
    expect(titles).toContain('Job Orders')
    expect(titles).toContain('Vendors')
    expect(titles).toContain('Invoices')
    expect(titles).toContain('Reports')
    expect(titles).toContain('Notifications')
    expect(titles).toContain('Settings')
    expect(titles).not.toContain('Cost Entry')
  })

  it('sales sees Dashboard, Customers, Projects, Proforma JO, Reports, Notifications, Settings (no Job Orders, no Vendors, no Invoices, no Cost Entry)', () => {
    const salesPermissions = DEFAULT_PERMISSIONS.sales
    const filteredItems = filterNavItems(NAV_ITEMS, 'sales', salesPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Dashboard')
    expect(titles).toContain('Customers')
    expect(titles).toContain('Projects')
    expect(titles).toContain('Proforma JO')
    expect(titles).toContain('Reports')
    expect(titles).toContain('Notifications')
    expect(titles).toContain('Settings')
    expect(titles).not.toContain('Job Orders')
    expect(titles).not.toContain('Vendors')
    expect(titles).not.toContain('Invoices')
    expect(titles).not.toContain('Cost Entry')
  })
})


// ============================================
// Property 19: Vendor Navigation Visibility by Role
// Feature: vendor-management
// Validates: Requirements 11.2, 11.3
// ============================================
describe('Property 19: Vendor Navigation Visibility by Role', () => {
  /**
   * Feature: vendor-management, Property 19a: Vendor Menu Visibility
   * The Vendors menu item SHALL be visible to roles: owner, admin, manager, ops, finance.
   */
  it('should show Vendors menu to authorized roles', () => {
    const authorizedRoles: UserRole[] = ['owner', 'admin', 'manager', 'ops', 'finance']
    
    fc.assert(
      fc.property(fc.constantFrom(...authorizedRoles), (role) => {
        const permissions = DEFAULT_PERMISSIONS[role]
        const filteredItems = filterNavItems(NAV_ITEMS, role, permissions)
        const titles = filteredItems.map(item => item.title)
        
        return titles.includes('Vendors')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: vendor-management, Property 19b: Vendor Menu Hidden from Unauthorized
   * The Vendors menu item SHALL NOT be visible to roles: sales, viewer.
   */
  it('should hide Vendors menu from unauthorized roles', () => {
    const unauthorizedRoles: UserRole[] = ['sales', 'viewer']
    
    fc.assert(
      fc.property(fc.constantFrom(...unauthorizedRoles), (role) => {
        const permissions = DEFAULT_PERMISSIONS[role]
        const filteredItems = filterNavItems(NAV_ITEMS, role, permissions)
        const titles = filteredItems.map(item => item.title)
        
        return !titles.includes('Vendors')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: vendor-management, Property 19c: Vendor Menu Position
   * The Vendors menu item SHALL appear after Job Orders in the navigation.
   */
  it('should position Vendors menu after Job Orders', () => {
    const vendorItem = NAV_ITEMS.find(item => item.title === 'Vendors')
    const jobOrdersItem = NAV_ITEMS.find(item => item.title === 'Job Orders')
    
    expect(vendorItem).toBeDefined()
    expect(jobOrdersItem).toBeDefined()
    
    const vendorIndex = NAV_ITEMS.indexOf(vendorItem!)
    const jobOrdersIndex = NAV_ITEMS.indexOf(jobOrdersItem!)
    
    expect(vendorIndex).toBeGreaterThan(jobOrdersIndex)
  })

  /**
   * Feature: vendor-management, Property 19d: Vendor Menu Icon
   * The Vendors menu item SHALL use the Building2 icon.
   */
  it('should use Building2 icon for Vendors menu', () => {
    const vendorItem = NAV_ITEMS.find(item => item.title === 'Vendors')
    
    expect(vendorItem).toBeDefined()
    expect(vendorItem!.icon.displayName || vendorItem!.icon.name).toBe('Building2')
  })

  /**
   * Feature: vendor-management, Property 19e: Vendor Menu Path
   * The Vendors menu item SHALL link to /vendors.
   */
  it('should link Vendors menu to /vendors', () => {
    const vendorItem = NAV_ITEMS.find(item => item.title === 'Vendors')
    
    expect(vendorItem).toBeDefined()
    expect(vendorItem!.href).toBe('/vendors')
  })
})

describe('Vendor navigation - role-specific tests', () => {
  it('owner sees Vendors in navigation', () => {
    const ownerPermissions = DEFAULT_PERMISSIONS.owner
    const filteredItems = filterNavItems(NAV_ITEMS, 'owner', ownerPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Vendors')
  })

  it('admin sees Vendors in navigation', () => {
    const adminPermissions = DEFAULT_PERMISSIONS.admin
    const filteredItems = filterNavItems(NAV_ITEMS, 'admin', adminPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Vendors')
  })

  it('manager sees Vendors in navigation', () => {
    const managerPermissions = DEFAULT_PERMISSIONS.manager
    const filteredItems = filterNavItems(NAV_ITEMS, 'manager', managerPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Vendors')
  })

  it('ops sees Vendors in navigation', () => {
    const opsPermissions = DEFAULT_PERMISSIONS.ops
    const filteredItems = filterNavItems(NAV_ITEMS, 'ops', opsPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Vendors')
  })

  it('finance sees Vendors in navigation', () => {
    const financePermissions = DEFAULT_PERMISSIONS.finance
    const filteredItems = filterNavItems(NAV_ITEMS, 'finance', financePermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).toContain('Vendors')
  })

  it('sales does NOT see Vendors in navigation', () => {
    const salesPermissions = DEFAULT_PERMISSIONS.sales
    const filteredItems = filterNavItems(NAV_ITEMS, 'sales', salesPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).not.toContain('Vendors')
  })

  it('viewer does NOT see Vendors in navigation', () => {
    const viewerPermissions = DEFAULT_PERMISSIONS.viewer
    const filteredItems = filterNavItems(NAV_ITEMS, 'viewer', viewerPermissions)
    const titles = filteredItems.map(item => item.title)
    
    expect(titles).not.toContain('Vendors')
  })
})
