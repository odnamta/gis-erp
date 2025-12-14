'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PJOCostItem, PJOWithRelations } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatIDR, calculateCostStatus } from '@/lib/pjo-utils'
import { CostItemRow, JustificationRow } from '@/components/pjo/cost-item-row'
import { ProgressIndicator } from '@/components/pjo/progress-indicator'
import { BudgetSummaryWarning } from '@/components/pjo/budget-warning'
import { confirmCostItem } from '@/app/(main)/proforma-jo/actions'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react'

interface CostsClientProps {
  pjo: PJOWithRelations
  costItems: PJOCostItem[]
  canEdit: boolean
}

export function CostsClient({ pjo, costItems: initialCostItems, canEdit }: CostsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [costItems, setCostItems] = useState(initialCostItems)
  const [justifications, setJustifications] = useState<Record<string, string>>({})

  // Calculate progress
  const confirmed = costItems.filter(item => item.actual_amount !== null && item.confirmed_at !== null).length
  const total = costItems.length
  const allConfirmed = confirmed === total && total > 0
  const hasOverruns = costItems.some(item => item.status === 'exceeded')

  // Calculate totals
  const totalEstimated = costItems.reduce((sum, item) => sum + item.estimated_amount, 0)
  const totalActual = costItems.reduce((sum, item) => sum + (item.actual_amount ?? 0), 0)
  const totalVariance = totalActual - totalEstimated
  const overrunCount = costItems.filter(item => item.status === 'exceeded').length

  const handleConfirm = async (itemId: string, amount: number, justification?: string) => {
    startTransition(async () => {
      const result = await confirmCostItem(itemId, amount, justification)
      
      if (result.success) {
        // Update local state
        const { status, variance, variancePct } = calculateCostStatus(
          costItems.find(i => i.id === itemId)?.estimated_amount ?? 0,
          amount
        )
        
        setCostItems(prev => prev.map(item => 
          item.id === itemId 
            ? {
                ...item,
                actual_amount: amount,
                variance,
                variance_pct: variancePct,
                status,
                confirmed_at: new Date().toISOString(),
                justification: status === 'exceeded' ? justification : undefined,
              }
            : item
        ))
        
        toast({
          title: 'Cost confirmed',
          description: 'The cost item has been confirmed successfully.',
        })
        
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to confirm cost item',
          variant: 'destructive',
        })
      }
    })
  }

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return (
      <Badge className={statusColors[pjo.status] || 'bg-gray-100'}>
        {pjo.status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  // Show message if PJO is not approved
  if (pjo.status !== 'approved') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/proforma-jo/${pjo.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PJO
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Cannot Fill Actual Costs</h2>
              <p className="text-muted-foreground">
                Actual costs can only be filled for approved PJOs. 
                This PJO is currently in <strong>{pjo.status.replace('_', ' ')}</strong> status.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show message if already converted to JO
  if (pjo.converted_to_jo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/proforma-jo/${pjo.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PJO
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-blue-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Costs Locked</h2>
              <p className="text-muted-foreground">
                This PJO has been converted to a Job Order. Cost items cannot be modified.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/proforma-jo/${pjo.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{pjo.pjo_number}</h1>
            <p className="text-muted-foreground">Fill Actual Costs</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* PJO Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Project:</span>{' '}
              <span className="font-medium">{pjo.projects?.name || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Customer:</span>{' '}
              <span className="font-medium">{pjo.projects?.customers?.name || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Commodity:</span>{' '}
              <span className="font-medium">{pjo.commodity || '-'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Confirmation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressIndicator
            confirmed={confirmed}
            total={total}
            allConfirmed={allConfirmed}
            hasOverruns={hasOverruns}
          />
        </CardContent>
      </Card>

      {/* Budget Warning */}
      {hasOverruns && (
        <BudgetSummaryWarning
          hasOverruns={hasOverruns}
          overrunCount={overrunCount}
          totalVariance={costItems
            .filter(item => item.status === 'exceeded')
            .reduce((sum, item) => sum + (item.variance ?? 0), 0)}
        />
      )}

      {/* Cost Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cost Items - Enter Actual Amounts</CardTitle>
        </CardHeader>
        <CardContent>
          {costItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No cost items found for this PJO.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Budget</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actual</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Variance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {costItems.map((item, index) => {
                    const currentJustification = justifications[item.id] || item.justification || ''
                    const currentAmount = item.actual_amount ?? 0
                    const { status: currentStatus } = item.actual_amount !== null
                      ? calculateCostStatus(item.estimated_amount, currentAmount)
                      : { status: 'estimated' }
                    const showJustification = currentStatus === 'exceeded' && !item.confirmed_at

                    return (
                      <>
                        <CostItemRow
                          key={item.id}
                          item={item}
                          index={index}
                          onConfirm={handleConfirm}
                          disabled={!canEdit || isPending}
                        />
                        {(showJustification || (item.status === 'exceeded' && item.justification)) && (
                          <JustificationRow
                            key={`${item.id}-justification`}
                            item={item}
                            justification={currentJustification}
                            setJustification={(value) => setJustifications(prev => ({ ...prev, [item.id]: value }))}
                            disabled={!canEdit || isPending}
                          />
                        )}
                      </>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50 font-medium">
                    <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                    <td className="px-4 py-3 text-right font-mono">{formatIDR(totalEstimated)}</td>
                    <td className="px-4 py-3 font-mono">{formatIDR(totalActual)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      totalVariance < 0 ? 'text-green-600' : totalVariance > 0 ? 'text-red-600' : ''
                    }`}>
                      {totalVariance >= 0 ? '+' : ''}{formatIDR(totalVariance)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create JO Button */}
      {allConfirmed && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready for Job Order Conversion</p>
                <p className="text-sm text-muted-foreground">
                  All cost items have been confirmed. You can now create a Job Order.
                </p>
              </div>
              <Link href={`/proforma-jo/${pjo.id}/convert`}>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Job Order
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
