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
