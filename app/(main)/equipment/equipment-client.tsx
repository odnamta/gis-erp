'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  AssetFilters,
  AssetVirtualTable,
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
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AssetFilterState>({
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('category') || 'all',
    status: (searchParams.get('status') as AssetStatus | 'all') || 'all',
    locationId: searchParams.get('location') || 'all',
  })

  // Prevent URL sync from firing on initial mount
  const isInitialMount = useRef(true)

  const canCreate = canAccess('assets.create')
  const canEdit = canAccess('assets.edit')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Use Promise.allSettled to prevent one failing request from blocking all data
    const results = await Promise.allSettled([
      getAssets(filters),
      getAssetCategories(),
      getAssetLocations(),
      getExpiringDocumentsCount(),
    ])

    const [assetsResult, categoriesResult, locationsResult, expiringResult] = results

    // Extract assets — this is the critical data
    let loadedAssets: AssetWithRelations[] = []
    if (assetsResult.status === 'fulfilled') {
      loadedAssets = assetsResult.value
    } else {
      console.error('Failed to load assets:', assetsResult.reason)
      setError('Gagal memuat data asset. Silakan coba lagi.')
    }
    setAssets(loadedAssets)

    // Extract categories (non-critical, used for filters)
    if (categoriesResult.status === 'fulfilled') {
      setCategories(categoriesResult.value)
    }

    // Extract locations (non-critical, used for filters)
    if (locationsResult.status === 'fulfilled') {
      setLocations(locationsResult.value)
    }

    // Calculate stats from loaded assets
    const expiringCount = expiringResult.status === 'fulfilled' ? expiringResult.value : 0
    const calculatedStats = calculateAssetSummaryStats(
      loadedAssets as import('@/types/assets').Asset[],
      expiringCount
    )
    setStats(calculatedStats)

    setLoading(false)
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Update URL when filters change (skip initial mount to avoid unnecessary router.replace)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

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
            Kelola aset dan peralatan perusahaan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
          {canCreate && (
            <Button onClick={() => router.push('/equipment/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Aset
            </Button>
          )}
        </div>
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

      {/* Error State */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Memuat data equipment...
        </div>
      ) : (
        <AssetVirtualTable assets={assets} canEdit={canEdit} />
      )}
    </div>
  )
}
