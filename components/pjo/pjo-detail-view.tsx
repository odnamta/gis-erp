'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PJOWithRelations, PJORevenueItem, PJOCostItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { PJOStatusBadge } from '@/components/ui/pjo-status-badge'
import { RevenueItemsSection } from './revenue-items-section'
import { CostItemsSection } from './cost-items-section'
import { CostConfirmationSection } from './cost-confirmation-section'
import { BudgetSummary } from './budget-summary'
import { ConversionStatus } from './conversion-status'
import { formatIDR, formatDate, calculateMargin, calculateRevenueTotal, calculateCostTotal, analyzeBudget, validatePositiveMargin } from '@/lib/pjo-utils'
import { submitForApproval, approvePJO, rejectPJO } from '@/app/(main)/proforma-jo/actions'
import { getRevenueItems } from '@/app/(main)/proforma-jo/revenue-actions'
import { getCostItems } from '@/app/(main)/proforma-jo/cost-actions'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Send, Check, X, DollarSign } from 'lucide-react'

interface PJODetailViewProps {
  pjo: PJOWithRelations
  canApprove?: boolean
}

export function PJODetailView({ pjo, canApprove = true }: PJODetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [revenueItems, setRevenueItems] = useState<PJORevenueItem[]>([])
  const [costItems, setCostItems] = useState<PJOCostItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)

  const margin = calculateMargin(pjo.total_revenue, pjo.total_expenses)

  const loadItems = async () => {
    setItemsLoading(true)
    try {
      const [revenue, cost] = await Promise.all([
        getRevenueItems(pjo.id),
        getCostItems(pjo.id),
      ])
      setRevenueItems(revenue)
      setCostItems(cost)
    } finally {
      setItemsLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pjo.id])

  const totalRevenue = revenueItems.length > 0 
    ? calculateRevenueTotal(revenueItems) 
    : pjo.total_revenue
  const budget = analyzeBudget(costItems)
  const hasItemizedData = revenueItems.length > 0 || costItems.length > 0
  const isEditable = pjo.status === 'draft'
  const showCostConfirmation = pjo.status === 'approved' && !pjo.converted_to_jo

  async function handleSubmitForApproval() {
    // Validate line items exist
    if (revenueItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one revenue item', variant: 'destructive' })
      return
    }
    if (costItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one cost item', variant: 'destructive' })
      return
    }

    // Validate positive margin (revenue > cost)
    const totalCost = calculateCostTotal(costItems, 'estimated')
    const marginValidation = validatePositiveMargin(totalRevenue, totalCost)
    if (!marginValidation.valid) {
      toast({ title: 'Error', description: marginValidation.error, variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await submitForApproval(pjo.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PJO submitted for approval' })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApprove() {
    setIsLoading(true)
    try {
      const result = await approvePJO(pjo.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PJO approved' })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a rejection reason', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await rejectPJO(pjo.id, rejectionReason)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'PJO rejected' })
        setRejectDialogOpen(false)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{pjo.pjo_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <PJOStatusBadge status={pjo.status} />
            {pjo.jo_date && (
              <span className="text-sm text-muted-foreground">
                {formatDate(pjo.jo_date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {pjo.status === 'draft' && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/proforma-jo/${pjo.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button onClick={handleSubmitForApproval} disabled={isLoading}>
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </>
          )}
          {pjo.status === 'pending_approval' && canApprove && (
            <>
              <Button onClick={handleApprove} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {pjo.status === 'approved' && !pjo.converted_to_jo && (
            <Button asChild>
              <Link href={`/proforma-jo/${pjo.id}/costs`}>
                <DollarSign className="mr-2 h-4 w-4" />
                Fill Actual Costs
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Rejection reason if rejected */}
      {pjo.status === 'rejected' && pjo.rejection_reason && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{pjo.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Project</Label>
            <p className="font-medium">
              {pjo.projects ? (
                <Link href={`/projects/${pjo.projects.id}`} className="hover:underline">
                  {pjo.projects.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">
              {pjo.projects?.customers ? (
                <Link href={`/customers/${pjo.projects.customers.id}`} className="hover:underline">
                  {pjo.projects.customers.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Commodity</Label>
            <p className="font-medium">{pjo.commodity || '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Quantity</Label>
            <p className="font-medium">
              {pjo.quantity ? `${pjo.quantity} ${pjo.quantity_unit || ''}` : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logistics */}
      <Card>
        <CardHeader>
          <CardTitle>Logistics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Point of Loading (POL)</Label>
            <p className="font-medium">{pjo.pol || '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Point of Destination (POD)</Label>
            <p className="font-medium">{pjo.pod || '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">ETD</Label>
            <p className="font-medium">
              {pjo.etd ? formatDate(pjo.etd) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">ETA</Label>
            <p className="font-medium">
              {pjo.eta ? formatDate(pjo.eta) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Carrier Type</Label>
            <p className="font-medium">{pjo.carrier_type || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Items */}
      {!itemsLoading && (
        <RevenueItemsSection
          pjoId={pjo.id}
          items={revenueItems}
          isEditable={isEditable}
          onRefresh={loadItems}
        />
      )}

      {/* Cost Items - Estimation view for draft/pending, or read-only for others */}
      {!itemsLoading && !showCostConfirmation && (
        <CostItemsSection
          pjoId={pjo.id}
          items={costItems}
          totalRevenue={totalRevenue}
          isEditable={isEditable}
          onRefresh={loadItems}
        />
      )}

      {/* Cost Confirmation - Operations view when approved */}
      {!itemsLoading && showCostConfirmation && (
        <CostConfirmationSection
          items={costItems}
          onRefresh={loadItems}
        />
      )}

      {/* Budget Summary - Show when approved and has cost items */}
      {!itemsLoading && pjo.status === 'approved' && costItems.length > 0 && (
        <BudgetSummary budget={budget} totalRevenue={totalRevenue} />
      )}

      {/* Conversion Status - Show when approved */}
      {pjo.status === 'approved' && (
        <ConversionStatus
          pjoId={pjo.id}
          pjoStatus={pjo.status}
          isConverted={pjo.converted_to_jo || false}
          jobOrderId={pjo.job_order_id}
        />
      )}

      {/* Legacy Financials - Show only if no itemized data */}
      {!hasItemizedData && !itemsLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Financials (Legacy)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-muted-foreground">Total Revenue</Label>
              <p className="text-lg font-semibold">{formatIDR(pjo.total_revenue)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Expenses</Label>
              <p className="text-lg font-semibold">{formatIDR(pjo.total_expenses)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Profit</Label>
              <p className={`text-lg font-semibold ${pjo.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatIDR(pjo.profit)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Margin</Label>
              <p className={`text-lg font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margin.toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {pjo.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{pjo.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject PJO</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this PJO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isLoading || !rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
