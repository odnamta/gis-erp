'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  HardDrive,
  Archive,
  RefreshCw,
  Save,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Shield,
  Users,
  Activity,
} from 'lucide-react'
import {
  getRetentionSummary,
  updateRetentionConfig,
  archiveLogs,
  LogType,
} from '@/app/actions/retention-actions'
import { DEFAULT_RETENTION_PERIODS, MIN_RETENTION_PERIODS } from '@/lib/retention-constants'
import { formatBytes } from '@/lib/format-utils'
import { RetentionConfig, AuditStorageStats } from '@/types/audit'
import { useToast } from '@/hooks/use-toast'
import { format, formatDistanceToNow } from 'date-fns'


/**
 * Retention Client Component
 * 
 * v0.76: System Audit & Logging Module
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * 
 * Provides:
 * - Storage statistics display
 * - Retention configuration
 * - Archive controls
 * - Archive history
 */

interface RetentionSummary {
  storage: AuditStorageStats
  config: RetentionConfig
  preview: {
    audit_logs: { count: number; cutoff_date: string }
    system_logs: { count: number; cutoff_date: string }
    login_history: { count: number; cutoff_date: string }
    data_access_logs: { count: number; cutoff_date: string }
  }
}

interface ArchiveRecord {
  id: string
  log_type: LogType
  archived_at: string
  before_date: string
  records_archived: number
  records_deleted: number
  archive_path: string | null
  created_by: string | null
}

interface RetentionClientProps {
  initialSummary: RetentionSummary | null
  archiveHistory: ArchiveRecord[]
  currentUser: {
    id: string
    email: string
    role: string
  }
}

const LOG_TYPE_LABELS: Record<LogType, string> = {
  audit_logs: 'Audit Logs',
  system_logs: 'System Logs',
  login_history: 'Login History',
  data_access_logs: 'Data Access Logs',
}

const LOG_TYPE_ICONS: Record<LogType, React.ReactNode> = {
  audit_logs: <FileText className="h-4 w-4" />,
  system_logs: <Activity className="h-4 w-4" />,
  login_history: <Users className="h-4 w-4" />,
  data_access_logs: <Shield className="h-4 w-4" />,
}

