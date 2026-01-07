'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/components/providers/permission-provider'
import { WorkflowStatus, WorkflowAction, WorkflowDocumentType, getAvailableActions } from '@/types/workflow'
import { CheckCircle, XCircle, Send, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkflowActionsProps {
  /** Document type (pjo, jo, bkk) */
  documentType: WorkflowDocumentType
  /** Current workflow status */
  currentStatus: WorkflowStatus
  /** Document ID */
  documentId: string
  /** Document number for display */
  documentNumber: string
  /** Callback when action is performed */
  onAction: (action: WorkflowAction, comment?: string) => Promise<{ success: boolean; error?: string }>
  /** Optional: Show compact version */
  compact?: boolean
  /** Optional: Disable all actions */
  disabled?: boolean
}

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Clock },
  pending_check: { label: 'Pending Check', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  checked: { label: 'Checked', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
}

const ACTION_CONFIG: Record<WorkflowAction, { label: string; variant: 'default' | 'destructive' | 'outline'; icon: typeof Send }> = {
  submit: { label: 'Submit for Review', variant: 'default', icon: Send },
  check: { label: 'Mark as Checked', variant: 'default', icon: CheckCircle },
  approve: { label: 'Approve', variant: 'default', icon: CheckCircle },
  reject: { label: 'Reject', variant: 'destructive', icon: XCircle },
}

export function WorkflowActions({
  documentType,
  currentStatus,
  documentId,
  documentNumber,
  onAction,
  compact = false,
  disabled = false,
}: WorkflowActionsProps) {
  const { profile } = usePermissions()
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState<WorkflowAction | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!profile) return null

  const availableActions = getAvailableActions(documentType, currentStatus, profile.role)
  const statusConfig = STATUS_CONFIG[currentStatus]
  const StatusIcon = statusConfig.icon

  const handleAction = async (action: WorkflowAction) => {
    if (action === 'reject') {
      setShowRejectDialog(true)
      return
    }
    
    // For approve action, show confirmation
    if (action === 'approve') {
      setShowConfirmDialog(action)
      return
    }
    
    // For other actions, execute directly
    await executeAction(action)
  }

  const executeAction = async (action: WorkflowAction, actionComment?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await onAction(action, actionComment)
      if (!result.success) {
        setError(result.error || 'Action failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setIsLoading(false)
      setShowRejectDialog(false)
      setShowConfirmDialog(null)
      setComment('')
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={cn('flex items-center gap-1', statusConfig.color)}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
        {availableActions.length > 0 && !disabled && (
          <div className="flex gap-1">
            {availableActions.map((action) => {
              const config = ACTION_CONFIG[action]
              const Icon = config.icon
              return (
                <Button
                  key={action}
                  size="sm"
                  variant={config.variant}
                  onClick={() => handleAction(action)}
                  disabled={isLoading}
                  className="h-7 px-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </Button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge className={cn('flex items-center gap-1', statusConfig.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {availableActions.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => {
            const config = ACTION_CONFIG[action]
            const Icon = config.icon
            return (
              <Button
                key={action}
                variant={config.variant}
                onClick={() => handleAction(action)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="mr-2 h-4 w-4" />
                )}
                {config.label}
              </Button>
            )
          })}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {documentType.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {documentNumber}. This will be recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => executeAction('reject', comment)}
              disabled={!comment.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {showConfirmDialog ? ACTION_CONFIG[showConfirmDialog].label : ''}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {showConfirmDialog?.toLowerCase()} {documentNumber}?
              {showConfirmDialog === 'approve' && ' This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-comment">Comment (Optional)</Label>
              <Textarea
                id="action-comment"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => showConfirmDialog && executeAction(showConfirmDialog, comment)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus
  size?: 'sm' | 'default'
}

/**
 * Simple status badge component
 */
export function WorkflowStatusBadge({ status, size = 'default' }: WorkflowStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  
  return (
    <Badge className={cn(
      'flex items-center gap-1',
      config.color,
      size === 'sm' && 'text-xs px-1.5 py-0.5'
    )}>
      <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />
      {config.label}
    </Badge>
  )
}
