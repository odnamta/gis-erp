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
  Clock,
  Calendar,
  LucideIcon,
  HelpCircle,
  Truck,
  ShieldAlert,
  Package,
  Compass,
  Ship,
  Zap,
  Shield,
} from 'lucide-react'
import { UserRole, UserPermissions } from '@/types/permissions'

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
 */
export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
    children: [
      {
        title: 'Overview',
        href: '/dashboard',
      },
      {
        title: 'Executive KPI',
        href: '/dashboard/executive',
        roles: ['owner', 'admin', 'manager', 'finance'],
      },
      {
        title: 'Financial Analytics',
        href: '/dashboard/executive/finance',
        roles: ['owner', 'admin', 'manager', 'finance'],
      },
      {
        title: 'AI Insights',
        href: '/dashboard/executive/ai',
        roles: ['owner', 'manager', 'finance'],
      },
      {
        title: 'Predictive Analytics',
        href: '/dashboard/executive/predictions',
        roles: ['owner', 'manager', 'finance'],
      },
    ],
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: Users,
    roles: ['owner', 'admin', 'manager', 'finance', 'sales'],
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: FolderKanban,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
  },
  {
    title: 'Quotations',
    href: '/quotations',
    icon: FileQuestion,
    roles: ['owner', 'admin', 'manager', 'finance', 'sales'],
  },
  {
    title: 'Proforma JO',
    href: '/proforma-jo',
    icon: FileText,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales'],
  },
  {
    title: 'Cost Entry',
    href: '/cost-entry',
    icon: Calculator,
    roles: ['owner', 'admin', 'ops'],
  },
  {
    title: 'Job Orders',
    href: '/job-orders',
    icon: Briefcase,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance'],
  },
  {
    title: 'Vendors',
    href: '/vendors',
    icon: Building2,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance'],
  },
  {
    title: 'Agency',
    href: '/agency/shipping-lines',
    icon: Ship,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales'],
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
        roles: ['owner', 'admin', 'manager', 'finance'],
      },
      {
        title: 'Unbilled Revenue',
        href: '/agency/reports/unbilled',
        roles: ['owner', 'admin', 'manager', 'finance'],
      },
      {
        title: 'Vendor Payables',
        href: '/agency/reports/payables',
        roles: ['owner', 'admin', 'manager', 'finance'],
      },
    ],
  },
  {
    title: 'Equipment',
    href: '/equipment',
    icon: Truck,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance'],
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
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
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
    roles: ['owner', 'admin', 'manager', 'ops'],
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
    roles: ['owner', 'admin', 'manager', 'ops', 'finance'],
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
    roles: ['owner', 'admin', 'finance'],
    permission: 'can_manage_invoices',
  },
  {
    title: 'Vendor Invoices',
    href: '/finance/vendor-invoices',
    icon: FileStack,
    roles: ['owner', 'admin', 'manager', 'finance'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales'],
  },
  {
    title: 'My Attendance',
    href: '/hr/my-attendance',
    icon: Clock,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
  },
  {
    title: 'My Leave',
    href: '/hr/my-leave',
    icon: Calendar,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
  },
  {
    title: 'HR',
    href: '/hr/employees',
    icon: UserCog,
    roles: ['owner', 'admin', 'manager'],
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
        title: 'My Attendance',
        href: '/hr/my-attendance',
      },
      {
        title: 'My Leave',
        href: '/hr/my-leave',
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
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
  },
  {
    title: 'Automation',
    href: '/settings/automation/scheduled-tasks',
    icon: Zap,
    roles: ['owner', 'admin'],
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
    roles: ['owner', 'admin'],
    children: [
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
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
    children: [
      {
        title: 'Users',
        href: '/settings/users',
        permission: 'can_manage_users',
      },
      {
        title: 'Overhead Allocation',
        href: '/finance/settings/overhead',
      },
      {
        title: 'Activity Log',
        href: '/settings/activity-log',
      },
      {
        title: 'Scheduled Tasks',
        href: '/settings/automation/scheduled-tasks',
        roles: ['owner', 'admin'],
      },
      {
        title: 'Integrations',
        href: '/settings/integrations',
        roles: ['owner', 'admin'],
      },
      {
        title: 'Document Templates',
        href: '/settings/document-templates',
        roles: ['owner', 'admin'],
      },
      {
        title: 'Notification Templates',
        href: '/settings/notification-templates',
        roles: ['owner', 'admin'],
      },
    ],
  },
  {
    title: 'Help',
    href: '/help',
    icon: HelpCircle,
    roles: ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'],
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
    ],
  },
]

/**
 * Filter navigation items based on user role and permissions
 */
export function filterNavItems(
  items: NavItem[],
  userRole: UserRole,
  permissions: Partial<UserPermissions>
): NavItem[] {
  return items
    .filter((item) => {
      // Check role access
      if (!item.roles.includes(userRole)) {
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
          if (child.roles && !child.roles.includes(userRole)) {
            return false
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
 */
export function getDashboardPath(role: UserRole): string {
  const dashboardMap: Record<UserRole, string> = {
    owner: '/dashboard',
    admin: '/dashboard',
    manager: '/dashboard/manager',
    ops: '/dashboard/ops',
    finance: '/dashboard/finance',
    sales: '/dashboard/sales',
    viewer: '/dashboard',
  }
  return dashboardMap[role] || '/dashboard'
}
