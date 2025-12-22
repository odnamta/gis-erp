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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AddPersonInput, PersonType, TreatmentLevel } from '@/types/incident';
import { getPersonTypeLabel, getTreatmentLabel } from '@/lib/incident-utils';

interface Employee {
  id: string;
  full_name: string;
}

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (person: AddPersonInput) => void;
  employees: Employee[];
}

const personTypes: PersonType[] = ['injured', 'witness', 'involved', 'first_responder'];
const treatmentLevels: TreatmentLevel[] = ['none', 'first_aid', 'medical_treatment', 'hospitalized', 'fatality'];

export function AddPersonDialog({
  open,
  onOpenChange,
  onAdd,
  employees,
}: AddPersonDialogProps) {
  const [isEmployee, setIsEmployee] = useState(true);
  const [personType, setPersonType] = useState<PersonType>('witness');
  const [employeeId, setEmployeeId] = useState('');
  const [personName, setPersonName] = useState('');
  const [personCompany, setPersonCompany] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [injuryDescription, setInjuryDescription] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [treatment, setTreatment] = useState<TreatmentLevel>('none');
  const [daysLost, setDaysLost] = useState(0);
  const [statement, setStatement] = useState('');

  const resetForm = () => {
    setIsEmployee(true);
    setPersonType('witness');
    setEmployeeId('');
    setPersonName('');
    setPersonCompany('');
    setPersonPhone('');
    setInjuryType('');
    setInjuryDescription('');
    setBodyPart('');
    setTreatment('none');
    setDaysLost(0);
    setStatement('');
  };

  const handleSubmit = () => {
    const person: AddPersonInput = {
      personType,
      employeeId: isEmployee ? employeeId : undefined,
      personName: !isEmployee ? personName : undefined,
      personCompany: !isEmployee ? personCompany : undefined,
      personPhone: !isEmployee ? personPhone : undefined,
      statement: statement || undefined,
    };

    if (personType === 'injured') {
      person.injuryType = injuryType || undefined;
      person.injuryDescription = injuryDescription || undefined;
      person.bodyPart = bodyPart || undefined;
      person.treatment = treatment;
      person.daysLost = daysLost;
    }

    onAdd(person);
    resetForm();
    onOpenChange(false);
  };

  const isValid = isEmployee ? !!employeeId : !!personName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Orang Terlibat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label>Karyawan Internal</Label>
            <Switch checked={isEmployee} onCheckedChange={setIsEmployee} />
          </div>

          <div className="space-y-2">
            <Label>Tipe Keterlibatan</Label>
            <Select value={personType} onValueChange={(v) => setPersonType(v as PersonType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {personTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getPersonTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEmployee ? (
            <div className="space-y-2">
              <Label>Karyawan</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={personName} onChange={(e) => setPersonName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Perusahaan</Label>
                <Input value={personCompany} onChange={(e) => setPersonCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} />
              </div>
            </>
          )}

          {personType === 'injured' && (
            <>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Detail Cedera</h4>
              </div>
              <div className="space-y-2">
                <Label>Jenis Cedera</Label>
                <Input
                  value={injuryType}
                  onChange={(e) => setInjuryType(e.target.value)}
                  placeholder="Contoh: Luka potong, Patah tulang"
                />
              </div>
              <div className="space-y-2">
                <Label>Bagian Tubuh</Label>
                <Input
                  value={bodyPart}
                  onChange={(e) => setBodyPart(e.target.value)}
                  placeholder="Contoh: Tangan kanan, Kaki kiri"
                />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi Cedera</Label>
                <Textarea
                  value={injuryDescription}
                  onChange={(e) => setInjuryDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Penanganan</Label>
                <Select value={treatment} onValueChange={(v) => setTreatment(v as TreatmentLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {treatmentLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {getTreatmentLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hari Kerja Hilang</Label>
                <Input
                  type="number"
                  min={0}
                  value={daysLost}
                  onChange={(e) => setDaysLost(parseInt(e.target.value) || 0)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Pernyataan/Keterangan</Label>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={3}
              placeholder="Keterangan dari orang yang terlibat..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Tambah
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
