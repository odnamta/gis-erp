'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarClock } from 'lucide-react'
import { MaintenanceScheduleForm } from '@/components/maintenance'
import { MaintenanceType } from '@/types/maintenance'
import { Asset } from '@/types/assets'
import { getMaintenanceTypes } from '@/lib/maintenance-actions'
import { getAssets } from '@/lib/asset-actions'

export function NewScheduleClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [assetsData, typesData] = await Promise.all([
        getAssets({ search: '', categoryId: 'all', status: 'active', locationId: 'all' }),
        getMaintenanceTypes(),
      ])
      setAssets(assetsData)
      setMaintenanceTypes(typesData)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleSuccess = () => {
    router.push('/equipment/maintenance/schedules')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div>
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-8 w-8" />
            New Maintenance Schedule
          </h1>
          <p className="text-muted-foreground">
            Create a scheduled maintenance for an asset
          </p>
        </div>
      </div>

      <MaintenanceScheduleForm
        assets={assets}
        maintenanceTypes={maintenanceTypes}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
