'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { AddActionInput } from '@/types/incident';

interface Employee {
  id: string;
  full_name: string;
}

interface AddActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (action: AddActionInput) => Promise<void>;
  employees: Employee[];
  actionType: 'corrective' | 'preventive';
}

export function AddActionDialog({
  open,
  onOpenChange,
  onAdd,
  employees,
  actionType,
}: AddActionDialogProps) {
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setDescription('');
    setResponsibleId('');
    setDueDate('');
  };

  const handleSubmit = async () => {
    if (!description || !responsibleId || !dueDate) return;

    setSubmitting(true);
    try {
      await onAdd({ description, responsibleId, dueDate });
      resetForm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = description.trim().length > 0 && responsibleId && dueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Tambah Tindakan {actionType === 'corrective' ? 'Korektif' : 'Preventif'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Deskripsi Tindakan</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tindakan yang harus dilakukan..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Penanggung Jawab</Label>
            <EmployeeCombobox
              employees={employees}
              value={responsibleId}
              onValueChange={setResponsibleId}
              placeholder="Cari penanggung jawab..."
            />
          </div>

          <div className="space-y-2">
            <Label>Batas Waktu</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? 'Menyimpan...' : 'Tambah'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
