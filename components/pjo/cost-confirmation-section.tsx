'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { PJOCostItem } from '@/types'
import { confirmActualCost } from '@/app/(main)/proforma-jo/cost-actions'
import { useToast } from '@/hooks/use-toast'
import { formatIDR, analyzeBudget, getBudgetWarningLevel, getBudgetUsagePercent, COST_CATEGORY_LABELS } from '@/lib/pjo-utils'

interface CostConfirmationSectionProps {
  items: PJOCostItem[]
  onRefresh?: () => void
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'confirmed':
    case 'under_budget':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'exceeded':
      return <AlertTriangle className="h-5 w-5 text-amber-600" />
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />
  }
}

interface ConfirmRowProps {
  item: PJOCostItem
  onConfirm: (id: string, actual: number, justification?: string) => Promise<void>
}

function ConfirmRow({ item, onConfirm }: ConfirmRowProps) {
  const [actualAmount, setActualAmount] = useState<string>(item.actual_amount?.toString() || '')
  const [justification, setJustification] = useState(item.justification || '')
  const [isLoading, setIsLoading] = useState(false)
  const [showJustification, setShowJustification] = useState(false)

  const actualNum = parseFloat(actualAmount) || 0
  const needsJustification = actualNum > item.estimated_amount
  const isConfirmed = item.actual_amount !== null && item.actual_amount !== undefined

  async function handleConfirm() {
    if (needsJustification && !justification.trim()) {
      setShowJustification(true)
      return
    }
    setIsLoading(true)
    try {
      await onConfirm(item.id, actualNum, needsJustification ? justification : undefined)
    } finally {
      setIsLoading(false)
    }
  }

  const varianceDisplay = isConfirmed && item.variance !== null && item.variance !== undefined
    ? `${item.variance >= 0 ? '+' : ''}${item.variance_pct?.toFixed(1)}%`
    : '-'

  const varianceColor = item.variance !== null && item.variance !== undefined
    ? item.variance > 0 ? 'text-amber-600' : 'text-green-600'
    : ''

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          {COST_CATEGORY_LABELS[item.category] || item.category}
        </TableCell>
        <TableCell>{item.description}</TableCell>
        <TableCell className="text-right">{formatIDR(item.estimated_amount)}</TableCell>
        <TableCell>
          {isConfirmed ? (
            <span className="text-right block">{formatIDR(item.actual_amount!)}</span>
          ) : (
            <div className="space-y-1">
              <Input
                type="number"
                value={actualAmount}
                onChange={(e) => {
                  setActualAmount(e.target.value)
                  const val = parseFloat(e.target.value) || 0
                  setShowJustification(val > item.estimated_amount)
                }}
                placeholder="Enter actual"
                className="w-32"
              />
              {/* 90% budget warning */}
              {actualNum > 0 && getBudgetWarningLevel(item.estimated_amount, actualNum) === 'warning' && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {getBudgetUsagePercent(item.estimated_amount, actualNum).toFixed(0)}% of budget
                </p>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className={`text-right ${varianceColor}`}>
          {varianceDisplay}
        </TableCell>
        <TableCell className="text-center">
          <StatusIcon status={item.status} />
        </TableCell>
        <TableCell>
          {!isConfirmed && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading || !actualAmount}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {(showJustification || (isConfirmed && item.justification)) && (
        <TableRow>
          <TableCell colSpan={7} className="bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {isConfirmed ? 'Over budget justification:' : 'Justification required (over budget):'}
                </p>
                {isConfirmed ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">{item.justification}</p>
                ) : (
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explain why actual cost exceeds budget..."
                    rows={2}
                    className="mt-1"
                  />
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function CostConfirmationSection({ items, onRefresh }: CostConfirmationSectionProps) {
  const { toast } = useToast()
  const budget = analyzeBudget(items)

  async function handleConfirm(id: string, actual: number, justification?: string) {
    const result = await confirmActualCost(id, {
      actual_amount: actual,
      justification,
    })
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Cost confirmed' })
      onRefresh?.()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cost Confirmation</CardTitle>
        <div className="flex items-center gap-2">
          {budget.has_overruns ? (
            <span className="flex items-center gap-1 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {budget.items_over_budget} over budget
            </span>
          ) : budget.all_confirmed ? (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              All confirmed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              {budget.items_pending} pending
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No cost items to confirm.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Budget (Max)</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <ConfirmRow key={item.id} item={item} onConfirm={handleConfirm} />
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-lg font-semibold">{formatIDR(budget.total_estimated ?? 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed Actual</p>
                <p className="text-lg font-semibold">{formatIDR(budget.total_actual ?? 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Confirmed</p>
                <p className="text-lg font-semibold">{budget.items_confirmed} / {items.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Variance</p>
                <p className={`text-lg font-semibold ${(budget.total_variance ?? 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {(budget.total_variance ?? 0) >= 0 ? '+' : ''}{(budget.variance ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
