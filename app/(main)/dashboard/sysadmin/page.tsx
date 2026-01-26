import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSysadminDashboardMetrics } from '@/lib/dashboard/sysadmin-data'
import { formatDateTime, formatNumber } from '@/lib/utils/format'
import { 
  Settings, 
  Users, 
  Activity, 
  Clock, 
  UserPlus, 
  FileText, 
  Eye, 
  LogIn, 
  Shield,
  UserCheck,
  CalendarDays,
  TrendingUp,
  Zap
} from 'lucide-react'

export const metadata = {
  title: 'System Admin Dashboard | Gama ERP',
  description: 'System health and user management',
}

// Action type badge component with color coding
function ActionTypeBadge({ actionType }: { actionType: string }) {
  const colors: Record<string, string> = {
    login: 'bg-green-100 text-green-800',
    page_view: 'bg-blue-100 text-blue-800',
    create: 'bg-purple-100 text-purple-800',
    update: 'bg-yellow-100 text-yellow-800',
    delete: 'bg-red-100 text-red-800',
    approve: 'bg-orange-100 text-orange-800',
    reject: 'bg-orange-100 text-orange-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[actionType.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {actionType.replace('_', ' ')}
    </span>
  )
}

// Role badge component
function RoleBadge({ role }: { role: string }) {
  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    director: 'bg-blue-100 text-blue-800',
    sysadmin: 'bg-slate-100 text-slate-800',
    finance_manager: 'bg-green-100 text-green-800',
    operations_manager: 'bg-orange-100 text-orange-800',
    marketing_manager: 'bg-pink-100 text-pink-800',
    hr: 'bg-cyan-100 text-cyan-800',
    finance: 'bg-emerald-100 text-emerald-800',
    ops: 'bg-amber-100 text-amber-800',
    marketing: 'bg-rose-100 text-rose-800',
    engineer: 'bg-indigo-100 text-indigo-800',
    hse: 'bg-teal-100 text-teal-800',
    agency: 'bg-violet-100 text-violet-800',
    customs: 'bg-lime-100 text-lime-800',
    administration: 'bg-sky-100 text-sky-800',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${roleColors[role.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {role.replace('_', ' ')}
    </span>
  )
}

export default async function SysadminDashboardPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check access: sysadmin, owner, director roles only
  const allowedRoles = ['sysadmin', 'owner', 'director']
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch metrics using the data service
  const metrics = await getSysadminDashboardMetrics(profile.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-slate-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System health and user management
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/settings/users"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <Users className="h-4 w-4" />
          User Management
        </Link>
        <Link 
          href="/settings/activity"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <Activity className="h-4 w-4" />
          View Activity Logs
        </Link>
        <Link 
          href="/settings"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <Settings className="h-4 w-4" />
          System Settings
        </Link>
        <Link 
          href="/settings/users"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border hover:bg-accent min-h-[44px]"
        >
          <Eye className="h-4 w-4" />
          View All Users
        </Link>
      </div>

      {/* User Statistics Row */}
      <div>
        <h2 className="text-lg font-semibold mb-3">User Statistics</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border p-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-sm">Total Users</h3>
            </div>
            <div className="text-2xl font-bold text-slate-700">{formatNumber(metrics.totalUsers)}</div>
            <p className="text-sm text-muted-foreground">All registered users</p>
          </div>

          <div className="rounded-lg border p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-sm">Active Users</h3>
            </div>
            <div className="text-2xl font-bold text-green-700">{formatNumber(metrics.activeUsers)}</div>
            <p className="text-sm text-muted-foreground">Currently active</p>
          </div>

          <div className="rounded-lg border p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-sm">Active Today</h3>
            </div>
            <div className="text-2xl font-bold text-blue-700">{formatNumber(metrics.activeToday)}</div>
            <p className="text-sm text-muted-foreground">Logged in today</p>
          </div>

          <div className="rounded-lg border p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-sm">Active This Week</h3>
            </div>
            <div className="text-2xl font-bold text-purple-700">{formatNumber(metrics.activeThisWeek)}</div>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </div>

          <div className="rounded-lg border p-4 bg-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-sm">New This Month</h3>
            </div>
            <div className="text-2xl font-bold text-orange-700">{formatNumber(metrics.newUsersThisMonth)}</div>
            <p className="text-sm text-muted-foreground">New registrations</p>
          </div>
        </div>
      </div>

      {/* System Activity Row */}
      <div>
        <h2 className="text-lg font-semibold mb-3">System Activity</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="rounded-lg border p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-sm">Logins Today</h3>
            </div>
            <div className="text-2xl font-bold text-green-700">{formatNumber(metrics.loginsToday)}</div>
            <p className="text-sm text-muted-foreground">User logins</p>
          </div>

          <div className="rounded-lg border p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-sm">Page Views Today</h3>
            </div>
            <div className="text-2xl font-bold text-blue-700">{formatNumber(metrics.pageViewsToday)}</div>
            <p className="text-sm text-muted-foreground">Pages viewed</p>
          </div>

          <div className="rounded-lg border p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-sm">Total Actions Today</h3>
            </div>
            <div className="text-2xl font-bold text-purple-700">{formatNumber(metrics.totalActionsToday)}</div>
            <p className="text-sm text-muted-foreground">All actions</p>
          </div>

          <div className="rounded-lg border p-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-sm">Actions/Hour</h3>
            </div>
            <div className="text-2xl font-bold text-slate-700">{metrics.actionsPerHour.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">Average rate</p>
          </div>
        </div>
      </div>

      {/* Role Distribution Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Role Distribution</h2>
        <div className="rounded-lg border p-4">
          {metrics.roleDistribution.length > 0 ? (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {metrics.roleDistribution.map((item) => (
                <div key={item.role} className="flex items-center justify-between p-3 rounded-md bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <RoleBadge role={item.role} />
                  </div>
                  <span className="text-lg font-bold text-slate-700">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No role distribution data available</p>
          )}
        </div>
      </div>

      {/* Recent Activity Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="rounded-lg border">
            {metrics.recentActivities.length > 0 ? (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {metrics.recentActivities.map((activity) => (
                  <div 
                    key={activity.id}
                    className="p-3 flex items-center justify-between min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{activity.userEmail || 'Unknown user'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.pagePath || activity.resourceType || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <ActionTypeBadge actionType={activity.actionType} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Recent Document Changes */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Document Changes</h2>
          <div className="rounded-lg border">
            {metrics.recentDocumentChanges.length > 0 ? (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {metrics.recentDocumentChanges.map((change) => (
                  <div 
                    key={change.id}
                    className="p-3 flex items-center justify-between min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{change.userName || 'Unknown user'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        <span className="capitalize">{change.documentType}</span>
                        {change.documentNumber && ` • ${change.documentNumber}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <ActionTypeBadge actionType={change.actionType} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(change.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                No recent document changes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
