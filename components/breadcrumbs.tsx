'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/**
 * Human-readable labels for known route segments.
 * Maps a URL segment (kebab-case) to a display label.
 * If a segment is not found here, it falls back to auto-formatting.
 */
const SEGMENT_LABELS: Record<string, string> = {
  // Top-level modules
  'dashboard': 'Dashboard',
  'customers': 'Customers',
  'projects': 'Projects',
  'quotations': 'Quotations',
  'proforma-jo': 'Proforma JO',
  'cost-entry': 'Cost Entry',
  'job-orders': 'Job Orders',
  'disbursements': 'Disbursements (BKK)',
  'vendors': 'Vendors',
  'invoices': 'Invoices',
  'reports': 'Reports',
  'notifications': 'Notifications',
  'settings': 'Settings',
  'feedback': 'Feedback',
  'changelog': 'Changelog',
  'help': 'Help',
  'onboarding': 'Onboarding',
  'request-access': 'Request Access',

  // Agency
  'agency': 'Agency',
  'shipping-lines': 'Shipping Lines',
  'port-agents': 'Port Agents',
  'service-providers': 'Service Providers',
  'shipping-rates': 'Shipping Rates',
  'bookings': 'Bookings',
  'bl': 'Bills of Lading',
  'si': 'Shipping Instructions',
  'arrivals': 'Arrivals',
  'manifests': 'Manifests',
  'vessels': 'Vessels',
  'schedules': 'Schedules',
  'tracking': 'Tracking',

  // Equipment
  'equipment': 'Equipment',
  'utilization': 'Utilization',
  'costing': 'Costing',
  'maintenance': 'Maintenance',
  'assign': 'Assign',
  'costs': 'Costs',
  'depreciation': 'Depreciation',
  'logs': 'Logs',

  // HSE
  'hse': 'HSE',
  'incidents': 'Incidents',
  'audits': 'Audits',
  'findings': 'Findings',
  'types': 'Types',
  'documents': 'Documents',
  'permits': 'Permits',
  'training': 'Training',
  'courses': 'Courses',
  'records': 'Records',
  'sessions': 'Sessions',
  'ppe': 'PPE',
  'inventory': 'Inventory',
  'issuance': 'Issuance',
  'compliance': 'Compliance',
  'replacement': 'Replacement',
  'report': 'Report',

  // Engineering
  'engineering': 'Engineering',
  'surveys': 'Route Surveys',
  'jmp': 'Journey Plans (JMP)',
  'active': 'Active',
  'drawings': 'Drawings',
  'transmittals': 'Transmittals',
  'resources': 'Resources',
  'assessments': 'Assessments',

  // Customs
  'customs': 'Customs',
  'import': 'Import (PIB)',
  'export': 'Export (PEB)',
  'hs-codes': 'HS Codes',
  'calculator': 'Calculator',
  'fees': 'Fees & Duties',
  'pending': 'Pending',
  'containers': 'Containers',
  'templates': 'Templates',

  // HR
  'hr': 'HR',
  'employees': 'Employees',
  'attendance': 'Attendance',
  'leave': 'Leave',
  'payroll': 'Payroll',
  'manpower-cost': 'Manpower Cost',
  'holidays': 'Holidays',
  'skills': 'Skills',
  'my-attendance': 'My Attendance',
  'my-leave': 'My Leave',
  'request': 'Request',

  // Finance
  'finance': 'Finance',
  'vendor-invoices': 'Vendor Invoices',
  'overhead': 'Overhead Allocation',

  // Admin
  'admin': 'Admin',
  'audit-logs': 'Audit Logs',
  'system-logs': 'System Logs',
  'login-history': 'Login History',
  'retention': 'Retention',
  'errors': 'Error Tracking',
  'recovery': 'Data Recovery',
  'jobs': 'Job Failures',
  'security': 'Security',
  'events': 'Events',
  'blocked-ips': 'Blocked IPs',
  'api-keys': 'API Keys',

  // Settings
  'company': 'Company',
  'users': 'Users',
  'profile': 'Profile',
  'preferences': 'Preferences',
  'activity-log': 'Activity Log',
  'activity': 'Activity',
  'automation': 'Automation',
  'scheduled-tasks': 'Scheduled Tasks',
  'integrations': 'Integrations',
  'history': 'History',
  'mappings': 'Mappings',
  'document-templates': 'Document Templates',
  'notification-templates': 'Notification Templates',
  'notification-logs': 'Notification Logs',

  // Co-Builder
  'co-builder': 'Co-Builder',
  'my-feedback': 'Feedback Saya',
  'scenarios': 'Test Scenarios',
  'top5': 'Top 5',
  'bug-tracker': 'Bug Tracker',

  // Dashboard sub-routes
  'executive': 'Executive',
  'director': 'Director',
  'marketing-manager': 'Marketing Manager',
  'finance-manager': 'Finance Manager',
  'operations-manager': 'Operations Manager',
  'sysadmin': 'Sysadmin',
  'operation': 'Operations',
  'marketing': 'Marketing',
  'viewer': 'Viewer',
  'alerts': 'Alerts',
  'rules': 'Rules',
  'assets': 'Assets',
  'budget-alerts': 'Budget Alerts',
  'widgets': 'Widgets',
  'ai': 'AI Insights',
  'predictions': 'Predictions',
  'scheduled': 'Scheduled',

  // Common actions
  'new': 'New',
  'edit': 'Edit',
  'manage': 'Manage',

  // Job Order sub-resources
  'berita-acara': 'Berita Acara',
  'bkk': 'BKK',
  'surat-jalan': 'Surat Jalan',
  'financials': 'Financials',
  'release': 'Release',
  'settle': 'Settle',

  // Help
  'tours': 'Guided Tours',

  // Reports
  'ar-aging': 'AR Aging',
  'budget-variance': 'Budget Variance',
  'cost-analysis': 'Cost Analysis',
  'customer-acquisition': 'Customer Acquisition',
  'customer-payment-history': 'Customer Payment History',
  'jo-summary': 'JO Summary',
  'job-profitability': 'Job Profitability',
  'on-time-delivery': 'On-Time Delivery',
  'outstanding-invoices': 'Outstanding Invoices',
  'profit-loss': 'Profit & Loss',
  'quotation-conversion': 'Quotation Conversion',
  'revenue-by-customer': 'Revenue by Customer',
  'revenue-by-project': 'Revenue by Project',
  'sales-pipeline': 'Sales Pipeline',
  'vendor-performance': 'Vendor Performance',
  'profitability': 'Profitability',
  'unbilled': 'Unbilled Revenue',
  'payables': 'Vendor Payables',
}

