'use server';

/**
 * Recovery Server Actions
 * Server-side actions for deleted record recovery
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { DeletedRecordFilters } from '@/types/deleted-record';

/**
 * Get deleted records with optional filters
 */
export async function getDeletedRecordsAction(filters?: DeletedRecordFilters) {
  const supabase = await createClient();

  let query = supabase
    .from('deleted_records')
    .select('*')
    .order('deleted_at', { ascending: false });

  if (filters?.source_table) {
    if (Array.isArray(filters.source_table)) {
      query = query.in('source_table', filters.source_table);
    } else {
      query = query.eq('source_table', filters.source_table);
    }
  }

  if (filters?.from_date) {
    query = query.gte('deleted_at', filters.from_date);
  }

  if (filters?.to_date) {
    query = query.lte('deleted_at', filters.to_date);
  }

  if (filters?.recovered !== undefined) {
    if (filters.recovered) {
      query = query.not('recovered_at', 'is', null);
    } else {
      query = query.is('recovered_at', null);
    }
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
}

/**
 * Recover a deleted record
 */
export async function recoverRecordAction(
  sourceTable: string,
  sourceId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Find the deleted record
  const { data: deletedRecord, error: findError } = await supabase
    .from('deleted_records')
    .select('*')
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId)
    .is('recovered_at', null)
    .single();

  if (findError || !deletedRecord) {
    return { success: false, error: 'Deleted record not found' };
  }

  // Restore the record
  const recordData = deletedRecord.record_data as Record<string, unknown>;
  const { error: restoreError } = await supabase
    .from(sourceTable)
    .update({ ...recordData, is_active: true })
    .eq('id', sourceId);

  if (restoreError) {
    return { success: false, error: `Failed to restore: ${restoreError.message}` };
  }

  // Update deleted_records
  const { error: updateError } = await supabase
    .from('deleted_records')
    .update({
      recovered_at: new Date().toISOString(),
      recovered_by: user.id,
    })
    .eq('id', deletedRecord.id);

  if (updateError) {
    return { success: false, error: `Failed to update recovery info: ${updateError.message}` };
  }

  revalidatePath('/admin/recovery');
  return { success: true, error: null, data: recordData };
}

/**
 * Get deleted records grouped by table
 */
export async function getDeletedRecordsByTableAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('deleted_records')
    .select('source_table')
    .is('recovered_at', null);

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  const grouped = (data || []).reduce(
    (acc, record) => {
      const table = record.source_table;
      acc[table] = (acc[table] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const result = Object.entries(grouped).map(([source_table, count]) => ({
    source_table,
    count,
  }));

  return { success: true, error: null, data: result };
}

/**
 * Get recovery statistics
 */
export async function getRecoveryStatsAction() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('deleted_records')
    .select('recovered_at, purge_after');

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  const records = data || [];
  const total_deleted = records.length;
  const total_recovered = records.filter((r) => r.recovered_at !== null).length;
  const pending_purge = records.filter(
    (r) => r.recovered_at === null && r.purge_after < today
  ).length;

  return {
    success: true,
    error: null,
    data: { total_deleted, total_recovered, pending_purge },
  };
}
