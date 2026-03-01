// Support Thread System — generic conversation threads for any entity
// Used by: competition_feedback, feedback_submissions, job_orders, etc.

export type ThreadStatus = 'open' | 'needs_clarification' | 'in_progress' | 'scoped' | 'resolved' | 'closed'
export type ThreadPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SenderType = 'user' | 'admin' | 'agent'

export interface SupportThread {
  id: string
  entity_type: string
  entity_id: string
  status: ThreadStatus
  priority: ThreadPriority
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Enriched
  message_count?: number
  unread_count?: number
  last_message?: SupportMessage | null
}

export interface SupportMessage {
  id: string
  thread_id: string
  sender_id: string
  sender_type: SenderType
  message: string
  metadata: Record<string, unknown>
  is_read: boolean
  created_at: string
  // Enriched
  sender_name?: string
  sender_avatar?: string
  sender_role?: string
}

export const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  open: 'Terbuka',
  needs_clarification: 'Perlu Klarifikasi',
  in_progress: 'Sedang Diproses',
  scoped: 'Siap Implementasi',
  resolved: 'Selesai',
  closed: 'Ditutup',
}

export const THREAD_STATUS_COLORS: Record<ThreadStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  needs_clarification: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-orange-100 text-orange-700',
  scoped: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}
