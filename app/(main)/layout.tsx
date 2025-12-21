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

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Ensure user profile exists and get it
  let userProfile: UserProfile | null = null
  if (user) {
    userProfile = await ensureUserProfile()
  }

  const userInfo: UserInfo | null = user ? {
    name: userProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
    email: user.email || '',
    avatarUrl: userProfile?.avatar_url || user.user_metadata?.avatar_url || null,
  } : null

  return (
    <PermissionProvider initialProfile={userProfile}>
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
          </div>
        </TourProvider>
      </PreviewProviderWrapper>
    </PermissionProvider>
  )
}
