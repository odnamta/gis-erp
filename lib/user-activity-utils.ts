/**
 * User Activity Utilities (v0.13.1)
 * 
 * Utility functions for the activity viewer page.
 */

import type { ResourceType } from '@/types/activity';

/**
 * Generate navigation URL for a resource based on its type and ID.
 * Returns null if the resource type doesn't have a viewable page.
 */
export function getResourceUrl(resourceType: ResourceType | null, resourceId: string | null): string | null {
  if (!resourceType || !resourceId) {
    return null;
  }

  const urlMap: Record<ResourceType, string> = {
    customer: `/customers/${resourceId}`,
    pjo: `/proforma-jo/${resourceId}`,
    job_order: `/job-orders/${resourceId}`,
    invoice: `/invoices/${resourceId}`,
    disbursement: `/disbursements/${resourceId}`,
    employee: `/hr/employees/${resourceId}`,
    project: `/projects/${resourceId}`,
    quotation: `/quotations/${resourceId}`,
  };

  return urlMap[resourceType] || null;
}

/**
 * Get human-readable label for action type
 */
export function getActionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    page_view: 'Viewed Page',
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    login: 'Logged In',
    logout: 'Logged Out',
    approve: 'Approved',
    reject: 'Rejected',
  };
  return labels[actionType] || actionType;
}

/**
 * Get human-readable label for resource type
 */
export function getResourceTypeLabel(resourceType: string | null): string {
  if (!resourceType) return '';
  
  const labels: Record<string, string> = {
    customer: 'Customer',
    pjo: 'PJO',
    job_order: 'Job Order',
    invoice: 'Invoice',
    disbursement: 'Disbursement',
    employee: 'Employee',
    project: 'Project',
    quotation: 'Quotation',
  };
  return labels[resourceType] || resourceType;
}

/**
 * Get badge color class for action type
 */
export function getActionTypeBadgeColor(actionType: string): string {
  const colors: Record<string, string> = {
    page_view: 'bg-gray-100 text-gray-700',
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    login: 'bg-purple-100 text-purple-700',
    logout: 'bg-gray-100 text-gray-700',
    approve: 'bg-emerald-100 text-emerald-700',
    reject: 'bg-orange-100 text-orange-700',
  };
  return colors[actionType] || 'bg-gray-100 text-gray-700';
}

/**
 * Calculate date range for filters
 */
export function getDateRangeFilter(range: 'today' | 'last_7_days' | 'last_30_days'): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  
  switch (range) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_7_days':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_30_days':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}
