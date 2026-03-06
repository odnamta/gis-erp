'use client'

import { useState } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { approveRoleRequest, rejectRoleRequest } from './actions'
import { RoleRequestWithUser } from '@/types/role-request'
import { UserRole } from '@/types/permissions'

/**
 * Human-readable labels for roles
 */
const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  director: 'Director',
  marketing_manager: 'Marketing Manager',
  finance_manager: 'Finance Manager',
  operations_manager: 'Operations Manager',
  sysadmin: 'System Administrator',
  administration: 'Administration',
  finance: 'Finance',
  marketing: 'Marketing',
  ops: 'Operations',
  engineer: 'Engineer',
  hr: 'Human Resources',
  hse: 'Health, Safety & Environment',
  agency: 'Agency Staff',
  customs: 'Customs Specialist',
}

/**
 * Get human-readable label for a role
 */
function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] || role
}

/**
 * Props for ApproveDialog component
 */
interface ApproveDialogProps {
  request: RoleRequestWithUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * ApproveDialog Component
 * 
 * Confirmation dialog for approving a role request.
 * Shows request details (user email, role) and Confirm/Cancel buttons.
 * Includes loading state during approval.
 * 
 * Requirements: 3.3
 */
export function ApproveDialog({
  request,
  open,
  onOpenChange,
  onSuccess,
}: ApproveDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleApprove = async () => {
    if (!request) return

    setIsLoading(true)
    try {
      const result = await approveRoleRequest(request.id)
      
      if (result.success) {
        toast({
          title: 'Request Approved',
          description: `${request.user_email} has been assigned the ${getRoleLabel(request.requested_role)} role.`,
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve request',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!request) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve Role Request
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Are you sure you want to approve this role request?</p>
              <div className="rounded-md border p-3 space-y-2 bg-muted/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-medium text-foreground">{request.user_email}</span>
                </div>
                {request.user_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium text-foreground">{request.user_name}</span>
                  </div>
                )}
                {request.requested_department && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium text-foreground">{request.requested_department}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Role:</span>
                  <Badge variant="outline">{getRoleLabel(request.requested_role)}</Badge>
                </div>
              </div>
              <p className="text-sm">
                The user will be granted access to the system with the requested role permissions.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleApprove()
            }}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Props for RejectDialog component
 */
interface RejectDialogProps {
  request: RoleRequestWithUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * RejectDialog Component
 * 
 * Dialog with reason textarea for rejecting a role request.
 * Shows request details and requires a rejection reason.
 * Includes loading state during rejection.
 * 
 * Requirements: 3.4
 */
export function RejectDialog({
  request,
  open,
  onOpenChange,
  onSuccess,
}: RejectDialogProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleReject = async () => {
    if (!request) return

    // Validate reason is not empty
    if (!reason.trim()) {
      setError('Rejection reason is required')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const result = await rejectRoleRequest(request.id, reason.trim())
      
      if (result.success) {
        toast({
          title: 'Request Rejected',
          description: `The role request from ${request.user_email} has been rejected.`,
        })
        setReason('')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject request',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setReason('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Reject Role Request
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this request. The user will be notified.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Request Details */}
          <div className="rounded-md border p-3 space-y-2 bg-muted/50">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">User:</span>
              <span className="font-medium text-sm">{request.user_email}</span>
            </div>
            {request.user_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Name:</span>
                <span className="font-medium text-sm">{request.user_name}</span>
              </div>
            )}
            {request.requested_department && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Department:</span>
                <span className="font-medium text-sm">{request.requested_department}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Requested Role:</span>
              <Badge variant="outline" className="text-xs">
                {getRoleLabel(request.requested_role)}
              </Badge>
            </div>
          </div>

          {/* Rejection Reason */}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Please explain why this request is being rejected..."
              rows={4}
              disabled={isLoading}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Reject Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
