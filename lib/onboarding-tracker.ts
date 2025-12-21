'use server';

// =====================================================
// v0.36: ONBOARDING ACTION TRACKER
// =====================================================
// Helper functions to track record creation for onboarding

import { trackAction } from './onboarding-actions';
import { createClient } from '@/lib/supabase/server';

/**
 * Track a record creation for onboarding purposes
 * Call this after successfully creating a record
 */
export async function trackRecordCreation(table: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    await trackAction(user.id, table, 'create');
  } catch (error) {
    // Silently fail - onboarding tracking should not break main functionality
    console.error('Error tracking record creation for onboarding:', error);
  }
}

/**
 * Track quotation creation
 */
export async function trackQuotationCreation(): Promise<void> {
  await trackRecordCreation('quotations');
}

/**
 * Track customer creation
 */
export async function trackCustomerCreation(): Promise<void> {
  await trackRecordCreation('customers');
}

/**
 * Track payment creation
 */
export async function trackPaymentCreation(): Promise<void> {
  await trackRecordCreation('payments');
}

/**
 * Track surat jalan creation
 */
export async function trackSuratJalanCreation(): Promise<void> {
  await trackRecordCreation('surat_jalan');
}

/**
 * Track BKK creation
 */
export async function trackBKKCreation(): Promise<void> {
  await trackRecordCreation('bkk');
}
