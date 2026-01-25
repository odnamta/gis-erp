import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'
import { formatDate } from '@/lib/utils/format'

// =====================================================
// INTERFACES
// =====================================================

export interface IncidentBySeverity {
  critical: number
  major: number
  minor: number
}

export interface RecentIncident {
  id: string
  incidentNumber: string
  title: string
  severity: string
  status: string
  incidentDate: string
  locationType: string
}

export interface RecentPermit {
  id: string
  permitNumber: string
  permitType: string
  workLocation: string
  status: string
  validTo: string
}

export interface ExpiringTraining {
  employeeCode: string
  fullName: string
  courseName: string
  validTo: string
  daysUntilExpiry: number
}

export interface PpeReplacementDue {
  id: string
  employeeCode: string
  fullName: string
  ppeName: string
  expectedReplacementDate: string
  daysOverdue: number
}

export interface HseDashboardMetrics {
  // Safety Overview
  daysSinceLastIncident: number
  lastIncidentDate: string | null
  incidentsYtd: number
  openIncidents: number
  incidentsBySeverity: IncidentBySeverity
  recentIncidents: RecentIncident[]
  
  // Permit Status
  activePermits: number
  expiringPermits: number
  expiredPermits: number
  recentPermits: RecentPermit[]
  
  // Training Compliance
  expiringTrainingCount: number
  overdueTrainingCount: number
  trainingComplianceRate: number
  expiringTrainingList: ExpiringTraining[]
  
  // PPE Status
  ppeReplacementDueCount: number
  ppeOverdueCount: number
  employeesWithIncompletePpe: number
  ppeReplacementDueList: PpeReplacementDue[]
}

// =====================================================
// CONSTANTS
// =====================================================

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const CLOSED_INCIDENT_STATUSES = ['closed', 'resolved']
const CLOSED_PERMIT_STATUSES = ['closed', 'cancelled']

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get start of current year
 */
function getStartOfYear(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), 0, 1)
}

// =====================================================
// MAIN DATA FETCHER
// =====================================================

