export type TaskAssignmentStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type TaskAssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';

export const STATUS_LABELS: Record<TaskAssignmentStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  completed: 'Selesai',
};

export const STATUS_COLORS: Record<TaskAssignmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

export const PRIORITY_LABELS: Record<TaskAssignmentPriority, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
};

export const PRIORITY_COLORS: Record<TaskAssignmentPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export interface TaskAssignment {
  id: string;
  request_number: string;
  requester_id: string;
  employee_id: string;
  task_title: string;
  task_description: string;
  purpose: string;
  location: string;
  start_date: string;
  end_date: string;
  budget_allocation: number | null;
  priority: TaskAssignmentPriority;
  status: TaskAssignmentStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  completed_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  requester?: { id: string; full_name: string } | null;
  employee?: { id: string; full_name: string; employee_code?: string } | null;
  approver?: { id: string; full_name: string } | null;
}

export interface CreateTaskAssignmentInput {
  employee_id: string;
  task_title: string;
  task_description: string;
  purpose: string;
  location: string;
  start_date: string;
  end_date: string;
  budget_allocation?: number;
  priority?: TaskAssignmentPriority;
  notes?: string;
}

export interface TaskAssignmentFilters {
  status?: TaskAssignmentStatus | 'all';
  search?: string;
}
