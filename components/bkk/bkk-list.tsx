'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BKKStatusBadge } from '@/components/ui/bkk-status-badge'
import { formatBKKCurrency, getAvailableActions } from '@/lib/bkk-utils'
import { approveBKK, rejectBKK, cancelBKK } from '@/app/(main)/job-orders/bkk-actions'
import type { BKKWithRelations, BKKStatus } from '@/types'
import { Eye, X, Check, Banknote, FileCheck } from 'lucide-react'
import { toast } from 'sonner'

interface BKKListProps {
  bkks: BKKWithRelations[]
  jobOrderId: string
  userRole: string
  currentUserId?: string
}

export function BKKList({ bkks, jobOrderId, userRole, currentUserId }: BKKListProps) {
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedBKK, setSelectedBKK] = useState<BKKWithRelations | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleView = (bkkId: string) => {
    router.push(`/job-orders/${jobOrderId}/bkk/${bkkId}`)
  }

  const handleSettle = (bkkId: string) => {
    router.push(`/job-orders/${jobOrderId}/bkk/${bkkId}/settle`)
  }

  const handleApprove = async (bkk: BKKWithRelations) => {
    setIsLoading(true)
    const result = await approveBKK(bkk.id)
    setIsLoading(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('BKK approved successfully')
      router.refresh()
    }
  }

  const handleRejectClick = (bkk: BKKWithRelations) => {
    setSelectedBKK(bkk)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!selectedBKK || !rejectionReason.trim()) return
    
    setIsLoading(true)
    const result = await rejectBKK(selectedBKK.id, rejectionReason)
    setIsLoading(false)
    setRejectDialogOpen(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('BKK rejected')
      router.refresh()
    }
  }

  const handleCancelClick = (bkk: BKKWithRelations) => {
    setSelectedBKK(bkk)
    setCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!selectedBKK) return
    
    setIsLoading(true)
    const result = await cancelBKK(selectedBKK.id)
    setIsLoading(false)
    setCancelDialogOpen(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('BKK cancelled')
      router.refresh()
    }
  }

  const handleRelease = (bkkId: string) => {
    router.push(`/job-orders/${jobOrderId}/bkk/${bkkId}/release`)
  }

  if (bkks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No cash disbursements yet
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>BKK #</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bkks.map((bkk) => {
              const isRequester = bkk.requested_by === currentUserId
              const actions = getAvailableActions(bkk.status as BKKStatus, userRole, isRequester)
              
              return (
                <TableRow key={bkk.id}>
                  <TableCell className="font-medium">{bkk.bkk_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{bkk.purpose}</TableCell>
                  <TableCell className="text-right">{formatBKKCurrency(bkk.amount_requested)}</TableCell>
                  <TableCell>
                    <BKKStatusBadge 
                      status={bkk.status as BKKStatus}
                      showDetails
                      requestedAt={bkk.requested_at}
                      approvedAt={bkk.approved_at}
                      releasedAt={bkk.released_at}
                      settledAt={bkk.settled_at}
                      requesterName={(bkk.requester as { full_name?: string })?.full_name}
                      approverName={(bkk.approver as { full_name?: string })?.full_name}
                      releaserName={(bkk.releaser as { full_name?: string })?.full_name}
                      settlerName={(bkk.settler as { full_name?: string })?.full_name}
                      rejectionReason={bkk.rejection_reason}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {bkk.amount_spent !== null ? formatBKKCurrency(bkk.amount_spent) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(bkk.id)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {actions.includes('approve') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(bkk)}
                          disabled={isLoading}
                          title="Approve"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {actions.includes('reject') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRejectClick(bkk)}
                          disabled={isLoading}
                          title="Reject"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {actions.includes('release') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRelease(bkk.id)}
                          title="Release"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Banknote className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {actions.includes('settle') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSettle(bkk.id)}
                          title="Settle"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <FileCheck className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {actions.includes('cancel') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelClick(bkk)}
                          disabled={isLoading}
                          title="Cancel"
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel BKK Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel {selectedBKK?.bkk_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} disabled={isLoading}>
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject BKK Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedBKK?.bkk_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={isLoading || !rejectionReason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
