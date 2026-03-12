import { redirect } from 'next/navigation'
import { getAssetCategories, getAssetLocations } from '@/lib/asset-actions'
import { AssetForm } from '@/components/equipment/asset-form'
import { canCreateAsset } from '@/lib/permissions'
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export default async function NewAssetPage() {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/equipment');
  }

  if (!profile || !canCreateAsset(profile as import('@/types/permissions').UserProfile)) {
    redirect('/equipment')
  }

  // Fetch categories and locations
  const [categories, locations] = await Promise.all([
    getAssetCategories(),
    getAssetLocations(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Asset</h1>
        <p className="text-muted-foreground">
          Register a new equipment or asset
        </p>
      </div>

      <AssetForm
        categories={categories}
        locations={locations}
        mode="create"
      />
    </div>
  )
}
