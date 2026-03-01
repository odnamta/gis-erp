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
import { PJOCostItem, CostCategory } from '@/types'
import { createCostItem, updateCostEstimate, CostItemFormData } from '@/app/(main)/proforma-jo/cost-actions'
import { useToast } from '@/hooks/use-toast'
import { COST_CATEGORY_LABELS } from '@/lib/pjo-utils'
import { VendorSelector } from '@/components/vendors/vendor-selector'
import { EquipmentSelector } from '@/components/vendors/equipment-selector'
import { mapCostCategoryToVendorType } from '@/lib/vendor-utils'
import { Vendor, VendorEquipment } from '@/types/vendors'
import { getActiveVendorRates } from '@/lib/vendor-rate-actions'
import type { VendorRate } from '@/types/vendor-rate'
import { SERVICE_TYPE_LABELS, UNIT_LABELS } from '@/types/vendor-rate'
import { formatCurrency } from '@/lib/utils/format'

const schema = z.object({
  category: z.enum([
    'trucking', 'port_charges', 'documentation', 'handling',
    'customs', 'insurance', 'storage', 'labor', 'fuel', 'tolls', 'other'
  ] as const),
  description: z.string().min(1, 'Description is required'),
  estimated_amount: z.number().positive('Amount must be positive'),
  notes: z.string().optional(),
  vendor_id: z.string().uuid().optional().nullable(),
  vendor_equipment_id: z.string().uuid().optional().nullable(),
})

const categoryOptions: CostCategory[] = [
  'trucking', 'port_charges', 'documentation', 'handling',
  'customs', 'insurance', 'storage', 'labor', 'fuel', 'tolls', 'other'
]

interface CostItemFormProps {
  pjoId: string
  item?: PJOCostItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CostItemForm({ pjoId, item, open, onOpenChange, onSuccess }: CostItemFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(item?.vendor_id || null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(item?.vendor_equipment_id || null)
  const [vendorRates, setVendorRates] = useState<VendorRate[]>([])
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const isEdit = !!item

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CostItemFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: (item?.category || 'trucking') as CostItemFormData['category'],
      description: item?.description || '',
      estimated_amount: item?.estimated_amount || 0,
      notes: item?.notes || '',
      vendor_id: item?.vendor_id || null,
      vendor_equipment_id: item?.vendor_equipment_id || null,
    },
  })

  const selectedCategory = watch('category')
  const vendorType = mapCostCategoryToVendorType(selectedCategory)

  // Reset vendor and equipment when category changes
  useEffect(() => {
    if (!isEdit) {
      setSelectedVendorId(null)
      setSelectedEquipmentId(null)
      setValue('vendor_id', null)
      setValue('vendor_equipment_id', null)
    }
  }, [selectedCategory, isEdit, setValue])

  // Fetch vendor rates when vendor changes
  useEffect(() => {
    if (selectedVendorId) {
      setIsLoadingRates(true)
      getActiveVendorRates(selectedVendorId)
        .then((result) => {
          if (result.data) {
            setVendorRates(result.data)
          } else {
            setVendorRates([])
          }
        })
        .finally(() => setIsLoadingRates(false))
    } else {
      setVendorRates([])
    }
  }, [selectedVendorId])

  const handleVendorChange = (vendorId: string | null, vendor?: Vendor) => {
    setSelectedVendorId(vendorId)
    setValue('vendor_id', vendorId)
    // Clear equipment when vendor changes
    setSelectedEquipmentId(null)
    setValue('vendor_equipment_id', null)
  }

  const handleEquipmentChange = (equipmentId: string | null, equipment?: VendorEquipment) => {
    setSelectedEquipmentId(equipmentId)
    setValue('vendor_equipment_id', equipmentId)
    // Auto-suggest daily rate as estimated amount if equipment has one
    if (equipment?.daily_rate && !watch('estimated_amount')) {
      setValue('estimated_amount', equipment.daily_rate)
    }
  }

  async function onSubmit(data: CostItemFormData) {
    setIsLoading(true)
    try {
      if (isEdit && item) {
        const result = await updateCostEstimate(item.id, data)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'Cost item updated' })
          onOpenChange(false)
          onSuccess?.()
        }
      } else {
        const result = await createCostItem(pjoId, data)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Success', description: 'Cost item added' })
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
          <DialogTitle>{isEdit ? 'Edit Cost Item' : 'Add Cost Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setValue('category', value as CostCategory)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {COST_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="e.g., SBY - Tanjung Perak"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label>Vendor (Optional)</Label>
            <VendorSelector
              value={selectedVendorId}
              onChange={handleVendorChange}
              vendorType={vendorType}
              placeholder="Select vendor..."
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {vendorType ? `Showing ${vendorType} vendors` : 'Showing all vendors'}
            </p>
          </div>

          {/* Equipment Selection (only for trucking-related categories) */}
          {selectedVendorId && ['trucking', 'handling', 'fuel', 'tolls'].includes(selectedCategory) && (
            <div className="space-y-2">
              <Label>Equipment (Optional)</Label>
              <EquipmentSelector
                vendorId={selectedVendorId}
                value={selectedEquipmentId}
                onChange={handleEquipmentChange}
                placeholder="Select equipment..."
                disabled={isLoading}
              />
            </div>
          )}

          {/* Available Vendor Rates */}
          {selectedVendorId && vendorRates.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tarif Tersedia
              </Label>
              <div className="flex flex-wrap gap-2">
                {vendorRates.map((rate) => {
                  const unitLabel = UNIT_LABELS[rate.unit] || rate.unit
                  return (
                    <button
                      key={rate.id}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      onClick={() => {
                        setValue('estimated_amount', rate.base_price)
                        if (!watch('description') && rate.description) {
                          setValue('description', rate.description)
                        }
                      }}
                      title={`Klik untuk mengisi ${formatCurrency(rate.base_price)} sebagai estimasi`}
                    >
                      <span className="font-medium">{formatCurrency(rate.base_price)}</span>
                      <span className="text-muted-foreground">/ {unitLabel}</span>
                      <span className="text-muted-foreground">- {rate.description}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Klik tarif untuk mengisi estimasi biaya
              </p>
            </div>
          )}
          {selectedVendorId && isLoadingRates && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Memuat tarif vendor...
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="estimated_amount">Estimated Amount (IDR) *</Label>
            <Input
              id="estimated_amount"
              type="number"
              step="1"
              {...register('estimated_amount', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.estimated_amount && (
              <p className="text-sm text-destructive">{errors.estimated_amount.message}</p>
            )}
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
