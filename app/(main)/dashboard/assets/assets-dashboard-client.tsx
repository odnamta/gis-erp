'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Truck, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  MapPin,
  Settings,
  Activity,
  ArrowRight,
  Package
} from 'lucide-react'
import { UserRole } from '@/types/permissions'
import { AssetsDashboardMetrics } from '@/lib/dashboard/assets-data'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface AssetsDashboardClientProps {
  userRole: UserRole
  metrics: AssetsDashboardMetrics
}

export function AssetsDashboardClient({ userRole: _userRole, metrics }: AssetsDashboardClientProps) {
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'in_use': return 'bg-blue-100 text-blue-800'
      case 'maintenance': 
      case 'repair': return 'bg-yellow-100 text-yellow-800'
      case 'retired':
      case 'sold': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor asset performance, maintenance, and utilization
          </p>
        </div>
        <Button onClick={() => router.push('/equipment')}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Equipment
        </Button>
      </div>

      {/* Asset Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.total}</div>
            <p className="text-xs text-muted-foreground">
              All registered assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.summary.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.summary.maintenance}</div>
            <p className="text-xs text-muted-foreground">
              Under maintenance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idle</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{metrics.summary.idle}</div>
            <p className="text-xs text-muted-foreground">
              Not in use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disposed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.summary.disposed}</div>
            <p className="text-xs text-muted-foreground">
              End of life
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Category Breakdown */}
      {metrics.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Asset Categories
            </CardTitle>
            <CardDescription>
              Distribution of assets by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {metrics.categories.map((category) => (
                <div key={category.categoryId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{category.categoryName}</p>
                    <p className="text-xs text-muted-foreground">{category.categoryCode}</p>
                  </div>
                  <Badge variant="secondary">{category.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="maintenance">Maintenance Alerts</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Maintenance Alerts
              </CardTitle>
              <CardDescription>
                Assets requiring attention or overdue maintenance
                {metrics.maintenanceStats.overdueCount > 0 && (
                  <span className="ml-2 text-red-600">
                    ({metrics.maintenanceStats.overdueCount} overdue)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.maintenanceAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No maintenance alerts</p>
                  <p className="text-sm">All assets are up to date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.maintenanceAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{alert.assetName}</h4>
                          <Badge variant="outline">{alert.assetCode}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.maintenanceType}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          Due: {formatDate(alert.dueDate)}
                          {alert.status === 'overdue' && alert.overdueDays && (
                            <Badge variant="destructive" className="ml-2">
                              {alert.overdueDays} days overdue
                            </Badge>
                          )}
                          {alert.status === 'due_soon' && (
                            <Badge variant="secondary" className="ml-2">
                              Due soon
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => router.push(`/equipment/maintenance?asset=${alert.assetId}`)}>
                        Schedule
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.utilization.utilizationRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Of active assets assigned to jobs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned to Jobs</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.utilization.assignedToJobs}</div>
                <p className="text-xs text-muted-foreground">
                  Currently working
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Idle Available</CardTitle>
                <Clock className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{metrics.utilization.idleAvailable}</div>
                <p className="text-xs text-muted-foreground">
                  Ready for assignment
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Asset Utilization Overview
              </CardTitle>
              <CardDescription>
                Current location and utilization status of assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Asset tracking and utilization charts will be displayed here</p>
                <p className="text-sm">Integration with GPS tracking and job assignments</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-yellow-600" />
                  Recent Maintenance
                </CardTitle>
                <CardDescription>
                  Last 7 days ({metrics.maintenanceStats.completedLast7Days} completed)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.recentMaintenance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent maintenance records
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.recentMaintenance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{record.assetName}</span>
                            <Badge variant="outline" className="text-xs">{record.assetCode}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{record.maintenanceType}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(record.maintenanceDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(record.totalCost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  Recent Assignments
                </CardTitle>
                <CardDescription>
                  Latest asset assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.recentAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent assignments
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.recentAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{assignment.assetName}</span>
                            <Badge variant="outline" className="text-xs">{assignment.assetCode}</Badge>
                          </div>
                          {assignment.jobNumber && (
                            <p className="text-xs text-muted-foreground">Job: {assignment.jobNumber}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDate(assignment.assignedFrom)}
                            {assignment.assignedTo && ` - ${formatDate(assignment.assignedTo)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Status Changes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-purple-600" />
                Recent Status Changes
              </CardTitle>
              <CardDescription>
                Latest asset status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.recentStatusChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent status changes
                </p>
              ) : (
                <div className="space-y-3">
                  {metrics.recentStatusChanges.map((change) => (
                    <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{change.assetName}</span>
                          <Badge variant="outline" className="text-xs">{change.assetCode}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {change.previousStatus && (
                            <>
                              <Badge className={getStatusColor(change.previousStatus)} variant="secondary">
                                {change.previousStatus}
                              </Badge>
                              <ArrowRight className="h-3 w-3" />
                            </>
                          )}
                          <Badge className={getStatusColor(change.newStatus)} variant="secondary">
                            {change.newStatus}
                          </Badge>
                        </div>
                        {change.reason && (
                          <p className="text-xs text-muted-foreground">{change.reason}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(change.changedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
