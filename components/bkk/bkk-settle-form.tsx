'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatBKKCurrency, calculateSettlementDifference } from '@/lib/bkk-utils'
import { settleBKK } from '@/app/(main)/job-orders/bkk-actions'
import type { BKKWithRelations, SettleBKKInput } from '@/types'
import { ArrowDown, ArrowUp, Minus, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

interface BKKSettleFormProps {
  bkk: BKKWithRelations
  jobOrderId: string
}

export function BKKSettleForm({ bkk, jobOrderId }: BKKSettleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [amountSpent, setAmountSpent] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptUrls, setReceiptUrls] = useState<string[]>([])
  const [newReceiptUrl, setNewReceiptUrl] = useState('')

  const spentAmount = parseFloat(amountSpent) || 0
  const releasedAmount = bkk.amount_requested
  const difference = calculateSettlementDifference(releasedAmount, spentAmount)

  const handleAddReceipt = () => {
    if (newReceiptUrl.trim()) {
      setReceiptUrls([...receiptUrls, newReceiptUrl.trim()])
      setNewReceiptUrl('')
    }
  }

  const handleRemoveReceipt = (index: number) => {
    setReceiptUrls(receiptUrls.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (spentAmount < 0) {
      toast.error('Amount spent cannot be negative')
      return
    }

    setIsLoading(true)

    const input: SettleBKKInput = {
      amount_spent: spentAmount,
      receipt_urls: receiptUrls.length > 0 ? receiptUrls : undefined,
      notes: notes.trim() || undefined,
    }

    const result = await settleBKK(bkk.id, input)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('BKK settled successfully')
      router.push(`/job-orders/${jobOrderId}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Settle {bkk.bkk_number}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Released Amount */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Released Amount</p>
            <p className="text-2xl font-bold">{formatBKKCurrency(releasedAmount)}</p>
          </div>

          {/* Actual Spending Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">Actual Spending</h3>
            
            <div className="space-y-2">
              <Label htmlFor="amount-spent">Amount Spent *</Label>
              <Input
                id="amount-spent"
                type="number"
                value={amountSpent}
                onChange={(e) => setAmountSpent(e.target.value)}
                placeholder="0"
                min="0"
                required
              />
              {spentAmount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatBKKCurrency(spentAmount)}
                </p>
              )}
            </div>

            {/* Difference Display */}
            {spentAmount > 0 && (
              <Alert className={
                difference.type === 'return' ? 'border-green-500 bg-green-50' :
                difference.type === 'additional' ? 'border-orange-500 bg-orange-50' :
                'border-gray-500 bg-gray-50'
              }>
                <div className="flex items-center gap-2">
                  {difference.type === 'return' && <ArrowDown className="h-4 w-4 text-green-600" />}
                  {difference.type === 'additional' && <ArrowUp className="h-4 w-4 text-orange-600" />}
                  {difference.type === 'exact' && <Minus className="h-4 w-4 text-gray-600" />}
                  <AlertDescription>
                    {difference.type === 'return' && (
                      <span className="text-green-700">
                        {formatBKKCurrency(difference.difference)} to be returned
                      </span>
                    )}
                    {difference.type === 'additional' && (
                      <span className="text-orange-700">
                        {formatBKKCurrency(difference.difference)} additional spent
                      </span>
                    )}
                    {difference.type === 'exact' && (
                      <span className="text-gray-700">Exact match - no return needed</span>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>

          {/* Receipts Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">Receipts/Proof</h3>
            
            <div className="flex gap-2">
              <Input
                value={newReceiptUrl}
                onChange={(e) => setNewReceiptUrl(e.target.value)}
                placeholder="Enter receipt URL..."
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAddReceipt}>
                <Upload className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {receiptUrls.length > 0 && (
              <div className="space-y-2">
                {receiptUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="flex-1 text-sm truncate">{url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveReceipt(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Return Rp 500,000 ke kasir"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Settlement
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
