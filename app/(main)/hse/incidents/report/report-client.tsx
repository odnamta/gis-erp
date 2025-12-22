'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  CategorySelect,
  AddPersonDialog,
  PersonsList,
} from '@/components/hse';
import { reportIncident } from '@/lib/incident-actions';
import {
  IncidentCategory,
  IncidentSeverity,
  IncidentType,
  LocationType,
  AddPersonInput,
  ReportIncidentInput,
} from '@/types/incident';
import {
  getSeverityLabel,
  getIncidentTypeLabel,
  getLocationTypeLabel,
} from '@/lib/incident-utils';

interface Employee {
  id: string;
  full_name: string;
}

interface JobOrder {
  id: string;
  jo_number: string;
}

interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
}

interface ReportClientProps {
  categories: IncidentCategory[];
  employees: Employee[];
  jobOrders: JobOrder[];
  assets: Asset[];
}

const severityOptions: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
const incidentTypeOptions: IncidentType[] = ['accident', 'near_miss', 'observation', 'violation'];
const locationTypeOptions: LocationType[] = ['office', 'warehouse', 'road', 'customer_site', 'port', 'other'];

export function ReportClient({ categories, employees, jobOrders, assets }: ReportClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [categoryId, setCategoryId] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [incidentType, setIncidentType] = useState<IncidentType>('near_miss');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('office');
  const [locationName, setLocationName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [immediateActions, setImmediateActions] = useState('');
  const [jobOrderId, setJobOrderId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [persons, setPersons] = useState<AddPersonInput[]>([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAddPerson = (person: AddPersonInput) => {
    setPersons([...persons, person]);
  };

  const handleRemovePerson = (index: number) => {
    setPersons(persons.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const input: ReportIncidentInput = {
      categoryId,
      severity,
      incidentType,
      incidentDate,
      incidentTime: incidentTime || undefined,
      locationType,
      locationName: locationName || undefined,
      title,
      description,
      immediateActions: immediateActions || undefined,
      jobOrderId: jobOrderId || undefined,
      assetId: assetId || undefined,
      supervisorId: supervisorId || undefined,
    };

    setSubmitting(true);
    try {
      const result = await reportIncident(input, persons);

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: `Insiden ${result.data?.incidentNumber} berhasil dilaporkan`,
        });
        router.push('/hse/incidents');
      } else {
        toast({
          title: 'Gagal',
          description: result.error || 'Gagal melaporkan insiden',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = categoryId && severity && incidentType && incidentDate && locationType && title && description.length >= 10;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hse/incidents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Laporkan Insiden</h1>
          <p className="text-muted-foreground">Isi form berikut untuk melaporkan insiden</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Klasifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori Insiden *</Label>
              <CategorySelect
                categories={categories}
                value={categoryId}
                onValueChange={setCategoryId}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((s) => (
                      <SelectItem key={s} value={s}>{getSeverityLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jenis Insiden *</Label>
                <Select value={incidentType} onValueChange={(v) => setIncidentType(v as IncidentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypeOptions.map((t) => (
                      <SelectItem key={t} value={t}>{getIncidentTypeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* When & Where */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kapan & Dimana</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Waktu</Label>
                <Input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipe Lokasi *</Label>
              <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationTypeOptions.map((l) => (
                    <SelectItem key={l} value={l}>{getLocationTypeLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Lokasi</Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Contoh: Gudang A, Jalan Tol Jakarta-Cikampek KM 50"
              />
            </div>
          </CardContent>
        </Card>

        {/* What Happened */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Apa yang Terjadi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Insiden *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ringkasan singkat insiden"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi * (min. 10 karakter)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kronologi kejadian secara detail..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Tindakan Segera yang Diambil</Label>
              <Textarea
                value={immediateActions}
                onChange={(e) => setImmediateActions(e.target.value)}
                placeholder="Tindakan apa yang sudah dilakukan segera setelah insiden..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Related */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terkait</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Order</Label>
              <Select value={jobOrderId} onValueChange={setJobOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih JO (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada</SelectItem>
                  {jobOrders.map((jo) => (
                    <SelectItem key={jo.id} value={jo.id}>{jo.jo_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Asset/Equipment</Label>
              <Select value={assetId} onValueChange={setAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih asset (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_code} - {asset.asset_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select value={supervisorId} onValueChange={setSupervisorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih supervisor (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* People Involved */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Orang Terlibat</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddPerson(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </CardHeader>
          <CardContent>
            <PersonsList
              persons={persons}
              employees={employees}
              onRemove={handleRemovePerson}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/hse/incidents">Batal</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || submitting}>
          <Save className="h-4 w-4 mr-2" />
          {submitting ? 'Menyimpan...' : 'Laporkan Insiden'}
        </Button>
      </div>

      <AddPersonDialog
        open={showAddPerson}
        onOpenChange={setShowAddPerson}
        onAdd={handleAddPerson}
        employees={employees}
      />
    </div>
  );
}
