'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatCurrencyIDR, formatDate, formatDateTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  X,
  Banknote,
  FileCheck,
  Trash2,
  Send,
  CreditCard,
  Building2,
  Briefcase,
  Calendar,
  User,
  FileText,
} from 'lucide-react'
import {
  submitForApproval,
  approveDisbursement,
  rejectDisbursement,
  releaseDisbursement,
  settleDisbursement,
  deleteDisbursement,
} from '../actions'

interface BKKRecord {
  id: string
  bkk_number: string
  date: string
  description: string | null
  amount: number
  currency: string
  exchange_rate: number
  status: string
  category: string
  payment_method: string | null
  bank_account: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  released_at: string | null
  settled_at: string | null
  job_orders: { id: string; jo_number: string; customer_name: string | null; status: string } | null
  vendors: { id: string; name: string; vendor_code: string | null; bank_name: string | null; bank_account: string | null; bank_account_name: string | null } | null
  created_by_profile: { id: string; full_name: string; email: string } | null
  approved_by_profile: { id: string; full_name: string; email: string } | null
  released_by_profile: { id: string; full_name: string; email: string } | null
  settled_by_profile: { id: string; full_name: string; email: string } | null
}

export type { BKKRecord }

interface DisbursementDetailProps {
  bkk: BKKRecord
  userRole: string
  userId: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  released: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  settled: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const categoryLabels: Record<string, string> = {
  job_cost: 'Job Cost',
  vendor_payment: 'Vendor Payment',
  overhead: 'Overhead',
  other: 'Other',
}

export function DisbursementDetail({ bkk, userRole, userId }: DisbursementDetailProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const canApprove = ['owner', 'director', 'finance_manager'].includes(userRole) && bkk.status === 'pending'
  const canRelease = ['owner', 'director', 'finance_manager', 'finance'].includes(userRole) && bkk.status === 'approved'
  const canSettle = ['owner', 'director', 'finance_manager', 'finance'].includes(userRole) && bkk.status === 'released'
  const canSubmit = bkk.status === 'draft'
  const canDelete = bkk.status === 'draft' && ['owner', 'director', 'finance'].includes(userRole)

  const handleSubmit = async () => {
    setIsLoading(true)
    const result = await submitForApproval(bkk.id)
    setIsLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Submitted for approval')
      router.refresh()
    }
  }

  const handleApprove = async () => {
    setIsLoading(true)
    const result = await approveDisbursement(bkk.id, userId)
    setIsLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Disbursement approved')
      router.refresh()
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setIsLoading(true)
    const result = await rejectDisbursement(bkk.id, userId, rejectionReason)
    setIsLoading(false)
    setRejectDialogOpen(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Disbursement rejected')
      router.refresh()
    }
  }

  const handleRelease = async () => {
    setIsLoading(true)
    const result = await releaseDisbursement(bkk.id, userId)
    setIsLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Funds released')
      router.refresh()
    }
  }

  const handleSettle = async () => {
    setIsLoading(true)
    const result = await settleDisbursement(bkk.id, userId)
    setIsLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Disbursement settled')
      router.refresh()
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    const result = await deleteDisbursement(bkk.id)
    setIsLoading(false)
    setDeleteDialogOpen(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Disbursement deleted')
      router.push('/disbursements')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/disbursements')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{bkk.bkk_number}</h1>
              <Badge className={cn('capitalize', statusColors[bkk.status])}>
                {bkk.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {categoryLabels[bkk.category]} • Created {formatDate(bkk.created_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canSubmit && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </Button>
          )}
          {canApprove && (
            <>
              <Button onClick={handleApprove} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} disabled={isLoading}>
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {canRelease && (
            <Button onClick={handleRelease} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <Banknote className="mr-2 h-4 w-4" />
              Release Funds
            </Button>
          )}
          {canSettle && (
            <Button onClick={handleSettle} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              <FileCheck className="mr-2 h-4 w-4" />
              Settle
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} disabled={isLoading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Disbursement Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(bkk.date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline">{categoryLabels[bkk.category]}</Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{bkk.description || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">{formatCurrencyIDR(bkk.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium capitalize">{bkk.payment_method || '-'}</p>
              </div>
            </div>

            {bkk.reference_number && (
              <div>
                <p className="text-sm text-muted-foreground">Reference Number</p>
                <p className="font-medium">{bkk.reference_number}</p>
              </div>
            )}

            {bkk.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{bkk.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* References */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              References
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bkk.job_orders && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-medium">Job Order</span>
                </div>
                <p className="font-mono">{bkk.job_orders.jo_number}</p>
                <p className="text-sm text-muted-foreground">{bkk.job_orders.customer_name}</p>
              </div>
            )}

            {bkk.vendors && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Vendor</span>
                </div>
                <p className="font-medium">{bkk.vendors.name}</p>
                {bkk.vendors.vendor_code && (
                  <p className="text-sm text-muted-foreground">{bkk.vendors.vendor_code}</p>
                )}
                
                {bkk.vendors.bank_account && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Bank Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Bank</p>
                        <p>{bkk.vendors.bank_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account</p>
                        <p className="font-mono">{bkk.vendors.bank_account}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p>{bkk.vendors.bank_account_name || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!bkk.job_orders && !bkk.vendors && (
              <p className="text-muted-foreground text-center py-4">No references linked</p>
            )}
          </CardContent>
        </Card>

        {/* Workflow History */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Workflow History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-muted-foreground">Created</div>
                <div>
                  <p className="font-medium">{bkk.created_by_profile?.full_name || '-'}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(bkk.created_at)}</p>
                </div>
              </div>

              {bkk.approved_at && (
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-muted-foreground">Approved</div>
                  <div>
                    <p className="font-medium">{bkk.approved_by_profile?.full_name || '-'}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(bkk.approved_at)}</p>
                  </div>
                </div>
              )}

              {bkk.released_at && (
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-muted-foreground">Released</div>
                  <div>
                    <p className="font-medium">{bkk.released_by_profile?.full_name || '-'}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(bkk.released_at)}</p>
                  </div>
                </div>
              )}

              {bkk.settled_at && (
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-muted-foreground">Settled</div>
                  <div>
                    <p className="font-medium">{bkk.settled_by_profile?.full_name || '-'}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(bkk.settled_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Disbursement</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this disbursement request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={isLoading || !rejectionReason.trim()}>
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Disbursement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bkk.bkk_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
