'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { addParticipant } from '@/lib/training-actions';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface AddParticipantDialogProps {
  sessionId: string;
  employees: Employee[];
  existingParticipantIds: string[];
  onSuccess: () => void;
}

export function AddParticipantDialog({
  sessionId,
  employees,
  existingParticipantIds,
  onSuccess,
}: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const availableEmployees = employees.filter(
    (emp) => !existingParticipantIds.includes(emp.id)
  );

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      toast.error('Pilih karyawan terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      await addParticipant({
        sessionId,
        employeeId: selectedEmployeeId,
      });
      toast.success('Peserta berhasil ditambahkan');
      setSelectedEmployeeId('');
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menambah peserta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Peserta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Peserta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Pilih Karyawan</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih karyawan" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.length === 0 ? (
                  <SelectItem value="" disabled>
                    Semua karyawan sudah terdaftar
                  </SelectItem>
                ) : (
                  availableEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedEmployeeId}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambah
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
