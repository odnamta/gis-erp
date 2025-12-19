'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { VendorRating } from '@/types/vendors';

// Validation schema
const ratingSchema = z.object({
  overall_rating: z.number().int().min(1).max(5),
  punctuality_rating: z.number().int().min(1).max(5).optional().nullable(),
  quality_rating: z.number().int().min(1).max(5).optional().nullable(),
  communication_rating: z.number().int().min(1).max(5).optional().nullable(),
  price_rating: z.number().int().min(1).max(5).optional().nullable(),
  was_on_time: z.boolean().optional().nullable(),
  had_issues: z.boolean().default(false),
  issue_description: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
});

export type RatingFormInput = z.infer<typeof ratingSchema>;

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
 * Get all ratings for a vendor
 */
export async function getVendorRatings(vendorId: string): Promise<{
  data: VendorRating[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendor_ratings')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as VendorRating[] };
}

/**
 * Create a new rating for a vendor
 */
export async function rateVendor(
  vendorId: string,
  input: RatingFormInput,
  joId?: string,
  bkkId?: string
): Promise<{
  data?: VendorRating;
  error?: string;
}> {
  const validation = ratingSchema.safeParse(input);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const supabase = await createClient();
  const userProfileId = await getCurrentUserProfileId();

  const { data, error } = await supabase
    .from('vendor_ratings')
    .insert({
      vendor_id: vendorId,
      jo_id: joId || null,
      bkk_id: bkkId || null,
      overall_rating: input.overall_rating,
      punctuality_rating: input.punctuality_rating || null,
      quality_rating: input.quality_rating || null,
      communication_rating: input.communication_rating || null,
      price_rating: input.price_rating || null,
      was_on_time: input.was_on_time ?? null,
      had_issues: input.had_issues,
      issue_description: input.issue_description || null,
      comments: input.comments || null,
      rated_by: userProfileId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Update vendor metrics after rating
  await updateVendorMetricsFromRatings(vendorId);

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${vendorId}`);
  return { data: data as VendorRating };
}

/**
 * Update vendor metrics based on all ratings
 */
async function updateVendorMetricsFromRatings(vendorId: string): Promise<void> {
  const supabase = await createClient();

  // Get all ratings for this vendor
  const { data: ratings } = await supabase
    .from('vendor_ratings')
    .select('overall_rating, was_on_time')
    .eq('vendor_id', vendorId);

  if (!ratings || ratings.length === 0) return;

  // Calculate average rating
  const sum = ratings.reduce((acc, r) => acc + (r.overall_rating || 0), 0);
  const averageRating = Math.round((sum / ratings.length) * 100) / 100;

  // Calculate on-time rate
  const onTimeCount = ratings.filter((r) => r.was_on_time === true).length;
  const onTimeRate = Math.round((onTimeCount / ratings.length) * 100 * 100) / 100;

  // Update vendor
  await supabase
    .from('vendors')
    .update({
      average_rating: averageRating,
      on_time_rate: onTimeRate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vendorId);
}

/**
 * Delete a rating
 */
export async function deleteRating(
  ratingId: string,
  vendorId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendor_ratings')
    .delete()
    .eq('id', ratingId);

  if (error) {
    return { error: error.message };
  }

  // Update vendor metrics after deletion
  await updateVendorMetricsFromRatings(vendorId);

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${vendorId}`);
  return {};
}
