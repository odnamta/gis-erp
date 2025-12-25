/**
 * Validation Error Logger
 * Tracks validation errors for analysis and form improvement
 * 
 * Requirements:
 * - 5.1: Record entity_type, entity_id, field_name, field_value
 * - 5.2: Record validation_rule and error_message
 * - 5.3: Update corrected flag and corrected_at timestamp
 * - 5.4: Query by entity_type, field_name, date range
 */

import { createClient } from '@/lib/supabase/client';
import type { ValidationErrorFilters } from '@/types/error-handling';
import type { ValidationErrorRecord } from '@/types/validation-error';

/**
 * Log a validation error
 * 
 * Requirements: 5.1, 5.2
 */
export async function logValidationError(params: {
  entityType: string;
  entityId?: string;
  fieldName: string;
  fieldValue?: string;
  validationRule: string;
  errorMessage: string;
  userId?: string;
}): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('validation_errors')
    .insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      field_name: params.fieldName,
      field_value: params.fieldValue,
      validation_rule: params.validationRule,
      error_message: params.errorMessage,
      user_id: params.userId,
      corrected: false,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to log validation error: ${error.message}`);
  }

  return data.id;
}

/**
 * Mark a validation error as corrected
 * 
 * Requirement: 5.3
 */
export async function markValidationCorrected(errorId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('validation_errors')
    .update({
      corrected: true,
      corrected_at: new Date().toISOString(),
    })
    .eq('id', errorId);

  if (error) {
    throw new Error(`Failed to mark validation error as corrected: ${error.message}`);
  }
}

/**
 * Get validation errors with optional filters
 * 
 * Requirement: 5.4
 */
export async function getValidationErrors(
  filters?: ValidationErrorFilters
): Promise<ValidationErrorRecord[]> {
  const supabase = createClient();

  let query = supabase
    .from('validation_errors')
    .select('*')
    .order('timestamp', { ascending: false });

  if (filters?.entityType) {
    if (Array.isArray(filters.entityType)) {
      query = query.in('entity_type', filters.entityType);
    } else {
      query = query.eq('entity_type', filters.entityType);
    }
  }

  if (filters?.fieldName) {
    if (Array.isArray(filters.fieldName)) {
      query = query.in('field_name', filters.fieldName);
    } else {
      query = query.eq('field_name', filters.fieldName);
    }
  }

  if (filters?.dateFrom) {
    query = query.gte('timestamp', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('timestamp', filters.dateTo);
  }

  if (filters?.corrected !== undefined) {
    query = query.eq('corrected', filters.corrected);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get validation errors: ${error.message}`);
  }

  return data || [];
}

/**
 * Get validation error by ID
 */
export async function getValidationErrorById(
  errorId: string
): Promise<ValidationErrorRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('validation_errors')
    .select('*')
    .eq('id', errorId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get validation error: ${error.message}`);
  }

  return data;
}

/**
 * Get validation error statistics
 */
export async function getValidationErrorStatistics(): Promise<{
  total: number;
  corrected: number;
  uncorrected: number;
  byEntityType: Record<string, number>;
  byFieldName: Record<string, number>;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('validation_errors')
    .select('entity_type, field_name, corrected');

  if (error) {
    throw new Error(`Failed to get validation error statistics: ${error.message}`);
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
    total,
    corrected,
    uncorrected,
    byEntityType,
    byFieldName,
  };
}
