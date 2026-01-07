// Report Permissions Utility
// Defines which roles can access which reports

import { UserRole } from '@/types/permissions'
import { ReportConfig, ReportCategory } from '@/types/reports'

/**
 * Report configuration with role-based access control
 */
export const REPORTS: ReportConfig[] = [
  // Financial Reports
  {
    id: 'profit-loss',
    title: 'Profit & Loss Statement',
    description: 'Revenue, costs, and margins by period',
    category: 'financial',
    href: '/reports/profit-loss',
    icon: 'TrendingUp',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
  },
  {
    id: 'revenue-customer',
    title: 'Revenue by Customer',
    description: 'Revenue breakdown by customer',
    category: 'financial',
    href: '/reports/revenue-customer',
    icon: 'Users',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance', 'marketing'],
  },
  {
    id: 'cost-analysis',
    title: 'Cost Analysis by Category',
    description: 'Detailed cost breakdown by category',
    category: 'financial',
    href: '/reports/cost-analysis',
    icon: 'PieChart',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
  },
  // Operational Reports
  {
    id: 'budget-variance',
    title: 'Budget Variance Report',
    description: 'Estimated vs actual costs per PJO',
    category: 'operational',
    href: '/reports/budget-variance',
    icon: 'BarChart3',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'],
  },
  {
    id: 'jo-summary',
    title: 'Job Order Summary',
    description: 'Overview of all job orders',
    category: 'operational',
    href: '/reports/jo-summary',
    icon: 'ClipboardList',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'],
  },
  // Accounts Receivable Reports
  {
    id: 'ar-aging',
    title: 'AR Aging Report',
    description: 'Outstanding invoices by age',
    category: 'ar',
    href: '/reports/ar-aging',
    icon: 'Clock',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
  },
  {
    id: 'outstanding-invoices',
    title: 'Outstanding Invoices',
    description: 'All unpaid invoices',
    category: 'ar',
    href: '/reports/outstanding-invoices',
    icon: 'FileText',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
  },
  // Sales Reports
  {
    id: 'quotation-conversion',
    title: 'Quotation Conversion Rate',
    description: 'PJO conversion and pipeline analysis',
    category: 'sales',
    href: '/reports/quotation-conversion',
    icon: 'TrendingUp',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'marketing'],
  },
  // Phase 2 Reports
  {
    id: 'revenue-by-customer',
    title: 'Revenue by Customer',
    description: 'Revenue breakdown by customer from completed JOs',
    category: 'financial',
    href: '/reports/revenue-by-customer',
    icon: 'Users',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance', 'marketing'],
  },
  {
    id: 'revenue-by-project',
    title: 'Revenue by Project',
    description: 'Revenue and profit analysis by project',
    category: 'financial',
    href: '/reports/revenue-by-project',
    icon: 'FolderKanban',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager'],
  },
  {
    id: 'on-time-delivery',
    title: 'On-Time Delivery',
    description: 'Delivery performance metrics',
    category: 'operational',
    href: '/reports/on-time-delivery',
    icon: 'Clock',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'],
  },
  {
    id: 'vendor-performance',
    title: 'Vendor Performance',
    description: 'Vendor spend and performance analysis',
    category: 'operational',
    href: '/reports/vendor-performance',
    icon: 'Truck',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'],
  },
  {
    id: 'customer-payment-history',
    title: 'Customer Payment History',
    description: 'Payment patterns and slow payer analysis',
    category: 'ar',
    href: '/reports/customer-payment-history',
    icon: 'CreditCard',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
  },
  {
    id: 'sales-pipeline',
    title: 'Sales Pipeline Analysis',
    description: 'PJO pipeline stages and weighted values',
    category: 'sales',
    href: '/reports/sales-pipeline',
    icon: 'TrendingUp',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'marketing'],
  },
  {
    id: 'customer-acquisition',
    title: 'Customer Acquisition',
    description: 'New customer trends and revenue analysis',
    category: 'sales',
    href: '/reports/customer-acquisition',
    icon: 'UserPlus',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'marketing'],
  },
  {
    id: 'job-profitability',
    title: 'Job Profitability',
    description: 'Net profit and margin analysis by job',
    category: 'financial',
    href: '/reports/job-profitability',
    icon: 'TrendingUp',
    allowedRoles: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
  },
]

/**
 * Get reports visible to a specific role
 */
export function getVisibleReports(role: UserRole): ReportConfig[] {
  return REPORTS.filter((report) => report.allowedRoles.includes(role))
}

/**
 * Check if a role can access a specific report
 */
export function canAccessReport(role: UserRole, reportId: string): boolean {
  const report = REPORTS.find((r) => r.id === reportId)
  if (!report) return false
  return report.allowedRoles.includes(role)
}

/**
 * Get reports grouped by category for a specific role
 */
export function getReportsByCategory(role: UserRole): Record<ReportCategory, ReportConfig[]> {
  const visibleReports = getVisibleReports(role)
  
  return {
    financial: visibleReports.filter((r) => r.category === 'financial'),
    operational: visibleReports.filter((r) => r.category === 'operational'),
    ar: visibleReports.filter((r) => r.category === 'ar'),
    sales: visibleReports.filter((r) => r.category === 'sales'),
  }
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: ReportCategory): string {
  const names: Record<ReportCategory, string> = {
    financial: 'Financial Reports',
    operational: 'Operational Reports',
    ar: 'Accounts Receivable',
    sales: 'Sales Reports',
  }
  return names[category]
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: ReportCategory): string {
  const icons: Record<ReportCategory, string> = {
    financial: 'DollarSign',
    operational: 'Settings',
    ar: 'Receipt',
    sales: 'TrendingUp',
  }
  return icons[category]
}

/**
 * Check if a role has access to a specific category
 * Used for category-level access control
 */
export function canAccessCategory(role: UserRole, category: ReportCategory): boolean {
  const categoryRoles: Record<ReportCategory, UserRole[]> = {
    financial: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
    operational: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'],
    ar: ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'finance'],
    sales: ['owner', 'director', 'administration', 'marketing_manager', 'marketing'],
  }
  return categoryRoles[category].includes(role)
}

/**
 * Admin roles that have full access to all reports
 */
export const ADMIN_ROLES: UserRole[] = ['owner', 'director', 'administration', 'marketing_manager', 'finance_manager', 'operations_manager']

/**
 * Check if a role is an admin role with full access
 */
export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role)
}

/**
 * Get all reports a role can access (combines static and DB configs)
 * This function provides backward compatibility while supporting DB-driven configs
 */
export function getAllAccessibleReports(role: UserRole): ReportConfig[] {
  // For now, use static config. DB config is handled in report-config-utils.ts
  return getVisibleReports(role)
}
