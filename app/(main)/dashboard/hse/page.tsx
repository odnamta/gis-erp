import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getHseDashboardMetrics } from '@/lib/dashboard/hse-data'
import { formatDate, formatNumber, formatPercent } from '@/lib/utils/format'
import { 
  Shield, 
  AlertTriangle, 
  FileCheck, 
  GraduationCap, 
  HardHat,
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  ArrowRight,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react'

export const metadata = {
  title: 'HSE Dashboard | Gama ERP',
  description: 'Health, Safety, and Environment metrics overview',
}

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    major: 'bg-orange-100 text-orange-800',
    minor: 'bg-yellow-100 text-yellow-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[severity.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {severity}
    </span>
  )
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    investigating: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    active: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-orange-100 text-orange-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-purple-100 text-purple-800',
  }
  
  const label = status.replace(/_/g, ' ')
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  )
}

// Alert indicator component
function AlertIndicator({ type, count }: { type: 'danger' | 'warning' | 'success'; count: number }) {
  if (count === 0) return null
  
  const colors = {
    danger: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
  }
  
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white ${colors[type]}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Compliance rate indicator
function ComplianceIndicator({ rate }: { rate: number }) {
  let colorClass = 'text-red-600'
  if (rate >= 90) colorClass = 'text-green-600'
  else if (rate >= 70) colorClass = 'text-yellow-600'
  
  return <span className={`font-bold ${colorClass}`}>{formatPercent(rate)}</span>
}

// Days since incident counter
function DaysSinceIncidentCounter({ days, isWarning }: { days: number; isWarning: boolean }) {
  return (
    <div className={`rounded-lg border-2 p-6 text-center ${isWarning ? 'border-yellow-500 bg-yellow-50' : 'border-green-500 bg-green-50'}`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <Shield className={`h-6 w-6 ${isWarning ? 'text-yellow-600' : 'text-green-600'}`} />
        <span className="text-sm font-medium text-muted-foreground">Days Since Last Incident</span>
      </div>
      <div className={`text-5xl font-bold ${isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
        {days}
      </div>
      {isWarning && (
        <p className="text-sm text-yellow-600 mt-2 flex items-center justify-center gap-1">
          <AlertTriangle className="h-4 w-4" />
          Recent incident - stay vigilant
        </p>
      )}
    </div>
  )
}

export default async function HseDashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check access: hse role or executive roles
  const allowedRoles = ['hse', 'owner', 'director', 'operations_manager']
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch real metrics
  const metrics = await getHseDashboardMetrics(profile.role)
  
  // Determine if days since incident is a warning (< 7 days)
  const isIncidentWarning = metrics.daysSinceLastIncident < 7

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HSE Dashboard</h1>
          <p className="text-muted-foreground">
            Health, Safety, and Environment metrics
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/hse/incidents/new"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          Report Incident
        </Link>
        <Link 
          href="/hse/incidents"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          View All Incidents
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link 
          href="/hse/training"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          View Training Records
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link 
          href="/hse/ppe"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          View PPE Status
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Days Since Last Incident - Prominent */}
      <DaysSinceIncidentCounter days={metrics.daysSinceLastIncident} isWarning={isIncidentWarning} />

      {/* Safety Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Safety Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Incidents YTD</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.incidentsYtd)}</div>
            <p className="text-sm text-muted-foreground">Year to date</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm">Open Incidents</h3>
              </div>
              {metrics.openIncidents > 0 && <AlertIndicator type="danger" count={metrics.openIncidents} />}
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.openIncidents)}</div>
            <p className="text-sm text-muted-foreground">Unresolved</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <h3 className="font-semibold text-sm">Critical</h3>
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600">{formatNumber(metrics.incidentsBySeverity.critical)}</div>
            <p className="text-sm text-muted-foreground">YTD</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Major / Minor</h3>
            </div>
            <div className="text-2xl font-bold mt-2">
              <span className="text-orange-600">{metrics.incidentsBySeverity.major}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-yellow-600">{metrics.incidentsBySeverity.minor}</span>
            </div>
            <p className="text-sm text-muted-foreground">YTD</p>
          </div>
        </div>
      </div>

      {/* Permit Status */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Permit Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold text-sm">Active Permits</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.activePermits)}</div>
            <p className="text-sm text-muted-foreground">Currently valid</p>
          </div>
          <div className="rounded-lg border p-4 border-yellow-200 bg-yellow-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Expiring Soon</h3>
              </div>
              {metrics.expiringPermits > 0 && <AlertIndicator type="warning" count={metrics.expiringPermits} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-yellow-600">{formatNumber(metrics.expiringPermits)}</div>
            <p className="text-sm text-muted-foreground">Within 30 days</p>
          </div>
          <div className="rounded-lg border p-4 border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm">Expired</h3>
              </div>
              {metrics.expiredPermits > 0 && <AlertIndicator type="danger" count={metrics.expiredPermits} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600">{formatNumber(metrics.expiredPermits)}</div>
            <p className="text-sm text-muted-foreground">Requires renewal</p>
          </div>
        </div>
      </div>

      {/* Training Compliance */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Training Compliance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Compliance Rate</h3>
            </div>
            <div className="text-2xl font-bold mt-2">
              <ComplianceIndicator rate={metrics.trainingComplianceRate} />
            </div>
            <p className="text-sm text-muted-foreground">Mandatory training</p>
          </div>
          <div className="rounded-lg border p-4 border-yellow-200 bg-yellow-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Expiring Soon</h3>
              </div>
              {metrics.expiringTrainingCount > 0 && <AlertIndicator type="warning" count={metrics.expiringTrainingCount} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-yellow-600">{formatNumber(metrics.expiringTrainingCount)}</div>
            <p className="text-sm text-muted-foreground">Within 30 days</p>
          </div>
          <div className="rounded-lg border p-4 border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm">Overdue</h3>
              </div>
              {metrics.overdueTrainingCount > 0 && <AlertIndicator type="danger" count={metrics.overdueTrainingCount} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600">{formatNumber(metrics.overdueTrainingCount)}</div>
            <p className="text-sm text-muted-foreground">Requires immediate action</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Employees</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.expiringTrainingList.length)}</div>
            <p className="text-sm text-muted-foreground">Need attention</p>
          </div>
        </div>
      </div>

      {/* PPE Status */}
      <div>
        <h2 className="text-lg font-semibold mb-3">PPE Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4 border-yellow-200 bg-yellow-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Replacement Due</h3>
              </div>
              {metrics.ppeReplacementDueCount > 0 && <AlertIndicator type="warning" count={metrics.ppeReplacementDueCount} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-yellow-600">{formatNumber(metrics.ppeReplacementDueCount)}</div>
            <p className="text-sm text-muted-foreground">Items need replacement</p>
          </div>
          <div className="rounded-lg border p-4 border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm">Overdue (&gt;30 days)</h3>
              </div>
              {metrics.ppeOverdueCount > 0 && <AlertIndicator type="danger" count={metrics.ppeOverdueCount} />}
            </div>
            <div className="text-2xl font-bold mt-2 text-red-600">{formatNumber(metrics.ppeOverdueCount)}</div>
            <p className="text-sm text-muted-foreground">Critical - replace immediately</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                <h3 className="font-semibold text-sm">Incomplete PPE</h3>
              </div>
              {metrics.employeesWithIncompletePpe > 0 && <AlertIndicator type="warning" count={metrics.employeesWithIncompletePpe} />}
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.employeesWithIncompletePpe)}</div>
            <p className="text-sm text-muted-foreground">Employees missing mandatory PPE</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Incidents */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Incidents</h2>
          <div className="rounded-lg border">
            {metrics.recentIncidents.length > 0 ? (
              <div className="divide-y">
                {metrics.recentIncidents.map((incident) => (
                  <Link 
                    key={incident.id} 
                    href={`/hse/incidents/${incident.id}`}
                    className="p-3 flex items-center justify-between hover:bg-accent/50 block"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{incident.incidentNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {incident.title || 'Untitled Incident'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {incident.incidentDate}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent incidents
              </div>
            )}
          </div>
        </div>

        {/* Recent Permits */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Permits</h2>
          <div className="rounded-lg border">
            {metrics.recentPermits.length > 0 ? (
              <div className="divide-y">
                {metrics.recentPermits.map((permit) => (
                  <Link 
                    key={permit.id} 
                    href={`/hse/permits/${permit.id}`}
                    className="p-3 flex items-center justify-between hover:bg-accent/50 block"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{permit.permitNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {permit.permitType} - {permit.workLocation || 'Unknown location'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <StatusBadge status={permit.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Valid to: {permit.validTo}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent permits
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expiring Training & PPE Replacement Due */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expiring Training */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Expiring Training</h2>
          <div className="rounded-lg border">
            {metrics.expiringTrainingList.length > 0 ? (
              <div className="divide-y">
                {metrics.expiringTrainingList.map((training, index) => (
                  <div 
                    key={`${training.employeeCode}-${index}`}
                    className={`p-3 flex items-center justify-between ${training.daysUntilExpiry <= 7 ? 'bg-red-50' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{training.fullName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {training.courseName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs font-medium ${training.daysUntilExpiry <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {training.daysUntilExpiry} days
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {training.validTo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No expiring training
              </div>
            )}
          </div>
        </div>

        {/* PPE Replacement Due */}
        <div>
          <h2 className="text-lg font-semibold mb-3">PPE Replacement Due</h2>
          <div className="rounded-lg border">
            {metrics.ppeReplacementDueList.length > 0 ? (
              <div className="divide-y">
                {metrics.ppeReplacementDueList.map((ppe) => (
                  <div 
                    key={ppe.id}
                    className={`p-3 flex items-center justify-between ${ppe.daysOverdue > 30 ? 'bg-red-50' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{ppe.fullName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {ppe.ppeName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs font-medium ${ppe.daysOverdue > 30 ? 'text-red-600' : 'text-orange-600'}`}>
                        {ppe.daysOverdue} days overdue
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {ppe.expectedReplacementDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No PPE replacement due
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
