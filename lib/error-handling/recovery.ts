/**
 * Recovery Service
 * Implements soft-delete with recovery and auto-purge functionality
 * 
 * Requirements:
 * - 4.1: Store complete record data as JSON when soft-deleted
 * - 4.2: Record source table, source ID, deleted_by, deletion timestamp
 * - 4.3: Restore record to original table with is_active=true
 * - 4.4: Record recovery timestamp and recovered_by user
 * - 4.5: Retain deleted records for 90 days before auto-purge
 * - 4.6: Return not found error if record not in deleted_records
 * - 8.2: Permanently delete records where purge_after has passed
 * - 8.3: Do not purge recovered records
 * - 8.4: Log count of purged records
 */

import { createClient } from '@/lib/supabase/client';
import type { DeletedRecord, DeletedRecordFilters } from '@/types/error-handling';
import { NotFoundError } from './errors';
import type { Json } from '@/types/database';

/** Retention period in days */
const RETENTION_DAYS = 90;

/**
 * Calculate purge date (90 days from now)
 * 
 * Requirement 4.5: Retain deleted records for 90 days
 */
export function calculatePurgeDate(deletedAt: Date = new Date()): string {
  const purgeDate = new Date(deletedAt);
  purgeDate.setDate(purgeDate.getDate() + RETENTION_DAYS);
  return purgeDate.toISOString().split('T')[0]; // Return date only (YYYY-MM-DD)
}

/**
 * Soft delete a record with recovery capability
 * Fetches the record, stores it in deleted_records, and sets is_active=false
 * 
 * Requirements: 4.1, 4.2, 4.5
 */
export async function softDeleteWithRecovery(
  table: string,
  id: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  const now = new Date();

  // Fetch the record to be deleted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: record, error: fetchError } = await (supabase as any)
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !record) {
    throw new NotFoundError(table, id);
  }

  // Store in deleted_records
  const { error: insertError } = await supabase.from('deleted_records').insert({
    deleted_at: now.toISOString(),
    deleted_by: userId,
    source_table: table,
    source_id: id,
    record_data: record as Json,
    purge_after: calculatePurgeDate(now),
  });

  if (insertError) {
    throw new Error(`Failed to store deleted record: ${insertError.message}`);
  }

  // Set is_active=false on the original record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from(table)
    .update({ is_active: false })
    .eq('id', id);

  if (updateError) {
    throw new Error(`Failed to soft delete record: ${updateError.message}`);
  }
}

/**
 * Recover a deleted record
 * Restores the record to its original table with is_active=true
 * 
 * Requirements: 4.3, 4.4, 4.6
 */
export async function recoverDeletedRecord(
  table: string,
  sourceId: string,
  userId: string
): Promise<Record<string, unknown>> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Find the deleted record
  const { data: deletedRecord, error: findError } = await supabase
    .from('deleted_records')
    .select('*')
    .eq('source_table', table)
    .eq('source_id', sourceId)
    .is('recovered_at', null)
    .single();

  if (findError || !deletedRecord) {
    throw new NotFoundError('Deleted record', `${table}/${sourceId}`);
  }

  // Restore the record with is_active=true
  const recordData = deletedRecord.record_data as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: restoreError } = await (supabase as any)
    .from(table)
    .update({ ...recordData, is_active: true })
    .eq('id', sourceId);

  if (restoreError) {
    throw new Error(`Failed to restore record: ${restoreError.message}`);
  }

  // Update deleted_records with recovery info
  const { error: updateError } = await supabase
    .from('deleted_records')
    .update({
      recovered_at: now,
      recovered_by: userId,
    })
    .eq('id', deletedRecord.id);

  if (updateError) {
    throw new Error(`Failed to update recovery info: ${updateError.message}`);
  }

  return recordData;
}

/**
 * Get deleted records with optional filters
 * 
 * Requirement 7.5
 */
export async function getDeletedRecords(
  filters?: DeletedRecordFilters
): Promise<DeletedRecord[]> {
  const supabase = createClient();

  let query = supabase
    .from('deleted_records')
    .select('*')
    .order('deleted_at', { ascending: false });

  if (filters?.sourceTable) {
    if (Array.isArray(filters.sourceTable)) {
      query = query.in('source_table', filters.sourceTable);
    } else {
      query = query.eq('source_table', filters.sourceTable);
    }
  }

  if (filters?.dateFrom) {
    query = query.gte('deleted_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('deleted_at', filters.dateTo);
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
    throw new Error(`Failed to get deleted records: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single deleted record by ID
 */
export async function getDeletedRecordById(id: string): Promise<DeletedRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deleted_records')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get deleted record: ${error.message}`);
  }

  return data;
}

/**
 * Purge expired records
 * Deletes records where purge_after has passed and recovered_at is null
 * 
 * Requirements: 8.2, 8.3, 8.4
 */
export async function purgeExpiredRecords(): Promise<number> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Get count of records to be purged
  const { data: toDelete, error: countError } = await supabase
    .from('deleted_records')
    .select('id')
    .lt('purge_after', today)
    .is('recovered_at', null);

  if (countError) {
    throw new Error(`Failed to count expired records: ${countError.message}`);
  }

  const count = toDelete?.length || 0;

  if (count === 0) {
    return 0;
  }

  // Delete expired records
  const { error: deleteError } = await supabase
    .from('deleted_records')
    .delete()
    .lt('purge_after', today)
    .is('recovered_at', null);

  if (deleteError) {
    throw new Error(`Failed to purge expired records: ${deleteError.message}`);
  }

  return count;
}

/**
 * Get deleted records grouped by table
 */
export async function getDeletedRecordsByTable(): Promise<
  Array<{ source_table: string; count: number }>
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('deleted_records')
    .select('source_table')
    .is('recovered_at', null);

  if (error) {
    throw new Error(`Failed to get deleted records by table: ${error.message}`);
  }

  // Group by source_table
  const grouped = (data || []).reduce(
    (acc, record) => {
      const table = record.source_table;
      acc[table] = (acc[table] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(grouped).map(([source_table, count]) => ({
    source_table,
    count,
  }));
}

/**
 * Get recovery statistics
 */
export async function getRecoveryStatistics(): Promise<{
  total_deleted: number;
  total_recovered: number;
  pending_purge: number;
}> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.from('deleted_records').select('recovered_at, purge_after');

  if (error) {
    throw new Error(`Failed to get recovery statistics: ${error.message}`);
  }

  const records = data || [];
  const total_deleted = records.length;
  const total_recovered = records.filter((r) => r.recovered_at !== null).length;
  const pending_purge = records.filter(
    (r) => r.recovered_at === null && r.purge_after && r.purge_after < today
  ).length;

  return {
    total_deleted,
    total_recovered,
    pending_purge,
  };
}
