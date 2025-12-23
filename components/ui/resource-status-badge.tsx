'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ResourceType, AssignmentStatus, UnavailabilityType } from '@/types/resource-scheduling'

// Resource Type Badge
const resourceTypeConfig: Record<ResourceType, { label: string; className: string }> = {
  personnel: { label: 'Personnel', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  equipment: { label: 'Equipment', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  tool: { label: 'Tool', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  vehicle: { label: 'Vehicle', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
}

export function ResourceTypeBadge({ type }: { type: ResourceType }) {
  const config = resourceTypeConfig[type]
  return (
    <Badge variant="secondary" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}

// Assignment Status Badge
const assignmentStatusConfig: Record<AssignmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const config = assignmentStatusConfig[status]
  return (
    <Badge variant="secondary" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}

// Unavailability Type Badge
const unavailabilityTypeConfig: Record<UnavailabilityType, { label: string; className: string }> = {
  leave: { label: 'Leave', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  training: { label: 'Training', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  maintenance: { label: 'Maintenance', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  holiday: { label: 'Holiday', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
}

export function UnavailabilityTypeBadge({ type }: { type: UnavailabilityType }) {
  const config = unavailabilityTypeConfig[type]
  return (
    <Badge variant="secondary" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}

// Availability Badge
export function AvailabilityBadge({ isAvailable }: { isAvailable: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        isAvailable
          ? 'bg-green-100 text-green-800 hover:bg-green-100'
          : 'bg-red-100 text-red-800 hover:bg-red-100'
      )}
    >
      {isAvailable ? 'Available' : 'Unavailable'}
    </Badge>
  )
}

// Utilization Badge
export function UtilizationBadge({ percentage }: { percentage: number }) {
  let className = 'bg-green-100 text-green-800 hover:bg-green-100'
  if (percentage > 100) {
    className = 'bg-red-100 text-red-800 hover:bg-red-100'
  } else if (percentage >= 80) {
    className = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
  } else if (percentage >= 50) {
    className = 'bg-blue-100 text-blue-800 hover:bg-blue-100'
  }

  return (
    <Badge variant="secondary" className={cn('font-medium', className)}>
      {percentage.toFixed(0)}%
    </Badge>
  )
}
