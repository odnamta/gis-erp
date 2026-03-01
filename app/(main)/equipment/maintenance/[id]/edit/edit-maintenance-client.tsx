'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Wrench, Loader2 } from 'lucide-react'
import {
  MaintenanceType,
  MaintenanceRecord,
  MaintenanceRecordInput,
  MaintenancePerformedAt,
} from '@/types/maintenance'
import {
  getMaintenanceRecordById,
  getMaintenanceTypes,
  updateMaintenanceRecord,
} from '@/lib/maintenance-actions'
import { formatCurrency } from '@/lib/utils/format'
import { useToast } from '@/hooks/use-toast'

interface EditMaintenanceClientProps {
  recordId: string
}

export function EditMaintenanceClient({ recordId }: EditMaintenanceClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([])

  // Form state
  const [maintenanceTypeId, setMaintenanceTypeId] = useState('')
  const [maintenanceDate, setMaintenanceDate] = useState('')
  const [odometerKm, setOdometerKm] = useState<number | undefined>()
  const [hourMeter, setHourMeter] = useState<number | undefined>()
  const [performedAt, setPerformedAt] = useState<MaintenancePerformedAt>('internal')
  const [workshopName, setWorkshopName] = useState('')
  const [workshopAddress, setWorkshopAddress] = useState('')
  const [description, setDescription] = useState('')
  const [findings, setFindings] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [laborCost, setLaborCost] = useState(0)
  const [externalCost, setExternalCost] = useState(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [recordId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [recordData, typesData] = await Promise.all([
        getMaintenanceRecordById(recordId),
        getMaintenanceTypes(),
      ])

      if (!recordData) {
        setError('Maintenance record not found')
        return
      }

      setRecord(recordData)
      setMaintenanceTypes(typesData)

      // Pre-fill form
      setMaintenanceTypeId(recordData.maintenanceTypeId)
      setMaintenanceDate(recordData.maintenanceDate)
      setOdometerKm(recordData.odometerKm)
      setHourMeter(recordData.hourMeter)
      setPerformedAt(recordData.performedAt)
      setWorkshopName(recordData.workshopName || '')
      setWorkshopAddress(recordData.workshopAddress || '')
      setDescription(recordData.description)
      setFindings(recordData.findings || '')
      setRecommendations(recordData.recommendations || '')
      setTechnicianName(recordData.technicianName || '')
      setLaborCost(recordData.laborCost)
      setExternalCost(recordData.externalCost)
      setNotes(recordData.notes || '')
    } catch {
      setError('Failed to load maintenance record')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!description.trim()) {
      setError('Deskripsi wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      const input: Partial<MaintenanceRecordInput> = {
        maintenanceTypeId,
        maintenanceDate,
        odometerKm,
        hourMeter,
        performedAt,
        workshopName,
        workshopAddress,
        description,
        findings,
        recommendations,
        technicianName,
        laborCost,
        externalCost,
        notes,
        parts: record?.parts?.map(p => ({
          partName: p.partName,
          partNumber: p.partNumber,
          quantity: p.quantity,
          unit: p.unit,
          unitPrice: p.unitPrice,
          supplier: p.supplier,
          warrantyMonths: p.warrantyMonths,
        })) || [],
      }

      const result = await updateMaintenanceRecord(recordId, input)
      if (result.success) {
        toast({ title: 'Success', description: 'Maintenance record berhasil diperbarui' })
        router.push(`/equipment/maintenance/${recordId}`)
      } else {
        setError(result.error || 'Failed to update')
      }
    } catch {
      setError('Failed to update maintenance record')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !record) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Edit Maintenance Record
          </h1>
          <p className="text-muted-foreground">
            {record?.recordNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Maintenance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipe Maintenance</Label>
                <Select value={maintenanceTypeId} onValueChange={setMaintenanceTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.typeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={maintenanceDate}
                  onChange={(e) => setMaintenanceDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Lokasi Pengerjaan</Label>
                <Select value={performedAt} onValueChange={(v) => setPerformedAt(v as MaintenancePerformedAt)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Workshop</SelectItem>
                    <SelectItem value="external">External Workshop</SelectItem>
                    <SelectItem value="field">Field Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {performedAt === 'external' && (
                <>
                  <div className="space-y-2">
                    <Label>Nama Workshop</Label>
                    <Input
                      value={workshopName}
                      onChange={(e) => setWorkshopName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alamat Workshop</Label>
                    <Input
                      value={workshopAddress}
                      onChange={(e) => setWorkshopAddress(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Meter Readings */}
          <Card>
            <CardHeader>
              <CardTitle>Meter Readings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Odometer (km)</Label>
                <Input
                  type="number"
                  value={odometerKm ?? ''}
                  onChange={(e) => setOdometerKm(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>Hour Meter</Label>
                <Input
                  type="number"
                  value={hourMeter ?? ''}
                  onChange={(e) => setHourMeter(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>Teknisi</Label>
                <Input
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Description */}
        <Card>
          <CardHeader>
            <CardTitle>Deskripsi Pekerjaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Deskripsi *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Temuan</Label>
              <Textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Rekomendasi</Label>
              <Textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Biaya</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Biaya Tenaga Kerja</Label>
                <Input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Biaya Parts</Label>
                <Input
                  type="number"
                  value={record?.partsCost || 0}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Dihitung dari daftar parts</p>
              </div>

              <div className="space-y-2">
                <Label>Biaya Eksternal</Label>
                <Input
                  type="number"
                  value={externalCost}
                  onChange={(e) => setExternalCost(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Biaya</span>
              <span className="text-lg font-bold">
                {formatCurrency(laborCost + (record?.partsCost || 0) + externalCost)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Catatan Tambahan</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Catatan tambahan..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </div>
      </form>
    </div>
  )
}
