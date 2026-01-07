// Report Execution Service
// Handles logging report executions and retrieving recent reports

import { createClient } from '@/lib/supabase/client'
import { ReportExecution, RecentReport } from '@/types/reports'

export type ExportFormat = 'view' | 'pdf' | 'excel' | 'csv'

/**
 * Validate export format
 */
export function validateExportFormat(format: string): format is ExportFormat {
  return ['view', 'pdf', 'excel', 'csv'].includes(format)
}

/**
 * Log a report execution
 */
export async function logReportExecution(params: {
  reportCode: string
  userId: string
  parameters?: Record<string, unknown>
  exportFormat?: ExportFormat | null
}): Promise<{ success: boolean; error?: string }> {
  const { reportCode, userId, parameters = {}, exportFormat = null } = params
  
  // Validate export format if provided
  if (exportFormat && !validateExportFormat(exportFormat)) {
    return { success: false, error: 'Invalid export format' }
  }
  
  const supabase = createClient()
  
  const { error } = await supabase
    .from('report_executions')
    .insert({
      report_code: reportCode,
      executed_by: userId,
      parameters: parameters as unknown,
      export_format: exportFormat,
      executed_at: new Date().toISOString(),
    } as never)
  
  if (error) {
    console.error('Error logging report execution:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Get recent reports for a user
 */
export async function getRecentReports(
  userId: string,
  limit: number = 5
): Promise<RecentReport[]> {
  const supabase = createClient()
  
  // Get recent executions with report configurations
  const { data: executions, error } = await supabase
    .from('report_executions')
    .select('report_code, executed_at')
    .eq('executed_by', userId)
    .order('executed_at', { ascending: false })
    .limit(limit * 2) // Get more to deduplicate
  
  if (error) {
    console.error('Error fetching recent reports:', error)
    return []
  }
  
  if (!executions || executions.length === 0) {
    return []
  }
  
  // Get unique report codes
  const uniqueCodes = [...new Set(executions.map(e => e.report_code))]
  const limitedCodes = uniqueCodes.slice(0, limit)
  
  // Get report configurations for these codes
  const { data: configs, error: configError } = await supabase
    .from('report_configurations')
    .select('report_code, report_name, href')
    .in('report_code', limitedCodes)
    .eq('is_active', true)
  
  if (configError) {
    console.error('Error fetching report configurations:', configError)
    return []
  }
  
  // Build recent reports list
  const configMap = new Map(configs?.map(c => [c.report_code, c]) || [])
  const recentReports: RecentReport[] = []
  const seenCodes = new Set<string>()
  
  for (const execution of executions) {
    if (seenCodes.has(execution.report_code)) continue
    if (recentReports.length >= limit) break
    
    const config = configMap.get(execution.report_code)
    if (config) {
      recentReports.push({
        report_code: execution.report_code,
        report_name: config.report_name,
        href: config.href || `/reports/${execution.report_code}`,
        executed_at: execution.executed_at || '',
      })
      seenCodes.add(execution.report_code)
    }
  }
  
  return recentReports
}

/**
 * Get execution history for a specific report
 */
export async function getReportExecutionHistory(
  reportCode: string,
  limit: number = 10
): Promise<ReportExecution[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('report_executions')
    .select('*')
    .eq('report_code', reportCode)
    .order('executed_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching report execution history:', error)
    return []
  }
  
  return (data || []) as unknown as ReportExecution[]
}

/**
 * Log export action (convenience wrapper)
 */
export async function logExportAction(params: {
  reportCode: string
  userId: string
  exportFormat: ExportFormat
  parameters?: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  return logReportExecution({
    reportCode: params.reportCode,
    userId: params.userId,
    parameters: params.parameters,
    exportFormat: params.exportFormat,
  })
}
