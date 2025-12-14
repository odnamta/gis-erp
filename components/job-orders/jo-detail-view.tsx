'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { JobOrderWithRelations, PJORevenueItem, PJOCostItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { JOStatusBadge } from '@/components/ui/jo-status-badge'
import { formatIDR, formatDate, formatDateTime, COST_CATEGORY_LABELS } from '@/lib/pjo-utils'
import { markCompleted, submitToFinance, getJORevenueItems, getJOCostItems } from '@/app/(main)/job-orders/actions'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Send, FileText, ArrowLeft, Loader2 } from 'lucide-react'

interface JODetailViewProps {
  jobOrder: JobOrderWithRelations
}

export function JODetailView({ jobOrder }: JODetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [revenueItems, setRevenueItems] = useState<PJORevenueItem[]>([])
  const [costItems, setCostItems] = useState<PJOCostItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)

  const pjo = jobOrder.proforma_job_orders
  const profit = (jobOrder.final_revenue ?? jobOrder.amount ?? 0) - (jobOrder.final_cost ?? 0)
  const margin = jobOrder.final_revenue && jobOrder.final_revenue > 0
    ? (profit / jobOrder.final_revenue) * 100
    : 0

  useEffect(() => {
    async function loadItems() {
      if (!pjo?.id) {
        setItemsLoading(false)
        return
      }
      setItemsLoading(true)
      try {
        const [revenue, cost] = await Promise.all([
          getJORevenueItems(pjo.id),
          getJOCostItems(pjo.id),
        ])
        setRevenueItems(revenue as PJORevenueItem[])
        setCostItems(cost as PJOCostItem[])
      } finally {
        setItemsLoading(false)
      }
    }
    loadItems()
  }, [pjo?.id])

  async function handleMarkCompleted() {
    setIsLoading(true)
    try {
      const result = await markCompleted(jobOrder.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Job Order marked as completed' })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmitToFinance() {
    setIsLoading(true)
    try {
      const result = await submitToFinance(jobOrder.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Job Order submitted to finance' })
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
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{jobOrder.jo_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <JOStatusBadge status={jobOrder.status} />
            {jobOrder.converted_from_pjo_at && (
              <span className="text-sm text-muted-foreground">
                Created {formatDate(jobOrder.converted_from_pjo_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(jobOrder.status === 'active' || jobOrder.status === 'in_progress') && (
            <Button onClick={handleMarkCompleted} disabled={isLoading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Completed
            </Button>
          )}
          {jobOrder.status === 'completed' && (
            <Button onClick={handleSubmitToFinance} disabled={isLoading}>
              <Send className="mr-2 h-4 w-4" />
              Submit to Finance
            </Button>
          )}
          {jobOrder.status === 'submitted_to_finance' && (
            <Button disabled>
              <FileText className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Source PJO */}
      {pjo && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-400">Source PJO</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/proforma-jo/${pjo.id}`} className="text-blue-600 hover:underline font-medium">
              {pjo.pjo_number}
            </Link>
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
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">
              {jobOrder.customers ? (
                <Link href={`/customers/${jobOrder.customers.id}`} className="hover:underline">
                  {jobOrder.customers.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Project</Label>
            <p className="font-medium">
              {jobOrder.projects ? (
                <Link href={`/projects/${jobOrder.projects.id}`} className="hover:underline">
                  {jobOrder.projects.name}
                </Link>
              ) : (
                '-'
              )}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="font-medium">{jobOrder.description || pjo?.commodity || '-'}</p>
          </div>
          {pjo?.quantity && (
            <div>
              <Label className="text-muted-foreground">Quantity</Label>
              <p className="font-medium">{pjo.quantity} {pjo.quantity_unit || ''}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logistics (from PJO) */}
      {pjo && (
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
      )}

      {/* Financials */}
      <Card>
        <CardHeader>
          <CardTitle>Final Financials</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-muted-foreground">Final Revenue</Label>
            <p className="text-lg font-semibold">{formatIDR(jobOrder.final_revenue ?? jobOrder.amount ?? 0)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Final Cost</Label>
            <p className="text-lg font-semibold">{jobOrder.final_cost ? formatIDR(jobOrder.final_cost) : '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Final Profit</Label>
            <p className={`text-lg font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {jobOrder.final_cost ? formatIDR(profit) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Final Margin</Label>
            <p className={`text-lg font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {jobOrder.final_cost ? `${margin.toFixed(1)}%` : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : revenueItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No revenue items found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatIDR(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(item.subtotal)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={4}>Total Revenue</TableCell>
                  <TableCell className="text-right">{formatIDR(jobOrder.final_revenue ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown (Actual)</CardTitle>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : costItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No cost items found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costItems.map((item) => {
                  const variance = (item.actual_amount ?? 0) - item.estimated_amount
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{COST_CATEGORY_LABELS[item.category] || item.category}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{formatIDR(item.estimated_amount)}</TableCell>
                      <TableCell className="text-right">{item.actual_amount != null ? formatIDR(item.actual_amount) : '-'}</TableCell>
                      <TableCell className={`text-right ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}`}>
                        {item.actual_amount != null ? formatIDR(variance) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Total Cost</TableCell>
                  <TableCell className="text-right">{formatIDR(jobOrder.final_cost ?? 0)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Created from PJO</Label>
            <p className="font-medium">
              {jobOrder.converted_from_pjo_at
                ? formatDateTime(jobOrder.converted_from_pjo_at)
                : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Completed</Label>
            <p className="font-medium">
              {jobOrder.completed_at
                ? formatDateTime(jobOrder.completed_at)
                : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Submitted to Finance</Label>
            <p className="font-medium">
              {jobOrder.submitted_to_finance_at
                ? formatDateTime(jobOrder.submitted_to_finance_at)
                : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(jobOrder.notes || pjo?.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{jobOrder.notes || pjo?.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
