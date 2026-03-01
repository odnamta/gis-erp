'use client';

import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

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
  const [formData, setFormData] = useState<IssuePPEInput>({
    employee_id: '',
    ppe_type_id: '',
    quantity: 1,
    size: null,
    serial_number: null,
    issued_date: new Date().toISOString().split('T')[0],
    condition_at_issue: 'new',
    notes: null,
  });

  const selectedPPEType = ppeTypes.find(t => t.id === formData.ppe_type_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await issuePPE(formData);
      toast.success('PPE issued successfully');
      onOpenChange(false);
      setFormData({
        employee_id: '',
        ppe_type_id: '',
        quantity: 1,
        size: null,
        serial_number: null,
        issued_date: new Date().toISOString().split('T')[0],
        condition_at_issue: 'new',
        notes: null,
      });
      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to issue PPE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Issue PPE</DialogTitle>
          <DialogDescription>
            Issue Personal Protective Equipment to an employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <EmployeeCombobox
              employees={employees}
              value={formData.employee_id}
              onValueChange={value => setFormData({ ...formData, employee_id: value })}
              placeholder="Cari karyawan..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ppe_type">PPE Type</Label>
            <Select
              value={formData.ppe_type_id}
              onValueChange={value =>
                setFormData({ ...formData, ppe_type_id: value, size: null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select PPE type" />
              </SelectTrigger>
              <SelectContent>
                {ppeTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.ppe_name}
                    {type.is_mandatory && ' (Required)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {selectedPPEType?.has_sizes && selectedPPEType.available_sizes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size || ''}
                  onValueChange={value => setFormData({ ...formData, size: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
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

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issued_date">Issue Date</Label>
              <Input
                id="issued_date"
                type="date"
                value={formData.issued_date}
                onChange={e => setFormData({ ...formData, issued_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={formData.condition_at_issue || 'new'}
                onValueChange={value =>
                  setFormData({ ...formData, condition_at_issue: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number (Optional)</Label>
            <Input
              id="serial_number"
              value={formData.serial_number || ''}
              onChange={e =>
                setFormData({ ...formData, serial_number: e.target.value || null })
              }
              placeholder="For high-value items"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value || null })}
              placeholder="Any additional notes..."
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.employee_id || !formData.ppe_type_id}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue PPE
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
