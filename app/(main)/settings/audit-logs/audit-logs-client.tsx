'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, RefreshCw, BarChart3, List } from 'lucide-react'
import { AuditLogFiltersComponent } from '@/components/audit/audit-log-filters'
import { AuditLogTable } from '@/components/audit/audit-log-table'
import { AuditLogFilters, PaginatedAuditLogs, AuditLogStats } from '@/types/audit'
import { getAuditLogs, exportAuditLogs, getAuditLogStats } from '@/app/actions/audit-actions'
import { useToast } from '@/hooks/use-toast'

/**
 * Audit Logs Client Component
 * 
 * v0.76: System Audit & Logging Module
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * 
 * Provides:
 * - Real-time filter updates
 * - Pagination
 * - Export functionality
 * - Statistics view
 */

interface AuditLogsClientProps {
  initialData: PaginatedAuditLogs
  filterOptions: {
    modules: string[]
    entityTypes: string[]
    actions: string[]
  }
  users: Array<{ id: string; email: string; name: string }>
  currentUser: {
    id: string
    email: string
    role: string
  }
}

// Use AuditLogStats from types
type AuditStats = AuditLogStats;

export function AuditLogsClient({
  initialData,
  filterOptions,
  users,
  currentUser,
}: AuditLogsClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  
  // State
  const [data, setData] = useState<PaginatedAuditLogs>(initialData)
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list')
  const [stats, setStats] = useState<AuditStats | null>(null)

  // Fetch logs with current filters and page
  const fetchLogs = useCallback((newFilters: AuditLogFilters, page: number) => {
    startTransition(async () => {
      const result = await getAuditLogs(newFilters, { page, page_size: 25 })
      if (result.success && result.data) {
        setData(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch audit logs',
          variant: 'destructive',
        })
      }
    })
  }, [toast])

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: AuditLogFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
    fetchLogs(newFilters, 1)
  }, [fetchLogs])

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    fetchLogs(filters, page)
  }, [filters, fetchLogs])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchLogs(filters, currentPage)
  }, [filters, currentPage, fetchLogs])

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const result = await exportAuditLogs(filters)
      if (result.success && result.data) {
        // Create and download CSV file
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast({
          title: 'Export Complete',
          description: 'Audit logs have been exported to CSV',
        })
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to export audit logs',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }, [filters, toast])

  // Load statistics
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const result = await getAuditLogStats(filters)
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load statistics',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Stats error:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [filters, toast])

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as 'list' | 'stats')
    if (value === 'stats' && !stats) {
      loadStats()
    }
  }, [stats, loadStats])

  // Prepare users for filter dropdown
  const userOptions = users.map(u => ({
    id: u.id,
    email: u.email || u.name,
  }))

  const canExport = ['admin', 'owner'].includes(currentUser.role)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {canExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AuditLogFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            users={userOptions}
            entityTypes={filterOptions.entityTypes}
            modules={filterOptions.modules}
          />
        </CardContent>
      </Card>

      {/* Tabs for List and Stats views */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Log Entries
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <AuditLogTable
                data={data}
                onPageChange={handlePageChange}
                loading={isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <StatsView stats={stats} loading={isLoadingStats} onRefresh={loadStats} />
        </TabsContent>
      </Tabs>
    </div>
  )
}


// Stats View Component
interface StatsViewProps {
  stats: AuditStats | null
  loading: boolean
  onRefresh: () => void
}

function StatsView({ stats, loading, onRefresh }: StatsViewProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No statistics available</p>
          <Button variant="outline" onClick={onRefresh}>
            Load Statistics
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Use the correct property names from AuditLogStats
  const entriesByAction = stats.entries_by_action || stats.by_action || {}
  const entriesByModule = stats.entries_by_module || stats.by_module || {}
  const entriesByUser = stats.entries_by_user || stats.by_user || []

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_entries.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entries Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.entries_today.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.entries_this_week.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.entries_this_month.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Actions Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(entriesByAction).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{action.toLowerCase()}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min((count / stats.total_entries) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(entriesByModule).slice(0, 8).map(([moduleName, count]) => (
                <div key={moduleName} className="flex items-center justify-between">
                  <span className="text-sm">{moduleName.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min((count / stats.total_entries) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Most Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {entriesByUser.slice(0, 8).map(({ user_id, user_email, count }) => (
                <div key={user_id} className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[150px]">
                    {user_email || 'Unknown User'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${Math.min((count / stats.total_entries) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
