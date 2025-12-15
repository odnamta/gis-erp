'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { formatIDR } from '@/lib/pjo-utils'

interface CostItem {
  id: string
  category: string
  description: string | null
  estimated_amount: number
  actual_amount: number | null
}

interface QuickCostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  costItem: CostItem | null
  pjoNumber: string
  onConfirm: (itemId: string, amount: number, justification?: string) => Promise<void>
}

export function QuickCostModal({
  open,
  onOpenChange,
  costItem,
  pjoNumber,
  onConfirm,
}: QuickCostModalProps) {
  const [amount, setAmount] = useState('')
  const [justification, setJustification] = useState('')
  const [isPending, startTransition] = useTransition()

  if (!costItem) return null

  const numericAmount = parseFloat(amount) || 0
  const isExceeded = numericAmount > costItem.estimated_amount
  const variance = numericAmount - costItem.estimated_amount
  const variancePct = costItem.estimated_amount > 0 
    ? ((variance / costItem.estimated_amount) * 100).toFixed(1)
    : '0'

  const handleSubmit = () => {
    if (!amount || numericAmount <= 0) return
    if (isExceeded && !justification.trim()) return

    startTransition(async () => {
      await onConfirm(costItem.id, numericAmount, isExceeded ? justification : undefined)
      setAmount('')
      setJustification('')
      onOpenChange(false)
    })
  }

  const handleClose = () => {
    setAmount('')
    setJustification('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Cost Entry</DialogTitle>
          <DialogDescription>
            {pjoNumber} - {costItem.category}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Cost Item Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Category:</span>
              <p className="font-medium capitalize">{costItem.category.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Budget Cap:</span>
              <p className="font-medium font-mono">{formatIDR(costItem.estimated_amount)}</p>
            </div>
          </div>

          {costItem.description && (
            <div className="text-sm">
              <span className="text-muted-foreground">Description:</span>
              <p>{costItem.description}</p>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Actual Amount (Rp)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter actual cost"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Variance Display */}
          {amount && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm">Variance:</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-medium ${
                  variance < 0 ? 'text-green-600' : variance > 0 ? 'text-red-600' : ''
                }`}>
                  {variance >= 0 ? '+' : ''}{formatIDR(variance)} ({variancePct}%)
                </span>
                {isExceeded && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Over Budget
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Justification (required when exceeded) */}
          {isExceeded && (
            <div className="space-y-2">
              <Label htmlFor="justification" className="text-red-600">
                Justification Required *
              </Label>
              <Textarea
                id="justification"
                placeholder="Explain why the cost exceeded the budget..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                disabled={isPending}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                A justification is required when actual cost exceeds the budget.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !amount || numericAmount <= 0 || (isExceeded && !justification.trim())}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Cost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
