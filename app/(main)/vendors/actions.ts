'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  Vendor,
  VendorWithStats,
  VendorType,
  VendorFilterState,
  VendorSummaryStats,
  VendorEquipment,
  EquipmentType,
  EquipmentCondition,
} from '@/types/vendors';
import { generateVendorCode } from '@/lib/vendor-utils';

// Validation schemas
const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.enum(['trucking', 'shipping', 'port', 'handling', 'forwarding', 'documentation', 'other']),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  website: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  contact_position: z.string().optional().nullable(),
  legal_name: z.string().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  business_license: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  bank_branch: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  bank_account_name: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  is_preferred: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export type VendorFormInput = z.infer<typeof vendorSchema>;

// Get current user profile ID
async function getCurrentUserProfileId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return profile?.id || null;
}

/**
 * Get all vendors with optional filters
 */
export async function getVendors(filters?: Partial<VendorFilterState>): Promise<{
  data: VendorWithStats[];
  error?: string;
}> {
  const supabase = await createClient();

  let query = supabase
    .from('vendors')
    .select(`
      *,
      vendor_equipment(count),
      vendor_ratings(count)
    `)
    .order('vendor_name');

  // Apply filters
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('vendor_type', filters.type);
  }

  if (filters?.status === 'active') {
    query = query.eq('is_active', true);
  } else if (filters?.status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (filters?.preferredOnly) {
    query = query.eq('is_preferred', true);
  }

  if (filters?.search) {
    query = query.or(`vendor_name.ilike.%${filters.search}%,vendor_code.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  // Transform the data to include counts
  // Cast vendor_type from string to VendorType since database returns string
  const vendors = (data || []).map((v) => ({
    ...v,
    vendor_type: v.vendor_type as VendorType,
    equipment_count: v.vendor_equipment?.[0]?.count || 0,
    ratings_count: v.vendor_ratings?.[0]?.count || 0,
  })) as unknown as VendorWithStats[];

  return { data: vendors };
}

/**
 * Get vendor by ID with full details
 */
export async function getVendorById(id: string): Promise<{
  data: VendorWithStats | null;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select(`
      *,
      vendor_equipment(*),
      vendor_ratings(count)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  const vendor = {
    ...data,
    vendor_type: data.vendor_type as VendorType,
    equipment: (data.vendor_equipment || []).map((e: Record<string, unknown>) => ({
      ...e,
      equipment_type: e.equipment_type as EquipmentType,
      condition: e.condition as EquipmentCondition,
    })) as VendorEquipment[],
    equipment_count: data.vendor_equipment?.length || 0,
    ratings_count: data.vendor_ratings?.[0]?.count || 0,
  } as unknown as VendorWithStats;

  return { data: vendor };
}

/**
 * Get vendors by type for dropdown (with preferred first)
 */
export async function getVendorsByType(type: VendorType): Promise<{
  data: Vendor[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('vendor_type', type)
    .eq('is_active', true)
    .order('is_preferred', { ascending: false })
    .order('average_rating', { ascending: false, nullsFirst: false })
    .order('vendor_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []).map(v => ({ ...v, vendor_type: v.vendor_type as VendorType })) as unknown as Vendor[] };
}

/**
 * Get active vendors for dropdown (all types)
 */
export async function getActiveVendors(): Promise<{
  data: Vendor[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_active', true)
    .order('is_preferred', { ascending: false })
    .order('vendor_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []).map(v => ({ ...v, vendor_type: v.vendor_type as VendorType })) as unknown as Vendor[] };
}

/**
 * Get vendor summary statistics
 */
export async function getVendorSummaryStats(): Promise<{
  data: VendorSummaryStats;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('is_active, is_preferred, is_verified');

  if (error) {
    return {
      data: { total: 0, active: 0, preferred: 0, pendingVerification: 0 },
      error: error.message,
    };
  }

  const stats: VendorSummaryStats = {
    total: data?.length || 0,
    active: data?.filter((v) => v.is_active).length || 0,
    preferred: data?.filter((v) => v.is_preferred).length || 0,
    pendingVerification: data?.filter((v) => !v.is_verified).length || 0,
  };

  return { data: stats };
}

/**
 * Create a new vendor
 */
export async function createVendor(input: VendorFormInput): Promise<{
  data?: Vendor;
  error?: string;
}> {
  const validation = vendorSchema.safeParse(input);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const supabase = await createClient();
  const userProfileId = await getCurrentUserProfileId();

  // Get current vendor count for code generation
  const { count } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true });

  const vendorCode = generateVendorCode(count || 0);

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      vendor_code: vendorCode,
      vendor_name: input.vendor_name,
      vendor_type: input.vendor_type,
      address: input.address || null,
      city: input.city || null,
      province: input.province || null,
      postal_code: input.postal_code || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      contact_person: input.contact_person || null,
      contact_phone: input.contact_phone || null,
      contact_email: input.contact_email || null,
      contact_position: input.contact_position || null,
      legal_name: input.legal_name || null,
      tax_id: input.tax_id || null,
      business_license: input.business_license || null,
      bank_name: input.bank_name || null,
      bank_branch: input.bank_branch || null,
      bank_account: input.bank_account || null,
      bank_account_name: input.bank_account_name || null,
      is_active: input.is_active,
      is_preferred: input.is_preferred,
      notes: input.notes || null,
      created_by: userProfileId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  return { data: data as unknown as Vendor };
}

/**
 * Update an existing vendor
 */
export async function updateVendor(
  id: string,
  input: VendorFormInput
): Promise<{ error?: string }> {
  const validation = vendorSchema.safeParse(input);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('vendors')
    .update({
      vendor_name: input.vendor_name,
      vendor_type: input.vendor_type,
      address: input.address || null,
      city: input.city || null,
      province: input.province || null,
      postal_code: input.postal_code || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      contact_person: input.contact_person || null,
      contact_phone: input.contact_phone || null,
      contact_email: input.contact_email || null,
      contact_position: input.contact_position || null,
      legal_name: input.legal_name || null,
      tax_id: input.tax_id || null,
      business_license: input.business_license || null,
      bank_name: input.bank_name || null,
      bank_branch: input.bank_branch || null,
      bank_account: input.bank_account || null,
      bank_account_name: input.bank_account_name || null,
      is_active: input.is_active,
      is_preferred: input.is_preferred,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${id}`);
  return {};
}

/**
 * Delete (deactivate) a vendor
 */
export async function deleteVendor(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Soft delete - set is_active to false
  const { error } = await supabase
    .from('vendors')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  return {};
}

/**
 * Restore a deactivated vendor
 */
export async function restoreVendor(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendors')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  return {};
}

/**
 * Verify a vendor
 */
export async function verifyVendor(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const userProfileId = await getCurrentUserProfileId();

  const { error } = await supabase
    .from('vendors')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: userProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${id}`);
  return {};
}

/**
 * Unverify a vendor
 */
export async function unverifyVendor(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendors')
    .update({
      is_verified: false,
      verified_at: null,
      verified_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${id}`);
  return {};
}

/**
 * Toggle preferred status
 */
export async function togglePreferredVendor(
  id: string,
  isPreferred: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendors')
    .update({
      is_preferred: isPreferred,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${id}`);
  return {};
}

/**
 * Update vendor metrics (called after BKK settlement or rating)
 */
export async function updateVendorMetrics(vendorId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Get all ratings for this vendor
  const { data: ratings } = await supabase
    .from('vendor_ratings')
    .select('overall_rating, was_on_time')
    .eq('vendor_id', vendorId);

  // Get BKK stats
  const { data: bkkStats } = await supabase
    .from('bukti_kas_keluar')
    .select('amount_spent')
    .eq('vendor_id', vendorId)
    .eq('status', 'settled');

  // Calculate metrics
  let averageRating: number | null = null;
  let onTimeRate: number | null = null;

  if (ratings && ratings.length > 0) {
    const sum = ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0);
    averageRating = Math.round((sum / ratings.length) * 100) / 100;

    const onTimeCount = ratings.filter((r) => r.was_on_time === true).length;
    onTimeRate = Math.round((onTimeCount / ratings.length) * 100 * 100) / 100;
  }

  const totalJobs = bkkStats?.length || 0;
  const totalValue = bkkStats?.reduce((sum, b) => sum + (Number(b.amount_spent) || 0), 0) || 0;

  // Update vendor
  const { error } = await supabase
    .from('vendors')
    .update({
      average_rating: averageRating,
      on_time_rate: onTimeRate,
      total_jobs: totalJobs,
      total_value: totalValue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vendorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${vendorId}`);
  return {};
}
