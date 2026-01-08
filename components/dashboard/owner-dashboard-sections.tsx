'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  FileText,
  Briefcase,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { OwnerUserMetrics, OwnerSystemKPIs, RecentLogin } from '@/lib/dashboard-cache-actions'

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800',
  director: 'bg-indigo-100 text-indigo-800',
  manager: 'bg-blue-100 text-blue-800',
  sysadmin: 'bg-red-100 text-red-800',
  administration: 'bg-pink-100 text-pink-800',
  finance: 'bg-purple-100 text-purple-800',
  marketing: 'bg-yellow-100 text-yellow-800',
  ops: 'bg-green-100 text-green-800',
  engineer: 'bg-cyan-100 text-cyan-800',
  hr: 'bg-orange-100 text-orange-800',
  hse: 'bg-teal-100 text-teal-800',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * User Metrics KPI Cards
 */
export function UserMetricsSection({ data }: { data: OwnerUserMetrics }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalUsers}</div>
          <p className="text-xs text-muted-foreground">Registered in system</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <UserCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{data.activeUsers}</div>
          <p className="text-xs text-muted-foreground">Can access system</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
          <UserX className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{data.inactiveUsers}</div>
          <p className="text-xs text-muted-foreground">Deactivated accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Users</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{data.pendingUsers}</div>
          <p className="text-xs text-muted-foreground">Pre-registered, not logged in</p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Users by Role Section
 */
export function UsersByRoleSection({ data }: { data: OwnerUserMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users by Role</CardTitle>
        <CardDescription>Distribution of users across roles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {Object.entries(data.usersByRole).map(([role, count]) => (
            <div key={role} className="flex items-center gap-2">
              <Badge className={ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * System KPIs Section
 */
export function SystemKPIsSection({ data }: { data: OwnerSystemKPIs }) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total PJOs</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalPJOs}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total JOs</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalJOs}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalInvoices}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-green-600">
            {formatCurrency(data.totalRevenue)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-blue-600">
            {formatCurrency(data.totalProfit)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Recent Logins Section
 */
export function RecentLoginsSection({ data }: { data: RecentLogin[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Login Activity</CardTitle>
        <CardDescription>Users who logged in within the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No recent logins</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((login) => (
                <TableRow key={login.id}>
                  <TableCell className="font-medium">
                    {login.fullName || 'No name'}
                  </TableCell>
                  <TableCell>{login.email}</TableCell>
                  <TableCell>
                    {login.lastLoginAt
                      ? formatDistanceToNow(new Date(login.lastLoginAt), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
