import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompanySettingsForm } from '@/components/settings/company-settings-form';
import { loadCompanySettings } from './actions';
import { DEFAULT_SETTINGS } from '@/types/company-settings';

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  
  // Check user role - only admin/owner can access
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    redirect('/dashboard');
  }
  
  // Load settings
  const result = await loadCompanySettings();
  const settings = result.success && result.data ? result.data : DEFAULT_SETTINGS;
  
  return <CompanySettingsForm initialSettings={settings} />;
}
