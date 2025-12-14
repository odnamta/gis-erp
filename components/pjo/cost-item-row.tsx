'use client'

import { useState } from 'react'
import { PJOCostItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatIDR, parseIDR, calculateCostStatus, COST_CATEGORY_LABELS } from '@/lib/pjo-utils'

import { Check, Loader2 } from 'lucide-react'

interface CostItemRowProps {
  item: PJOCostItem
  index: number
  onConfirm: (itemId: string, amount: number, justification?: string) => Promise<void>
  disabled: boolean
  justification?: string
  onJustificationChange?: (value: string) => void
}

export function CostItemRow({ 
  item, 
  index, 
  onConfirm, 
  disabled,
  justification: externalJustification,
  onJustificationChange,
}: CostItemRowProps) {
  const [actualAmount, setActualAmount] = useState<string>(
    item.actual_amount != null ? item.actual_amount.toString() : ''
  )
  const [internalJustification, setInternalJustification] = useState(item.justification || '')
  const [isConfirming, setIsConfirming] = useState(false)
  
  // Use external justification if provided, otherwise use internal state
  const justification = externalJustification ?? internalJustification
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _setJustification = onJustificationChange ?? setInternalJustification

  const isConfirmed = item.actual_amount !== null && item.confirmed_at !== null

  // Calculate current status based on input
  const currentAmount = parseIDR(actualAmount) || 0
  const hasAmount = actualAmount.trim() !== '' && currentAmount >= 0
  const { status: calculatedStatus, variance, variancePct } = hasAmount
    ? calculateCostStatus(item.estimated_amount, currentAmount)
    : { status: item.status, variance: 0, variancePct: 0 }

  const isExceeded = calculatedStatus === 'exceeded'
  const needsJustification = isExceeded && justification.trim().length < 10
  const canConfirm = hasAmount && !needsJustification && !disabled && !isConfirmed

  const handleConfirm = async () => {
    if (!canConfirm) return
    
    setIsConfirming(true)
    try {
      await onConfirm(item.id, currentAmount, isExceeded ? justification : undefined)
    } finally {
      setIsConfirming(false)
    }
  }

  const getStatusIcon = () => {
    if (!hasAmount) return '⏳'
    switch (calculatedStatus) {
      case 'confirmed': return '✅'
      case 'at_risk': return '⚠️'
      case 'exceeded': return '🚫'
      default: return '⏳'
    }
  }

  const getStatusLabel = () => {
    if (!hasAmount) return 'Pending'
    switch (calculatedStatus) {
      case 'confirmed': return 'Under Budget'
      case 'at_risk': return 'At Risk'
      case 'exceeded': return 'Exceeded'
      default: return 'Pending'
    }
  }

  return (
    <tr className="border-b">
      <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
      <td className="px-4 py-3">
        <span className="font-medium">{COST_CATEGORY_LABELS[item.category] || item.category}</span>
      </td>
      <td className="px-4 py-3 text-sm">{item.description}</td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {formatIDR(item.estimated_amount)}
      </td>
      <td className="px-4 py-3">
        {isConfirmed || disabled ? (
          <span className="font-mono text-sm">
            {item.actual_amount != null ? formatIDR(item.actual_amount) : '-'}
          </span>
        ) : (
          <Input
            type="text"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Enter amount"
            className="w-32 font-mono text-sm"
          />
        )}
      </td>
      <td className={`px-4 py-3 text-right font-mono text-sm ${
        variance < 0 ? 'text-green-600' : variance > 0 ? 'text-red-600' : ''
      }`}>
        {hasAmount ? (
          <>
            {variance >= 0 ? '+' : ''}{formatIDR(variance)}
            <span className="text-xs text-muted-foreground ml-1">
              ({variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%)
            </span>
          </>
        ) : '-'}
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 text-sm">
          {getStatusIcon()} {getStatusLabel()}
        </span>
      </td>
      <td className="px-4 py-3">
        {!isConfirmed && !disabled && (
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming}
          >
            {isConfirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Confirm
              </>
            )}
          </Button>
        )}
        {isConfirmed && (
          <span className="text-sm text-green-600">Confirmed</span>
        )}
      </td>
    </tr>
  )
}

// Justification row shown below exceeded items
export function JustificationRow({
  item,
  justification,
  setJustification,
  disabled,
}: {
  item: PJOCostItem
  justification: string
  setJustification: (value: string) => void
  disabled: boolean
}) {
  const isConfirmed = item.actual_amount !== null && item.confirmed_at !== null

  if (isConfirmed && item.justification) {
    return (
      <tr className="bg-red-50">
        <td colSpan={8} className="px-4 py-2">
          <div className="text-sm">
            <span className="font-medium text-red-700">Justification: </span>
            <span className="text-red-600">{item.justification}</span>
          </div>
        </td>
      </tr>
    )
  }

  if (disabled) return null

  return (
    <tr className="bg-red-50">
      <td colSpan={8} className="px-4 py-2">
        <div className="flex items-start gap-2">
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Provide justification for exceeding budget (minimum 10 characters)..."
            className="flex-1 min-h-[60px] text-sm"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {justification.length}/10 min
          </span>
        </div>
      </td>
    </tr>
  )
}
