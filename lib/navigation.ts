import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Briefcase,
  Receipt,
  Settings,
  BarChart3,
  Calculator,
  Bell,
  Building2,
  FileQuestion,
  FileStack,
  UserCog,
  LucideIcon,
  HelpCircle,
  Truck,
  ShieldAlert,
  Package,
  Compass,
  Ship,
  Zap,
  Shield,
  Wallet,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { UserRole, UserPermissions, UserProfile, DepartmentScope } from '@/types/permissions'
import { getInheritedRoles, DEPARTMENT_STAFF_ROLES } from '@/lib/permissions'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles: UserRole[]
  permission?: keyof UserPermissions
  children?: NavSubItem[]
}

export interface NavSubItem {
  title: string
  href: string
  permission?: keyof UserPermissions
  roles?: UserRole[]
}

/**
 * Navigation items with role-based access control
 * Updated for 13 roles: owner, director, marketing_manager, finance_manager, operations_manager, sysadmin, administration, finance, marketing, ops, engineer, hr, hse
 */
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin', 'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse', 'agency', 'customs'],
    children: [
      {
        title: 'Overview',
        href: '/dashboard',
      },
      {
        title: 'Executive KPI',
        href: '/dashboard/executive',
        roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance'],
      },
      {
        title: 'Financial Analytics',
        href: '/dashboard/executive/finance',
        roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance'],
      },
      {
        title: 'AI Insights',
        href: '/dashboard/executive/ai',
        roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance'],
      },
      {
        title: 'Predictive Analytics',
        href: '/dashboard/executive/predictions',
        roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance'],
      },
      {
        title: 'Assets Dashboard',
        href: '/dashboard/assets',
        roles: ['owner', 'director', 'operations_manager', 'ops'],
      },
    ],
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: Users,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'administration', 'finance', 'marketing', 'agency', 'customs'],
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderKanban,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance', 'marketing', 'ops', 'engineer'],
  },
  {
    title: 'Quotations',
    href: '/quotations',
    icon: FileQuestion,
    roles: ['owner', 'director', 'marketing_manager', 'administration', 'marketing', 'engineer'],
  },
  {
    title: 'Proforma JO',
    href: '/proforma-jo',
    icon: FileText,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance', 'ops'],
  },
  {
    title: 'Cost Entry',
    href: '/cost-entry',
    icon: Calculator,
    roles: ['owner', 'director', 'operations_manager', 'ops'],
  },
  {
    title: 'Job Orders',
    href: '/job-orders',
    icon: Briefcase,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance', 'ops', 'customs'],
  },
  {
    title: 'Disbursements (BKK)',
    href: '/disbursements',
    icon: Wallet,
    roles: ['owner', 'director', 'finance_manager', 'operations_manager', 'administration', 'finance'],
  },
  {
    title: 'Vendors',
    href: '/vendors',
    icon: Building2,
    roles: ['owner', 'director', 'finance_manager', 'operations_manager', 'administration', 'finance', 'ops'],
  },
  {
    title: 'Agency',
    href: '/agency/shipping-lines',
    icon: Ship,
    roles: ['owner', 'director', 'sysadmin', 'agency'],
    children: [
      {
        title: 'Bookings',
        href: '/agency/bookings',
      },
      {
        title: 'Bills of Lading',
        href: '/agency/bl',
      },
      {
        title: 'Shipping Instructions',
        href: '/agency/si',
      },
      {
        title: 'Arrivals',
        href: '/agency/arrivals',
      },
      {
        title: 'Manifests',
        href: '/agency/manifests',
      },
      {
        title: 'Vessels',
        href: '/agency/vessels',
      },
      {
        title: 'Schedules',
        href: '/agency/schedules',
      },
      {
        title: 'Tracking',
        href: '/agency/tracking',
      },
      {
        title: 'Shipping Lines',
        href: '/agency/shipping-lines',
      },
      {
        title: 'Port Agents',
        href: '/agency/port-agents',
      },
      {
        title: 'Service Providers',
        href: '/agency/service-providers',
      },
      {
        title: 'Shipping Rates',
        href: '/agency/shipping-rates',
      },
      {
        title: 'Manage Rates',
        href: '/agency/shipping-rates/manage',
      },
      {
        title: 'Profitability Report',
        href: '/agency/reports/profitability',
        roles: ['owner', 'director', 'sysadmin', 'agency'],
      },
      {
        title: 'Unbilled Revenue',
        href: '/agency/reports/unbilled',
        roles: ['owner', 'director', 'sysadmin', 'agency'],
      },
      {
        title: 'Vendor Payables',
        href: '/agency/reports/payables',
        roles: ['owner', 'director', 'sysadmin', 'agency'],
      },
    ],
  },
  {
    title: 'Equipment',
    href: '/equipment',
    icon: Truck,
    roles: ['owner', 'director', 'operations_manager', 'administration', 'finance', 'ops'],
    children: [
      {
        title: 'Asset Registry',
        href: '/equipment',
      },
      {
        title: 'Utilization',
        href: '/equipment/utilization',
      },
      {
        title: 'Costing',
        href: '/equipment/costing',
      },
      {
        title: 'Maintenance',
        href: '/equipment/maintenance',
      },
      {
        title: 'Maintenance Schedules',
        href: '/equipment/maintenance/schedules',
      },
    ],
  },
  {
    title: 'HSE',
    href: '/hse',
    icon: ShieldAlert,
    roles: ['owner', 'director', 'operations_manager', 'administration', 'ops', 'hse', 'engineer'],
    children: [
      {
        title: 'Dashboard',
        href: '/hse',
      },
      {
        title: 'Incidents',
        href: '/hse/incidents',
      },
      {
        title: 'Report Incident',
        href: '/hse/incidents/report',
      },
      {
        title: 'Audits & Inspections',
        href: '/hse/audits',
      },
      {
        title: 'Audit Types',
        href: '/hse/audits/types',
      },
      {
        title: 'All Findings',
        href: '/hse/audits/findings',
      },
      {
        title: 'Documents',
        href: '/hse/documents',
      },
      {
        title: 'Permits',
        href: '/hse/permits',
      },
      {
        title: 'Training',
        href: '/hse/training',
      },
      {
        title: 'Training Courses',
        href: '/hse/training/courses',
      },
      {
        title: 'Training Records',
        href: '/hse/training/records',
      },
      {
        title: 'Training Sessions',
        href: '/hse/training/sessions',
      },
      {
        title: 'PPE Management',
        href: '/hse/ppe',
      },
      {
        title: 'PPE Types',
        href: '/hse/ppe/types',
      },
      {
        title: 'PPE Inventory',
        href: '/hse/ppe/inventory',
      },
      {
        title: 'PPE Issuance',
        href: '/hse/ppe/issuance',
      },
      {
        title: 'PPE Compliance',
        href: '/hse/ppe/compliance',
      },
      {
        title: 'PPE Replacement',
        href: '/hse/ppe/replacement',
      },
    ],
  },
  {
    title: 'Engineering',
    href: '/engineering/surveys',
    icon: Compass,
    roles: ['owner', 'director', 'marketing_manager', 'operations_manager', 'ops', 'engineer', 'marketing'],
    children: [
      {
        title: 'Resources',
        href: '/engineering/resources',
      },
      {
        title: 'Route Surveys',
        href: '/engineering/surveys',
      },
      {
        title: 'Journey Plans (JMP)',
        href: '/engineering/jmp',
      },
      {
        title: 'Active Journeys',
        href: '/engineering/jmp/active',
      },
      {
        title: 'Drawings',
        href: '/engineering/drawings',
      },
      {
        title: 'Transmittals',
        href: '/engineering/drawings/transmittals',
      },
    ],
  },
  {
    title: 'Customs',
    href: '/customs/import',
    icon: Package,
    roles: ['owner', 'director', 'sysadmin', 'customs'],
    children: [
      {
        title: 'Import Documents (PIB)',
        href: '/customs/import',
      },
      {
        title: 'Export Documents (PEB)',
        href: '/customs/export',
      },
      {
        title: 'HS Code Database',
        href: '/customs/hs-codes',
      },
      {
        title: 'Duty Calculator',
        href: '/customs/hs-codes/calculator',
      },
      {
        title: 'Fees & Duties',
        href: '/customs/fees',
      },
      {
        title: 'Pending Payments',
        href: '/customs/fees/pending',
      },
      {
        title: 'Container Tracking',
        href: '/customs/containers',
      },
      {
        title: 'Document Templates',
        href: '/customs/templates',
      },
      {
        title: 'Generated Documents',
        href: '/customs/documents',
      },
    ],
  },
  {
    title: 'Invoices',
    href: '/invoices',
    icon: Receipt,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'administration', 'finance'],
    permission: 'can_manage_invoices',
  },
  {
    title: 'Vendor Invoices',
    href: '/finance/vendor-invoices',
    icon: FileStack,
    roles: ['owner', 'director', 'finance_manager', 'operations_manager', 'administration', 'finance'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance', 'marketing', 'ops'],
  },
  {
    title: 'HR',
    href: '/hr/employees',
    icon: UserCog,
    roles: ['owner', 'director', 'hr'],
    children: [
      {
        title: 'Employees',
        href: '/hr/employees',
      },
      {
        title: 'Attendance',
        href: '/hr/attendance',
      },
      {
        title: 'Leave Requests',
        href: '/hr/leave',
      },
      {
        title: 'Payroll',
        href: '/hr/payroll',
      },
      {
        title: 'Manpower Cost',
        href: '/hr/manpower-cost',
      },
      {
        title: 'Schedules',
        href: '/hr/attendance/schedules',
      },
      {
        title: 'Holidays',
        href: '/hr/attendance/holidays',
      },
    ],
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin', 'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse', 'agency', 'customs'],
  },
  {
    title: 'Automation',
    href: '/settings/automation/scheduled-tasks',
    icon: Zap,
    roles: ['owner', 'director', 'sysadmin'],
    children: [
      {
        title: 'Scheduled Tasks',
        href: '/settings/automation/scheduled-tasks',
      },
      {
        title: 'Integrations',
        href: '/settings/integrations',
      },
      {
        title: 'Document Templates',
        href: '/settings/document-templates',
      },
      {
        title: 'Notification Templates',
        href: '/settings/notification-templates',
      },
      {
        title: 'Notification Logs',
        href: '/settings/notification-logs',
      },
    ],
  },
  {
    title: 'Admin',
    href: '/admin/audit-logs',
    icon: Shield,
    roles: ['owner', 'director', 'sysadmin'],
    children: [
      {
        title: 'Feedback',
        href: '/admin/feedback',
      },
      {
        title: 'Audit Logs',
        href: '/settings/audit-logs',
      },
      {
        title: 'System Logs',
        href: '/settings/system-logs',
      },
      {
        title: 'Login History',
        href: '/admin/login-history',
      },
      {
        title: 'Log Retention',
        href: '/admin/audit-logs/retention',
      },
      {
        title: 'Error Tracking',
        href: '/admin/errors',
      },
      {
        title: 'Data Recovery',
        href: '/admin/recovery',
      },
      {
        title: 'Job Failures',
        href: '/admin/jobs',
      },
    ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin'],
    children: [
      {
        title: 'Company',
        href: '/settings/company',
        roles: ['owner', 'director', 'sysadmin'],
      },
      {
        title: 'Users',
        href: '/settings/users',
        roles: ['owner', 'director', 'sysadmin'],
      },
      {
        title: 'Overhead Allocation',
        href: '/finance/settings/overhead',
        roles: ['owner', 'director', 'sysadmin', 'finance_manager'],
      },
      {
        title: 'Document Templates',
        href: '/settings/document-templates',
        roles: ['owner', 'director', 'sysadmin', 'marketing_manager', 'finance_manager', 'operations_manager'],
      },
      {
        title: 'Notification Templates',
        href: '/settings/notification-templates',
        roles: ['owner', 'director', 'sysadmin'],
      },
      {
        title: 'Activity Log',
        href: '/settings/activity-log',
        roles: ['owner', 'director', 'sysadmin', 'marketing_manager', 'finance_manager', 'operations_manager'],
      },
      {
        title: 'Scheduled Tasks',
        href: '/settings/automation/scheduled-tasks',
        roles: ['owner', 'director', 'sysadmin'],
      },
      {
        title: 'Integrations',
        href: '/settings/integrations',
        roles: ['owner', 'director', 'sysadmin'],
      },
    ],
  },
  {
    title: 'Co-Builder',
    href: '/co-builder',
    icon: Trophy,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin', 'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse', 'customs'],
    children: [
      {
        title: 'Leaderboard',
        href: '/co-builder',
      },
      {
        title: 'Feedback Saya',
        href: '/co-builder/my-feedback',
      },
      {
        title: 'Test Scenario',
        href: '/co-builder/scenarios',
      },
      {
        title: 'Top 5',
        href: '/co-builder/top5',
      },
      {
        title: 'Bug Tracker',
        href: '/co-builder/bug-tracker',
      },
      {
        title: 'Admin Panel',
        href: '/co-builder/admin',
        roles: ['owner', 'sysadmin'],
      },
    ],
  },
  {
    title: 'Help',
    href: '/help',
    icon: HelpCircle,
    roles: ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin', 'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse', 'agency', 'customs'],
    children: [
      {
        title: 'Help Center',
        href: '/help',
      },
      {
        title: 'Guided Tours',
        href: '/help/tours',
      },
      {
        title: 'Onboarding',
        href: '/onboarding',
      },
      {
        title: "What's New",
        href: '/changelog',
      },
    ],
  },
]

/**
 * Filter navigation items based on user role and permissions
 * Supports manager inheritance for department-scoped access
 */
export function filterNavItems(
  items: NavItem[],
  userRole: UserRole,
  permissions: Partial<UserPermissions>,
  profile?: UserProfile | null
): NavItem[] {
  // Get inherited roles for managers
  const effectiveRoles: UserRole[] = [userRole]
  if (profile && ['marketing_manager', 'finance_manager', 'operations_manager'].includes(profile.role) && profile.department_scope?.length) {
    const inheritedRoles = getInheritedRoles(profile)
    effectiveRoles.push(...inheritedRoles)
  }
  
  return items
    .filter((item) => {
      // Check role access (including inherited roles)
      const hasRoleAccess = item.roles.some(role => effectiveRoles.includes(role))
      if (!hasRoleAccess) {
        return false
      }
      // Check permission if specified
      if (item.permission && !permissions[item.permission]) {
        return false
      }
      return true
    })
    .map((item) => {
      // Filter children if present
      if (item.children) {
        const filteredChildren = item.children.filter((child) => {
          // Check role access for child if specified
          if (child.roles) {
            const hasChildRoleAccess = child.roles.some(role => effectiveRoles.includes(role))
            if (!hasChildRoleAccess) {
              return false
            }
          }
          // Check permission if specified
          if (child.permission && !permissions[child.permission]) {
            return false
          }
          return true
        })
        return { ...item, children: filteredChildren }
      }
      return item
    })
}

/**
 * Get the dashboard path for a specific role
 * Updated for 11 roles
 */
export function getDashboardPath(role: UserRole): string {
  const dashboardMap: Record<UserRole, string> = {
    owner: '/dashboard',
    director: '/dashboard/director',
    marketing_manager: '/dashboard/marketing-manager',
    finance_manager: '/dashboard/finance-manager',
    operations_manager: '/dashboard/operations-manager',
    sysadmin: '/dashboard/sysadmin',
    administration: '/dashboard/admin',
    finance: '/dashboard/finance',
    marketing: '/dashboard/marketing',
    ops: '/dashboard/operation',
    engineer: '/dashboard/engineering',
    hr: '/dashboard/hr',
    hse: '/dashboard/hse',
    agency: '/dashboard/agency',
    customs: '/dashboard/customs',
  }
  return dashboardMap[role] || '/dashboard'
}

/**
 * Get navigation items filtered for a manager's department scope
 */
export function getManagerScopedNavItems(
  profile: UserProfile
): NavItem[] {
  if (!['marketing_manager', 'finance_manager', 'operations_manager'].includes(profile.role) || !profile.department_scope?.length) {
    return filterNavItems(NAV_ITEMS, profile.role, profile)
  }
  
  // Manager gets access to their own role's items plus inherited department items
  return filterNavItems(NAV_ITEMS, profile.role, profile, profile)
}
