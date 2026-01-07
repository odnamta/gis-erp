import { redirect } from 'next/navigation'
import { getAssetCategories, getAssetLocations } from '@/lib/asset-actions'
import { AssetForm } from '@/components/equipment/asset-form'
import { createClient } from '@/lib/supabase/server'
import { canCreateAsset } from '@/lib/permissions'
import { UserProfile } from '@/types/permissions'

export default async function NewAssetPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile for permission check
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const profile = profileData as unknown as UserProfile | null

  if (!profile || !canCreateAsset(profile)) {
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
