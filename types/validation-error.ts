/**
 * Validation Error Types
 * Types for the validation error logging system
 */

/**
 * Validation error record from database
 */
export interface ValidationErrorRecord {
  id: string;
  timestamp: string;
  entity_type: string;
  entity_id: string | null;
  field_name: string;
  field_value: string | null;
  validation_rule: string;
  error_message: string;
  user_id: string | null;
  corrected: boolean;
  corrected_at: string | null;
}

/**
 * Validation error with user details
 */
export interface ValidationErrorWithUser extends ValidationErrorRecord {
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

/**
 * Input for logging a validation error
 */
export interface LogValidationErrorInput {
  entity_type: string;
  entity_id?: string | null;
  field_name: string;
  field_value?: string | null;
  validation_rule: string;
  error_message: string;
  user_id?: string | null;
}

/**
 * Input for marking a validation error as corrected
 */
export interface MarkCorrectedInput {
  id: string;
}

/**
 * Filters for querying validation errors
 */
export interface ValidationErrorFilters {
  entity_type?: string | string[];
  field_name?: string | string[];
  validation_rule?: string | string[];
  user_id?: string;
  corrected?: boolean;
  from_date?: string;
  to_date?: string;
  search?: string;
}

/**
 * Pagination options
 */
export interface ValidationErrorPaginationOptions {
  page?: number;
  page_size?: number;
  sort_by?: keyof ValidationErrorRecord;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedValidationErrorsResponse {
  data: ValidationErrorWithUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Validation error statistics
 */
export interface ValidationErrorStatistics {
  total_errors: number;
  corrected_errors: number;
  uncorrected_errors: number;
  by_entity_type: Record<string, number>;
  by_field_name: Record<string, number>;
  by_validation_rule: Record<string, number>;
  errors_today: number;
  errors_this_week: number;
  errors_this_month: number;
  correction_rate: number;
}

/**
 * Grouped validation errors by field
 */
export interface ValidationErrorsByField {
  field_name: string;
  entity_type: string;
  count: number;
  correction_rate: number;
  most_common_rule: string;
}

/**
 * Validation error trend data
 */
export interface ValidationErrorTrend {
  date: string;
  count: number;
  corrected_count: number;
}
