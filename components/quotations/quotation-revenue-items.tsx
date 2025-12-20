'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuotationRevenueItem, RevenueCategory, REVENUE_CATEGORY_LABELS } from '@/types/quotation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatIDR } from '@/lib/pjo-utils'
import { addRevenueItem, updateRevenueItem, deleteRevenueItem } from '@/app/(main)/quotations/actions'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface QuotationRevenueItemsProps {
  quotationId: string
  items: QuotationRevenueItem[]
  isEditable: boolean
}

export function QuotationRevenueItems({ quotationId, items, isEditable }: QuotationRevenueItemsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<QuotationRevenueItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    category: 'transportation' as RevenueCategory,
    description: '',
    quantity: 1,
    unit: 'unit',
    unit_price: 0,
  })

  const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

  function openAddDialog() {
    setEditingItem(null)
    setFormData({ category: 'transportation', description: '', quantity: 1, unit: 'unit', unit_price: 0 })
    setDialogOpen(true)
  }

  function openEditDialog(item: QuotationRevenueItem) {
    setEditingItem(item)
    setFormData({
      category: item.category as RevenueCategory,
      description: item.description,
      quantity: item.quantity || 1,
      unit: item.unit || 'unit',
      unit_price: item.unit_price,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.description.trim()) {
      toast({ title: 'Error', description: 'Description is required', variant: 'destructive' })
      return
    }
    if (formData.unit_price <= 0) {
      toast({ title: 'Error', description: 'Unit price must be greater than 0', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = editingItem
        ? await updateRevenueItem(editingItem.id, formData)
        : await addRevenueItem(quotationId, formData)
      
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: editingItem ? 'Item updated' : 'Item added' })
        setDialogOpen(false)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this revenue item?')) return
    
    const result = await deleteRevenueItem(id)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Item deleted' })
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue Items</CardTitle>
        {isEditable && (
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              {isEditable && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEditable ? 7 : 6} className="text-center text-muted-foreground py-8">
                  No revenue items
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{REVENUE_CATEGORY_LABELS[item.category as RevenueCategory] || item.category}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">{formatIDR(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatIDR(item.subtotal || 0)}</TableCell>
                  {isEditable && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={5} className="font-medium">Total Revenue</TableCell>
              <TableCell className="text-right font-bold">{formatIDR(total)}</TableCell>
              {isEditable && <TableCell></TableCell>}
            </TableRow>
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Revenue Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as RevenueCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REVENUE_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min={0.01} step={0.01} value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price</Label>
                  <Input type="number" min={0} value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                Subtotal: {formatIDR(formData.quantity * formData.unit_price)}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>Cancel</Button>
              <Button onClick={handleSave} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
