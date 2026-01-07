'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Settings,
  BarChart3,
  Crown,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { UserRole } from '@/types/permissions'
import { PreviewDropdown } from '@/components/preview/preview-dropdown'
import { usePreview } from '@/hooks/use-preview'

interface OwnerDashboardProps {
  data: {
    userMetrics: {
      totalUsers: number
      activeUsers: number
      inactiveUsers: number
      pendingUsers: number
      usersByRole: Record<UserRole, number>
    }
    recentLogins: {
      id: string
      email: string
      fullName: string | null
      lastLoginAt: string | null
    }[]
    systemKPIs: {
      totalPJOs: number
      totalJOs: number
      totalInvoices: number
      totalRevenue: number
      totalProfit: number
    }
  }
}

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

export function OwnerDashboard({ data }: OwnerDashboardProps) {
  const { userMetrics, recentLogins, systemKPIs } = data
  const { effectiveRole, setPreviewRole, canUsePreview } = usePreview()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-amber-500" />
            Owner Dashboard
          </h2>
          <p className="text-muted-foreground">
            System overview and user management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PreviewDropdown
            currentRole={effectiveRole}
            onRoleSelect={setPreviewRole}
            canUsePreview={canUsePreview}
          />
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/settings/users">
                <Settings className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </Button>
            <Button asChild>
              <Link href="/reports">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* User Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{userMetrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Can access system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{userMetrics.inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              Deactivated accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Users</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{userMetrics.pendingUsers}</div>
            <p className="text-xs text-muted-foreground">
              Pre-registered, not logged in
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Role</CardTitle>
          <CardDescription>Distribution of users across roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {(Object.entries(userMetrics.usersByRole) as [UserRole, number][]).map(([role, count]) => (
              <div key={role} className="flex items-center gap-2">
                <Badge className={ROLE_COLORS[role]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PJOs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemKPIs.totalPJOs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total JOs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemKPIs.totalJOs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemKPIs.totalInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(systemKPIs.totalRevenue)}
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
              {formatCurrency(systemKPIs.totalProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Login Activity</CardTitle>
          <CardDescription>Users who logged in within the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogins.length === 0 ? (
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
                {recentLogins.map((login) => (
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
    </div>
  )
}
