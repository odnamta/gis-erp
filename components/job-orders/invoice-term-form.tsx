'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InvoiceTerm, TriggerType } from '@/types'
import { TRIGGER_LABELS, calculateTermAmount } from '@/lib/invoice-terms-utils'
import { formatIDR } from '@/lib/pjo-utils'
import { X } from 'lucide-react'

interface InvoiceTermFormProps {
  term: InvoiceTerm
  index: number
  revenue: number
  onUpdate: (index: number, term: InvoiceTerm) => void
  onRemove: (index: number) => void
  disabled?: boolean
}

export function InvoiceTermForm({
  term,
  index,
  revenue,
  onUpdate,
  onRemove,
  disabled = false,
}: InvoiceTermFormProps) {
  const amount = calculateTermAmount(revenue, term.percentage)

  const handleChange = (field: keyof InvoiceTerm, value: string | number) => {
    onUpdate(index, { ...term, [field]: value })
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg">
      <div className="col-span-3">
        <Label className="text-xs text-muted-foreground">Term Name</Label>
        <Input
          value={term.term}
          onChange={(e) => handleChange('term', e.target.value)}
          placeholder="e.g., down_payment"
          disabled={disabled}
          className="h-9"
        />
      </div>
      <div className="col-span-2">
        <Label className="text-xs text-muted-foreground">Percentage</Label>
        <div className="relative">
          <Input
            type="number"
            min={0}
            max={100}
            value={term.percentage}
            onChange={(e) => handleChange('percentage', parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-9 pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
        </div>
      </div>
      <div className="col-span-2">
        <Label className="text-xs text-muted-foreground">Amount</Label>
        <div className="h-9 px-3 flex items-center bg-muted rounded-md text-sm font-medium">
          {formatIDR(amount)}
        </div>
      </div>
      <div className="col-span-2">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Input
          value={term.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="e.g., Down Payment"
          disabled={disabled}
          className="h-9"
        />
      </div>
      <div className="col-span-2">
        <Label className="text-xs text-muted-foreground">Trigger</Label>
        <Select
          value={term.trigger}
          onValueChange={(value) => handleChange('trigger', value as TriggerType)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-1 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={disabled}
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}