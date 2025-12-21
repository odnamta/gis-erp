// =====================================================
// v0.36: ONBOARDING FULL PAGE
// =====================================================

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserOnboardingProgress } from '@/lib/onboarding-actions';
import { OnboardingPageClient } from './onboarding-page-client';

export const metadata = {
  title: 'Getting Started | GAMA ERP',
  description: 'Complete your onboarding to get the most out of GAMA ERP',
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  // Get onboarding data
  const onboardingData = await getUserOnboardingProgress(user.id);

  return (
    <OnboardingPageClient
      userId={user.id}
      userName={profile?.full_name || user.email?.split('@')[0] || 'User'}
      initialData={onboardingData}
    />
  );
}
