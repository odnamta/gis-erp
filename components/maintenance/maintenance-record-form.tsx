'use client'

import { useState } from 'react'
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
import { MaintenanceTypeSelect } from './maintenance-type-select'
import { MaintenancePartsTable } from './maintenance-parts-table'
import { 
  MaintenanceType, 
  MaintenanceRecordInput,
  MaintenancePerformedAt 
} from '@/types/maintenance'
import { Asset } from '@/types/assets'
import { formatCurrency } from '@/lib/utils/format'
import { calculatePartsCost, calculateTotalCost, validateMaintenanceRecordInput } from '@/lib/maintenance-utils'
import { createMaintenanceRecord } from '@/lib/maintenance-actions'
import { Loader2 } from 'lucide-react'

interface MaintenanceRecordFormProps {
  assets: Asset[]
  maintenanceTypes: MaintenanceType[]
  scheduleId?: string
  assetId?: string
  onCancel: () => void
}

export function MaintenanceRecordForm({
  assets,
  maintenanceTypes,
  scheduleId,
  assetId: initialAssetId,
  onCancel,
}: MaintenanceRecordFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<MaintenanceRecordInput>({
    assetId: initialAssetId || '',
    maintenanceTypeId: '',
    scheduleId: scheduleId,
    maintenanceDate: new Date().toISOString().split('T')[0],
    odometerKm: undefined,
    hourMeter: undefined,
    performedAt: 'internal',
    workshopName: '',
    workshopAddress: '',
    description: '',
    findings: '',
    recommendations: '',
    technicianName: '',
    technicianEmployeeId: undefined,
    laborCost: 0,
    externalCost: 0,
    bkkId: undefined,
    photos: [],
    documents: [],
    notes: '',
    parts: [],
  })

  const partsCost = calculatePartsCost(formData.parts)
  const totalCost = calculateTotalCost(formData.laborCost, partsCost, formData.externalCost)

  const updateField = <K extends keyof MaintenanceRecordInput>(
    field: K,
    value: MaintenanceRecordInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validation = validateMaintenanceRecordInput(formData)
    if (!validation.valid) {
      setError(validation.errors.join(', '))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createMaintenanceRecord(formData)
      if (result.success) {
        router.push('/equipment/maintenance')
        router.refresh()
      } else {
        setError(result.error || 'Failed to create maintenance record')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Asset & Maintenance Type</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assetId">Asset *</Label>
            <Select
              value={formData.assetId}
              onValueChange={(value) => updateField('assetId', value)}
              disabled={!!initialAssetId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset..." />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_code} - {asset.asset_name}
                    {asset.registration_number && ` (${asset.registration_number})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Maintenance Type *</Label>
            <MaintenanceTypeSelect
              types={maintenanceTypes}
              value={formData.maintenanceTypeId}
              onValueChange={(value) => updateField('maintenanceTypeId', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceDate">Maintenance Date *</Label>
            <Input
              id="maintenanceDate"
              type="date"
              value={formData.maintenanceDate}
              onChange={(e) => updateField('maintenanceDate', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="performedAt">Performed At</Label>
            <Select
              value={formData.performedAt}
              onValueChange={(value) => updateField('performedAt', value as MaintenancePerformedAt)}
            >
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
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Meter Readings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="odometerKm">Odometer (km)</Label>
            <Input
              id="odometerKm"
              type="number"
              min="0"
              value={formData.odometerKm || ''}
              onChange={(e) => updateField('odometerKm', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Current odometer reading"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourMeter">Hour Meter</Label>
            <Input
              id="hourMeter"
              type="number"
              min="0"
              step="0.1"
              value={formData.hourMeter || ''}
              onChange={(e) => updateField('hourMeter', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Current hour meter reading"
            />
          </div>
        </CardContent>
      </Card>

      {formData.performedAt === 'external' && (
        <Card>
          <CardHeader>
            <CardTitle>Workshop Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workshopName">Workshop Name</Label>
              <Input
                id="workshopName"
                value={formData.workshopName || ''}
                onChange={(e) => updateField('workshopName', e.target.value)}
                placeholder="Workshop name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workshopAddress">Workshop Address</Label>
              <Input
                id="workshopAddress"
                value={formData.workshopAddress || ''}
                onChange={(e) => updateField('workshopAddress', e.target.value)}
                placeholder="Workshop address"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Work Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the maintenance work performed..."
              rows={3}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                id="findings"
                value={formData.findings || ''}
                onChange={(e) => updateField('findings', e.target.value)}
                placeholder="Issues found during inspection..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                value={formData.recommendations || ''}
                onChange={(e) => updateField('recommendations', e.target.value)}
                placeholder="Recommended follow-up actions..."
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technicianName">Technician Name</Label>
            <Input
              id="technicianName"
              value={formData.technicianName || ''}
              onChange={(e) => updateField('technicianName', e.target.value)}
              placeholder="Name of technician who performed the work"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parts Used</CardTitle>
        </CardHeader>
        <CardContent>
          <MaintenancePartsTable
            parts={formData.parts}
            onChange={(parts) => updateField('parts', parts)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="laborCost">Labor Cost</Label>
              <Input
                id="laborCost"
                type="number"
                min="0"
                value={formData.laborCost}
                onChange={(e) => updateField('laborCost', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Parts Cost</Label>
              <Input
                value={formatCurrency(partsCost)}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalCost">External Cost</Label>
              <Input
                id="externalCost"
                type="number"
                min="0"
                value={formData.externalCost}
                onChange={(e) => updateField('externalCost', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total Cost:</span>
            <span className="text-2xl font-bold">{formatCurrency(totalCost)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Maintenance Record
        </Button>
      </div>
    </form>
  )
}
