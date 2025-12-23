'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkillSelector } from './skill-selector'
import { CertificationEditor } from './certification-editor'
import {
  EngineeringResource,
  ResourceInput,
  ResourceType,
  Certification,
  RESOURCE_TYPE_LABELS,
} from '@/types/resource-scheduling'
import { createResource, updateResource } from '@/lib/resource-scheduling-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ResourceFormProps {
  resource?: EngineeringResource
  employees?: { id: string; full_name: string }[]
  assets?: { id: string; asset_code: string; asset_name: string }[]
}

export function ResourceForm({ resource, employees = [], assets = [] }: ResourceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [resourceType, setResourceType] = useState<ResourceType>(
    resource?.resource_type || 'personnel'
  )
  const [skills, setSkills] = useState<string[]>(resource?.skills || [])
  const [certifications, setCertifications] = useState<Certification[]>(
    resource?.certifications || []
  )
  const [isAvailable, setIsAvailable] = useState(resource?.is_available ?? true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ResourceInput>({
    defaultValues: {
      resource_type: resource?.resource_type || 'personnel',
      resource_name: resource?.resource_name || '',
      description: resource?.description || '',
      employee_id: resource?.employee_id || '',
      asset_id: resource?.asset_id || '',
      daily_capacity: resource?.daily_capacity || 8,
      hourly_rate: resource?.hourly_rate || undefined,
      daily_rate: resource?.daily_rate || undefined,
      base_location: resource?.base_location || '',
      is_available: resource?.is_available ?? true,
      unavailable_reason: resource?.unavailable_reason || '',
      unavailable_until: resource?.unavailable_until || '',
    },
  })

  const onSubmit = async (data: ResourceInput) => {
    setLoading(true)
    try {
      const input: ResourceInput = {
        ...data,
        resource_type: resourceType,
        skills,
        certifications,
        is_available: isAvailable,
        employee_id: resourceType === 'personnel' ? data.employee_id : undefined,
        asset_id: ['equipment', 'tool', 'vehicle'].includes(resourceType) ? data.asset_id : undefined,
      }

      if (resource) {
        await updateResource(resource.id, input)
        toast.success('Resource updated successfully')
      } else {
        await createResource(input)
        toast.success('Resource created successfully')
      }
      router.push('/engineering/resources')
      router.refresh()
    } catch (error) {
      toast.error(resource ? 'Failed to update resource' : 'Failed to create resource')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resource_type">Resource Type *</Label>
              <Select
                value={resourceType}
                onValueChange={(v) => setResourceType(v as ResourceType)}
                disabled={!!resource}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource_name">Resource Name *</Label>
              <Input
                id="resource_name"
                {...register('resource_name', { required: 'Name is required' })}
                placeholder="Enter resource name"
              />
              {errors.resource_name && (
                <p className="text-sm text-destructive">{errors.resource_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          {/* Link to Employee (for personnel) */}
          {resourceType === 'personnel' && employees.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="employee_id">Link to Employee</Label>
              <Select
                value={watch('employee_id') || ''}
                onValueChange={(v) => setValue('employee_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Link to Asset (for equipment/tool/vehicle) */}
          {['equipment', 'tool', 'vehicle'].includes(resourceType) && assets.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="asset_id">Link to Asset</Label>
              <Select
                value={watch('asset_id') || ''}
                onValueChange={(v) => setValue('asset_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_code} - {asset.asset_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity & Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily_capacity">Daily Capacity (hours)</Label>
              <Input
                id="daily_capacity"
                type="number"
                step="0.5"
                min="1"
                max="24"
                {...register('daily_capacity', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate (IDR)</Label>
              <Input
                id="hourly_rate"
                type="number"
                {...register('hourly_rate', { valueAsNumber: true })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_rate">Daily Rate (IDR)</Label>
              <Input
                id="daily_rate"
                type="number"
                {...register('daily_rate', { valueAsNumber: true })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_location">Base Location</Label>
            <Input
              id="base_location"
              {...register('base_location')}
              placeholder="Enter base location"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills & Certifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Skills</Label>
            <SkillSelector value={skills} onChange={setSkills} />
          </div>

          <div className="space-y-2">
            <Label>Certifications</Label>
            <CertificationEditor value={certifications} onChange={setCertifications} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Available for Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Toggle off if resource is temporarily unavailable
              </p>
            </div>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>

          {!isAvailable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unavailable_reason">Reason</Label>
                <Input
                  id="unavailable_reason"
                  {...register('unavailable_reason')}
                  placeholder="e.g., On leave, Under maintenance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unavailable_until">Available From</Label>
                <Input id="unavailable_until" type="date" {...register('unavailable_until')} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {resource ? 'Update Resource' : 'Create Resource'}
        </Button>
      </div>
    </form>
  )
}
