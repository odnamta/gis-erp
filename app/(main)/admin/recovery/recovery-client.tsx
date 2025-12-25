'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Archive, RotateCcw, Search, Trash2 } from 'lucide-react'
import { recoverRecordAction } from '@/app/actions/recovery-actions'
import { useToast } from '@/hooks/use-toast'

interface DeletedRecord {
  id: string
  deleted_at: string
  deleted_by: string | null
  source_table: string
  source_id: string
  record_data: Record<string, unknown>
  recovered_at: string | null
  recovered_by: string | null
  purge_after: string
}

interface RecoveryStats {
  total_deleted: number
  total_recovered: number
  pending_purge: number
}

interface Props {
  initialRecords: DeletedRecord[]
  initialStats: RecoveryStats | null
  currentUser: { id: string; email: string | null; role: string }
}

export function RecoveryClient({ initialRecords, initialStats, currentUser }: Props) {
  const [records, setRecords] = useState(initialRecords)
  const [stats] = useState(initialStats)
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<DeletedRecord | null>(null)
  const [isRecoverDialogOpen, setIsRecoverDialogOpen] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const { toast } = useToast()

  const uniqueTables = [...new Set(records.map(r => r.source_table))]

  const filteredRecords = records.filter((record) => {
    const matchesTable = tableFilter === 'all' || record.source_table === tableFilter
    const matchesSearch = searchQuery === '' || 
      record.source_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.source_table.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(record.record_data).toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTable && matchesSearch
  })

  const handleRecover = async () => {
    if (!selectedRecord) return
    
    setIsRecovering(true)
    const result = await recoverRecordAction(
      selectedRecord.source_table,
      selectedRecord.source_id
    )
    
    if (result.success) {
      setRecords(records.filter(r => r.id !== selectedRecord.id))
      toast({
        title: 'Record Recovered',
        description: `Successfully recovered record from ${selectedRecord.source_table}`,
      })
    } else {
      toast({
        title: 'Recovery Failed',
        description: result.error || 'Failed to recover record',
        variant: 'destructive',
      })
    }
    
    setIsRecovering(false)
    setIsRecoverDialogOpen(false)
    setSelectedRecord(null)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRecordPreview = (data: Record<string, unknown>) => {
    const name = data.name || data.title || data.email || data.id
    return String(name).substring(0, 50)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deleted</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_deleted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recovered</CardTitle>
              <RotateCcw className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.total_recovered}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Purge</CardTitle>
              <Archive className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_purge}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle>Deleted Records</CardTitle>
          <CardDescription>Records available for recovery (90-day retention)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {uniqueTables.map((table) => (
                  <SelectItem key={table} value={table}>{table}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead>Purge After</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No deleted records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.source_table}</TableCell>
                    <TableCell className="font-mono text-xs">{record.source_id}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {getRecordPreview(record.record_data)}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(record.deleted_at)}</TableCell>
                    <TableCell className="text-sm">{record.purge_after}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRecord(record)
                          setIsRecoverDialogOpen(true)
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Recover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recover Confirmation Dialog */}
      <AlertDialog open={isRecoverDialogOpen} onOpenChange={setIsRecoverDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recover Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the record to the {selectedRecord?.source_table} table.
              The record will be marked as active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRecovering}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecover} disabled={isRecovering}>
              {isRecovering ? 'Recovering...' : 'Recover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