export async function getHseDashboardMetrics(
  role: string = 'hse'
): Promise<HseDashboardMetrics> {
  const cacheKey = await generateCacheKey('hse-dashboard-metrics', role)
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const startOfYear = getStartOfYear().toISOString()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Run all queries in parallel for performance
    const [
      // Incident metrics
      lastIncidentResult,
      incidentsYtdResult,
      openIncidentsResult,
      incidentsBySeverityResult,
      recentIncidentsResult,
      
      // Permit metrics
      activePermitsResult,
      expiringPermitsResult,
      expiredPermitsResult,
      recentPermitsResult,
      
      // Training metrics
      expiringTrainingResult,
      overdueTrainingResult,
      trainingComplianceResult,
      expiringTrainingListResult,
      
      // PPE metrics
      ppeReplacementDueResult,
      ppeOverdueResult,
      employeesWithIncompletePpeResult,
      ppeReplacementDueListResult,
    ] = await Promise.all([
      // Last incident (most recent incident_date)
      supabase
        .from('incidents')
        .select('incident_date')
        .order('incident_date', { ascending: false })
        .limit(1),
      
      // Incidents YTD
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .gte('incident_date', startOfYear),
      
      // Open incidents (status NOT IN 'closed', 'resolved')
      supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', `(${CLOSED_INCIDENT_STATUSES.join(',')})`),
      
      // Incidents by severity (YTD)
      supabase
        .from('incidents')
        .select('severity')
        .gte('incident_date', startOfYear),
      
      // Recent incidents (last 5)
      supabase
        .from('incidents')
        .select('id, incident_number, title, severity, status, incident_date, location_type')
        .order('incident_date', { ascending: false })
        .limit(5),
      
      // Active permits (status = 'active' AND valid_to >= today)
      supabase
        .from('safety_permits')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('valid_to', today),
      
      // Expiring permits (valid_to between today and today + 30 days)
      supabase
        .from('safety_permits')
        .select('id', { count: 'exact', head: true })
        .gte('valid_to', today)
        .lte('valid_to', thirtyDaysFromNow)
        .not('status', 'in', `(${CLOSED_PERMIT_STATUSES.join(',')})`),
      
      // Expired permits (valid_to < today AND status NOT IN 'closed', 'cancelled')
      supabase
        .from('safety_permits')
        .select('id', { count: 'exact', head: true })
        .lt('valid_to', today)
        .not('status', 'in', `(${CLOSED_PERMIT_STATUSES.join(',')})`),
      
      // Recent permits (last 5)
      supabase
        .from('safety_permits')
        .select('id, permit_number, permit_type, work_location, status, valid_to')
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Expiring training count (within 30 days)
      supabase
        .from('expiring_training')
        .select('employee_code', { count: 'exact', head: true })
        .gte('days_until_expiry', 0)
        .lte('days_until_expiry', 30),
      
      // Overdue training count (days_until_expiry < 0)
      supabase
        .from('expiring_training')
        .select('employee_code', { count: 'exact', head: true })
        .lt('days_until_expiry', 0),
      
      // Training compliance rate (from training_compliance view)
      supabase
        .from('training_compliance')
        .select('compliance_status, is_mandatory'),
      
      // Expiring training list (5 soonest)
      supabase
        .from('expiring_training')
        .select('employee_code, full_name, course_name, valid_to, days_until_expiry')
        .gte('days_until_expiry', 0)
        .order('days_until_expiry', { ascending: true })
        .limit(5),
      
      // PPE replacement due count
      supabase
        .from('ppe_replacement_due')
        .select('id', { count: 'exact', head: true }),
      
      // PPE overdue count (> 30 days overdue)
      supabase
        .from('ppe_replacement_due')
        .select('id', { count: 'exact', head: true })
        .gt('days_overdue', 30),
      
      // Employees with incomplete PPE
      supabase
        .from('employee_ppe_status')
        .select('employee_id')
        .neq('ppe_status', 'issued')
        .eq('is_mandatory', true),
      
      // PPE replacement due list (5 most overdue)
      supabase
        .from('ppe_replacement_due')
        .select('id, employee_code, full_name, ppe_name, expected_replacement_date, days_overdue')
        .order('days_overdue', { ascending: false })
        .limit(5),
    ])
    
    // Calculate days since last incident
    let daysSinceLastIncident = 0
    let lastIncidentDate: string | null = null
    
    if (lastIncidentResult.data && lastIncidentResult.data.length > 0) {
      const lastIncident = lastIncidentResult.data[0]
      lastIncidentDate = lastIncident.incident_date
      const incidentDate = new Date(lastIncident.incident_date)
      daysSinceLastIncident = calculateDaysBetween(incidentDate, now)
    } else {
      // No incidents - calculate days since start of year
      daysSinceLastIncident = calculateDaysBetween(getStartOfYear(), now)
    }
    
    // Calculate incidents by severity
    const incidentsBySeverity: IncidentBySeverity = {
      critical: 0,
      major: 0,
      minor: 0,
    }
    
    if (incidentsBySeverityResult.data) {
      for (const incident of incidentsBySeverityResult.data) {
        const severity = (incident.severity || '').toLowerCase()
        if (severity === 'critical') {
          incidentsBySeverity.critical++
        } else if (severity === 'major') {
          incidentsBySeverity.major++
        } else if (severity === 'minor') {
          incidentsBySeverity.minor++
        }
      }
    }
    
    // Transform recent incidents
    const recentIncidents: RecentIncident[] = (recentIncidentsResult.data || []).map(incident => ({
      id: incident.id,
      incidentNumber: incident.incident_number || '',
      title: incident.title || '',
      severity: incident.severity || '',
      status: incident.status || '',
      incidentDate: formatDate(incident.incident_date),
      locationType: incident.location_type || '',
    }))
    
    // Transform recent permits
    const recentPermits: RecentPermit[] = (recentPermitsResult.data || []).map(permit => ({
      id: permit.id,
      permitNumber: permit.permit_number || '',
      permitType: permit.permit_type || '',
      workLocation: permit.work_location || '',
      status: permit.status || '',
      validTo: formatDate(permit.valid_to),
    }))
    
    // Calculate training compliance rate
    let trainingComplianceRate = 100
    if (trainingComplianceResult.data && trainingComplianceResult.data.length > 0) {
      const mandatoryRecords = trainingComplianceResult.data.filter(r => r.is_mandatory === true)
      if (mandatoryRecords.length > 0) {
        const compliantCount = mandatoryRecords.filter(r => r.compliance_status === 'compliant').length
        trainingComplianceRate = Math.round((compliantCount / mandatoryRecords.length) * 100)
      }
    }
    
    // Transform expiring training list
    const expiringTrainingList: ExpiringTraining[] = (expiringTrainingListResult.data || []).map(training => ({
      employeeCode: training.employee_code || '',
      fullName: training.full_name || '',
      courseName: training.course_name || '',
      validTo: formatDate(training.valid_to),
      daysUntilExpiry: training.days_until_expiry || 0,
    }))
    
    // Count unique employees with incomplete PPE
    const uniqueEmployeesWithIncompletePpe = new Set(
      (employeesWithIncompletePpeResult.data || []).map(r => r.employee_id)
    ).size
    
    // Transform PPE replacement due list
    const ppeReplacementDueList: PpeReplacementDue[] = (ppeReplacementDueListResult.data || []).map(ppe => ({
      id: ppe.id || '',
      employeeCode: ppe.employee_code || '',
      fullName: ppe.full_name || '',
      ppeName: ppe.ppe_name || '',
      expectedReplacementDate: formatDate(ppe.expected_replacement_date),
      daysOverdue: ppe.days_overdue || 0,
    }))
    
    return {
      // Safety Overview
      daysSinceLastIncident,
      lastIncidentDate,
      incidentsYtd: incidentsYtdResult.count || 0,
      openIncidents: openIncidentsResult.count || 0,
      incidentsBySeverity,
      recentIncidents,
      
      // Permit Status
      activePermits: activePermitsResult.count || 0,
      expiringPermits: expiringPermitsResult.count || 0,
      expiredPermits: expiredPermitsResult.count || 0,
      recentPermits,
      
      // Training Compliance
      expiringTrainingCount: expiringTrainingResult.count || 0,
      overdueTrainingCount: overdueTrainingResult.count || 0,
      trainingComplianceRate,
      expiringTrainingList,
      
      // PPE Status
      ppeReplacementDueCount: ppeReplacementDueResult.count || 0,
      ppeOverdueCount: ppeOverdueResult.count || 0,
      employeesWithIncompletePpe: uniqueEmployeesWithIncompletePpe,
      ppeReplacementDueList,
    }
  }, CACHE_TTL)
}
