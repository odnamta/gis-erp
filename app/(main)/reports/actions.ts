'use server'

import { createClient } from '@/lib/supabase/server'
import { ReportConfigurationDB, ReportCategoryDB } from '@/types/reports'

/**
 * Server-side: Get reports grouped by category for a specific role
 */
export async function getReportsByCategoryServer(
  role: string
): Promise<Record<ReportCategoryDB, ReportConfigurationDB[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('report_configurations')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const grouped: Record<ReportCategoryDB, ReportConfigurationDB[]> = {
    operations: [],
    finance: [],
    sales: [],
    executive: [],
  }

  if (error || !data) return grouped

  const reports = (data as unknown as ReportConfigurationDB[]).filter(
    (report) => report.allowed_roles?.includes(role) ?? false
  )

  for (const report of reports) {
    const category = report.report_category as ReportCategoryDB
    if (grouped[category]) {
      grouped[category].push(report)
    }
  }

  return grouped
}

/**
 * Server-side: Get recent reports for a user (eliminates client-side waterfall)
 */
export async function getRecentReportsServer(
  userId: string,
  limit: number = 5
): Promise<{ report_code: string; report_name: string; href: string; executed_at: string }[]> {
  const supabase = await createClient()

  const { data: executions, error } = await supabase
    .from('report_executions')
    .select('report_code, executed_at')
    .eq('executed_by', userId)
    .order('executed_at', { ascending: false })
    .limit(limit * 2)

  if (error || !executions?.length) return []

  const uniqueCodes = [...new Set(executions.map(e => e.report_code))]
  const limitedCodes = uniqueCodes.slice(0, limit)

  const { data: configs } = await supabase
    .from('report_configurations')
    .select('report_code, report_name, href')
    .in('report_code', limitedCodes)
    .eq('is_active', true)

  const configMap = new Map((configs || []).map(c => [c.report_code, c]))
  const result: { report_code: string; report_name: string; href: string; executed_at: string }[] = []
  const seenCodes = new Set<string>()

  for (const execution of executions) {
    if (seenCodes.has(execution.report_code)) continue
    if (result.length >= limit) break
    const config = configMap.get(execution.report_code)
    if (config) {
      result.push({
        report_code: execution.report_code,
        report_name: config.report_name,
        href: config.href || `/reports/${execution.report_code}`,
        executed_at: execution.executed_at || '',
      })
      seenCodes.add(execution.report_code)
    }
  }

  return result
}
