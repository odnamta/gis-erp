'use client'

import { useCallback, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Copy } from 'lucide-react'
import { formatIDR } from '@/lib/pjo-utils'

export interface RevenueItemRow {
  id?: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
  source_type?: 'quotation' | 'contract' | 'manual'
  source_id?: string
}

const UNIT_OPTIONS = [
  'TRIP', 'TRIPS', 'LOT', 'CASE', 'UNIT', 'UNITS',
  'SET', 'PACKAGE', 'CONTAINER', 'TON', 'KG', 'CBM', 'M3', 'PCS'
]

const SOURCE_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'contract', label: 'Contract' },
]

interface RevenueItemsTableProps {
  items: RevenueItemRow[]
  onChange: (items: RevenueItemRow[]) => void
  errors?: Record<number, { description?: string; unit_price?: string }>
  disabled?: boolean
}

export function RevenueItemsTable({ items, onChange, errors = {}, disabled = false }: RevenueItemsTableProps) {
  const descriptionRefs = useRef<(HTMLInputElement | null)[]>([])

  const calculateSubtotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice
  }

  const totalRevenue = items.reduce((sum, item) => sum + item.subtotal, 0)

  const handleAddItem = useCallback(() => {
    const newItem: RevenueItemRow = {
      description: '',
      quantity: 1,
      unit: 'TRIP',
      unit_price: 0,
      subtotal: 0,
      source_type: 'manual',
    }
    const newItems = [...items, newItem]
    onChange(newItems)
    // Focus the new row's description input after render
    setTimeout(() => {
      descriptionRefs.current[newItems.length - 1]?.focus()
    }, 0)
  }, [items, onChange])

  const handleDeleteItem = useCallback((index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }, [items, onChange])

  const handleDuplicateItem = useCallback((index: number) => {
    const itemToDuplicate = items[index]
    const duplicatedItem: RevenueItemRow = {
      ...itemToDuplicate,
      id: undefined, // New item, no ID
    }
    const newItems = [...items.slice(0, index + 1), duplicatedItem, ...items.slice(index + 1)]
    onChange(newItems)
  }, [items, onChange])

  const handleFieldChange = useCallback((index: number, field: keyof RevenueItemRow, value: string | number) => {
    const newItems = [...items]
    const item = { ...newItems[index] }
    
    if (field === 'quantity' || field === 'unit_price') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
      item[field] = numValue
      item.subtotal = calculateSubtotal(
        field === 'quantity' ? numValue : item.quantity,
        field === 'unit_price' ? numValue : item.unit_price
      )
    } else {
      (item as Record<string, unknown>)[field] = value
    }
    
    newItems[index] = item
    onChange(newItems)
  }, [items, onChange])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // If on last field of last row, add new row
      if (field === 'unit_price' && index === items.length - 1) {
        handleAddItem()
      }
    }
  }, [items.length, handleAddItem])

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">No revenue items yet</p>
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
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-24 text-right">Qty</TableHead>
                  <TableHead className="w-28">Unit</TableHead>
                  <TableHead className="w-36 text-right">Unit Price</TableHead>
                  <TableHead className="w-36 text-right">Subtotal</TableHead>
                  <TableHead className="w-28">Source</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id || `new-${index}`}>
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Input
                        ref={(el) => { descriptionRefs.current[index] = el }}
                        value={item.description}
                        onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                        placeholder="Enter description"
                        disabled={disabled}
                        className={errors[index]?.description ? 'border-destructive' : ''}
                      />
                      {errors[index]?.description && (
                        <p className="text-xs text-destructive mt-1">{errors[index].description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleFieldChange(index, 'quantity', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                        disabled={disabled}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.unit}
                        onValueChange={(value) => handleFieldChange(index, 'unit', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={item.unit_price}
                        onChange={(e) => handleFieldChange(index, 'unit_price', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'unit_price')}
                        disabled={disabled}
                        className={`text-right ${errors[index]?.unit_price ? 'border-destructive' : ''}`}
                      />
                      {errors[index]?.unit_price && (
                        <p className="text-xs text-destructive mt-1">{errors[index].unit_price}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(item.subtotal)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.source_type || 'manual'}
                        onValueChange={(value) => handleFieldChange(index, 'source_type', value)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateItem(index)}
                          disabled={disabled}
                          title="Duplicate row"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={handleAddItem} disabled={disabled}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatIDR(totalRevenue)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Calculate subtotal for a revenue item
 * Exported for testing
 */
export function calculateItemSubtotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

/**
 * Calculate total revenue from items
 * Exported for testing
 */
export function calculateTotalRevenue(items: RevenueItemRow[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0)
}

/**
 * Renumber items sequentially (1-indexed)
 * Exported for testing
 */
export function getSequentialLineNumbers(items: RevenueItemRow[]): number[] {
  return items.map((_, index) => index + 1)
}
