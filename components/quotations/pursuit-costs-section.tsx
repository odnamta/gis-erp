'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PursuitCost, PursuitCostCategory, PURSUIT_COST_CATEGORY_LABELS } from '@/types/quotation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { calculatePursuitCostPerShipment } from '@/lib/quotation-utils'
import { addPursuitCost, updatePursuitCost, deletePursuitCost } from '@/app/(main)/quotations/actions'
import { Plus, Pencil, Trash2, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface PursuitCostsSectionProps {
  quotationId: string
  items: PursuitCost[]
  estimatedShipments: number
  isEditable: boolean
}

export function PursuitCostsSection({ quotationId, items, estimatedShipments, isEditable }: PursuitCostsSectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PursuitCost | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    category: 'travel' as PursuitCostCategory,
    description: '',
    amount: 0,
    cost_date: new Date(),
  })

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const perShipment = calculatePursuitCostPerShipment(total, estimatedShipments)

  function openAddDialog() {
    setEditingItem(null)
    setFormData({ category: 'travel', description: '', amount: 0, cost_date: new Date() })
    setDialogOpen(true)
  }

  function openEditDialog(item: PursuitCost) {
    setEditingItem(item)
    setFormData({
      category: item.category as PursuitCostCategory,
      description: item.description,
      amount: item.amount,
      cost_date: new Date(item.cost_date),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.description.trim()) {
      toast({ title: 'Error', description: 'Description is required', variant: 'destructive' })
      return
    }
    if (formData.amount <= 0) {
      toast({ title: 'Error', description: 'Amount must be greater than 0', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const data = {
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        cost_date: format(formData.cost_date, 'yyyy-MM-dd'),
      }
      
      const result = editingItem
        ? await updatePursuitCost(editingItem.id, data)
        : await addPursuitCost(quotationId, data)
      
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: editingItem ? 'Cost updated' : 'Cost added' })
        setDialogOpen(false)
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pursuit cost?')) return
    
    const result = await deletePursuitCost(id)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Cost deleted' })
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pursuit Costs</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-award costs (travel, surveys, canvassing)
          </p>
        </div>
        {isEditable && (
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Cost
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {isEditable && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEditable ? 5 : 4} className="text-center text-muted-foreground py-8">
                  No pursuit costs recorded
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.cost_date)}</TableCell>
                  <TableCell>{PURSUIT_COST_CATEGORY_LABELS[item.category as PursuitCostCategory] || item.category}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right font-medium">{formatIDR(item.amount)}</TableCell>
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
              <TableCell colSpan={3} className="font-medium">Total Pursuit Cost</TableCell>
              <TableCell className="text-right font-bold">{formatIDR(total)}</TableCell>
              {isEditable && <TableCell></TableCell>}
            </TableRow>
            <TableRow className="bg-muted/50">
              <TableCell colSpan={3} className="text-muted-foreground">
                Per Shipment ({estimatedShipments} shipment{estimatedShipments > 1 ? 's' : ''})
              </TableCell>
              <TableCell className="text-right font-medium">{formatIDR(perShipment)}</TableCell>
              {isEditable && <TableCell></TableCell>}
            </TableRow>
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Pursuit Cost</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.cost_date, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.cost_date} onSelect={(d) => d && setFormData({ ...formData, cost_date: d })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as PursuitCostCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PURSUIT_COST_CATEGORY_LABELS).map(([key, label]) => (
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
                <Label>Amount</Label>
                <Input type="number" min={0} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
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
