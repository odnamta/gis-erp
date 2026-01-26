import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getHrDashboardMetrics } from '@/lib/dashboard/hr-data'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign,
  Clock, 
  AlertCircle,
  TrendingUp,
  Award,
  Briefcase,
  UserPlus,
  ClipboardList,
  BarChart3,
  XCircle
} from 'lucide-react'

export const metadata = {
  title: 'HR Dashboard | Gama ERP',
  description: 'Employee management and workforce analytics',
}

// Leave status badge component
function LeaveStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {status}
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

export default async function HRDashboardPage() {
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

  // Check access: hr role or executive roles
  const allowedRoles = ['hr', 'owner', 'director']
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch real metrics using the new data service
  const metrics = await getHrDashboardMetrics(profile.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
            <p className="text-muted-foreground">
              Employee management and workforce analytics
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/hr/employees/new"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Link>
        <Link 
          href="/hr/payroll"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <DollarSign className="h-4 w-4" />
          Process Payroll
        </Link>
        <Link 
          href="/hr/leave?status=pending"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <ClipboardList className="h-4 w-4" />
          Approve Leave
          {metrics.pendingLeaveRequests > 0 && (
            <AlertIndicator type="warning" count={metrics.pendingLeaveRequests} />
          )}
        </Link>
        <Link 
          href="/hr/attendance"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <Calendar className="h-4 w-4" />
          View Attendance
        </Link>
        <Link 
          href="/hr/reports"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <BarChart3 className="h-4 w-4" />
          Generate Reports
        </Link>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4 bg-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-sm">Employee Count</h3>
          </div>
          <div className="text-2xl font-bold text-blue-700">{formatNumber(metrics.activeEmployees)}</div>
          <p className="text-sm text-muted-foreground">Active employees</p>
          {metrics.inactiveEmployees > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              +{formatNumber(metrics.inactiveEmployees)} inactive
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-sm">Attendance Today</h3>
          </div>
          <div className="text-2xl font-bold text-green-700">{metrics.attendanceRate}%</div>
          <p className="text-sm text-muted-foreground">
            {formatNumber(metrics.presentToday)} present, {formatNumber(metrics.absentToday)} absent
          </p>
        </div>

        <div className="rounded-lg border p-4 bg-orange-50">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-sm">Leave Requests</h3>
          </div>
          <div className="text-2xl font-bold text-orange-700">{formatNumber(metrics.pendingLeaveRequests)}</div>
          <p className="text-sm text-muted-foreground">Pending approvals</p>
          {metrics.approvedLeavesToday > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(metrics.approvedLeavesToday)} on leave today
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4 bg-purple-50">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-sm">Payroll This Month</h3>
          </div>
          <div className="text-2xl font-bold text-purple-700">{formatCurrency(metrics.totalPayrollThisMonth)}</div>
          <p className="text-sm text-muted-foreground">Total payroll</p>
        </div>
      </div>

      {/* Payroll Overview Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Payroll Overview</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="grid gap-4 grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-sm">Overtime Hours</h3>
                </div>
                <div className="text-2xl font-bold">{formatNumber(metrics.overtimeHoursThisMonth)}</div>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-semibold text-sm">Pending Adjustments</h3>
                  </div>
                  {metrics.pendingPayrollAdjustments > 0 && (
                    <AlertIndicator type="warning" count={metrics.pendingPayrollAdjustments} />
                  )}
                </div>
                <div className="text-2xl font-bold text-yellow-600">{formatNumber(metrics.pendingPayrollAdjustments)}</div>
                <p className="text-sm text-muted-foreground">Requires review</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3">Payroll by Department</h3>
            {metrics.payrollByDepartment.length > 0 ? (
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {metrics.payrollByDepartment.map((dept) => (
                  <div key={dept.departmentId} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">{dept.departmentName}</span>
                      <span className="text-xs text-muted-foreground">({dept.employeeCount})</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(dept.totalPayroll)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payroll data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Leave Balance Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Leave Balance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="grid gap-4 grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <h3 className="font-semibold text-sm">Days Used</h3>
                </div>
                <div className="text-2xl font-bold">{formatNumber(metrics.leaveDaysUsedThisMonth)}</div>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <h3 className="font-semibold text-sm">Low Balance</h3>
                  </div>
                  {metrics.employeesWithLowLeaveBalance > 0 && (
                    <AlertIndicator type="warning" count={metrics.employeesWithLowLeaveBalance} />
                  )}
                </div>
                <div className="text-2xl font-bold text-yellow-600">{formatNumber(metrics.employeesWithLowLeaveBalance)}</div>
                <p className="text-sm text-muted-foreground">Employees &lt; 5 days</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Utilization Rate</span>
                <span className="text-lg font-bold">{metrics.leaveUtilizationRate}%</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3">Balance by Leave Type</h3>
            {metrics.leaveBalanceSummary.length > 0 ? (
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {metrics.leaveBalanceSummary.map((type) => (
                  <div key={type.leaveTypeId} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">{type.leaveTypeName}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{formatNumber(type.totalUsed)}</span>
                      <span className="text-muted-foreground"> / {formatNumber(type.totalEntitled)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No leave balance data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Analytics Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Attendance Analytics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="grid gap-4 grid-cols-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-500" />
                    <h3 className="font-semibold text-sm">Late Arrivals</h3>
                  </div>
                  {metrics.lateArrivalsThisMonth > 10 && (
                    <AlertIndicator type="warning" count={metrics.lateArrivalsThisMonth} />
                  )}
                </div>
                <div className={`text-2xl font-bold ${metrics.lateArrivalsThisMonth > 10 ? 'text-yellow-600' : ''}`}>
                  {formatNumber(metrics.lateArrivalsThisMonth)}
                </div>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <h3 className="font-semibold text-sm">Early Departures</h3>
                </div>
                <div className="text-2xl font-bold">{formatNumber(metrics.earlyDeparturesThisMonth)}</div>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <h3 className="font-semibold text-sm">Avg Work Hours</h3>
                </div>
                <div className="text-2xl font-bold">{metrics.averageWorkHoursPerDay.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">Hours/day</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3">Attendance by Department</h3>
            {metrics.attendanceByDepartment.length > 0 ? (
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {metrics.attendanceByDepartment.map((dept) => (
                  <div key={dept.departmentId} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm">{dept.departmentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600">{dept.presentCount} present</span>
                      <span className="text-red-600">{dept.absentCount} absent</span>
                      <span className="text-yellow-600">{dept.lateCount} late</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attendance data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Employee Lifecycle Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Employee Lifecycle</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-lg border p-4 ${metrics.probationEndingSoon > 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm">Probation Ending</h3>
              </div>
              {metrics.probationEndingSoon > 0 && (
                <AlertIndicator type="warning" count={metrics.probationEndingSoon} />
              )}
            </div>
            <div className={`text-2xl font-bold ${metrics.probationEndingSoon > 0 ? 'text-yellow-600' : ''}`}>
              {formatNumber(metrics.probationEndingSoon)}
            </div>
            <p className="text-sm text-muted-foreground">Within 30 days</p>
          </div>

          <div className={`rounded-lg border p-4 ${metrics.contractRenewalsDue > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                <h3 className="font-semibold text-sm">Contract Renewals</h3>
              </div>
              {metrics.contractRenewalsDue > 0 && (
                <AlertIndicator type="warning" count={metrics.contractRenewalsDue} />
              )}
            </div>
            <div className={`text-2xl font-bold ${metrics.contractRenewalsDue > 0 ? 'text-orange-600' : ''}`}>
              {formatNumber(metrics.contractRenewalsDue)}
            </div>
            <p className="text-sm text-muted-foreground">Due within 30 days</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Work Anniversaries</h3>
            </div>
            <div className="text-2xl font-bold">{formatNumber(metrics.workAnniversariesThisMonth)}</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <h3 className="font-semibold text-sm">Resignations</h3>
            </div>
            <div className="text-2xl font-bold">{formatNumber(metrics.resignationsThisMonth)}</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leave Requests */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Leave Requests</h2>
          <div className="rounded-lg border">
            {metrics.recentLeaveRequests.length > 0 ? (
              <div className="divide-y">
                {metrics.recentLeaveRequests.map((request) => (
                  <Link 
                    key={request.id} 
                    href={`/hr/leave/${request.id}`}
                    className="p-3 flex items-center justify-between hover:bg-accent/50 block min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{request.employeeName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {request.leaveTypeName} • {request.startDate} - {request.endDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <LeaveStatusBadge status={request.status} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent leave requests
              </div>
            )}
          </div>
        </div>

        {/* Recent Attendance Corrections */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Attendance Corrections</h2>
          <div className="rounded-lg border">
            {metrics.recentAttendanceCorrections.length > 0 ? (
              <div className="divide-y">
                {metrics.recentAttendanceCorrections.map((correction) => (
                  <div 
                    key={correction.id}
                    className="p-3 flex items-center justify-between min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{correction.employeeName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {correction.attendanceDate} • {correction.correctionReason || 'No reason provided'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {correction.updatedAt}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent attendance corrections
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">New Hires</h3>
          </div>
          <div className="text-2xl font-bold">{formatNumber(metrics.newHiresThisMonth)}</div>
          <p className="text-sm text-muted-foreground">This month</p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Upcoming Birthdays</h3>
          </div>
          <div className="text-2xl font-bold">{formatNumber(metrics.upcomingBirthdays)}</div>
          <p className="text-sm text-muted-foreground">Next 7 days</p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold">Expiring Certifications</h3>
          </div>
          <div className="text-2xl font-bold text-orange-600">{formatNumber(metrics.expiringCertifications)}</div>
          <p className="text-sm text-muted-foreground">Next 30 days</p>
        </div>
      </div>
    </div>
  )
}