export function RetentionClient({
  initialSummary,
  archiveHistory: initialArchiveHistory,
}: RetentionClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState<LogType | null>(null)
  
  // State
  const [summary, setSummary] = useState<RetentionSummary | null>(initialSummary)
  const [archiveHistory] = useState<ArchiveRecord[]>(initialArchiveHistory)
  const [editedPeriods, setEditedPeriods] = useState<Record<LogType, number>>(
    initialSummary?.config.periods || DEFAULT_RETENTION_PERIODS
  )
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(
    initialSummary?.config.auto_cleanup_enabled || false
  )
  const [hasChanges, setHasChanges] = useState(false)

  // Refresh data
  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      const result = await getRetentionSummary()
      if (result.success && result.data) {
        setSummary(result.data)
        setEditedPeriods(result.data.config.periods)
        setAutoCleanupEnabled(result.data.config.auto_cleanup_enabled)
        setHasChanges(false)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to refresh data',
          variant: 'destructive',
        })
      }
    })
  }, [toast])

  // Handle period change
  const handlePeriodChange = useCallback((logType: LogType, value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= MIN_RETENTION_PERIODS[logType]) {
      setEditedPeriods(prev => ({ ...prev, [logType]: numValue }))
      setHasChanges(true)
    }
  }, [])

  // Handle auto cleanup toggle
  const handleAutoCleanupToggle = useCallback((enabled: boolean) => {
    setAutoCleanupEnabled(enabled)
    setHasChanges(true)
  }, [])

  // Save configuration
  const handleSaveConfig = useCallback(async () => {
    setIsSaving(true)
    try {
      const result = await updateRetentionConfig({
        periods: editedPeriods,
        auto_cleanup_enabled: autoCleanupEnabled,
      })
      
      if (result.success) {
        toast({
          title: 'Configuration Saved',
          description: 'Retention settings have been updated successfully',
        })
        setHasChanges(false)
        handleRefresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save configuration',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [editedPeriods, autoCleanupEnabled, toast, handleRefresh])

  // Archive logs for a specific type
  const handleArchive = useCallback(async (logType: LogType) => {
    if (!summary) return
    
    const preview = summary.preview[logType]
    if (preview.count === 0) {
      toast({
        title: 'No Records to Archive',
        description: `There are no ${LOG_TYPE_LABELS[logType].toLowerCase()} older than the retention period`,
      })
      return
    }
    
    setIsArchiving(logType)
    try {
      const result = await archiveLogs({
        log_type: logType,
        before_date: preview.cutoff_date,
        delete_after_archive: true,
      })
      
      if (result.success && result.data) {
        toast({
          title: 'Archive Complete',
          description: `Successfully archived ${result.data.records_deleted.toLocaleString()} records from ${LOG_TYPE_LABELS[logType]}`,
        })
        handleRefresh()
      } else {
        toast({
          title: 'Archive Failed',
          description: result.error || 'Failed to archive logs',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Archive error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during archival',
        variant: 'destructive',
      })
    } finally {
      setIsArchiving(null)
    }
  }, [summary, toast, handleRefresh])

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Failed to load retention data</p>
          <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const totalRecords = 
    summary.storage.audit_logs.count +
    summary.storage.system_logs.count +
    summary.storage.login_history.count +
    summary.storage.data_access_logs.count

  const totalArchivable = 
    summary.preview.audit_logs.count +
    summary.preview.system_logs.count +
    summary.preview.login_history.count +
    summary.preview.data_access_logs.count

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(summary.storage.total_size_bytes)}</div>
            <p className="text-xs text-muted-foreground">
              {totalRecords.toLocaleString()} total records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archivable Records</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArchivable.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Records past retention period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Cleanup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.config.auto_cleanup_enabled ? (
                <Badge variant="default" className="text-sm">Enabled</Badge>
              ) : (
                <Badge variant="secondary" className="text-sm">Disabled</Badge>
              )}
            </div>
            {summary.config.next_cleanup_at && (
              <p className="text-xs text-muted-foreground">
                Next: {format(new Date(summary.config.next_cleanup_at), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Cleanup</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.config.last_cleanup_at ? (
                formatDistanceToNow(new Date(summary.config.last_cleanup_at), { addSuffix: true })
              ) : (
                <span className="text-muted-foreground text-lg">Never</span>
              )}
            </div>
            {summary.config.last_cleanup_at && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(summary.config.last_cleanup_at), 'MMM d, yyyy HH:mm')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage Details by Log Type */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storage by Log Type</CardTitle>
              <CardDescription>
                Current storage usage and archivable records for each log type
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log Type</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Oldest Entry</TableHead>
                <TableHead className="text-right">Archivable</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(LOG_TYPE_LABELS) as LogType[]).map((logType) => {
                const storage = summary.storage[logType]
                const preview = summary.preview[logType]
                
                return (
                  <TableRow key={logType}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {LOG_TYPE_ICONS[logType]}
                        <span className="font-medium">{LOG_TYPE_LABELS[logType]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {storage.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBytes(storage.size_bytes)}
                    </TableCell>
                    <TableCell className="text-right">
                      {storage.oldest_entry ? (
                        <span className="text-sm">
                          {format(new Date(storage.oldest_entry), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {preview.count > 0 ? (
                        <Badge variant="outline" className="text-orange-600">
                          {preview.count.toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={preview.count === 0 || isArchiving !== null}
                          >
                            {isArchiving === logType ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Archive
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive {LOG_TYPE_LABELS[logType]}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {preview.count.toLocaleString()} records 
                              older than {format(new Date(preview.cutoff_date), 'MMMM d, yyyy')}.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleArchive(logType)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Archive & Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      {/* Retention Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Retention Configuration</CardTitle>
              <CardDescription>
                Configure how long each type of log is retained before becoming eligible for archival
              </CardDescription>
            </div>
            <Button
              onClick={handleSaveConfig}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retention Periods */}
          <div className="grid gap-6 md:grid-cols-2">
            {(Object.keys(LOG_TYPE_LABELS) as LogType[]).map((logType) => (
              <div key={logType} className="space-y-2">
                <Label htmlFor={`retention-${logType}`} className="flex items-center gap-2">
                  {LOG_TYPE_ICONS[logType]}
                  {LOG_TYPE_LABELS[logType]}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`retention-${logType}`}
                    type="number"
                    min={MIN_RETENTION_PERIODS[logType]}
                    value={editedPeriods[logType]}
                    onChange={(e) => handlePeriodChange(logType, e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    (min: {MIN_RETENTION_PERIODS[logType]} days)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default: {DEFAULT_RETENTION_PERIODS[logType]} days
                </p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Auto Cleanup Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-cleanup" className="text-base">
                Automatic Cleanup
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically archive and delete logs older than the retention period (runs weekly)
              </p>
            </div>
            <Switch
              id="auto-cleanup"
              checked={autoCleanupEnabled}
              onCheckedChange={handleAutoCleanupToggle}
            />
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-600">
                You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archive History */}
      <Card>
        <CardHeader>
          <CardTitle>Archive History</CardTitle>
          <CardDescription>
            Record of past archive operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archiveHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No archive operations have been performed yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Log Type</TableHead>
                  <TableHead>Cutoff Date</TableHead>
                  <TableHead className="text-right">Records Archived</TableHead>
                  <TableHead className="text-right">Records Deleted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archiveHistory.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.archived_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {LOG_TYPE_ICONS[record.log_type]}
                        {LOG_TYPE_LABELS[record.log_type]}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.before_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.records_archived.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.records_deleted.toLocaleString()}
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
