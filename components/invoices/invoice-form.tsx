'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { InvoiceLineItemRow } from './invoice-line-item-row'
import { InvoiceFormData, InvoiceLineItemInput } from '@/types'
import { calculateInvoiceTotals, VAT_RATE } from '@/lib/invoice-utils'
import { formatIDR } from '@/lib/pjo-utils'
import { createInvoice } from '@/app/(main)/invoices/actions'
import { useToast } from '@/hooks/use-toast'
import { Plus, Save, Loader2 } from 'lucide-react'

interface InvoiceFormProps {
  initialData: InvoiceFormData & {
    invoiceNumber: string
    customerName: string
    joNumber: string
  }
  vatRate?: number // VAT rate as decimal (e.g., 0.11 for 11%)
}

export function InvoiceForm({ initialData, vatRate = VAT_RATE }: InvoiceFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(initialData.invoice_date)
  const [dueDate, setDueDate] = useState(initialData.due_date)
  const [notes, setNotes] = useState(initialData.notes || '')
  const [lineItems, setLineItems] = useState<InvoiceLineItemInput[]>(initialData.line_items)

  const { subtotal, vatAmount, grandTotal } = calculateInvoiceTotals(lineItems, vatRate)

  function handleLineItemChange(index: number, field: keyof InvoiceLineItemInput, value: string | number) {
    setLineItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function handleAddLineItem() {
    setLineItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unit: 'LOT', unit_price: 0 },
    ])
  }

  function handleRemoveLineItem(index: number) {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validate line items
    const hasEmptyDescription = lineItems.some((item) => !item.description.trim())
    if (hasEmptyDescription) {
      toast({ title: 'Error', description: 'All line items must have a description', variant: 'destructive' })
      return
    }

    const hasInvalidAmount = lineItems.some((item) => item.quantity <= 0 || item.unit_price < 0)
    if (hasInvalidAmount) {
      toast({ title: 'Error', description: 'All line items must have valid quantity and price', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await createInvoice({
        jo_id: initialData.jo_id,
        customer_id: initialData.customer_id,
        invoice_date: invoiceDate,
        due_date: dueDate,
        line_items: lineItems,
        notes: notes || undefined,
      })

      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else if (result.data) {
        toast({ title: 'Success', description: `Invoice ${result.data.invoice_number} created` })
        router.push(`/invoices/${result.data.id}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Header */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Invoice Number</Label>
            <Input value={initialData.invoiceNumber} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Customer</Label>
            <Input value={initialData.customerName} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Job Order</Label>
            <Input value={initialData.joNumber} disabled className="bg-muted" />
          </div>
          <div>
            <Label htmlFor="invoice_date">Invoice Date</Label>
            <Input
              id="invoice_date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="py-2 px-2 w-12">#</th>
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2 w-24">Qty</th>
                  <th className="py-2 px-2 w-20">Unit</th>
                  <th className="py-2 px-2 w-36">Unit Price</th>
                  <th className="py-2 px-2 w-32 text-right">Subtotal</th>
                  <th className="py-2 px-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <InvoiceLineItemRow
                    key={index}
                    index={index}
                    item={item}
                    onChange={handleLineItemChange}
                    onRemove={handleRemoveLineItem}
                    canRemove={lineItems.length > 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({(vatRate * 100).toFixed(0)}%)</span>
              <span className="font-medium">{formatIDR(vatAmount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Grand Total</span>
              <span className="font-bold text-lg">{formatIDR(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for this invoice..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Create Invoice
        </Button>
      </div>
    </form>
  )
}
