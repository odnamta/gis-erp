/**
 * Deleted Record Types
 * Types for the soft-delete recovery system
 */

/**
 * Deleted record from database
 */
export interface DeletedRecord {
  id: string;
  deleted_at: string;
  deleted_by: string | null;
  source_table: string;
  source_id: string;
  record_data: Record<string, unknown>;
  recovered_at: string | null;
  recovered_by: string | null;
  purge_after: string;
}

/**
 * Deleted record with user details
 */
export interface DeletedRecordWithUser extends DeletedRecord {
  deleter?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  recoverer?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

/**
 * Input for creating a deleted record entry
 */
export interface CreateDeletedRecordInput {
  source_table: string;
  source_id: string;
  record_data: Record<string, unknown>;
  deleted_by?: string | null;
}

/**
 * Input for recovering a deleted record
 */
export interface RecoverDeletedRecordInput {
  id: string;
  recovered_by: string;
}

/**
 * Filters for querying deleted records
 */
export interface DeletedRecordFilters {
  source_table?: string | string[];
  deleted_by?: string;
  from_date?: string;
  to_date?: string;
  recovered?: boolean;
  search?: string;
}

/**
 * Pagination options for deleted records
 */
export interface DeletedRecordPaginationOptions {
  page?: number;
  page_size?: number;
  sort_by?: keyof DeletedRecord;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response for deleted records
 */
export interface PaginatedDeletedRecordsResponse {
  data: DeletedRecordWithUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Statistics for deleted records
 */
export interface DeletedRecordStatistics {
  total_deleted: number;
  total_recovered: number;
  pending_purge: number;
  by_table: Record<string, number>;
  deleted_today: number;
  deleted_this_week: number;
  deleted_this_month: number;
}

/**
 * Grouped deleted records by table
 */
export interface DeletedRecordsByTable {
  source_table: string;
  count: number;
  records: DeletedRecordWithUser[];
}

/**
 * Purge result
 */
export interface PurgeResult {
  purged_count: number;
  purged_at: string;
  tables_affected: Record<string, number>;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  success: boolean;
  recovered_record: Record<string, unknown>;
  source_table: string;
  source_id: string;
  recovered_at: string;
}
