'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ResourceType, RESOURCE_TYPE_LABELS } from '@/types/resource-scheduling'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns'

interface CalendarHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  viewMode: 'week' | 'month'
  onViewModeChange: (mode: 'week' | 'month') => void
  resourceTypeFilter: string
  onResourceTypeFilterChange: (type: string) => void
}

export function CalendarHeader({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  resourceTypeFilter,
  onResourceTypeFilterChange,
}: CalendarHeaderProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })

  const goToPrevious = () => {
    if (viewMode === 'week') {
      onDateChange(subWeeks(currentDate, 1))
    } else {
      onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }
  }

  const goToNext = () => {
    if (viewMode === 'week') {
      onDateChange(addWeeks(currentDate, 1))
    } else {
      onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const getDateRangeLabel = () => {
    if (viewMode === 'week') {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'MMMM yyyy')
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={goToToday}>
          <Calendar className="h-4 w-4 mr-2" />
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="font-semibold ml-2">{getDateRangeLabel()}</span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={resourceTypeFilter} onValueChange={onResourceTypeFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as 'week' | 'month')}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
