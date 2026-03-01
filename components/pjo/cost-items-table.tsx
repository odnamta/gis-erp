'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ManagedSelect } from '@/components/ui/managed-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { formatIDR } from '@/lib/pjo-utils'
import { VendorSelector } from '@/components/vendors/vendor-selector'
import { mapCostCategoryToVendorType } from '@/lib/vendor-utils'
import type { Vendor } from '@/types/vendors'

export type CostCategory =
  | 'trucking'
  | 'port_charges'
  | 'documentation'
  | 'handling'
  | 'crew'
  | 'fuel'
  | 'tolls'
  | 'other'

export type CostItemStatus = 'estimated' | 'confirmed' | 'exceeded' | 'under_budget'

export interface CostItemRow {
  id?: string
  category: CostCategory | ''
  description: string
  estimated_amount: number
  actual_amount?: number
  status: CostItemStatus
  estimated_by?: string
  vendor_id?: string | null
  vendor_name?: string | null
}


interface CostItemsTableProps {
  items: CostItemRow[]
  onChange: (items: CostItemRow[]) => void
  errors?: Record<number, { category?: string; description?: string; estimated_amount?: string }>
  disabled?: boolean
}


/**
 * Get status icon component based on cost item status
 * Exported for testing
 */
export function getStatusIcon(
  status: CostItemStatus,
  actualAmount?: number,
  estimatedAmount?: number
): { icon: React.ReactNode; label: string; className: string } {
  // Check for "at risk" condition (actual > 90% of estimated but not exceeded)
  if (
    actualAmount !== undefined &&
    estimatedAmount !== undefined &&
    estimatedAmount > 0 &&
    actualAmount > estimatedAmount * 0.9 &&
    actualAmount <= estimatedAmount
  ) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'At Risk',
      className: 'text-yellow-600',
    }
  }

  switch (status) {
    case 'estimated':
      return {
        icon: <Clock className="h-4 w-4" />,
        label: 'Estimated',
        className: 'text-muted-foreground',
      }
    case 'confirmed':
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Confirmed',
        className: 'text-green-600',
      }
    case 'exceeded':
      return {
        icon: <XCircle className="h-4 w-4" />,
        label: 'Exceeded',
        className: 'text-destructive',
      }
    case 'under_budget':
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Under Budget',
        className: 'text-green-600',
      }
    default:
      return {
        icon: <Clock className="h-4 w-4" />,
        label: 'Estimated',
        className: 'text-muted-foreground',
      }
  }
}

/**
 * Calculate total estimated cost from items
 * Exported for testing
 */
export function calculateTotalEstimatedCost(items: CostItemRow[]): number {
  return items.reduce((sum, item) => sum + (item.estimated_amount || 0), 0)
}

/**
 * Renumber items sequentially (1-indexed)
 * Exported for testing
 */
export function getSequentialLineNumbers(items: CostItemRow[]): number[] {
  return items.map((_, index) => index + 1)
}

export function CostItemsTable({ items, onChange, errors = {}, disabled = false }: CostItemsTableProps) {
  const totalEstimatedCost = calculateTotalEstimatedCost(items)

  const handleAddItem = useCallback(() => {
    const newItem: CostItemRow = {
      category: '',
      description: '',
      estimated_amount: 0,
      status: 'estimated',
    }
    const newItems = [...items, newItem]
    onChange(newItems)
  }, [items, onChange])

  const handleDeleteItem = useCallback((index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }, [items, onChange])

  const handleFieldChange = useCallback((index: number, field: keyof CostItemRow, value: string | number) => {
    const newItems = [...items]
    const item = { ...newItems[index] }

    if (field === 'estimated_amount') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
      item[field] = numValue
    } else if (field === 'category') {
      item.category = value as CostCategory | ''
      // Clear vendor when category changes (vendor type may differ)
      item.vendor_id = null
      item.vendor_name = null
    } else if (field === 'description') {
      item.description = value as string
    }

    newItems[index] = item
    onChange(newItems)
  }, [items, onChange])

  const handleVendorChange = useCallback((index: number, vendorId: string | null, vendor?: Vendor) => {
    const newItems = [...items]
    const item = { ...newItems[index] }
    item.vendor_id = vendorId
    item.vendor_name = vendor?.vendor_name ?? null
    newItems[index] = item
    onChange(newItems)
  }, [items, onChange])

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">No cost items yet</p>
          <Button type="button" onClick={handleAddItem} disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-40">Category</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-48">Vendor</TableHead>
                  <TableHead className="w-40 text-right">Estimated Amount</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const statusInfo = getStatusIcon(item.status, item.actual_amount, item.estimated_amount)
                  return (
                    <TableRow key={item.id || `new-${index}`}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <ManagedSelect
                          category="cost_category"
                          value={item.category || undefined}
                          onValueChange={(v) => handleFieldChange(index, 'category', v)}
                          placeholder="Pilih kategori"
                          canManage={true}
                          disabled={disabled}
                          className={errors[index]?.category ? 'flex-1 border-destructive' : 'flex-1'}
                        />
                        {errors[index]?.category && (
                          <p className="text-xs text-destructive mt-1">{errors[index].category}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                          placeholder="Enter description"
                          disabled={disabled}
                          className={errors[index]?.description ? 'border-destructive' : ''}
                        />
                        {errors[index]?.description && (
                          <p className="text-xs text-destructive mt-1">{errors[index].description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <VendorSelector
                          value={item.vendor_id ?? null}
                          onChange={(vendorId, vendor) => handleVendorChange(index, vendorId, vendor)}
                          vendorType={item.category ? mapCostCategoryToVendorType(item.category) : undefined}
                          placeholder="Pilih vendor..."
                          disabled={disabled}
                          className="w-full text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.estimated_amount}
                          onChange={(e) => handleFieldChange(index, 'estimated_amount', e.target.value)}
                          disabled={disabled}
                          className={`text-right ${errors[index]?.estimated_amount ? 'border-destructive' : ''}`}
                        />
                        {errors[index]?.estimated_amount && (
                          <p className="text-xs text-destructive mt-1">{errors[index].estimated_amount}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center justify-center gap-1 ${statusInfo.className}`}>
                          {statusInfo.icon}
                          <span className="text-xs">{statusInfo.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(index)}
                          disabled={disabled}
                          title="Delete row"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={handleAddItem} disabled={disabled}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
              <p className="text-2xl font-bold">{formatIDR(totalEstimatedCost)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
