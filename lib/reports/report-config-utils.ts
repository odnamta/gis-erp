// Report Configuration Utilities
// Database-driven report configuration management

import { createClient } from '@/lib/supabase/client'
import { ReportConfigurationDB, ReportCategoryDB, CATEGORY_CONFIG_DB } from '@/types/reports'

/**
 * Get all active report configurations for a user role
 */
export async function getReportConfigurations(role: string): Promise<ReportConfigurationDB[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('report_configurations')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching report configurations:', error)
    return []
  }
  
  // Filter by role
  return ((data || []) as unknown as ReportConfigurationDB[]).filter(report => 
    report.allowed_roles?.includes(role) ?? false
  )
}

/**
 * Get a single report configuration by code
 */
export async function getReportByCode(code: string): Promise<ReportConfigurationDB | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('report_configurations')
    .select('*')
    .eq('report_code', code)
    .eq('is_active', true)
    .single()
  
  if (error) {
    console.error('Error fetching report by code:', error)
    return null
  }
  
  return data as unknown as ReportConfigurationDB
}

/**
 * Check if a user role can access a specific report (database-driven)
 */
export async function canAccessReportDB(role: string, reportCode: string): Promise<boolean> {
  const report = await getReportByCode(reportCode)
  if (!report) return false
  return report.allowed_roles.includes(role)
}

/**
 * Get reports grouped by category for a specific role
 */
export async function getReportsByCategoryDB(
  role: string
): Promise<Record<ReportCategoryDB, ReportConfigurationDB[]>> {
  const reports = await getReportConfigurations(role)
  
  const grouped: Record<ReportCategoryDB, ReportConfigurationDB[]> = {
    operations: [],
    finance: [],
    sales: [],
    executive: [],
  }
  
  for (const report of reports) {
    const category = report.report_category as ReportCategoryDB
    if (grouped[category]) {
      grouped[category].push(report)
    }
  }
  
  // Sort each category by display_order
  for (const category of Object.keys(grouped) as ReportCategoryDB[]) {
    grouped[category].sort((a, b) => a.display_order - b.display_order)
  }
  
  return grouped
}

/**
 * Filter reports by search query (name or description)
 * Case-insensitive search
 */
export function filterReportsBySearch(
  reports: ReportConfigurationDB[],
  query: string
): ReportConfigurationDB[] {
  if (!query || query.trim() === '') {
    return reports
  }
  
  const lowerQuery = query.toLowerCase().trim()
  
  return reports.filter(report => {
    const nameMatch = report.report_name.toLowerCase().includes(lowerQuery)
    const descMatch = report.description?.toLowerCase().includes(lowerQuery) ?? false
    return nameMatch || descMatch
  })
}

/**
 * Get category display name
 */
export function getCategoryDisplayNameDB(category: ReportCategoryDB): string {
  return CATEGORY_CONFIG_DB[category]?.name ?? category
}

/**
 * Get category icon
 */
export function getCategoryIconDB(category: ReportCategoryDB): string {
  return CATEGORY_CONFIG_DB[category]?.icon ?? 'FileText'
}

/**
 * Sort reports by display order
 */
export function sortReportsByDisplayOrder(
  reports: ReportConfigurationDB[]
): ReportConfigurationDB[] {
  return [...reports].sort((a, b) => a.display_order - b.display_order)
}
