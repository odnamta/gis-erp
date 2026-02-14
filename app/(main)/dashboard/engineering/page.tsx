import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEngineeringDashboardMetrics } from '@/lib/dashboard/engineering-data'
import { formatDate, formatNumber, formatPercent } from '@/lib/utils/format'
import { 
  MapPin, 
  FileText, 
  ClipboardCheck, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  ArrowRight,
  Truck,
  User
} from 'lucide-react'

export const metadata = {
  title: 'Engineering Dashboard | Gama ERP',
  description: 'Route surveys, JMPs, and engineering assessments overview',
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    requested: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    active: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-orange-100 text-orange-800',
    pending_review: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  
  const label = status.replace(/_/g, ' ')
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  )
}

// Risk level badge
function RiskBadge({ level }: { level: string | null }) {
  if (!level) return null
  
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[level] || 'bg-gray-100 text-gray-800'}`}>
      {level}
    </span>
  )
}

// Assignment type icon
function AssignmentIcon({ type }: { type: 'survey' | 'jmp' | 'assessment' }) {
  switch (type) {
    case 'survey':
      return <MapPin className="h-4 w-4 text-blue-500" />
    case 'jmp':
      return <Truck className="h-4 w-4 text-purple-500" />
    case 'assessment':
      return <ClipboardCheck className="h-4 w-4 text-orange-500" />
  }
}

export default async function EngineeringDashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, department_scope, user_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check access: engineer role or manager with engineering scope
  const hasAccess = profile.role === 'engineer' ||
    ['owner', 'director', 'marketing_manager', 'marketing', 'operations_manager'].includes(profile.role)

  if (!hasAccess) {
    redirect('/dashboard')
  }

  // Fetch real metrics with user ID for "My Assignments"
  const metrics = await getEngineeringDashboardMetrics(user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Engineering Dashboard</h1>
          <p className="text-muted-foreground">
            Route surveys, JMPs, and engineering assessments
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/engineering/surveys/new"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New Survey
        </Link>
        <Link 
          href="/engineering/jmp/new"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New JMP
        </Link>
        <Link 
          href="/engineering/surveys"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          View All Surveys
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link 
          href="/engineering/jmp"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent"
        >
          View All JMPs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Survey Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Survey Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Total Surveys</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.totalSurveys)}</div>
            <p className="text-sm text-muted-foreground">All time</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <h3 className="font-semibold text-sm">Pending</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.pendingSurveys)}</div>
            <p className="text-sm text-muted-foreground">Awaiting completion</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold text-sm">Completed</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.surveysCompletedThisMonth)}</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">My Surveys</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.mySurveyCount)}</div>
            <p className="text-sm text-muted-foreground">Assigned to me</p>
          </div>
        </div>
      </div>

      {/* JMP Status */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Journey Management Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-500" />
              <h3 className="font-semibold text-sm">Active JMPs</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.activeJmps)}</div>
            <p className="text-sm text-muted-foreground">In progress</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Upcoming</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.upcomingJmps)}</div>
            <p className="text-sm text-muted-foreground">Next 7 days</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Pending Review</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.pendingReviewJmps)}</div>
            <p className="text-sm text-muted-foreground">Awaiting approval</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              <h3 className="font-semibold text-sm">My JMPs</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.myJmpCount)}</div>
            <p className="text-sm text-muted-foreground">Assigned to me</p>
          </div>
        </div>
      </div>

      {/* Assessment Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Engineering Assessments</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Total</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.totalAssessments)}</div>
            <p className="text-sm text-muted-foreground">All assessments</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Pending</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.pendingAssessments)}</div>
            <p className="text-sm text-muted-foreground">Awaiting completion</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold text-sm">Completed</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatNumber(metrics.assessmentsCompletedThisMonth)}</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Completion Rate</h3>
            </div>
            <div className="text-2xl font-bold mt-2">{formatPercent(metrics.completionRate)}</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </div>
        </div>
      </div>

      {/* My Assignments & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Assignments */}
        <div>
          <h2 className="text-lg font-semibold mb-3">My Assignments ({metrics.myAssignments.length})</h2>
          <div className="rounded-lg border">
            {metrics.myAssignments.length > 0 ? (
              <div className="divide-y">
                {metrics.myAssignments.map((assignment) => (
                  <div key={`${assignment.type}-${assignment.id}`} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <AssignmentIcon type={assignment.type} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{assignment.title}</p>
                        {assignment.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due: {formatDate(assignment.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <StatusBadge status={assignment.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No pending assignments
              </div>
            )}
          </div>
        </div>

        {/* Recent Surveys */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Surveys</h2>
          <div className="rounded-lg border">
            {metrics.recentSurveys.length > 0 ? (
              <div className="divide-y">
                {metrics.recentSurveys.map((survey) => (
                  <Link 
                    key={survey.id} 
                    href={`/engineering/surveys/${survey.id}`}
                    className="p-3 flex items-center justify-between hover:bg-accent/50 block"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{survey.surveyNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {survey.originLocation || 'Unknown'} → {survey.destinationLocation || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <StatusBadge status={survey.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(survey.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent surveys
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent JMPs & Assessments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent JMPs */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent JMPs</h2>
          <div className="rounded-lg border">
            {metrics.recentJmps.length > 0 ? (
              <div className="divide-y">
                {metrics.recentJmps.map((jmp) => (
                  <Link 
                    key={jmp.id} 
                    href={`/engineering/jmp/${jmp.id}`}
                    className="p-3 flex items-center justify-between hover:bg-accent/50 block"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{jmp.jmpNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {jmp.journeyTitle || 'Untitled Journey'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <StatusBadge status={jmp.status} />
                      {jmp.plannedDeparture && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(jmp.plannedDeparture)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent JMPs
              </div>
            )}
          </div>
        </div>

        {/* Recent Assessments */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Assessments</h2>
          <div className="rounded-lg border">
            {metrics.recentAssessments.length > 0 ? (
              <div className="divide-y">
                {metrics.recentAssessments.map((assessment) => (
                  <Link 
                    key={assessment.id} 
                    href={`/engineering/assessments/${assessment.id}`}
                    className="p-3 flex items-center justify-between hover:bg-accent/50 block"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {assessment.pjoNumber || assessment.assessmentType || 'Assessment'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {assessment.assessmentType || 'Technical Assessment'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <RiskBadge level={assessment.riskLevel} />
                      <StatusBadge status={assessment.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(assessment.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent assessments
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
