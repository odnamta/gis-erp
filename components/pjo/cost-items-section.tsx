'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PJOCostItem } from '@/types'
import type { PJOCostItemWithVendor } from '@/app/(main)/proforma-jo/cost-actions'
import { CostItemForm } from './cost-item-form'
import { deleteCostItem } from '@/app/(main)/proforma-jo/cost-actions'
import { useToast } from '@/hooks/use-toast'
import { formatIDR, calculateCostTotal, calculateProfit, calculateMargin, COST_CATEGORY_LABELS } from '@/lib/pjo-utils'

interface CostItemsSectionProps {
  pjoId: string
  items: PJOCostItemWithVendor[]
  totalRevenue: number
  isEditable: boolean
  onRefresh?: () => void
  hideProfit?: boolean
}

export function CostItemsSection({ pjoId, items, totalRevenue, isEditable, onRefresh, hideProfit }: CostItemsSectionProps) {
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PJOCostItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalEstimated = calculateCostTotal(items, 'estimated')
  const estimatedProfit = calculateProfit(totalRevenue, totalEstimated)
  const estimatedMargin = calculateMargin(totalRevenue, totalEstimated)

  function handleEdit(item: PJOCostItem) {
    setEditingItem(item)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditingItem(null)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const result = await deleteCostItem(deleteId)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Cost item deleted' })
        onRefresh?.()
      }
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cost Estimation</CardTitle>
          {isEditable && (
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No cost items yet. {isEditable && 'Click "Add" to add one.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Estimated Amount</TableHead>
                    {isEditable && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {COST_CATEGORY_LABELS[item.category] || item.category}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.vendor_name || '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatIDR(item.estimated_amount)}</TableCell>
                      {isEditable && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className={`grid ${hideProfit ? 'grid-cols-1' : 'grid-cols-3'} gap-4 mt-4 pt-4 border-t`}>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                  <p className="text-xl font-bold">{formatIDR(totalEstimated)}</p>
                </div>
                {!hideProfit && (
                  <>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Estimated Profit</p>
                      <p className={`text-xl font-bold ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatIDR(estimatedProfit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Estimated Margin</p>
                      <p className={`text-xl font-bold ${estimatedMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {estimatedMargin.toFixed(2)}%
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CostItemForm
        pjoId={pjoId}
        item={editingItem}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={onRefresh}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cost item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
