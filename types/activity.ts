/**
 * User Activity Tracking Types (v0.13.1)
 * 
 * Types for tracking user interactions including page views and key actions.
 * This is separate from the existing activity_log (document audit trail).
 */

export type ActionType = 
  | 'page_view' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'approve' 
  | 'reject';

export type ResourceType = 
  | 'customer' 
  | 'pjo' 
  | 'job_order' 
  | 'invoice' 
  | 'disbursement' 
  | 'employee' 
  | 'project' 
  | 'quotation';

export interface UserActivityLog {
  id: string;
  user_id: string;
  user_email: string | null;
  action_type: ActionType;
  resource_type: ResourceType | null;
  resource_id: string | null;
  page_path: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

export interface ActivityFilters {
  userId?: string;
  actionType?: ActionType | 'all';
  dateRange: 'today' | 'last_7_days' | 'last_30_days';
}

export interface DailyActivityCount {
  date: string;
  count: number;
}

export interface ActivityLogEntry {
  user_id: string;
  user_email?: string;
  action_type: ActionType;
  resource_type?: ResourceType;
  resource_id?: string;
  page_path?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}
