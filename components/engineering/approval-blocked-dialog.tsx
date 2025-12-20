'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EngineeringStatusBadge } from '@/components/ui/engineering-status-badge'
import { EngineeringStatus, ENGINEERING_STATUS_LABELS } from '@/types/engineering'
import { AlertTriangle, HardHat, Shield, UserPlus } from 'lucide-react'

interface ApprovalBlockedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engineeringStatus: EngineeringStatus
  blockReason?: string
  canAssign?: boolean
  canWaive?: boolean
  onAssign?: () => void
  onWaive?: () => void
}

export function ApprovalBlockedDialog({
  open,
  onOpenChange,
  engineeringStatus,
  blockReason,
  canAssign = false,
  canWaive = false,
  onAssign,
  onWaive,
}: ApprovalBlockedDialogProps) {
  const isPending = engineeringStatus === 'pending'
  const isInProgress = engineeringStatus === 'in_progress'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Approval Blocked
          </DialogTitle>
          <DialogDescription>
            This PJO cannot be approved at this time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <HardHat className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Engineering Review Required</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">Status:</span>
                <EngineeringStatusBadge status={engineeringStatus} />
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {blockReason || `Engineering review is ${ENGINEERING_STATUS_LABELS[engineeringStatus].toLowerCase()}. The review must be completed or waived before this PJO can be approved.`}
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium">Available Options:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {isPending && !canAssign && (
                <li>Wait for an engineer to be assigned and complete the review</li>
              )}
              {isPending && canAssign && (
                <li>Assign an engineer to complete the review</li>
              )}
              {isInProgress && (
                <li>Wait for the assigned engineer to complete the review</li>
              )}
              {canWaive && (
                <li>Waive the engineering review (manager only)</li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canAssign && isPending && onAssign && (
            <Button variant="secondary" onClick={() => {
              onOpenChange(false)
              onAssign()
            }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Engineer
            </Button>
          )}
          {canWaive && onWaive && (
            <Button variant="destructive" onClick={() => {
              onOpenChange(false)
              onWaive()
            }}>
              <Shield className="h-4 w-4 mr-2" />
              Waive Review
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
