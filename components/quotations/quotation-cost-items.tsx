'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuotationCostItem, QuotationCostCategory, QUOTATION_COST_CATEGORY_LABELS } from '@/types/quotation'
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
import { addCostItem, updateCostItem, deleteCostItem } from '@/app/(main)/quotations/actions'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface QuotationCostItemsProps {
  quotationId: string
  items: QuotationCostItem[]
  isEditable: boolean
}

export function QuotationCostItems({ quotationId, items, isEditable }: QuotationCostItemsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<QuotationCostItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    category: 'trucking' as QuotationCostCategory,
    description: '',
    estimated_amount: 0,
    vendor_name: '',
  })

  const total = items.reduce((sum, item) => sum + (item.estimated_amount || 0), 0)

  function openAddDialog() {
    setEditingItem(null)
    setFormData({ category: 'trucking', description: '', estimated_amount: 0, vendor_name: '' })
    setDialogOpen(true)
  }

  function openEditDialog(item: QuotationCostItem) {
    setEditingItem(item)
    setFormData({
      category: item.category as QuotationCostCategory,
      description: item.description,
      estimated_amount: item.estimated_amount,
      vendor_name: item.vendor_name || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.description.trim()) {
      toast({ title: 'Error', description: 'Description is required', variant: 'destructive' })
      return
    }
    if (formData.estimated_amount <= 0) {
      toast({ title: 'Error', description: 'Amount must be greater than 0', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = editingItem
        ? await updateCostItem(editingItem.id, formData)
        : await addCostItem(quotationId, formData)
      
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
    if (!confirm('Delete this cost item?')) return
    
    const result = await deleteCostItem(id)
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
        <CardTitle>Cost Items (Estimated)</CardTitle>
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
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Estimated Amount</TableHead>
              {isEditable && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEditable ? 5 : 4} className="text-center text-muted-foreground py-8">
                  No cost items
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{QUOTATION_COST_CATEGORY_LABELS[item.category as QuotationCostCategory] || item.category}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.vendor_name || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatIDR(item.estimated_amount)}</TableCell>
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
              <TableCell colSpan={3} className="font-medium">Total Estimated Cost</TableCell>
              <TableCell className="text-right font-bold">{formatIDR(total)}</TableCell>
              {isEditable && <TableCell></TableCell>}
            </TableRow>
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Cost Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as QuotationCostCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUOTATION_COST_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Vendor (optional)</Label>
                <Input value={formData.vendor_name} onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} placeholder="Vendor name" />
              </div>
              <div className="space-y-2">
                <Label>Estimated Amount</Label>
                <Input type="number" min={0} value={formData.estimated_amount} onChange={(e) => setFormData({ ...formData, estimated_amount: parseFloat(e.target.value) || 0 })} />
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
