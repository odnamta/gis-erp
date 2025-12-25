'use server';

/**
 * Validation Error Server Actions
 * Server-side actions for validation error management
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ValidationErrorFilters } from '@/types/validation-error';

/**
 * Get validation errors with optional filters
 */
export async function getValidationErrorsAction(filters?: ValidationErrorFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('validation_errors')
    .select('*')
    .order('timestamp', { ascending: false });

  if (filters?.entity_type) {
    if (Array.isArray(filters.entity_type)) {
      query = query.in('entity_type', filters.entity_type);
    } else {
      query = query.eq('entity_type', filters.entity_type);
    }
  }

  if (filters?.field_name) {
    if (Array.isArray(filters.field_name)) {
      query = query.in('field_name', filters.field_name);
    } else {
      query = query.eq('field_name', filters.field_name);
    }
  }

  if (filters?.from_date) {
    query = query.gte('timestamp', filters.from_date);
  }

  if (filters?.to_date) {
    query = query.lte('timestamp', filters.to_date);
  }

  if (filters?.corrected !== undefined) {
    query = query.eq('corrected', filters.corrected);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
}

/**
 * Mark a validation error as corrected
 */
export async function markCorrectedAction(errorId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('validation_errors')
    .update({
      corrected: true,
      corrected_at: new Date().toISOString(),
    })
    .eq('id', errorId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/validation-errors');
  return { success: true, error: null };
}

/**
 * Get validation error statistics
 */
export async function getValidationErrorStatsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('validation_errors')
    .select('entity_type, field_name, corrected');

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  const records = data || [];
  const total = records.length;
  const corrected = records.filter((r) => r.corrected).length;
  const uncorrected = total - corrected;

  const byEntityType = records.reduce(
    (acc, r) => {
      acc[r.entity_type] = (acc[r.entity_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byFieldName = records.reduce(
    (acc, r) => {
      acc[r.field_name] = (acc[r.field_name] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    success: true,
    error: null,
    data: { total, corrected, uncorrected, byEntityType, byFieldName },
  };
}
