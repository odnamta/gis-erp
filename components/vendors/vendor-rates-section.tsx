'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Pencil, Ban, Loader2, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { formatDate } from '@/lib/utils/format'
import { useToast } from '@/hooks/use-toast'
import {
  createVendorRate,
  updateVendorRate,
  deactivateVendorRate,
} from '@/lib/vendor-rate-actions'
import type {
  VendorRate,
  VendorRateFormData,
  VendorRateServiceType,
} from '@/types/vendor-rate'
import {
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_OPTIONS,
  UNIT_OPTIONS,
  UNIT_LABELS,
} from '@/types/vendor-rate'

interface VendorRatesSectionProps {
  vendorId: string
  rates: VendorRate[]
  canEdit: boolean
  onRefresh: () => void
}

const emptyForm: VendorRateFormData = {
  service_type: 'trucking',
  description: '',
  unit: 'per_trip',
  base_price: 0,
  min_quantity: null,
  max_quantity: null,
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: null,
  payment_terms: null,
  notes: null,
}

export function VendorRatesSection({
  vendorId,
  rates,
  canEdit,
  onRefresh,
}: VendorRatesSectionProps) {
  const { toast } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<VendorRate | null>(null)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const [form, setForm] = useState<VendorRateFormData>(emptyForm)

  const activeRates = rates.filter((r) => r.is_active)
  const inactiveRates = rates.filter((r) => !r.is_active)

  function handleAdd() {
    setEditingRate(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function handleEdit(rate: VendorRate) {
    setEditingRate(rate)
    setForm({
      service_type: rate.service_type,
      description: rate.description,
      unit: rate.unit,
      base_price: rate.base_price,
      min_quantity: rate.min_quantity,
      max_quantity: rate.max_quantity,
      effective_from: rate.effective_from,
      effective_to: rate.effective_to,
      payment_terms: rate.payment_terms,
      notes: rate.notes,
    })
    setFormOpen(true)
  }

  async function handleSubmit() {
    if (!form.description.trim()) {
      toast({ title: 'Error', description: 'Deskripsi wajib diisi', variant: 'destructive' })
      return
    }
    if (form.base_price <= 0) {
      toast({ title: 'Error', description: 'Harga dasar harus lebih dari 0', variant: 'destructive' })
      return
    }
    if (!form.effective_from) {
      toast({ title: 'Error', description: 'Tanggal berlaku wajib diisi', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      if (editingRate) {
        const result = await updateVendorRate(editingRate.id, vendorId, form)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Berhasil', description: 'Tarif berhasil diperbarui' })
          setFormOpen(false)
          onRefresh()
        }
      } else {
        const result = await createVendorRate(vendorId, form)
        if (result.error) {
          toast({ title: 'Error', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: 'Berhasil', description: 'Tarif berhasil ditambahkan' })
          setFormOpen(false)
          onRefresh()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivateId) return
    setIsDeactivating(true)
    try {
      const result = await deactivateVendorRate(deactivateId, vendorId)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: 'Tarif berhasil dinonaktifkan' })
        onRefresh()
      }
    } finally {
      setIsDeactivating(false)
      setDeactivateId(null)
    }
  }

  function renderRateRow(rate: VendorRate) {
    const unitLabel = UNIT_LABELS[rate.unit] || rate.unit
    const serviceLabel = SERVICE_TYPE_LABELS[rate.service_type as VendorRateServiceType] || rate.service_type
    const isExpired = rate.effective_to && new Date(rate.effective_to) < new Date()

    return (
      <TableRow key={rate.id} className={!rate.is_active ? 'opacity-50' : ''}>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {serviceLabel}
          </Badge>
        </TableCell>
        <TableCell>{rate.description}</TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(rate.base_price)}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">{unitLabel}</TableCell>
        <TableCell className="text-sm">
          <span>{formatDate(rate.effective_from)}</span>
          {rate.effective_to && (
            <span className="text-muted-foreground"> - {formatDate(rate.effective_to)}</span>
          )}
        </TableCell>
        <TableCell>
          {!rate.is_active ? (
            <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
          ) : isExpired ? (
            <Badge variant="destructive" className="text-xs">Kadaluarsa</Badge>
          ) : (
            <Badge variant="default" className="text-xs bg-green-600">Aktif</Badge>
          )}
        </TableCell>
        {canEdit && (
          <TableCell>
            <div className="flex gap-1">
              {rate.is_active && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(rate)}
                    title="Edit tarif"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeactivateId(rate.id)}
                    title="Nonaktifkan tarif"
                  >
                    <Ban className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tarif & Harga ({activeRates.length})
          </CardTitle>
          {canEdit && (
            <Button size="sm" onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tarif
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada tarif.{' '}
              {canEdit && 'Klik "Tambah Tarif" untuk menambahkan.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Layanan</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Harga Dasar</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Masa Berlaku</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-[100px]">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRates.map(renderRateRow)}
                {inactiveRates.map(renderRateRow)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Edit Tarif' : 'Tambah Tarif Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Layanan *</Label>
                <Select
                  value={form.service_type}
                  onValueChange={(v) =>
                    setForm({ ...form, service_type: v as VendorRateServiceType })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis layanan" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Satuan *</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deskripsi *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Sewa trailer 40ft SBY-JKT"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label>Harga Dasar (IDR) *</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.base_price || ''}
                onChange={(e) =>
                  setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kuantitas Min</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.min_quantity ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      min_quantity: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Opsional"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Kuantitas Maks</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.max_quantity ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_quantity: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Opsional"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Berlaku Dari *</Label>
                <Input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Berlaku Sampai</Label>
                <Input
                  type="date"
                  value={form.effective_to ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, effective_to: e.target.value || null })
                  }
                  placeholder="Kosongkan jika tidak terbatas"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Syarat Pembayaran</Label>
              <Input
                value={form.payment_terms ?? ''}
                onChange={(e) =>
                  setForm({ ...form, payment_terms: e.target.value || null })
                }
                placeholder="Contoh: NET 30, COD"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                placeholder="Catatan tambahan..."
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : editingRate ? (
                'Perbarui'
              ) : (
                'Tambah'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Tarif</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan tarif ini? Tarif yang nonaktif tidak
              akan muncul sebagai referensi di PJO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={isDeactivating}>
              {isDeactivating ? 'Menonaktifkan...' : 'Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
