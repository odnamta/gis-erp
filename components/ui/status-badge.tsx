'use client'

import { cn } from '@/lib/utils'

export type ProjectStatus = 'draft' | 'active' | 'completed' | 'cancelled'

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
}

export function getStatusColor(status: ProjectStatus): string {
  return statusConfig[status]?.className || statusConfig.draft.className
}

export function getStatusLabel(status: ProjectStatus): string {
  return statusConfig[status]?.label || status
}

interface StatusBadgeProps {
  status: ProjectStatus | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const validStatus = (Object.keys(statusConfig).includes(status) ? status : 'draft') as ProjectStatus
  const config = statusConfig[validStatus]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
