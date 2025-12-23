'use client'

import { cn } from '@/lib/utils'
import { CalendarCell as CalendarCellType, ResourceAssignment } from '@/types/resource-scheduling'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UnavailabilityTypeBadge } from '@/components/ui/resource-status-badge'

interface CalendarCellProps {
  cell: CalendarCellType
  onClick?: () => void
}

export function CalendarCell({ cell, onClick }: CalendarCellProps) {
  const utilizationPercent = cell.available_hours > 0
    ? (cell.assigned_hours / cell.available_hours) * 100
    : 0

  const getBackgroundClass = () => {
    if (!cell.is_available) {
      return 'bg-gray-200 dark:bg-gray-700'
    }
    if (utilizationPercent >= 100) {
      return 'bg-red-100 dark:bg-red-900/30'
    }
    if (utilizationPercent >= 75) {
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    }
    if (utilizationPercent > 0) {
      return 'bg-blue-100 dark:bg-blue-900/30'
    }
    return 'bg-green-50 dark:bg-green-900/20'
  }

  const getUtilizationBar = () => {
    if (!cell.is_available) return null
    const width = Math.min(utilizationPercent, 100)
    let barColor = 'bg-green-500'
    if (utilizationPercent >= 100) barColor = 'bg-red-500'
    else if (utilizationPercent >= 75) barColor = 'bg-yellow-500'
    else if (utilizationPercent > 0) barColor = 'bg-blue-500'

    return (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-600">
        <div className={cn('h-full', barColor)} style={{ width: `${width}%` }} />
      </div>
    )
  }

  const cellContent = (
    <div
      className={cn(
        'relative h-16 p-1 border-r border-b cursor-pointer transition-colors hover:opacity-80',
        getBackgroundClass()
      )}
      onClick={onClick}
    >
      {!cell.is_available ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-xs text-muted-foreground uppercase">
            {cell.unavailability_type?.slice(0, 3) || 'OFF'}
          </span>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {cell.assignments.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              {cell.assignments.slice(0, 2).map((assignment, idx) => (
                <div
                  key={assignment.id}
                  className="text-xs truncate px-1 py-0.5 mb-0.5 bg-primary/10 rounded"
                >
                  {assignment.task_description?.slice(0, 15) || 'Assignment'}
                </div>
              ))}
              {cell.assignments.length > 2 && (
                <span className="text-xs text-muted-foreground px-1">
                  +{cell.assignments.length - 2} more
                </span>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {cell.remaining_hours.toFixed(1)}h
              </span>
            </div>
          )}
        </div>
      )}
      {getUtilizationBar()}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{cell.date}</div>
            {!cell.is_available ? (
              <div className="flex items-center gap-2">
                <span>Unavailable:</span>
                {cell.unavailability_type && (
                  <UnavailabilityTypeBadge type={cell.unavailability_type} />
                )}
              </div>
            ) : (
              <>
                <div className="text-sm space-y-1">
                  <div>Available: {cell.available_hours}h</div>
                  <div>Assigned: {cell.assigned_hours.toFixed(1)}h</div>
                  <div>Remaining: {cell.remaining_hours.toFixed(1)}h</div>
                  <div>Utilization: {utilizationPercent.toFixed(0)}%</div>
                </div>
                {cell.assignments.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-xs font-medium mb-1">Assignments:</div>
                    {cell.assignments.map((a) => (
                      <div key={a.id} className="text-xs text-muted-foreground">
                        • {a.task_description || 'No description'}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
