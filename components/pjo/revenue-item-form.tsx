'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Tag } from 'lucide-react'
import { PJORevenueItem } from '@/types'
import { createRevenueItem, updateRevenueItem, RevenueItemFormData } from '@/app/(main)/proforma-jo/revenue-actions'
import { useToast } from '@/hooks/use-toast'
import { formatIDR } from '@/lib/pjo-utils'
import { getActiveCustomerRates } from '@/lib/customer-rate-actions'
import type { CustomerContractRate } from '@/types/customer-rate'
import { UNIT_LABELS } from '@/types/vendor-rate'
import { formatCurrency } from '@/lib/utils/format'

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  source_type: z.enum(['quotation', 'contract', 'manual']).optional(),
  notes: z.string().optional(),
})

const unitOptions = [
  'Trip', 'Trips', 'Lot', 'Set', 'Unit', 'Units',
  'CBM', 'Ton', 'KG', 'Container', 'Package', 'Pcs'
]

interface RevenueItemFormProps {
  pjoId: string
  item?: PJORevenueItem | null
  customerId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RevenueItemForm({ pjoId, item, customerId, open, onOpenChange, onSuccess }: RevenueItemFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [customerRates, setCustomerRates] = useState<CustomerContractRate[]>([])
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const isEdit = !!item

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RevenueItemFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: item?.description || '',
      quantity: item?.quantity || 1,
      unit: item?.unit || '',
      unit_price: item?.unit_price || 0,
      source_type: (item?.source_type as 'quotation' | 'contract' | 'manual') || 'manual',
      notes: item?.notes || '',
    },
  })

  // Fetch customer contract rates
  useEffect(() => {
    if (customerId) {
      setIsLoadingRates(true)
      getActiveCustomerRates(customerId)
        .then((result) => {
          if (result.data) {
            setCustomerRates(result.data)
          } else {
            setCustomerRates([])
          }
        })
        .finally(() => setIsLoadingRates(false))
    }
  }, [customerId])

  const quantity = watch('quantity') || 0
  const unitPrice = watch('unit_price') || 0
  const subtotal = quantity * unitPrice
  const selectedUnit = watch('unit')

  async function onSubmit(data: RevenueItemFormData) {
    setIsLoading(true)
    try {
      if (isEdit && item) {
        const result = await updateRevenueItem(item.id, data)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'Revenue item updated' })
          onOpenChange(false)
          onSuccess?.()
        }
      } else {
        const result = await createRevenueItem(pjoId, data)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'Revenue item added' })
          reset()
          onOpenChange(false)
          onSuccess?.()
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Revenue Item' : 'Add Revenue Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="e.g., Freight Charge SBY-JKT"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                {...register('quantity', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={selectedUnit}
                onValueChange={(value) => setValue('unit', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-sm text-destructive">{errors.unit.message}</p>
              )}
            </div>
          </div>

          {/* Customer Contract Rates */}
          {customerId && customerRates.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tarif Kontrak
              </Label>
              <div className="flex flex-wrap gap-2">
                {customerRates.map((rate) => {
                  const unitLabel = UNIT_LABELS[rate.unit] || rate.unit
                  return (
                    <button
                      key={rate.id}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      onClick={() => {
                        setValue('unit_price', rate.base_price)
                        setValue('source_type', 'contract')
                        if (!watch('description') && rate.description) {
                          setValue('description', rate.description)
                        }
                      }}
                      title={`Klik untuk mengisi ${formatCurrency(rate.base_price)} sebagai harga satuan`}
                    >
                      <span className="font-medium">{formatCurrency(rate.base_price)}</span>
                      <span className="text-muted-foreground">/ {unitLabel}</span>
                      <span className="text-muted-foreground">- {rate.description}</span>
                      {rate.route_pattern && (
                        <span className="text-muted-foreground">({rate.route_pattern})</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Klik tarif untuk mengisi harga
              </p>
            </div>
          )}
          {customerId && isLoadingRates && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Memuat tarif kontrak...
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="unit_price">Unit Price (IDR) *</Label>
            <Input
              id="unit_price"
              type="number"
              step="1"
              {...register('unit_price', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.unit_price && (
              <p className="text-sm text-destructive">{errors.unit_price.message}</p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-semibold">{formatIDR(subtotal)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                'Update'
              ) : (
                'Add Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
