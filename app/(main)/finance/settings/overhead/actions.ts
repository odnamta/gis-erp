'use server';

// Server actions for Overhead Category management (v0.26)

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  OverheadCategory,
  CreateOverheadCategoryInput,
  UpdateOverheadCategoryInput,
} from '@/types/overhead';
import {
  validateAllocationRate,
  validateCategoryCode,
  validateCategoryName,
} from '@/lib/overhead-utils';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';

/**
 * Get all overhead categories ordered by display_order
 */
export async function getOverheadCategories(): Promise<{
  data: OverheadCategory[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('overhead_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as OverheadCategory[], error: null };
  } catch {
    return { data: null, error: 'Failed to fetch overhead categories' };
  }
}

/**
 * Update overhead category rate
 */
export async function updateOverheadCategoryRate(
  categoryId: string,
  rate: number
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  try {
    const supabase = await createClient();

    // Validate rate
    const validation = validateAllocationRate(rate, 'revenue_percentage');
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid rate' };
    }

    const { error } = await supabase
      .from('overhead_categories')
      .update({ default_rate: rate })
      .eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/finance/settings/overhead');
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'Failed to update rate' };
  }
}

/**
 * Toggle overhead category active status
 */
export async function toggleOverheadCategoryActive(
  categoryId: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('overhead_categories')
      .update({ is_active: isActive })
      .eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/finance/settings/overhead');
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'Failed to toggle category status' };
  }
}

/**
 * Create a new overhead category
 */
export async function createOverheadCategory(
  input: CreateOverheadCategoryInput
): Promise<{ data: OverheadCategory | null; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { data: null, error: 'Tidak memiliki akses' };
  }

  try {
    const supabase = await createClient();

    // Validate category code
    const codeValidation = validateCategoryCode(input.category_code);
    if (!codeValidation.valid) {
      return { data: null, error: codeValidation.error || 'Invalid category code' };
    }

    // Validate category name
    const nameValidation = validateCategoryName(input.category_name);
    if (!nameValidation.valid) {
      return { data: null, error: nameValidation.error || 'Invalid category name' };
    }

    // Validate rate
    const rateValidation = validateAllocationRate(input.default_rate, input.allocation_method);
    if (!rateValidation.valid) {
      return { data: null, error: rateValidation.error || 'Invalid rate' };
    }

    // Get max display_order
    const { data: maxOrderData } = await supabase
      .from('overhead_categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('overhead_categories')
      .insert({
        category_code: input.category_code,
        category_name: input.category_name,
        description: input.description || null,
        allocation_method: input.allocation_method,
        default_rate: input.default_rate,
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? nextOrder,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'Category code already exists' };
      }
      return { data: null, error: error.message };
    }

    revalidatePath('/finance/settings/overhead');
    return { data: data as OverheadCategory, error: null };
  } catch {
    return { data: null, error: 'Failed to create category' };
  }
}

/**
 * Update an overhead category
 */
export async function updateOverheadCategory(
  categoryId: string,
  input: UpdateOverheadCategoryInput
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  try {
    const supabase = await createClient();

    // Validate name if provided
    if (input.category_name !== undefined) {
      const nameValidation = validateCategoryName(input.category_name);
      if (!nameValidation.valid) {
        return { success: false, error: nameValidation.error || 'Invalid category name' };
      }
    }

    // Validate rate if provided
    if (input.default_rate !== undefined && input.allocation_method) {
      const rateValidation = validateAllocationRate(input.default_rate, input.allocation_method);
      if (!rateValidation.valid) {
        return { success: false, error: rateValidation.error || 'Invalid rate' };
      }
    }

    const { error } = await supabase
      .from('overhead_categories')
      .update(input)
      .eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/finance/settings/overhead');
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'Failed to update category' };
  }
}

/**
 * Delete an overhead category
 */
export async function deleteOverheadCategory(
  categoryId: string
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('overhead_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/finance/settings/overhead');
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'Failed to delete category' };
  }
}

/**
 * Get total overhead rate (sum of active revenue_percentage categories)
 */
export async function getTotalOverheadRate(): Promise<{
  rate: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('overhead_categories')
      .select('default_rate')
      .eq('is_active', true)
      .eq('allocation_method', 'revenue_percentage');

    if (error) {
      return { rate: 0, error: error.message };
    }

    const totalRate = data?.reduce((sum, cat) => sum + (Number(cat.default_rate) || 0), 0) || 0;
    return { rate: totalRate, error: null };
  } catch {
    return { rate: 0, error: 'Failed to calculate total rate' };
  }
}
