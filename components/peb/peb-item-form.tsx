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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PEBItem, PEBItemFormData } from '@/types/peb'
import { calculateItemTotalPrice, formatCurrency } from '@/lib/peb-utils'
import { HSCodeDropdown } from '@/components/hs-codes/hs-code-dropdown'
import type { HSCodeRates } from '@/types/hs-codes'
import { Loader2, AlertTriangle } from 'lucide-react'

const itemSchema = z.object({
  hs_code: z.string().min(1, 'HS code is required'),
  hs_description: z.string().optional(),
  goods_description: z.string().min(1, 'Goods description is required'),
  brand: z.string().optional(),
  specifications: z.string().optional(),
  quantity: z.number().min(0.001, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  net_weight_kg: z.number().optional(),
  gross_weight_kg: z.number().optional(),
  unit_price: z.number().min(0, 'Unit price must be positive'),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface PEBItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: PEBItem | null
  currency: string
  onSubmit: (data: PEBItemFormData) => Promise<void>
}

const UNITS = ['PCS', 'SET', 'UNIT', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'ROLL', 'PACK', 'BOX']

export function PEBItemForm({
  open,
  onOpenChange,
  item,
  currency,
  onSubmit,
}: PEBItemFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [calculatedTotal, setCalculatedTotal] = useState(0)
  const [hasExportRestriction, setHasExportRestriction] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      hs_code: '',
      hs_description: '',
      goods_description: '',
      brand: '',
      specifications: '',
      quantity: 1,
      unit: 'PCS',
      net_weight_kg: undefined,
      gross_weight_kg: undefined,
      unit_price: 0,
    },
  })

  const quantity = watch('quantity')
  const unitPrice = watch('unit_price')

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      reset({
        hs_code: item.hs_code,
        hs_description: item.hs_description || '',
        goods_description: item.goods_description,
        brand: item.brand || '',
        specifications: item.specifications || '',
        quantity: item.quantity,
        unit: item.unit,
        net_weight_kg: item.net_weight_kg || undefined,
        gross_weight_kg: item.gross_weight_kg || undefined,
        unit_price: item.unit_price || 0,
      })
    } else {
      reset({
        hs_code: '',
        hs_description: '',
        goods_description: '',
        brand: '',
        specifications: '',
        quantity: 1,
        unit: 'PCS',
        net_weight_kg: undefined,
        gross_weight_kg: undefined,
        unit_price: 0,
      })
    }
  }, [item, reset])

  // Calculate total when values change
  useEffect(() => {
    const total = calculateItemTotalPrice(quantity || 0, unitPrice || 0)
    setCalculatedTotal(total)
  }, [quantity, unitPrice])

  async function handleFormSubmit(data: ItemFormValues) {
    setIsLoading(true)
    try {
      await onSubmit({
        ...data,
        currency,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* HS Code & Description */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hs_code">HS Code *</Label>
              <HSCodeDropdown
                value={watch('hs_code')}
                onChange={(code, rates) => {
                  setValue('hs_code', code)
                  if (rates) {
                    setValue('hs_description', '')
                    setHasExportRestriction(rates.hasExportRestrictions)
                  } else {
                    setHasExportRestriction(false)
                  }
                }}
                placeholder="Search HS code..."
                disabled={isLoading}
                showRestrictionWarning={false}
                error={errors.hs_code?.message}
              />
              {hasExportRestriction && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This HS code has export restrictions. Please ensure you have the required permits.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hs_description">HS Description</Label>
              <Input
                id="hs_description"
                {...register('hs_description')}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Goods Description */}
          <div className="space-y-2">
            <Label htmlFor="goods_description">Goods Description *</Label>
            <Textarea
              id="goods_description"
              {...register('goods_description')}
              rows={2}
              disabled={isLoading}
            />
            {errors.goods_description && (
              <p className="text-sm text-destructive">{errors.goods_description.message}</p>
            )}
          </div>

          {/* Brand & Specs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" {...register('brand')} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Input
                id="specifications"
                {...register('specifications')}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Quantity & Weight */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                {...register('quantity', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                {...register('unit')}
                list="units"
                disabled={isLoading}
              />
              <datalist id="units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              {errors.unit && (
                <p className="text-sm text-destructive">{errors.unit.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="net_weight_kg">Net Weight (kg)</Label>
              <Input
                id="net_weight_kg"
                type="number"
                step="0.01"
                {...register('net_weight_kg', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_weight_kg">Gross Weight (kg)</Label>
              <Input
                id="gross_weight_kg"
                type="number"
                step="0.01"
                {...register('gross_weight_kg', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Price */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price ({currency}) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                {...register('unit_price', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.unit_price && (
                <p className="text-sm text-destructive">{errors.unit_price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Total Price</Label>
              <div className="rounded-md border bg-muted/50 p-2 font-medium">
                {formatCurrency(calculatedTotal, currency)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : item ? (
                'Update Item'
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
