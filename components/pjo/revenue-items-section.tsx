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
import { PJORevenueItem } from '@/types'
import { RevenueItemForm } from './revenue-item-form'
import { deleteRevenueItem } from '@/app/(main)/proforma-jo/revenue-actions'
import { useToast } from '@/hooks/use-toast'
import { formatIDR, calculateRevenueTotal } from '@/lib/pjo-utils'

interface RevenueItemsSectionProps {
  pjoId: string
  items: PJORevenueItem[]
  isEditable: boolean
  onRefresh?: () => void
}

export function RevenueItemsSection({ pjoId, items, isEditable, onRefresh }: RevenueItemsSectionProps) {
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PJORevenueItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalRevenue = calculateRevenueTotal(items)

  function handleEdit(item: PJORevenueItem) {
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
      const result = await deleteRevenueItem(deleteId)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Revenue item deleted' })
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
          <CardTitle>Revenue Items</CardTitle>
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
              No revenue items yet. {isEditable && 'Click "Add" to add one.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {isEditable && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatIDR(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatIDR(item.subtotal ?? 0)}</TableCell>
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
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">{formatIDR(totalRevenue)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <RevenueItemForm
        pjoId={pjoId}
        item={editingItem}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={onRefresh}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Revenue Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this revenue item? This action cannot be undone.
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
