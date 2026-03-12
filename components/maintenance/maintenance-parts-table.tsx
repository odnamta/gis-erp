'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { MaintenancePartInput } from '@/types/maintenance'
import { formatCurrency } from '@/lib/utils/format'
import { calculatePartsCost } from '@/lib/maintenance-utils'

interface MaintenancePartsTableProps {
  parts: MaintenancePartInput[]
  onChange: (parts: MaintenancePartInput[]) => void
  readOnly?: boolean
}

const emptyPart: MaintenancePartInput = {
  partNumber: '',
  partName: '',
  quantity: 1,
  unit: 'pcs',
  unitPrice: 0,
  supplier: '',
  warrantyMonths: undefined,
}

export function MaintenancePartsTable({ 
  parts, 
  onChange, 
  readOnly = false 
}: MaintenancePartsTableProps) {
  const addPart = () => {
    onChange([...parts, { ...emptyPart }])
  }

  const removePart = (index: number) => {
    onChange(parts.filter((_, i) => i !== index))
  }

  const updatePart = (index: number, field: keyof MaintenancePartInput, value: string | number) => {
    const updated = parts.map((part, i) => {
      if (i === index) {
        return { ...part, [field]: value }
      }
      return part
    })
    onChange(updated)
  }

  const totalCost = calculatePartsCost(parts)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Parts Used</h4>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={addPart}>
            <Plus className="h-4 w-4 mr-1" />
            Add Part
          </Button>
        )}
      </div>

      {parts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          No parts added yet
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Part Number</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[80px]">Unit</TableHead>
                <TableHead className="w-[140px]">Unit Price</TableHead>
                <TableHead className="w-[140px]">Total</TableHead>
                <TableHead className="w-[120px]">Supplier</TableHead>
                {!readOnly && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {readOnly ? (
                      part.partNumber || '-'
                    ) : (
                      <Input
                        value={part.partNumber || ''}
                        onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                        placeholder="P/N"
                        className="h-8"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      part.partName
                    ) : (
                      <Input
                        value={part.partName}
                        onChange={(e) => updatePart(index, 'partName', e.target.value)}
                        placeholder="Part name"
                        className="h-8"
                        required
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      part.quantity
                    ) : (
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={part.quantity}
                        onChange={(e) => updatePart(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      part.unit
                    ) : (
                      <Input
                        value={part.unit}
                        onChange={(e) => updatePart(index, 'unit', e.target.value)}
                        placeholder="pcs"
                        className="h-8"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      formatCurrency(part.unitPrice)
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        value={part.unitPrice}
                        onChange={(e) => updatePart(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(part.quantity * part.unitPrice)}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      part.supplier || '-'
                    ) : (
                      <Input
                        value={part.supplier || ''}
                        onChange={(e) => updatePart(index, 'supplier', e.target.value)}
                        placeholder="Supplier"
                        className="h-8"
                      />
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePart(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right font-medium">
                  Total Parts Cost:
                </TableCell>
                <TableCell className="font-bold">{formatCurrency(totalCost)}</TableCell>
                <TableCell colSpan={readOnly ? 1 : 2}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  )
}
