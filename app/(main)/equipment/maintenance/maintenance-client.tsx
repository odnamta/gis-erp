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
} from '@/components/maintenance'
import {
  MaintenanceDashboardStats,
  UpcomingMaintenance,
  MaintenanceRecord,
  MaintenanceCostSummary as CostSummaryType,
  MaintenanceHistoryFilters,
  MaintenanceType,
} from '@/types/maintenance'
import { Asset } from '@/types/assets'
import {
  getMaintenanceDashboardStats,
  getUpcomingMaintenance,
  getMaintenanceHistory,
  getMaintenanceCostSummary,
  getMaintenanceTypes,
} from '@/lib/maintenance-actions'
import { getAssets } from '@/lib/asset-actions'

export function MaintenanceClient() {
  const router = useRouter()
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
      const [statsData, upcomingData, assetsData, typesData] = await Promise.all([
        getMaintenanceDashboardStats(),
        getUpcomingMaintenance(),
        getAssets({ search: '', categoryId: 'all', status: 'active', locationId: 'all' }),
        getMaintenanceTypes(),
      ])
      
      setStats(statsData)
      setUpcomingItems(upcomingData)
      setAssets(assetsData)
      setMaintenanceTypes(typesData)

      // Load cost summary for current year
      const currentYear = new Date().getFullYear()
      const costData = await getMaintenanceCostSummary(currentYear)
      setCostSummary(costData)
    } catch (error) {
      console.error('Failed to load maintenance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const records = await getMaintenanceHistory(historyFilters)
      setHistoryRecords(records)
    } catch (error) {
      console.error('Failed to load maintenance history:', error)
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
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="schedules" onClick={() => router.push('/equipment/maintenance/schedules')}>
            Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <UpcomingMaintenanceList
            items={upcomingItems}
            onLogCompletion={handleLogCompletion}
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
