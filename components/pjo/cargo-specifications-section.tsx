'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CargoSpecifications } from '@/types/market-classification'
import { Package, Ruler, DollarSign, Clock } from 'lucide-react'

interface CargoSpecificationsSectionProps {
  values: CargoSpecifications
  onChange: (values: CargoSpecifications) => void
  disabled?: boolean
  errors?: Partial<Record<keyof CargoSpecifications, string>>
}

export function CargoSpecificationsSection({
  values,
  onChange,
  disabled = false,
  errors = {},
}: CargoSpecificationsSectionProps) {
  const handleChange = (field: keyof CargoSpecifications, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    onChange({ ...values, [field]: numValue })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Cargo Specifications
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cargo_weight_kg" className="flex items-center gap-1">
            Weight (kg)
          </Label>
          <Input
            id="cargo_weight_kg"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 30000"
            value={values.cargo_weight_kg ?? ''}
            onChange={(e) => handleChange('cargo_weight_kg', e.target.value)}
            disabled={disabled}
          />
          {errors.cargo_weight_kg && (
            <p className="text-sm text-destructive">{errors.cargo_weight_kg}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargo_length_m" className="flex items-center gap-1">
            <Ruler className="h-4 w-4" />
            Length (m)
          </Label>
          <Input
            id="cargo_length_m"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 12"
            value={values.cargo_length_m ?? ''}
            onChange={(e) => handleChange('cargo_length_m', e.target.value)}
            disabled={disabled}
          />
          {errors.cargo_length_m && (
            <p className="text-sm text-destructive">{errors.cargo_length_m}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargo_width_m">Width (m)</Label>
          <Input
            id="cargo_width_m"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 2.5"
            value={values.cargo_width_m ?? ''}
            onChange={(e) => handleChange('cargo_width_m', e.target.value)}
            disabled={disabled}
          />
          {errors.cargo_width_m && (
            <p className="text-sm text-destructive">{errors.cargo_width_m}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargo_height_m">Height (m)</Label>
          <Input
            id="cargo_height_m"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 4.2"
            value={values.cargo_height_m ?? ''}
            onChange={(e) => handleChange('cargo_height_m', e.target.value)}
            disabled={disabled}
          />
          {errors.cargo_height_m && (
            <p className="text-sm text-destructive">{errors.cargo_height_m}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargo_value" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Cargo Value (IDR)
          </Label>
          <Input
            id="cargo_value"
            type="number"
            step="1"
            min="0"
            placeholder="e.g., 5000000000"
            value={values.cargo_value ?? ''}
            onChange={(e) => handleChange('cargo_value', e.target.value)}
            disabled={disabled}
          />
          {errors.cargo_value && (
            <p className="text-sm text-destructive">{errors.cargo_value}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration_days" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Duration (days)
          </Label>
          <Input
            id="duration_days"
            type="number"
            step="1"
            min="0"
            placeholder="e.g., 30"
            value={values.duration_days ?? ''}
            onChange={(e) => handleChange('duration_days', e.target.value)}
            disabled={disabled}
          />
          {errors.duration_days && (
            <p className="text-sm text-destructive">{errors.duration_days}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}