'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BKKStatusBadge } from '@/components/ui/bkk-status-badge'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { approveBKK, rejectBKK } from '@/app/(main)/job-orders/bkk-actions'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { BKKWithRelations } from '@/types/database'
import { Check, X, Banknote, Loader2 } from 'lucide-react'

interface PendingBKKTableProps {
  bkks: BKKWithRelations[]
}

export function PendingBKKTable({ bkks }: PendingBKKTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedBKK, setSelectedBKK] = useState<BKKWithRelations | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  async function handleApprove(bkk: BKKWithRelations) {
    setIsLoading(bkk.id)
    try {
      const result = await approveBKK(bkk.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: `BKK ${bkk.bkk_number} approved` })
        router.refresh()
      }
    } finally {
      setIsLoading(null)
    }
  }

  function openRejectDialog(bkk: BKKWithRelations) {
    setSelectedBKK(bkk)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }

  async function handleReject() {
    if (!selectedBKK || !rejectionReason.trim()) return
    
    setIsLoading(selectedBKK.id)
    try {
      const result = await rejectBKK(selectedBKK.id, rejectionReason)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: `BKK ${selectedBKK.bkk_number} rejected` })
        setRejectDialogOpen(false)
        router.refresh()
      }
    } finally {
      setIsLoading(null)
    }
  }

  if (bkks.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Pending BKK Approvals
            <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {bkks.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BKK #</TableHead>
                <TableHead>Job Order</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bkks.map((bkk) => (
                <TableRow key={bkk.id}>
                  <TableCell>
                    <Link 
                      href={`/job-orders/${bkk.jo_id}/bkk/${bkk.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {bkk.bkk_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {bkk.job_order ? (
                      <Link 
                        href={`/job-orders/${bkk.jo_id}`}
                        className="hover:underline"
                      >
                        {bkk.job_order.jo_number}
                      </Link>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={bkk.purpose}>
                    {bkk.purpose}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatIDR(bkk.amount_requested)}
                  </TableCell>
                  <TableCell>{bkk.requester?.full_name || '-'}</TableCell>
                  <TableCell>{bkk.requested_at ? formatDate(bkk.requested_at) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(bkk)}
                        disabled={isLoading === bkk.id}
                      >
                        {isLoading === bkk.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openRejectDialog(bkk)}
                        disabled={isLoading === bkk.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject BKK Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedBKK?.bkk_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
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
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isLoading === selectedBKK?.id}
            >
              {isLoading === selectedBKK?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
