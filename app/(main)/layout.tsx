import { Sidebar } from '@/components/layout/sidebar'
import { Header, UserInfo } from '@/components/layout/header'
import { Toaster } from '@/components/ui/toaster'
import { createClient } from '@/lib/supabase/server'
import { PermissionProvider } from '@/components/providers/permission-provider'
import { PreviewProviderWrapper } from '@/components/providers/preview-provider-wrapper'
import { ensureUserProfile } from '@/lib/permissions-server'
import { OnboardingRouteTracker } from '@/components/onboarding'
import { TourProvider } from '@/components/guided-tours'
import { PreferencesProvider } from '@/contexts/preferences-context'
import { getUserPreferences } from '@/app/(main)/settings/preferences/actions'
import { DEFAULT_PREFERENCES } from '@/types/user-preferences'
import { FeedbackButton } from '@/components/feedback'
import { TermsConditionsWrapper } from '@/components/terms-conditions-wrapper'
import { hasAcceptedCurrentTerms } from '@/lib/terms-conditions'
import { WelcomeWrapper } from '@/components/welcome-wrapper'
import { shouldShowWelcome } from '@/lib/welcome-content'

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

  // Check if user needs to accept Terms & Conditions
  // Requirements 5.1, 5.2, 5.3, 5.4: Check T&C acceptance status
  const needsTCAcceptance = user && userProfile 
    ? !hasAcceptedCurrentTerms(userProfile.tc_accepted_at, userProfile.tc_version)
    : false

  // Check if user needs to see Welcome modal (v0.86)
  // Requirements 6.1, 6.2: Welcome modal shows after T&C acceptance
  // Requirements 3.1, 3.2: Show welcome only if tc_accepted_at is set and welcome_shown_at is null
  const needsWelcome = user && userProfile 
    ? shouldShowWelcome({
        tc_accepted_at: userProfile.tc_accepted_at,
        welcome_shown_at: userProfile.welcome_shown_at,
      })
    : false

  return (
    <PermissionProvider initialProfile={userProfile}>
      <PreferencesProvider initialPreferences={initialPreferences}>
        <PreviewProviderWrapper>
          <TourProvider>
            {/* 
              Requirements 5.5, 5.6, 6.1, 6.2, 6.3: 
              Wrap content with T&C modal that blocks access until accepted
            */}
            <TermsConditionsWrapper needsAcceptance={needsTCAcceptance}>
              {/* 
                v0.86 Welcome Flow:
                Requirements 6.1, 6.2: Welcome modal shows after T&C acceptance (not simultaneously)
                Requirements 6.3, 6.4: Welcome modal is dismissible via button, backdrop click, or escape key
              */}
              <WelcomeWrapper needsWelcome={needsWelcome} role={userProfile?.role || 'ops'}>
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
              </WelcomeWrapper>
            </TermsConditionsWrapper>
          </TourProvider>
        </PreviewProviderWrapper>
      </PreferencesProvider>
    </PermissionProvider>
  )
}
