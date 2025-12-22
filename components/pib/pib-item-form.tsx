'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { PIBItem, PIBItemFormData, DEFAULT_PPN_RATE } from '@/types/pib'
import { calculateItemTotalPrice, calculateItemDuties, formatCurrency } from '@/lib/pib-utils'
import { HSCodeDropdown } from '@/components/hs-codes/hs-code-dropdown'
import type { HSCodeRates } from '@/types/hs-codes'
import { Loader2 } from 'lucide-react'

const itemSchema = z.object({
  hs_code: z.string().min(1, 'HS code is required'),
  hs_description: z.string().optional(),
  goods_description: z.string().min(1, 'Goods description is required'),
  brand: z.string().optional(),
  type_model: z.string().optional(),
  specifications: z.string().optional(),
  country_of_origin: z.string().optional(),
  quantity: z.number().min(0.001, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  net_weight_kg: z.number().optional(),
  gross_weight_kg: z.number().optional(),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  bm_rate: z.number().min(0).max(100).optional(),
  ppn_rate: z.number().min(0).max(100).optional(),
  pph_rate: z.number().min(0).max(100).optional(),
  requires_permit: z.boolean().optional(),
  permit_type: z.string().optional(),
  permit_number: z.string().optional(),
  permit_date: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface PIBItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: PIBItem | null
  currency: string
  onSubmit: (data: PIBItemFormData) => Promise<void>
}

const UNITS = ['PCS', 'SET', 'UNIT', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'ROLL', 'PACK', 'BOX']

export function PIBItemForm({
  open,
  onOpenChange,
  item,
  currency,
  onSubmit,
}: PIBItemFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [calculatedDuties, setCalculatedDuties] = useState({
    totalPrice: 0,
    beaMasuk: 0,
    ppn: 0,
    pphImport: 0,
    total: 0,
  })

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
      type_model: '',
      specifications: '',
      country_of_origin: '',
      quantity: 1,
      unit: 'PCS',
      net_weight_kg: undefined,
      gross_weight_kg: undefined,
      unit_price: 0,
      bm_rate: 0,
      ppn_rate: DEFAULT_PPN_RATE,
      pph_rate: 0,
      requires_permit: false,
      permit_type: '',
      permit_number: '',
      permit_date: '',
    },
  })

  const quantity = watch('quantity')
  const unitPrice = watch('unit_price')
  const bmRate = watch('bm_rate')
  const ppnRate = watch('ppn_rate')
  const pphRate = watch('pph_rate')
  const requiresPermit = watch('requires_permit')

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      reset({
        hs_code: item.hs_code,
        hs_description: item.hs_description || '',
        goods_description: item.goods_description,
        brand: item.brand || '',
        type_model: item.type_model || '',
        specifications: item.specifications || '',
        country_of_origin: item.country_of_origin || '',
        quantity: item.quantity,
        unit: item.unit,
        net_weight_kg: item.net_weight_kg || undefined,
        gross_weight_kg: item.gross_weight_kg || undefined,
        unit_price: item.unit_price || 0,
        bm_rate: item.bm_rate || 0,
        ppn_rate: item.ppn_rate || DEFAULT_PPN_RATE,
        pph_rate: item.pph_rate || 0,
        requires_permit: item.requires_permit,
        permit_type: item.permit_type || '',
        permit_number: item.permit_number || '',
        permit_date: item.permit_date || '',
      })
    } else {
      reset({
        hs_code: '',
        hs_description: '',
        goods_description: '',
        brand: '',
        type_model: '',
        specifications: '',
        country_of_origin: '',
        quantity: 1,
        unit: 'PCS',
        net_weight_kg: undefined,
        gross_weight_kg: undefined,
        unit_price: 0,
        bm_rate: 0,
        ppn_rate: DEFAULT_PPN_RATE,
        pph_rate: 0,
        requires_permit: false,
        permit_type: '',
        permit_number: '',
        permit_date: '',
      })
    }
  }, [item, reset])

  // Calculate duties when values change
  useEffect(() => {
    const totalPrice = calculateItemTotalPrice(quantity || 0, unitPrice || 0)
    const duties = calculateItemDuties(
      totalPrice,
      bmRate || 0,
      ppnRate || DEFAULT_PPN_RATE,
      pphRate || 0
    )
    setCalculatedDuties({
      totalPrice,
      beaMasuk: duties.bea_masuk,
      ppn: duties.ppn,
      pphImport: duties.pph_import,
      total: duties.total,
    })
  }, [quantity, unitPrice, bmRate, ppnRate, pphRate])

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
                    setValue('bm_rate', rates.bmRate)
                    setValue('ppn_rate', rates.ppnRate)
                    setValue('pph_rate', rates.pphRate)
                    if (rates.hasRestrictions) {
                      setValue('requires_permit', true)
                      setValue('permit_type', rates.restrictionType || 'Import License')
                    }
                  }
                }}
                placeholder="Search HS code..."
                disabled={isLoading}
                showRestrictionWarning={true}
                error={errors.hs_code?.message}
              />
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

          {/* Brand, Model, Specs */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" {...register('brand')} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_model">Type/Model</Label>
              <Input id="type_model" {...register('type_model')} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country_of_origin">Country of Origin</Label>
              <Input
                id="country_of_origin"
                {...register('country_of_origin')}
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

          {/* Price & Duties */}
          <div className="grid gap-4 md:grid-cols-4">
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
              <Label htmlFor="bm_rate">BM Rate (%)</Label>
              <Input
                id="bm_rate"
                type="number"
                step="0.1"
                {...register('bm_rate', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ppn_rate">PPN Rate (%)</Label>
              <Input
                id="ppn_rate"
                type="number"
                step="0.1"
                {...register('ppn_rate', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pph_rate">PPh Rate (%)</Label>
              <Input
                id="pph_rate"
                type="number"
                step="0.1"
                {...register('pph_rate', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Calculated Duties Display */}
          <div className="rounded-md border bg-muted/50 p-4">
            <h4 className="font-medium mb-2">Calculated Duties</h4>
            <div className="grid gap-2 md:grid-cols-5 text-sm">
              <div>
                <span className="text-muted-foreground">Total Price:</span>
                <p className="font-medium">{formatCurrency(calculatedDuties.totalPrice, currency)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Bea Masuk:</span>
                <p className="font-medium">{formatCurrency(calculatedDuties.beaMasuk, currency)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">PPN:</span>
                <p className="font-medium">{formatCurrency(calculatedDuties.ppn, currency)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">PPh Import:</span>
                <p className="font-medium">{formatCurrency(calculatedDuties.pphImport, currency)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Duties:</span>
                <p className="font-semibold text-primary">{formatCurrency(calculatedDuties.total, currency)}</p>
              </div>
            </div>
          </div>

          {/* Permit Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_permit"
                checked={requiresPermit}
                onCheckedChange={(checked) => setValue('requires_permit', !!checked)}
                disabled={isLoading}
              />
              <Label htmlFor="requires_permit">Requires Import Permit</Label>
            </div>
            {requiresPermit && (
              <div className="grid gap-4 md:grid-cols-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="permit_type">Permit Type</Label>
                  <Input
                    id="permit_type"
                    {...register('permit_type')}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permit_number">Permit Number</Label>
                  <Input
                    id="permit_number"
                    {...register('permit_number')}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permit_date">Permit Date</Label>
                  <Input
                    id="permit_date"
                    type="date"
                    {...register('permit_date')}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
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
