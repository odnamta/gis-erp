'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarHeader } from './calendar-header'
import { CalendarCell } from './calendar-cell'
import { AssignmentDialog } from './assignment-dialog'
import { ResourceTypeBadge } from '@/components/ui/resource-status-badge'
import {
  CalendarData,
  CalendarCell as CalendarCellType,
  EngineeringResource,
  ResourceType,
} from '@/types/resource-scheduling'
import { getCalendarData } from '@/lib/resource-scheduling-actions'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns'
import Link from 'next/link'

interface ResourceCalendarProps {
  initialData?: CalendarData
}

export function ResourceCalendar({ initialData }: ResourceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all')
  const [calendarData, setCalendarData] = useState<CalendarData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [selectedCell, setSelectedCell] = useState<{
    resource: EngineeringResource
    date: string
    cell: CalendarCellType
  } | null>(null)

  useEffect(() => {
    loadCalendarData()
  }, [currentDate, viewMode, resourceTypeFilter])

  const loadCalendarData = async () => {
    setLoading(true)
    try {
      const dateRange = getDateRange()
      const filters = resourceTypeFilter !== 'all'
        ? { resource_types: [resourceTypeFilter as ResourceType] }
        : undefined

      const data = await getCalendarData(dateRange, filters)
      setCalendarData(data)
    } catch (error) {
      console.error('Failed to load calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      }
    }
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    }
  }

  const getCell = (resourceId: string, date: string): CalendarCellType | undefined => {
    if (!calendarData?.cells) return undefined
    const cells = calendarData.cells as unknown as Map<string, CalendarCellType>
    if (cells instanceof Map) {
      return cells.get(`${resourceId}_${date}`)
    }
    // Handle if cells is an object
    return (calendarData.cells as any)[`${resourceId}_${date}`]
  }

  const handleCellClick = (resource: EngineeringResource, date: string) => {
    const cell = getCell(resource.id, date)
    if (cell) {
      setSelectedCell({ resource, date, cell })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const dates = calendarData?.dates || []
  const resources = calendarData?.resources || []

  // Group resources by type
  const groupedResources = resources.reduce((acc, resource) => {
    const type = resource.resource_type
    if (!acc[type]) acc[type] = []
    acc[type].push(resource)
    return acc
  }, {} as Record<ResourceType, EngineeringResource[]>)

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CalendarHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            resourceTypeFilter={resourceTypeFilter}
            onResourceTypeFilterChange={setResourceTypeFilter}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row with dates */}
              <div className="flex border-b sticky top-0 bg-background z-10">
                <div className="w-48 flex-shrink-0 p-2 font-medium border-r">Resource</div>
                {dates.map((date) => {
                  const d = new Date(date)
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  const isToday = format(new Date(), 'yyyy-MM-dd') === date
                  return (
                    <div
                      key={date}
                      className={`flex-1 min-w-[80px] p-2 text-center text-sm border-r ${
                        isWeekend ? 'bg-muted/50' : ''
                      } ${isToday ? 'bg-primary/10 font-bold' : ''}`}
                    >
                      <div>{format(d, 'EEE')}</div>
                      <div className="text-muted-foreground">{format(d, 'd')}</div>
                    </div>
                  )
                })}
              </div>

              {/* Resource rows grouped by type */}
              {Object.entries(groupedResources).map(([type, typeResources]) => (
                <div key={type}>
                  {/* Type header */}
                  <div className="flex border-b bg-muted/30">
                    <div className="w-48 flex-shrink-0 p-2 font-medium border-r">
                      <ResourceTypeBadge type={type as ResourceType} />
                    </div>
                    <div className="flex-1" />
                  </div>

                  {/* Resources of this type */}
                  {typeResources.map((resource) => (
                    <div key={resource.id} className="flex border-b hover:bg-muted/20">
                      <div className="w-48 flex-shrink-0 p-2 border-r">
                        <Link
                          href={`/engineering/resources/${resource.id}`}
                          className="font-medium hover:underline text-sm"
                        >
                          {resource.resource_name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">
                          {resource.resource_code}
                        </div>
                      </div>
                      {dates.map((date) => {
                        const cell = getCell(resource.id, date)
                        const d = new Date(date)
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6

                        if (!cell) {
                          return (
                            <div
                              key={date}
                              className={`flex-1 min-w-[80px] border-r ${
                                isWeekend ? 'bg-muted/30' : ''
                              }`}
                            />
                          )
                        }

                        return (
                          <div key={date} className="flex-1 min-w-[80px]">
                            <CalendarCell
                              cell={cell}
                              onClick={() => handleCellClick(resource, date)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ))}

              {resources.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No resources found. Add resources to see them in the calendar.
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-t flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border rounded" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border rounded" />
              <span>Partially Assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border rounded" />
              <span>High Utilization (75%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border rounded" />
              <span>Over-allocated (100%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border rounded" />
              <span>Unavailable</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      {selectedCell && (
        <AssignmentDialog
          open={!!selectedCell}
          onOpenChange={(open) => !open && setSelectedCell(null)}
          resource={selectedCell.resource}
          date={selectedCell.date}
          cell={selectedCell.cell}
          onSuccess={() => {
            setSelectedCell(null)
            loadCalendarData()
          }}
        />
      )}
    </>
  )
}
