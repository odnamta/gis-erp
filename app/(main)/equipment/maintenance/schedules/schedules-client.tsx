'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, CalendarClock } from 'lucide-react'
import { MaintenanceScheduleList } from '@/components/maintenance'
import { MaintenanceSchedule, MaintenanceType } from '@/types/maintenance'
import { Asset } from '@/types/assets'
import { getMaintenanceSchedules, getMaintenanceTypes, deleteMaintenanceSchedule } from '@/lib/maintenance-actions'
import { getAssets } from '@/lib/asset-actions'
import { useToast } from '@/hooks/use-toast'

export function SchedulesClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [schedulesData, assetsData, typesData] = await Promise.all([
        getMaintenanceSchedules(),
        getAssets({ search: '', categoryId: 'all', status: 'active', locationId: 'all' }),
        getMaintenanceTypes(),
      ])
      setSchedules(schedulesData)
      setAssets(assetsData)
      setMaintenanceTypes(typesData)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load maintenance schedules',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (scheduleId: string) => {
    router.push(`/equipment/maintenance/schedules/${scheduleId}/edit`)
  }

  const handleDelete = async (scheduleId: string) => {
    try {
      const result = await deleteMaintenanceSchedule(scheduleId)
      if (result.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId))
        toast({
          title: 'Success',
          description: 'Schedule deleted successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete schedule',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/equipment/maintenance')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalendarClock className="h-8 w-8" />
              Maintenance Schedules
            </h1>
            <p className="text-muted-foreground">
              Manage scheduled maintenance for your assets
            </p>
          </div>
        </div>
        <Button onClick={() => router.push('/equipment/maintenance/schedules/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Schedule
        </Button>
      </div>

      <MaintenanceScheduleList
        schedules={schedules}
        assets={assets}
        maintenanceTypes={maintenanceTypes}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
