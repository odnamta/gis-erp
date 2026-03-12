'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, RefreshCw, BarChart3, List, AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react'
import { SystemLogTable } from '@/components/audit/system-log-table'
import { SystemLogFilters, PaginatedSystemLogs, SystemLogLevel, SystemLogStats } from '@/types/system-log'
import { getSystemLogs, exportSystemLogs, getLogStatistics } from '@/app/actions/system-log-actions'
import { useToast } from '@/hooks/use-toast'

/**
 * System Logs Client Component
 * 
 * v0.76: System Audit & Logging Module
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * Provides:
 * - Real-time filter updates
 * - Log level filtering
 * - Text search in messages
 * - Pagination
 * - Export functionality
 * - Statistics view
 */

interface SystemLogsClientProps {
  initialData: PaginatedSystemLogs
  filterOptions: {
    sources: string[]
    modules: string[]
    levels: readonly SystemLogLevel[] | SystemLogLevel[]
  }
  currentUser: {
    id: string
    email: string
    role: string
  }
}

export function SystemLogsClient({
  initialData,
  filterOptions: _filterOptions,
  currentUser,
}: SystemLogsClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  
  // State
  const [data, setData] = useState<PaginatedSystemLogs>(initialData)
  const [filters, setFilters] = useState<SystemLogFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list')
  const [stats, setStats] = useState<SystemLogStats | null>(null)

  // Fetch logs with current filters and page
  const fetchLogs = useCallback((newFilters: SystemLogFilters, page: number) => {
    startTransition(async () => {
      const result = await getSystemLogs(newFilters, { page, page_size: 50 })
      if (result.success && result.data) {
        setData(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch system logs',
          variant: 'destructive',
        })
      }
    })
  }, [toast])

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: SystemLogFilters) => {
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
      const result = await exportSystemLogs(filters)
      if (result.success && result.data) {
        // Create and download CSV file
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast({
          title: 'Export Complete',
          description: 'System logs have been exported to CSV',
        })
      } else {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to export system logs',
          variant: 'destructive',
        })
      }
    } catch {
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
      const result = await getLogStatistics(filters)
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load statistics',
          variant: 'destructive',
        })
      }
    } catch {
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

  const canExport = ['sysadmin', 'director', 'owner'].includes(currentUser.role)

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Log Viewer</CardTitle>
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
              <SystemLogTable
                data={data}
                filters={filters}
                onFiltersChange={handleFiltersChange}
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
  stats: SystemLogStats | null
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
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.error_rate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.error_rate.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Error Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">
                {stats.entries_by_level.error.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Warning Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">
                {stats.entries_by_level.warn.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Log Levels Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <LevelBar 
                level="error" 
                count={stats.entries_by_level.error} 
                total={stats.total_entries}
                icon={<AlertCircle className="h-4 w-4 text-red-500" />}
                color="bg-red-500"
              />
              <LevelBar 
                level="warn" 
                count={stats.entries_by_level.warn} 
                total={stats.total_entries}
                icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
                color="bg-yellow-500"
              />
              <LevelBar 
                level="info" 
                count={stats.entries_by_level.info} 
                total={stats.total_entries}
                icon={<Info className="h-4 w-4 text-blue-500" />}
                color="bg-blue-500"
              />
              <LevelBar 
                level="debug" 
                count={stats.entries_by_level.debug} 
                total={stats.total_entries}
                icon={<Bug className="h-4 w-4 text-gray-500" />}
                color="bg-gray-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.entries_by_source.slice(0, 8).map(({ source, count }) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[180px]">{source}</span>
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
              {stats.entries_by_source.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No source data available
                </p>
              )}
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
              {stats.entries_by_module.slice(0, 8).map(({ module, count }) => (
                <div key={module} className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[180px]">{module}</span>
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
              {stats.entries_by_module.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No module data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_errors.slice(0, 5).map((error) => (
                <div key={error.id} className="border-l-2 border-red-500 pl-3 py-1">
                  <div className="text-sm font-medium truncate">{error.message}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{error.source}</span>
                    <span>•</span>
                    <span>{new Date(error.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {stats.recent_errors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent errors
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Level Bar Component
interface LevelBarProps {
  level: string
  count: number
  total: number
  icon: React.ReactNode
  color: string
}

function LevelBar({ level, count, total, icon, color }: LevelBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium capitalize">{level}</span>
          <span className="text-sm text-muted-foreground">
            {count.toLocaleString()} ({percentage.toFixed(1)}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
