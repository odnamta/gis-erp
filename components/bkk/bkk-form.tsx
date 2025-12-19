'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatBKKCurrency, calculateAvailableBudget } from '@/lib/bkk-utils'
import { createBKK, getBKKsForCostItem } from '@/app/(main)/job-orders/bkk-actions'
import type { BKK, CreateBKKInput } from '@/types/database'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CostItem {
  id: string
  category: string
  description: string
  estimated_amount: number
  actual_amount: number | null
  status: string
}

interface BKKFormProps {
  jobOrderId: string
  joNumber: string
  costItems: CostItem[]
  generatedBKKNumber: string
}

export function BKKForm({ jobOrderId, joNumber, costItems, generatedBKKNumber }: BKKFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCostItemId, setSelectedCostItemId] = useState<string>('')
  const [purpose, setPurpose] = useState('')
  const [amountRequested, setAmountRequested] = useState('')
  const [notes, setNotes] = useState('')
  const [budgetInfo, setBudgetInfo] = useState<{
    budgetAmount: number
    alreadyDisbursed: number
    available: number
    pendingRequests: number
  } | null>(null)
  const [loadingBudget, setLoadingBudget] = useState(false)

  // Filter out closed cost items
  const availableCostItems = costItems.filter(
    item => item.status !== 'confirmed' && item.status !== 'exceeded'
  )

  // Load budget info when cost item is selected
  useEffect(() => {
    async function loadBudgetInfo() {
      if (!selectedCostItemId) {
        setBudgetInfo(null)
        return
      }

      setLoadingBudget(true)
      const costItem = costItems.find(c => c.id === selectedCostItemId)
      if (!costItem) {
        setBudgetInfo(null)
        setLoadingBudget(false)
        return
      }

      const existingBKKs = await getBKKsForCostItem(selectedCostItemId)
      const budget = calculateAvailableBudget(costItem.estimated_amount, existingBKKs)
      setBudgetInfo(budget)
      setLoadingBudget(false)
    }

    loadBudgetInfo()
  }, [selectedCostItemId, costItems])

  const selectedCostItem = costItems.find(c => c.id === selectedCostItemId)
  const requestedAmount = parseFloat(amountRequested) || 0
  const exceedsBudget = budgetInfo && requestedAmount > budgetInfo.available

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!purpose.trim()) {
      toast.error('Purpose is required')
      return
    }
    
    if (requestedAmount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    setIsLoading(true)

    const input: CreateBKKInput = {
      jo_id: jobOrderId,
      purpose: purpose.trim(),
      amount_requested: requestedAmount,
      notes: notes.trim() || undefined,
    }

    if (selectedCostItemId && selectedCostItem) {
      input.pjo_cost_item_id = selectedCostItemId
      input.budget_category = selectedCostItem.category
      input.budget_amount = selectedCostItem.estimated_amount
    }

    const result = await createBKK(input)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('BKK request submitted successfully')
      router.push(`/job-orders/${jobOrderId}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Request Cash Disbursement (BKK)</span>
            <span className="text-sm font-normal text-muted-foreground">JO: {joNumber}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* BKK Number */}
          <div className="space-y-2">
            <Label>BKK Number</Label>
            <Input value={generatedBKKNumber} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Auto-generated</p>
          </div>

          {/* Budget Reference Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">Budget Reference</h3>
            
            <div className="space-y-2">
              <Label htmlFor="cost-item">Select Cost Item (Optional)</Label>
              <Select value={selectedCostItemId} onValueChange={setSelectedCostItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cost item..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No cost item</SelectItem>
                  {availableCostItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.category} - {item.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingBudget && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading budget info...
              </div>
            )}

            {budgetInfo && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Budget Amount</p>
                  <p className="font-semibold">{formatBKKCurrency(budgetInfo.budgetAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Already Disbursed</p>
                  <p className="font-semibold">{formatBKKCurrency(budgetInfo.alreadyDisbursed)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="font-semibold text-green-600">{formatBKKCurrency(budgetInfo.available)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Request Details Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">Request Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Uang jalan driver + BBM perjalanan Bogor-Bandung"
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount Requested *</Label>
              <Input
                id="amount"
                type="number"
                value={amountRequested}
                onChange={(e) => setAmountRequested(e.target.value)}
                placeholder="0"
                min="1"
                required
              />
              {requestedAmount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatBKKCurrency(requestedAmount)}
                </p>
              )}
            </div>

            {exceedsBudget && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Requested amount exceeds available budget by{' '}
                  {formatBKKCurrency(requestedAmount - budgetInfo.available)}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
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
              Submit Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
