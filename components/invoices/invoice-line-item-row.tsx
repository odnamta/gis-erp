'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatIDR } from '@/lib/pjo-utils'
import { Trash2 } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
}

interface InvoiceLineItemRowProps {
  index: number
  item: LineItem
  onChange: (index: number, field: keyof LineItem, value: string | number) => void
  onRemove: (index: number) => void
  canRemove: boolean
}

export function InvoiceLineItemRow({
  index,
  item,
  onChange,
  onRemove,
  canRemove,
}: InvoiceLineItemRowProps) {
  const subtotal = item.quantity * item.unit_price

  return (
    <tr className="border-b">
      <td className="py-2 px-2 text-center text-muted-foreground">{index + 1}</td>
      <td className="py-2 px-2">
        <Input
          value={item.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          placeholder="Description"
          className="min-w-[200px]"
        />
      </td>
      <td className="py-2 px-2">
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) => onChange(index, 'quantity', parseFloat(e.target.value) || 0)}
          min={0.01}
          step={0.01}
          className="w-24 text-right"
        />
      </td>
      <td className="py-2 px-2">
        <Input
          value={item.unit}
          onChange={(e) => onChange(index, 'unit', e.target.value)}
          placeholder="Unit"
          className="w-20"
        />
      </td>
      <td className="py-2 px-2">
        <Input
          type="number"
          value={item.unit_price}
          onChange={(e) => onChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
          min={0}
          step={1000}
          className="w-36 text-right"
        />
      </td>
      <td className="py-2 px-2 text-right font-medium">
        {formatIDR(subtotal)}
      </td>
      <td className="py-2 px-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}
