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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { Asset, AssetCategory, AssetLocation, AssetFormData } from '@/types/assets'
import { DEPRECIATION_METHODS } from '@/lib/asset-utils'
import { createAsset, updateAsset } from '@/lib/asset-actions'
import { toast } from 'sonner'

interface AssetFormProps {
  asset?: Asset
  categories: AssetCategory[]
  locations: AssetLocation[]
  mode: 'create' | 'edit'
}

export function AssetForm({ asset, categories, locations, mode }: AssetFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<AssetFormData>({
    asset_name: asset?.asset_name || '',
    description: asset?.description || '',
    category_id: asset?.category_id || '',
    registration_number: asset?.registration_number || '',
    vin_number: asset?.vin_number || '',
    engine_number: asset?.engine_number || '',
    chassis_number: asset?.chassis_number || '',
    brand: asset?.brand || '',
    model: asset?.model || '',
    year_manufactured: asset?.year_manufactured || undefined,
    color: asset?.color || '',
    capacity_tons: asset?.capacity_tons || undefined,
    capacity_cbm: asset?.capacity_cbm || undefined,
    axle_configuration: asset?.axle_configuration || '',
    length_m: asset?.length_m || undefined,
    width_m: asset?.width_m || undefined,
    height_m: asset?.height_m || undefined,
    weight_kg: asset?.weight_kg || undefined,
    purchase_date: asset?.purchase_date || '',
    purchase_price: asset?.purchase_price || undefined,
    purchase_vendor: asset?.purchase_vendor || '',
    purchase_invoice: asset?.purchase_invoice || '',
    useful_life_years: asset?.useful_life_years || undefined,
    salvage_value: asset?.salvage_value || 0,
    depreciation_method: asset?.depreciation_method || 'straight_line',
    current_location_id: asset?.current_location_id || '',
    insurance_policy_number: asset?.insurance_policy_number || '',
    insurance_provider: asset?.insurance_provider || '',
    insurance_expiry_date: asset?.insurance_expiry_date || '',
    insurance_value: asset?.insurance_value || undefined,
    registration_expiry_date: asset?.registration_expiry_date || '',
    kir_expiry_date: asset?.kir_expiry_date || '',
    notes: asset?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === 'create') {
        const result = await createAsset(formData)
        if (result.success && result.asset) {
          toast.success('Asset created successfully')
          router.push(`/equipment/${result.asset.id}`)
        } else {
          toast.error(result.error || 'Failed to create asset')
        }
      } else if (asset) {
        const result = await updateAsset(asset.id, formData)
        if (result.success) {
          toast.success('Asset updated successfully')
          router.push(`/equipment/${asset.id}`)
        } else {
          toast.error(result.error || 'Failed to update asset')
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = <K extends keyof AssetFormData>(
    field: K,
    value: AssetFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>General asset details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="asset_name">Asset Name *</Label>
            <Input
              id="asset_name"
              value={formData.asset_name}
              onChange={(e) => updateField('asset_name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">Category *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => updateField('category_id', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Details */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
          <CardDescription>Registration and identification</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="registration_number">Registration (Plate)</Label>
            <Input
              id="registration_number"
              value={formData.registration_number}
              onChange={(e) => updateField('registration_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin_number">VIN Number</Label>
            <Input
              id="vin_number"
              value={formData.vin_number}
              onChange={(e) => updateField('vin_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="engine_number">Engine Number</Label>
            <Input
              id="engine_number"
              value={formData.engine_number}
              onChange={(e) => updateField('engine_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chassis_number">Chassis Number</Label>
            <Input
              id="chassis_number"
              value={formData.chassis_number}
              onChange={(e) => updateField('chassis_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => updateField('brand', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => updateField('model', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year_manufactured">Year</Label>
            <Input
              id="year_manufactured"
              type="number"
              value={formData.year_manufactured || ''}
              onChange={(e) => updateField('year_manufactured', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => updateField('color', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity & Dimensions</CardTitle>
          <CardDescription>Physical specifications</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="capacity_tons">Capacity (Tons)</Label>
            <Input
              id="capacity_tons"
              type="number"
              step="0.01"
              value={formData.capacity_tons || ''}
              onChange={(e) => updateField('capacity_tons', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity_cbm">Capacity (CBM)</Label>
            <Input
              id="capacity_cbm"
              type="number"
              step="0.01"
              value={formData.capacity_cbm || ''}
              onChange={(e) => updateField('capacity_cbm', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="axle_configuration">Axle Configuration</Label>
            <Input
              id="axle_configuration"
              value={formData.axle_configuration}
              onChange={(e) => updateField('axle_configuration', e.target.value)}
              placeholder="e.g., 6x4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight_kg">Weight (kg)</Label>
            <Input
              id="weight_kg"
              type="number"
              value={formData.weight_kg || ''}
              onChange={(e) => updateField('weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="length_m">Length (m)</Label>
            <Input
              id="length_m"
              type="number"
              step="0.01"
              value={formData.length_m || ''}
              onChange={(e) => updateField('length_m', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width_m">Width (m)</Label>
            <Input
              id="width_m"
              type="number"
              step="0.01"
              value={formData.width_m || ''}
              onChange={(e) => updateField('width_m', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height_m">Height (m)</Label>
            <Input
              id="height_m"
              type="number"
              step="0.01"
              value={formData.height_m || ''}
              onChange={(e) => updateField('height_m', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Purchase & Financials */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase & Financials</CardTitle>
          <CardDescription>Acquisition and depreciation details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <Input
              id="purchase_date"
              type="date"
              value={formData.purchase_date}
              onChange={(e) => updateField('purchase_date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase_price">Purchase Price (IDR)</Label>
            <Input
              id="purchase_price"
              type="number"
              value={formData.purchase_price || ''}
              onChange={(e) => updateField('purchase_price', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase_vendor">Vendor</Label>
            <Input
              id="purchase_vendor"
              value={formData.purchase_vendor}
              onChange={(e) => updateField('purchase_vendor', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase_invoice">Invoice Number</Label>
            <Input
              id="purchase_invoice"
              value={formData.purchase_invoice}
              onChange={(e) => updateField('purchase_invoice', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="useful_life_years">Useful Life (Years)</Label>
            <Input
              id="useful_life_years"
              type="number"
              value={formData.useful_life_years || ''}
              onChange={(e) => updateField('useful_life_years', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salvage_value">Salvage Value (IDR)</Label>
            <Input
              id="salvage_value"
              type="number"
              value={formData.salvage_value || ''}
              onChange={(e) => updateField('salvage_value', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depreciation_method">Depreciation Method</Label>
            <Select
              value={formData.depreciation_method}
              onValueChange={(value) => updateField('depreciation_method', value as AssetFormData['depreciation_method'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPRECIATION_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Location & Insurance */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Insurance</CardTitle>
          <CardDescription>Current location and insurance details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="current_location_id">Current Location</Label>
            <Select
              value={formData.current_location_id || ''}
              onValueChange={(value) => updateField('current_location_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.location_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurance_provider">Insurance Provider</Label>
            <Input
              id="insurance_provider"
              value={formData.insurance_provider}
              onChange={(e) => updateField('insurance_provider', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurance_policy_number">Policy Number</Label>
            <Input
              id="insurance_policy_number"
              value={formData.insurance_policy_number}
              onChange={(e) => updateField('insurance_policy_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurance_expiry_date">Insurance Expiry</Label>
            <Input
              id="insurance_expiry_date"
              type="date"
              value={formData.insurance_expiry_date}
              onChange={(e) => updateField('insurance_expiry_date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_expiry_date">Registration Expiry</Label>
            <Input
              id="registration_expiry_date"
              type="date"
              value={formData.registration_expiry_date}
              onChange={(e) => updateField('registration_expiry_date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kir_expiry_date">KIR Expiry</Label>
            <Input
              id="kir_expiry_date"
              type="date"
              value={formData.kir_expiry_date}
              onChange={(e) => updateField('kir_expiry_date', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes..."
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Asset' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
