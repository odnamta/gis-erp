'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Wrench } from 'lucide-react'
import {
  MaintenanceSummaryCards,
  UpcomingMaintenanceList,
  MaintenanceHistoryTable,
  MaintenanceCostSummary,
  MaintenanceScheduleList,
} from '@/components/maintenance'
import {
  MaintenanceDashboardStats,
  UpcomingMaintenance,
  MaintenanceRecord,
  MaintenanceCostSummary as CostSummaryType,
  MaintenanceHistoryFilters,
  MaintenanceType,
  MaintenanceSchedule,
} from '@/types/maintenance'
import { Asset } from '@/types/assets'
import {
  getMaintenanceDashboardStats,
  getUpcomingMaintenance,
  getMaintenanceHistory,
  getMaintenanceCostSummary,
  getMaintenanceTypes,
  getMaintenanceSchedules,
  deleteMaintenanceSchedule,
} from '@/lib/maintenance-actions'
import { getAssets } from '@/lib/asset-actions'
import { useToast } from '@/hooks/use-toast'

export function MaintenanceClient() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [isLoading, setIsLoading] = useState(true)

  // Data states
  const [stats, setStats] = useState<MaintenanceDashboardStats>({
    overdueCount: 0,
    dueSoonCount: 0,
    inProgressCount: 0,
    costMTD: 0,
  })
  const [upcomingItems, setUpcomingItems] = useState<UpcomingMaintenance[]>([])
  const [historyRecords, setHistoryRecords] = useState<MaintenanceRecord[]>([])
  const [costSummary, setCostSummary] = useState<CostSummaryType[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([])
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [historyFilters, setHistoryFilters] = useState<MaintenanceHistoryFilters>({})

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [historyFilters, activeTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [statsData, upcomingData, assetsData, typesData, schedulesData] = await Promise.all([
        getMaintenanceDashboardStats(),
        getUpcomingMaintenance(),
        getAssets({ search: '', categoryId: 'all', status: 'active', locationId: 'all' }),
        getMaintenanceTypes(),
        getMaintenanceSchedules(),
      ])

      setStats(statsData)
      setUpcomingItems(upcomingData)
      setAssets(assetsData)
      setMaintenanceTypes(typesData)
      setSchedules(schedulesData)

      // Load cost summary for current year
      const currentYear = new Date().getFullYear()
      const costData = await getMaintenanceCostSummary(currentYear)
      setCostSummary(costData)
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const records = await getMaintenanceHistory(historyFilters)
      setHistoryRecords(records)
    } catch (error) {
    }
  }

  const handleLogCompletion = (scheduleId: string, assetId: string) => {
    router.push(`/equipment/maintenance/new?schedule=${scheduleId}&asset=${assetId}`)
  }

  const handleViewDetails = (recordId: string) => {
    router.push(`/equipment/maintenance/${recordId}`)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
  }

  const handleEditSchedule = (scheduleId: string) => {
    router.push(`/equipment/maintenance/schedules/${scheduleId}/edit`)
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const result = await deleteMaintenanceSchedule(scheduleId)
      if (result.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId))
        toast({
          title: 'Berhasil',
          description: 'Jadwal berhasil dihapus',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Gagal menghapus jadwal',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus jadwal',
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Equipment Maintenance
          </h1>
          <p className="text-muted-foreground">
            Track and manage maintenance schedules and service records
          </p>
        </div>
        <Button onClick={() => router.push('/equipment/maintenance/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Log Maintenance
        </Button>
      </div>

      <MaintenanceSummaryCards stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {(stats.overdueCount + stats.dueSoonCount) > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                {stats.overdueCount + stats.dueSoonCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="schedules">
            Jadwal
            {schedules.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                {schedules.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <UpcomingMaintenanceList
            items={upcomingItems}
            onLogCompletion={handleLogCompletion}
          />
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <div className="flex items-center justify-end mb-4">
            <Button variant="outline" onClick={() => router.push('/equipment/maintenance/schedules/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Jadwal Baru
            </Button>
          </div>
          <MaintenanceScheduleList
            schedules={schedules}
            assets={assets}
            maintenanceTypes={maintenanceTypes}
            onEdit={handleEditSchedule}
            onDelete={handleDeleteSchedule}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <MaintenanceHistoryTable
            records={historyRecords}
            assets={assets}
            maintenanceTypes={maintenanceTypes}
            filters={historyFilters}
            onFilterChange={setHistoryFilters}
            onExport={handleExport}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <MaintenanceCostSummary
            data={costSummary}
            title={`Maintenance Costs - ${new Date().getFullYear()}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
