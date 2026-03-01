'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ManagedSelect } from '@/components/ui/managed-select'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Loader2, MoreHorizontal, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import {
  EquipmentTool,
  ToolFormData,
  createTool,
  updateTool,
  deactivateTool,
} from '@/lib/tools-actions'

// ============================================================
// CONSTANTS
// ============================================================

const CONDITIONS = [
  { value: 'baik', label: 'Baik' },
  { value: 'cukup', label: 'Cukup' },
  { value: 'perlu_perbaikan', label: 'Perlu Perbaikan' },
  { value: 'rusak', label: 'Rusak' },
]

// ============================================================
// FORM COMPONENT
// ============================================================

interface ToolFormProps {
  tool?: EquipmentTool | null
  onSubmit: (data: ToolFormData) => Promise<void>
  isLoading: boolean
}

function ToolForm({ tool, onSubmit, isLoading }: ToolFormProps) {
  const [name, setName] = useState(tool?.name || '')
  const [category, setCategory] = useState(tool?.category || '')
  const [description, setDescription] = useState(tool?.description || '')
  const [quantity, setQuantity] = useState(tool?.quantity ?? 0)
  const [minimumStock, setMinimumStock] = useState(tool?.minimum_stock ?? 0)
  const [unit, setUnit] = useState(tool?.unit || '')
  const [location, setLocation] = useState(tool?.location || '')
  const [condition, setCondition] = useState(tool?.condition || '')
  const [notes, setNotes] = useState(tool?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      category: category || undefined,
      description: description || undefined,
      quantity,
      minimum_stock: minimumStock,
      unit: unit || undefined,
      location: location || undefined,
      condition: condition || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tool-name">Nama Alat *</Label>
        <Input
          id="tool-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama alat atau sparepart"
          disabled={isLoading}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tool-category">Kategori</Label>
          <ManagedSelect
            category="tool_category"
            value={category}
            onValueChange={setCategory}
            placeholder="Pilih kategori"
            canManage={true}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-condition">Kondisi</Label>
          <Select value={condition} onValueChange={setCondition} disabled={isLoading}>
            <SelectTrigger id="tool-condition">
              <SelectValue placeholder="Pilih kondisi" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tool-quantity">Jumlah *</Label>
          <Input
            id="tool-quantity"
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-min-stock">Stok Minimum</Label>
          <Input
            id="tool-min-stock"
            type="number"
            min={0}
            value={minimumStock}
            onChange={(e) => setMinimumStock(Number(e.target.value))}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-unit">Satuan</Label>
          <Input
            id="tool-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="pcs, set, unit"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tool-location">Lokasi</Label>
        <Input
          id="tool-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Lokasi penyimpanan"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tool-description">Deskripsi</Label>
        <Textarea
          id="tool-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi alat"
          disabled={isLoading}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tool-notes">Catatan</Label>
        <Textarea
          id="tool-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan tambahan"
          disabled={isLoading}
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : tool ? (
            'Perbarui'
          ) : (
            'Tambah Alat'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ============================================================
// CONDITION BADGE
// ============================================================

function ConditionBadge({ condition }: { condition: string | null }) {
  if (!condition) return <span className="text-muted-foreground">-</span>
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
    baik: { label: 'Baik', variant: 'success' },
    cukup: { label: 'Cukup', variant: 'secondary' },
    perlu_perbaikan: { label: 'Perlu Perbaikan', variant: 'warning' },
    rusak: { label: 'Rusak', variant: 'destructive' },
  }
  const item = map[condition] || { label: condition, variant: 'secondary' as const }
  return <Badge variant={item.variant}>{item.label}</Badge>
}

// ============================================================
// MAIN CLIENT COMPONENT
// ============================================================

interface ToolsClientProps {
  tools: EquipmentTool[]
}

export function ToolsClient({ tools }: ToolsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<EquipmentTool | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTool, setDeletingTool] = useState<EquipmentTool | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter tools by search term
  const filteredTools = searchTerm.trim()
    ? tools.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tools

  // Count low stock items
  const lowStockCount = tools.filter(
    (t) => t.quantity <= t.minimum_stock && t.minimum_stock > 0
  ).length

  const handleAddClick = () => {
    setEditingTool(null)
    setDialogOpen(true)
  }

  const handleEditClick = (tool: EquipmentTool) => {
    setEditingTool(tool)
    setDialogOpen(true)
  }

  const handleDeleteClick = (tool: EquipmentTool) => {
    setDeletingTool(tool)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (data: ToolFormData) => {
    setIsSubmitting(true)
    try {
      if (editingTool) {
        const result = await updateTool(editingTool.id, data)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Berhasil', description: 'Alat berhasil diperbarui.' })
          setDialogOpen(false)
          router.refresh()
        }
      } else {
        const result = await createTool(data)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Berhasil', description: 'Alat berhasil ditambahkan.' })
          setDialogOpen(false)
          router.refresh()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingTool) return
    setIsDeleting(true)
    const result = await deactivateTool(deletingTool.id)
    setIsDeleting(false)

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Berhasil', description: 'Alat berhasil dihapus.' })
      router.refresh()
    }

    setDeleteDialogOpen(false)
    setDeletingTool(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alat & Sparepart</h2>
          <p className="text-muted-foreground">
            Kelola inventaris alat dan sparepart perusahaan
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Alat
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Alat</CardDescription>
            <CardTitle className="text-2xl">{tools.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stok Rendah</CardDescription>
            <CardTitle className="text-2xl text-destructive flex items-center gap-2">
              {lowStockCount}
              {lowStockCount > 0 && <AlertTriangle className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Kategori</CardDescription>
            <CardTitle className="text-2xl">
              {new Set(tools.map((t) => t.category).filter(Boolean)).size}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari alat berdasarkan nama..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTools.length === 0 ? (
            <div className="rounded-md p-6 text-center text-muted-foreground">
              {searchTerm
                ? 'Tidak ada alat yang cocok dengan pencarian.'
                : 'Belum ada data alat. Tambahkan alat pertama Anda.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Min. Stok</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTools.map((tool) => {
                    const isLowStock =
                      tool.minimum_stock > 0 && tool.quantity <= tool.minimum_stock
                    return (
                      <TableRow key={tool.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {tool.name}
                            {isLowStock && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Stok Rendah
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tool.category || '-'}</TableCell>
                        <TableCell className="text-right">{tool.quantity}</TableCell>
                        <TableCell className="text-right">{tool.minimum_stock}</TableCell>
                        <TableCell>{tool.unit || '-'}</TableCell>
                        <TableCell>{tool.location || '-'}</TableCell>
                        <TableCell>
                          <ConditionBadge condition={tool.condition} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(tool)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(tool)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTool ? 'Edit Alat' : 'Tambah Alat Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingTool
                ? 'Perbarui informasi alat di bawah ini.'
                : 'Isi detail untuk menambahkan alat baru.'}
            </DialogDescription>
          </DialogHeader>
          <ToolForm
            tool={editingTool}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Alat</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deletingTool?.name}&quot;?
              Data tidak akan dihapus permanen dan dapat dipulihkan oleh administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
