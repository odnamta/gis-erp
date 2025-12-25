'use client'

import { useState, useCallback, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  blockIP,
  unblockIPByBlockId,
  getBlockedIPs,
} from '@/app/actions/ip-blocking'
import type { BlockedIP } from '@/lib/security/types'
import {
  RefreshCw,
  Shield,
  ShieldOff,
  Plus,
  Clock,
  Ban,
  FileText,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface BlockedIPsClientProps {
  initialData: BlockedIP[]
  stats: {
    totalActive: number
    totalInactive: number
    permanentBlocks: number
    temporaryBlocks: number
    expiringWithin24h: number
  }
  currentUser: {
    id: string
    email: string
    role: string
  }
}

const durationOptions = [
  { value: '0', label: 'Permanent' },
  { value: '3600', label: '1 Hour' },
  { value: '86400', label: '24 Hours' },
  { value: '604800', label: '7 Days' },
  { value: '2592000', label: '30 Days' },
]

export function BlockedIPsClient({
  initialData,
  stats,
}: BlockedIPsClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<BlockedIP[]>(initialData)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [newBlockIP, setNewBlockIP] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')
  const [newBlockDuration, setNewBlockDuration] = useState('0')

  const fetchData = useCallback(async () => {
    startTransition(async () => {
      const result = await getBlockedIPs(false, false)
      if (result.success && result.data) {
        setData(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch blocked IPs',
          variant: 'destructive',
        })
      }
    })
  }, [toast])

  const handleRefresh = () => {
    fetchData()
  }

  const handleBlockIP = async () => {
    if (!newBlockIP.trim() || !newBlockReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'IP address and reason are required',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      const duration = parseInt(newBlockDuration)
      const result = await blockIP(
        newBlockIP.trim(),
        newBlockReason.trim(),
        duration > 0 ? duration : undefined
      )
      
      if (result.success) {
        toast({
          title: 'IP Blocked',
          description: `Successfully blocked ${newBlockIP}`,
        })
        setBlockDialogOpen(false)
        setNewBlockIP('')
        setNewBlockReason('')
        setNewBlockDuration('0')
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to block IP',
          variant: 'destructive',
        })
      }
    })
  }

  const handleUnblockIP = async (blockId: string, ipAddress: string) => {
    startTransition(async () => {
      const result = await unblockIPByBlockId(blockId)
      
      if (result.success) {
        toast({
          title: 'IP Unblocked',
          description: `Successfully unblocked ${ipAddress}`,
        })
        fetchData()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to unblock IP',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Blocks</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalActive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permanent</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.permanentBlocks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temporary</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.temporaryBlocks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringWithin24h}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <ShieldOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.totalInactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Blocked IPs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Blocked IP Addresses</CardTitle>
              <CardDescription>Manage blocked IP addresses</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isPending}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isPending && 'animate-spin')} />
                Refresh
              </Button>
              <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Block IP
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Block IP Address</DialogTitle>
                    <DialogDescription>
                      Add a new IP address to the block list
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ip">IP Address</Label>
                      <Input
                        id="ip"
                        placeholder="e.g., 192.168.1.1"
                        value={newBlockIP}
                        onChange={(e) => setNewBlockIP(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reason">Reason</Label>
                      <Textarea
                        id="reason"
                        placeholder="Enter the reason for blocking..."
                        value={newBlockReason}
                        onChange={(e) => setNewBlockReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Select value={newBlockDuration} onValueChange={setNewBlockDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBlockIP} disabled={isPending}>
                      {isPending ? 'Blocking...' : 'Block IP'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">IP Address</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[180px]">Blocked At</TableHead>
                  <TableHead className="w-[150px]">Expires</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        No blocked IPs found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-mono text-sm">
                        {block.ip_address}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={block.reason}>
                        {block.reason}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(block.blocked_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {block.expires_at ? (
                          <span title={format(new Date(block.expires_at), 'MMM dd, yyyy HH:mm')}>
                            {formatDistanceToNow(new Date(block.expires_at), { addSuffix: true })}
                          </span>
                        ) : (
                          <Badge variant="secondary">Permanent</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {block.is_active ? (
                          <Badge variant="destructive">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {block.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnblockIP(block.id, block.ip_address)}
                            disabled={isPending}
                          >
                            <ShieldOff className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
