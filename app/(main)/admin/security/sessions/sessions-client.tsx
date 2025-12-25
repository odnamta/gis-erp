'use client'

import { useState, useCallback, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  getUserSessions,
  terminateSession,
  terminateAllUserSessions,
} from '@/app/actions/sessions'
import type { UserSession } from '@/lib/security/types'
import {
  RefreshCw,
  Monitor,
  Smartphone,
  Globe,
  LogOut,
  Trash2,
  FileText,
  Users,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface SessionsClientProps {
  users: Array<{
    id: string
    email: string
    full_name: string | null
    role: string
  }>
  currentUser: {
    id: string
    email: string
    role: string
  }
}

function getDeviceIcon(userAgent: string | null) {
  if (!userAgent) return <Globe className="h-4 w-4" />
  const lower = userAgent.toLowerCase()
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
    return <Smartphone className="h-4 w-4" />
  }
  return <Monitor className="h-4 w-4" />
}

export function SessionsClient({
  users,
  currentUser,
}: SessionsClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
  const [terminateAllDialogOpen, setTerminateAllDialogOpen] = useState(false)
  const [sessionToTerminate, setSessionToTerminate] = useState<UserSession | null>(null)

  const fetchSessions = useCallback(async (userId: string) => {
    if (!userId) {
      setSessions([])
      return
    }
    
    startTransition(async () => {
      const result = await getUserSessions(userId)
      if (result.success && result.data) {
        setSessions(result.data)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch sessions',
          variant: 'destructive',
        })
        setSessions([])
      }
    })
  }, [toast])

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId)
    fetchSessions(userId)
  }

  const handleRefresh = () => {
    if (selectedUserId) {
      fetchSessions(selectedUserId)
    }
  }

  const handleTerminateClick = (session: UserSession) => {
    setSessionToTerminate(session)
    setTerminateDialogOpen(true)
  }

  const handleTerminateConfirm = async () => {
    if (!sessionToTerminate) return

    startTransition(async () => {
      const result = await terminateSession(sessionToTerminate.id, 'admin_terminated')
      
      if (result.success) {
        toast({
          title: 'Session Terminated',
          description: 'The session has been terminated successfully',
        })
        setTerminateDialogOpen(false)
        setSessionToTerminate(null)
        fetchSessions(selectedUserId)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to terminate session',
          variant: 'destructive',
        })
      }
    })
  }

  const handleTerminateAllClick = () => {
    setTerminateAllDialogOpen(true)
  }

  const handleTerminateAllConfirm = async () => {
    if (!selectedUserId) return

    startTransition(async () => {
      const result = await terminateAllUserSessions(selectedUserId, 'admin_terminated_all')
      
      if (result.success) {
        toast({
          title: 'All Sessions Terminated',
          description: `Terminated ${result.terminatedCount} session(s)`,
        })
        setTerminateAllDialogOpen(false)
        fetchSessions(selectedUserId)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to terminate sessions',
          variant: 'destructive',
        })
      }
    })
  }

  const selectedUser = users.find(u => u.id === selectedUserId)
  const activeSessions = sessions.filter(s => s.is_active)

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select User
          </CardTitle>
          <CardDescription>Choose a user to view their active sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedUserId} onValueChange={handleUserChange}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.full_name || user.email}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedUserId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isPending}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isPending && 'animate-spin')} />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Sessions for {selectedUser?.full_name || selectedUser?.email}
                </CardTitle>
                <CardDescription>
                  {activeSessions.length} active session(s)
                </CardDescription>
              </div>
              {activeSessions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleTerminateAllClick}
                  disabled={isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Terminate All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Device</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead className="w-[150px]">Created</TableHead>
                    <TableHead className="w-[150px]">Last Active</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="h-8 w-8" />
                          No sessions found
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session.id} className={cn(!session.is_active && 'opacity-50')}>
                        <TableCell>
                          {getDeviceIcon(session.user_agent)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {session.ip_address || 'Unknown'}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground" title={session.user_agent || ''}>
                          {session.user_agent || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(session.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {session.last_activity ? (
                            <span title={format(new Date(session.last_activity), 'MMM dd, yyyy HH:mm')}>
                              {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {session.is_active ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">
                              {session.terminated_reason || 'Terminated'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {session.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTerminateClick(session)}
                              disabled={isPending}
                            >
                              <LogOut className="h-4 w-4 text-red-500" />
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
      )}

      {/* Terminate Single Session Dialog */}
      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate this session? The user will be logged out from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate All Sessions Dialog */}
      <AlertDialog open={terminateAllDialogOpen} onOpenChange={setTerminateAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate All Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate all sessions for {selectedUser?.full_name || selectedUser?.email}? 
              They will be logged out from all devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminateAllConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Terminate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
