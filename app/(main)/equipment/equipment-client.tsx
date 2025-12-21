'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  AssetFilters,
  AssetTable,
  AssetSummaryCards,
} from '@/components/equipment'
import {
  AssetWithRelations,
  AssetFilterState,
  AssetSummaryStats,
  AssetCategory,
  AssetLocation,
  AssetStatus,
} from '@/types/assets'
import { calculateAssetSummaryStats } from '@/lib/asset-utils'
import {
  getAssets,
  getAssetCategories,
  getAssetLocations,
  getExpiringDocumentsCount,
} from '@/lib/asset-actions'
import { usePermissions } from '@/components/providers/permission-provider'

export function EquipmentClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canAccess } = usePermissions()

  const [assets, setAssets] = useState<AssetWithRelations[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [locations, setLocations] = useState<AssetLocation[]>([])
  const [stats, setStats] = useState<AssetSummaryStats>({
    total: 0,
    active: 0,
    maintenance: 0,
    idle: 0,
    totalBookValue: 0,
    expiringDocuments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AssetFilterState>({
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('category') || 'all',
    status: (searchParams.get('status') as AssetStatus | 'all') || 'all',
    locationId: searchParams.get('location') || 'all',
  })

  const canCreate = canAccess('assets.create')
  const canEdit = canAccess('assets.edit')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [assetsResult, categoriesResult, locationsResult, expiringCount] = await Promise.all([
        getAssets(filters),
        getAssetCategories(),
        getAssetLocations(),
        getExpiringDocumentsCount(),
      ])

      setAssets(assetsResult)
      setCategories(categoriesResult)
      setLocations(locationsResult)
      
      // Calculate stats from assets
      const calculatedStats = calculateAssetSummaryStats(
        assetsResult as unknown as import('@/types/assets').Asset[],
        expiringCount
      )
      setStats(calculatedStats)
    } catch (error) {
      console.error('Failed to load equipment:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.categoryId !== 'all') params.set('category', filters.categoryId)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.locationId !== 'all') params.set('location', filters.locationId)

    const queryString = params.toString()
    const newUrl = queryString ? `/equipment?${queryString}` : '/equipment'
    router.replace(newUrl, { scroll: false })
  }, [filters, router])

  const handleFilterChange = (newFilters: AssetFilterState) => {
    setFilters(newFilters)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
          <p className="text-muted-foreground">
            Manage company assets and equipment
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push('/equipment/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <AssetSummaryCards stats={stats} />

      {/* Filters */}
      <AssetFilters
        filters={filters}
        onFiltersChange={handleFilterChange}
        categories={categories}
        locations={locations}
      />

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading equipment...
        </div>
      ) : (
        <AssetTable assets={assets} canEdit={canEdit} />
      )}
    </div>
  )
}
