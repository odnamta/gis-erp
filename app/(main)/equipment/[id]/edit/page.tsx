'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssetForm } from '@/components/equipment'
import {
  AssetWithRelations,
  AssetCategory,
  AssetLocation,
} from '@/types/assets'
import {
  getAssetById,
  getAssetCategories,
  getAssetLocations,
} from '@/lib/asset-actions'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/components/providers/permission-provider'

export default function EditAssetPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { canAccess } = usePermissions()

  const [asset, setAsset] = useState<AssetWithRelations | null>(null)
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [locations, setLocations] = useState<AssetLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const assetId = params.id as string
  const canEdit = canAccess('assets.edit')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [assetResult, categoriesResult, locationsResult] = await Promise.all([
          getAssetById(assetId),
          getAssetCategories(),
          getAssetLocations(),
        ])

        if (!assetResult) {
          toast({
            title: 'Error',
            description: 'Asset not found',
            variant: 'destructive',
          })
          router.push('/equipment')
          return
        }

        setAsset(assetResult)
        setCategories(categoriesResult)
        setLocations(locationsResult)
      } catch (error) {
        console.error('Failed to load asset:', error)
        toast({
          title: 'Error',
          description: 'Failed to load asset details',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [assetId, router, toast])

  // Check permission
  useEffect(() => {
    if (!isLoading && !canEdit) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to edit assets',
        variant: 'destructive',
      })
      router.push(`/equipment/${assetId}`)
    }
  }, [isLoading, canEdit, assetId, router, toast])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!asset || !canEdit) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/equipment/${assetId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Asset</h1>
          <p className="text-muted-foreground">
            {asset.asset_code} - {asset.asset_name}
          </p>
        </div>
      </div>

      {/* Form - uses existing asset data for edit mode */}
      <AssetForm
        mode="edit"
        asset={asset}
        categories={categories}
        locations={locations}
      />
    </div>
  )
}