/** Check if a string looks like a UUID */
function isUUID(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
}

/** Get label for a segment, with auto-formatting fallback */
function getSegmentLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment]
  }
  // Auto-format: "some-thing" -> "Some Thing"
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface BreadcrumbEntry {
  label: string
  href: string
  isCurrent: boolean
}

function buildBreadcrumbs(pathname: string): BreadcrumbEntry[] {
  const segments = pathname.split('/').filter(Boolean)

  // Don't show breadcrumbs for top-level dashboard
  if (segments.length <= 1 && segments[0] === 'dashboard') {
    return []
  }

  const breadcrumbs: BreadcrumbEntry[] = []
  let currentPath = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    const isLast = i === segments.length - 1

    if (isUUID(segment)) {
      // For UUIDs: show "Detail" as label
      // If next segment is 'edit', skip the UUID -- we'll show the parent + Edit
      if (i < segments.length - 1 && segments[i + 1] === 'edit') {
        continue
      }
      breadcrumbs.push({
        label: 'Detail',
        href: currentPath,
        isCurrent: isLast,
      })
    } else if (segment === 'edit' && i > 0 && isUUID(segments[i - 1])) {
      // "Edit" after a UUID: combine with the UUID path
      breadcrumbs.push({
        label: 'Edit',
        href: currentPath,
        isCurrent: isLast,
      })
    } else {
      breadcrumbs.push({
        label: getSegmentLabel(segment),
        href: currentPath,
        isCurrent: isLast,
      })
    }
  }

  return breadcrumbs
}

export function AppBreadcrumbs() {
  const pathname = usePathname()
  const breadcrumbs = buildBreadcrumbs(pathname)

  // No breadcrumbs for top-level pages like /dashboard
  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {/* Always start with Dashboard link */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs.map((crumb, index) => {
          // Skip the first "Dashboard" crumb if it exists (we already render it above)
          if (index === 0 && crumb.href === '/dashboard') {
            return null
          }

          return (
            <span key={crumb.href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isCurrent ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
