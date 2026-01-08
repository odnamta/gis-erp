import { Sidebar } from '@/components/layout/sidebar'
import { Header, UserInfo } from '@/components/layout/header'
import { Toaster } from '@/components/ui/toaster'
import { createClient } from '@/lib/supabase/server'
import { PermissionProvider } from '@/components/providers/permission-provider'
import { PreviewProviderWrapper } from '@/components/providers/preview-provider-wrapper'
import { ensureUserProfile } from '@/lib/permissions-server'
import { UserProfile } from '@/types/permissions'
import { OnboardingRouteTracker } from '@/components/onboarding'
import { TourProvider } from '@/components/guided-tours'
import { PreferencesProvider } from '@/contexts/preferences-context'
import { getUserPreferences } from '@/app/(main)/settings/preferences/actions'
import { DEFAULT_PREFERENCES } from '@/types/user-preferences'
import { FeedbackButton } from '@/components/feedback'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Parallelize profile and preferences fetch - both depend on user but are independent of each other
  const [userProfile, prefsResult] = await Promise.all([
    user ? ensureUserProfile() : Promise.resolve(null),
    getUserPreferences(),
  ])

  const initialPreferences = prefsResult.success && prefsResult.data
    ? prefsResult.data
    : DEFAULT_PREFERENCES

  const userInfo: UserInfo | null = user ? {
    name: userProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
    email: user.email || '',
    avatarUrl: userProfile?.avatar_url || user.user_metadata?.avatar_url || null,
  } : null

  return (
    <PermissionProvider initialProfile={userProfile}>
      <PreferencesProvider initialPreferences={initialPreferences}>
        <PreviewProviderWrapper>
          <TourProvider>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header user={userInfo} />
                <main className="flex-1 overflow-auto bg-muted/30 p-6">{children}</main>
              </div>
              <Toaster />
              <OnboardingRouteTracker userId={userProfile?.id || null} />
              <FeedbackButton />
            </div>
          </TourProvider>
        </PreviewProviderWrapper>
      </PreferencesProvider>
    </PermissionProvider>
  )
}
