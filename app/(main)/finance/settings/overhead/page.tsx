// Overhead Settings Page (v0.26)

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { profileHasRole } from '@/lib/auth-utils';
import { OverheadSettingsForm } from '@/components/overhead/overhead-settings-form';
import { getOverheadCategories, getTotalOverheadRate } from './actions';

export const metadata = {
  title: 'Overhead Settings | Gama ERP',
  description: 'Configure overhead allocation settings',
};

export default async function OverheadSettingsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Check user role - only finance and manager roles can access
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const allowedRoles = ['owner', 'admin', 'manager', 'finance'];
  if (!profileHasRole(profile as any, allowedRoles)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    redirect('/dashboard?error=unauthorized');
  }

  // Fetch overhead categories and total rate
  const [categoriesResult, rateResult] = await Promise.all([
    getOverheadCategories(),
    getTotalOverheadRate(),
  ]);

  const categories = categoriesResult.data || [];
  const totalRate = rateResult.rate || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overhead Allocation Settings</h1>
        <p className="text-muted-foreground">
          Configure how overhead costs are allocated to job orders for accurate profitability calculation.
        </p>
      </div>

      <OverheadSettingsForm
        initialCategories={categories}
        initialTotalRate={totalRate}
      />
    </div>
  );
}
