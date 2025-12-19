'use client'

import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RouteCharacteristics, TerrainType, TERRAIN_TYPE_LABELS } from '@/types/market-classification'
import { Route, AlertTriangle, FileCheck, Mountain } from 'lucide-react'

interface RouteCharacteristicsSectionProps {
  values: RouteCharacteristics
  onChange: (values: RouteCharacteristics) => void
  disabled?: boolean
}

const terrainOptions: { value: TerrainType; label: string }[] = [
  { value: 'normal', label: TERRAIN_TYPE_LABELS.normal },
  { value: 'mountain', label: TERRAIN_TYPE_LABELS.mountain },
  { value: 'unpaved', label: TERRAIN_TYPE_LABELS.unpaved },
  { value: 'narrow', label: TERRAIN_TYPE_LABELS.narrow },
]

export function RouteCharacteristicsSection({
  values,
  onChange,
  disabled = false,
}: RouteCharacteristicsSectionProps) {
  const handleCheckboxChange = (field: keyof RouteCharacteristics, checked: boolean) => {
    onChange({ ...values, [field]: checked })
  }

  const handleTerrainChange = (value: string) => {
    onChange({ ...values, terrain_type: value as TerrainType })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Route Characteristics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="terrain_type" className="flex items-center gap-1">
              <Mountain className="h-4 w-4" />
              Terrain Type
            </Label>
            <Select
              value={values.terrain_type || ''}
              onValueChange={handleTerrainChange}
              disabled={disabled}
            >
              <SelectTrigger id="terrain_type">
                <SelectValue placeholder="Select terrain type" />
              </SelectTrigger>
              <SelectContent>
                {terrainOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_new_route"
              checked={values.is_new_route}
              onCheckedChange={(checked) => handleCheckboxChange('is_new_route', checked === true)}
              disabled={disabled}
            />
            <Label
              htmlFor="is_new_route"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              New/Unfamiliar Route
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires_special_permit"
              checked={values.requires_special_permit}
              onCheckedChange={(checked) => handleCheckboxChange('requires_special_permit', checked === true)}
              disabled={disabled}
            />
            <Label
              htmlFor="requires_special_permit"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1"
            >
              <FileCheck className="h-4 w-4" />
              Special Permits Required
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_hazardous"
              checked={values.is_hazardous}
              onCheckedChange={(checked) => handleCheckboxChange('is_hazardous', checked === true)}
              disabled={disabled}
            />
            <Label
              htmlFor="is_hazardous"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1"
            >
              <AlertTriangle className="h-4 w-4" />
              Hazardous Material
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}