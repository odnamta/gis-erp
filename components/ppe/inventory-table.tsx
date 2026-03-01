'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { PPEInventory, PPEType, RecordPurchaseInput, UpdateInventoryInput } from '@/types/ppe';
import { updateInventory, recordPurchase, deleteInventoryItem } from '@/lib/ppe-actions';
import { getStockStatus, getStockStatusColor, formatPPECost, formatPPEDate } from '@/lib/ppe-utils';
import { toast } from 'sonner';
import { Package, Plus, AlertTriangle, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InventoryTableProps {
  inventory: PPEInventory[];
  ppeTypes: PPEType[];
}

export function InventoryTable({ inventory, ppeTypes }: InventoryTableProps) {
  const router = useRouter();
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchaseData, setPurchaseData] = useState<RecordPurchaseInput>({
    ppe_type_id: '',
    size: '',
    quantity: 1,
    purchase_date: new Date().toISOString().split('T')[0],
    unit_cost: 0,
    storage_location: '',
  });

  // Edit state
  const [editingItem, setEditingItem] = useState<PPEInventory | null>(null);
  const [editData, setEditData] = useState<UpdateInventoryInput>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deletingItem, setDeletingItem] = useState<PPEInventory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await recordPurchase(purchaseData);
      toast.success('Pembelian berhasil dicatat');
      setShowPurchaseForm(false);
      setPurchaseData({
        ppe_type_id: '',
        size: '',
        quantity: 1,
        purchase_date: new Date().toISOString().split('T')[0],
        unit_cost: 0,
        storage_location: '',
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mencatat pembelian');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (item: PPEInventory) => {
    setEditingItem(item);
    setEditData({
      quantity_in_stock: item.quantity_in_stock,
      reorder_level: item.reorder_level,
      storage_location: item.storage_location,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditLoading(true);

    try {
      await updateInventory(editingItem.id, editData);
      toast.success('Item inventaris berhasil diperbarui');
      setEditingItem(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui item inventaris');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleteLoading(true);

    try {
      await deleteInventoryItem(deletingItem.id);
      toast.success('Item inventaris berhasil dihapus');
      setDeletingItem(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus item inventaris');
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedPPEType = ppeTypes.find(t => t.id === purchaseData.ppe_type_id);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Inventaris PPE</h2>
        <Button onClick={() => setShowPurchaseForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Catat Pembelian
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipe PPE</TableHead>
              <TableHead>Ukuran</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Batas Reorder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Pembelian Terakhir</TableHead>
              <TableHead className="w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Belum ada data inventaris. Catat pembelian untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map(item => {
                const status = getStockStatus(item.quantity_in_stock, item.reorder_level);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.ppe_type?.ppe_name || 'Unknown'}
                    </TableCell>
                    <TableCell>{item.size || '-'}</TableCell>
                    <TableCell>
                      <span className="font-mono">{item.quantity_in_stock}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{item.reorder_level}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStockStatusColor(status)}>
                        {status === 'critical' && (
                          <AlertTriangle className="mr-1 h-3 w-3" />
                        )}
                        {status === 'adequate' ? 'Cukup' : status === 'low' ? 'Rendah' : 'Kritis'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.storage_location || '-'}</TableCell>
                    <TableCell>
                      {item.last_purchase_date ? (
                        <div className="text-sm">
                          <div>{formatPPEDate(item.last_purchase_date)}</div>
                          <div className="text-muted-foreground">
                            {item.last_purchase_qty} unit @ {formatPPECost(item.last_purchase_cost)}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingItem(item)}
                          title="Hapus item"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Record Purchase Dialog */}
      <Dialog open={showPurchaseForm} onOpenChange={setShowPurchaseForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Catat Pembelian</DialogTitle>
            <DialogDescription>
              Tambahkan stok PPE baru ke inventaris.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPurchase} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ppe_type">Tipe PPE</Label>
              <Select
                value={purchaseData.ppe_type_id}
                onValueChange={value =>
                  setPurchaseData({ ...purchaseData, ppe_type_id: value, size: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe PPE" />
                </SelectTrigger>
                <SelectContent>
                  {ppeTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.ppe_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPPEType?.has_sizes && selectedPPEType.available_sizes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="size">Ukuran</Label>
                <Select
                  value={purchaseData.size || ''}
                  onValueChange={value =>
                    setPurchaseData({ ...purchaseData, size: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ukuran" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPPEType.available_sizes.map(size => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={purchaseData.quantity}
                  onChange={e =>
                    setPurchaseData({ ...purchaseData, quantity: parseInt(e.target.value) || 1 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_cost">Harga Satuan (IDR)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  min="0"
                  value={purchaseData.unit_cost}
                  onChange={e =>
                    setPurchaseData({ ...purchaseData, unit_cost: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Tanggal Pembelian</Label>
              <Input
                id="purchase_date"
                type="date"
                value={purchaseData.purchase_date}
                onChange={e =>
                  setPurchaseData({ ...purchaseData, purchase_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage_location">Lokasi Penyimpanan</Label>
              <Input
                id="storage_location"
                value={purchaseData.storage_location || ''}
                onChange={e =>
                  setPurchaseData({ ...purchaseData, storage_location: e.target.value })
                }
                placeholder="cth. Gudang A, Rak 3"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPurchaseForm(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading || !purchaseData.ppe_type_id}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Catat Pembelian
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Inventory Dialog */}
      <Dialog open={!!editingItem} onOpenChange={open => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item Inventaris</DialogTitle>
            <DialogDescription>
              {editingItem?.ppe_type?.ppe_name}
              {editingItem?.size ? ` - Ukuran ${editingItem.size}` : ''}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_quantity">Jumlah Stok</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  min="0"
                  value={editData.quantity_in_stock ?? 0}
                  onChange={e =>
                    setEditData({ ...editData, quantity_in_stock: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_reorder">Batas Reorder</Label>
                <Input
                  id="edit_reorder"
                  type="number"
                  min="0"
                  value={editData.reorder_level ?? 0}
                  onChange={e =>
                    setEditData({ ...editData, reorder_level: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_location">Lokasi Penyimpanan</Label>
              <Input
                id="edit_location"
                value={editData.storage_location ?? ''}
                onChange={e =>
                  setEditData({ ...editData, storage_location: e.target.value || null })
                }
                placeholder="cth. Gudang A, Rak 3"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
                disabled={editLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingItem} onOpenChange={open => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item Inventaris?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus item inventaris{' '}
              <span className="font-semibold">{deletingItem?.ppe_type?.ppe_name}</span>
              {deletingItem?.size ? ` (Ukuran ${deletingItem.size})` : ''}.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
