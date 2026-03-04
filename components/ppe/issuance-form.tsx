'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { PPEType, IssuePPEInput, PPEEmployee } from '@/types/ppe';
import { issuePPE } from '@/lib/ppe-actions';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface PPEItem {
  ppe_type_id: string;
  quantity: number;
  size: string | null;
  condition_at_issue: string;
}

const emptyItem = (): PPEItem => ({
  ppe_type_id: '',
  quantity: 1,
  size: null,
  condition_at_issue: 'new',
});

interface IssuanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ppeTypes: PPEType[];
  employees: PPEEmployee[];
  onSuccess?: () => void;
}

export function IssuanceForm({
  open,
  onOpenChange,
  ppeTypes,
  employees,
  onSuccess,
}: IssuanceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [issuedDate, setIssuedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PPEItem[]>([emptyItem()]);

  const updateItem = (index: number, updates: Partial<PPEItem>) => {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyItem()]);
  };

  const validItems = items.filter(item => item.ppe_type_id !== '');

  const resetForm = () => {
    setEmployeeId('');
    setIssuedDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([emptyItem()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      toast.error('Pilih karyawan terlebih dahulu');
      return;
    }

    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 item PPE');
      return;
    }

    setLoading(true);

    let successCount = 0;
    const errors: string[] = [];

    for (const item of validItems) {
      const input: IssuePPEInput = {
        employee_id: employeeId,
        ppe_type_id: item.ppe_type_id,
        quantity: item.quantity,
        size: item.size,
        serial_number: null,
        issued_date: issuedDate,
        condition_at_issue: item.condition_at_issue,
        notes: notes || null,
      };

      try {
        await issuePPE(input);
        successCount++;
      } catch (error) {
        const ppeType = ppeTypes.find(t => t.id === item.ppe_type_id);
        const name = ppeType?.ppe_name || 'Unknown';
        errors.push(
          `${name}: ${error instanceof Error ? error.message : 'Gagal'}`
        );
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} item PPE berhasil dikeluarkan`);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
      router.refresh();
    }

    if (errors.length > 0) {
      toast.error(`Gagal mengeluarkan ${errors.length} item`, {
        description: errors.join('; '),
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengeluaran PPE</DialogTitle>
          <DialogDescription>
            Keluarkan alat pelindung diri kepada karyawan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shared: Employee */}
          <div className="space-y-2">
            <Label>Karyawan</Label>
            <EmployeeCombobox
              employees={employees}
              value={employeeId}
              onValueChange={setEmployeeId}
              placeholder="Cari karyawan..."
            />
          </div>

          {/* Shared: Date */}
          <div className="space-y-2">
            <Label>Tanggal Pengeluaran</Label>
            <Input
              type="date"
              value={issuedDate}
              onChange={e => setIssuedDate(e.target.value)}
              required
            />
          </div>

          {/* Divider: PPE Items */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                Item PPE
              </span>
              <div className="flex-1 border-t" />
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const selectedType = ppeTypes.find(
                  t => t.id === item.ppe_type_id
                );
                const showSize =
                  selectedType?.has_sizes &&
                  selectedType.available_sizes.length > 0;

                return (
                  <div
                    key={index}
                    className="rounded-lg border p-3 space-y-3 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Item {index + 1}
                      </span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Row 1: PPE Type (full width) */}
                    <div className="space-y-1">
                      <Label className="text-xs">Jenis PPE</Label>
                      <Select
                        value={item.ppe_type_id}
                        onValueChange={value =>
                          updateItem(index, {
                            ppe_type_id: value,
                            size: null,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis PPE" />
                        </SelectTrigger>
                        <SelectContent>
                          {ppeTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.ppe_name}
                              {type.is_mandatory && ' (Wajib)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Row 2: Qty, Size (if applicable), Condition */}
                    <div
                      className={`grid gap-3 ${showSize ? 'grid-cols-3' : 'grid-cols-2'}`}
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Jumlah</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e =>
                            updateItem(index, {
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>

                      {showSize && (
                        <div className="space-y-1">
                          <Label className="text-xs">Ukuran</Label>
                          <Select
                            value={item.size || ''}
                            onValueChange={value =>
                              updateItem(index, { size: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedType!.available_sizes.map(size => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs">Kondisi</Label>
                        <Select
                          value={item.condition_at_issue}
                          onValueChange={value =>
                            updateItem(index, {
                              condition_at_issue: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Baru</SelectItem>
                            <SelectItem value="good">Baik</SelectItem>
                            <SelectItem value="fair">Cukup</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Item Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={addItem}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Item PPE
            </Button>
          </div>

          {/* Shared: Notes */}
          <div className="space-y-2">
            <Label>Catatan (Opsional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || !employeeId || validItems.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Keluarkan ({validItems.length} item)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
