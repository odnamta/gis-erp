'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { Customer, Project } from '@/types'
import { ProjectStatus } from '@/components/ui/status-badge'

export const projectSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  name: z.string().min(1, 'Project name is required').refine(
    (val) => val.trim().length > 0,
    'Project name cannot be only whitespace'
  ),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  site_address: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>

export function validateProjectName(name: string): boolean {
  return name.trim().length > 0
}

interface ProjectFormProps {
  customers: Customer[]
  project?: Project | null
  preselectedCustomerId?: string
  onSubmit: (data: ProjectFormData) => Promise<void>
  isLoading: boolean
  mode: 'create' | 'edit'
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function ProjectForm({
  customers,
  project,
  preselectedCustomerId,
  onSubmit,
  isLoading,
  mode,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      customer_id: project?.customer_id || preselectedCustomerId || '',
      name: project?.name || '',
      status: (project?.status as ProjectStatus) || 'active',
      site_address: project?.description || '',
    },
  })

  const selectedCustomerId = watch('customer_id')
  const selectedStatus = watch('status')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer_id">Customer *</Label>
        <Select
          value={selectedCustomerId}
          onValueChange={(value) => setValue('customer_id', value)}
          disabled={isLoading || mode === 'edit'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.customer_id && (
          <p className="text-sm text-destructive">{errors.customer_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Project name"
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={selectedStatus}
          onValueChange={(value) => setValue('status', value as ProjectStatus)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="site_address">Site Address</Label>
        <Input
          id="site_address"
          {...register('site_address')}
          placeholder="Project site address"
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : mode === 'edit' ? (
          'Update Project'
        ) : (
          'Add Project'
        )}
      </Button>
    </form>
  )
}
