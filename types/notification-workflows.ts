// types/notification-workflows.ts
// TypeScript types for n8n Notification Workflows (v0.67)

// ============================================================================
// Enums and Type Aliases
// ============================================================================

export type NotificationChannel = 'email' | 'whatsapp' | 'in_app' | 'push';

export type EventType =
  | 'job_order.assigned'
  | 'job_order.status_changed'
  | 'invoice.sent'
  | 'invoice.overdue'
  | 'incident.created'
  | 'document.expiring'
  | 'maintenance.due'
  | 'approval.required';

// Alias for backward compatibility
export type NotificationEventType = EventType;

export type DigestFrequency = 'immediate' | 'hourly' | 'daily';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

// ============================================================================
// Placeholder Definition
// ============================================================================

export interface PlaceholderDefinition {
  key: string;
  description: string;
  default_value?: string;
}

// ============================================================================
// Notification Template
// ============================================================================

export interface NotificationTemplate {
  id: string;
  template_code: string;
  template_name: string;
  event_type: EventType;
  // Email template
  email_subject: string | null;
  email_body_html: string | null;
  email_body_text: string | null;
  // WhatsApp template
  whatsapp_template_id: string | null;
  whatsapp_body: string | null;
  // In-app notification
  in_app_title: string | null;
  in_app_body: string | null;
  in_app_action_url: string | null;
  // Push notification
  push_title: string | null;
  push_body: string | null;
  // Metadata
  placeholders: PlaceholderDefinition[];
  is_active: boolean;
  created_at: string;
}

export interface NotificationTemplateInsert {
  template_code: string;
  template_name: string;
  event_type: EventType;
  email_subject?: string | null;
  email_body_html?: string | null;
  email_body_text?: string | null;
  whatsapp_template_id?: string | null;
  whatsapp_body?: string | null;
  in_app_title?: string | null;
  in_app_body?: string | null;
  in_app_action_url?: string | null;
  push_title?: string | null;
  push_body?: string | null;
  placeholders?: PlaceholderDefinition[];
  is_active?: boolean;
}

export interface NotificationTemplateUpdate {
  template_name?: string;
  event_type?: EventType;
  email_subject?: string | null;
  email_body_html?: string | null;
  email_body_text?: string | null;
  whatsapp_template_id?: string | null;
  whatsapp_body?: string | null;
  in_app_title?: string | null;
  in_app_body?: string | null;
  in_app_action_url?: string | null;
  push_title?: string | null;
  push_body?: string | null;
  placeholders?: PlaceholderDefinition[];
  is_active?: boolean;
}

// ============================================================================
// Notification Workflow Preferences
// ============================================================================

export interface NotificationWorkflowPreference {
  id: string;
  user_id: string;
  event_type: EventType;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null; // TIME format HH:MM
  quiet_hours_end: string | null;
  digest_frequency: DigestFrequency;
  created_at: string;
  updated_at: string;
}

export interface NotificationWorkflowPreferenceInsert {
  user_id: string;
  event_type: EventType;
  email_enabled?: boolean;
  whatsapp_enabled?: boolean;
  in_app_enabled?: boolean;
  push_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  digest_frequency?: DigestFrequency;
}

export interface NotificationWorkflowPreferenceUpdate {
  email_enabled?: boolean;
  whatsapp_enabled?: boolean;
  in_app_enabled?: boolean;
  push_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  digest_frequency?: DigestFrequency;
}

// Default preference values
export const DEFAULT_PREFERENCE: Omit<NotificationWorkflowPreference, 'id' | 'user_id' | 'event_type' | 'created_at' | 'updated_at'> = {
  email_enabled: true,
  whatsapp_enabled: false,
  in_app_enabled: true,
  push_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  digest_frequency: 'immediate',
};

// ============================================================================
// Notification Log Entry
// ============================================================================

export interface NotificationLogEntry {
  id: string;
  template_id: string | null;
  recipient_user_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: NotificationChannel;
  subject: string | null;
  body: string | null;
  status: NotificationStatus;
  external_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface NotificationLogInsert {
  template_id?: string | null;
  recipient_user_id?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  channel: NotificationChannel;
  subject?: string | null;
  body?: string | null;
  status?: NotificationStatus;
  external_id?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  error_message?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface NotificationLogUpdate {
  status?: NotificationStatus;
  external_id?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  error_message?: string | null;
}

// ============================================================================
// Template Rendering
// ============================================================================

export interface RenderTemplateInput {
  template: NotificationTemplate;
  data: Record<string, string>;
  channel: NotificationChannel;
}

export interface RenderedNotification {
  channel: NotificationChannel;
  subject?: string;
  body: string;
  title?: string;
  action_url?: string;
  template_id?: string; // For WhatsApp
}

// ============================================================================
// Notification Sending
// ============================================================================

export interface SendNotificationInput {
  template_code: string;
  recipient_user_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  data: Record<string, string>;
  entity_type?: string;
  entity_id?: string;
}

export interface SendNotificationResult {
  success: boolean;
  channels_sent: NotificationChannel[];
  channels_skipped: NotificationChannel[];
  log_ids: string[];
  errors: Array<{ channel: NotificationChannel; error: string }>;
}

// ============================================================================
// Phone Validation
// ============================================================================

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string | null;
  error?: string;
}

// ============================================================================
// Statistics
// ============================================================================

export interface NotificationStats {
  total_sent: number;
  by_channel: Record<NotificationChannel, number>;
  by_status: Record<NotificationStatus, number>;
  success_rate: number;
  failure_rate: number;
  common_errors: Array<{ error: string; count: number }>;
}

export interface StatsFilter {
  start_date?: string;
  end_date?: string;
  event_type?: EventType;
  channel?: NotificationChannel;
}

// ============================================================================
// Event Trigger Payloads
// ============================================================================

export interface JobOrderAssignedPayload {
  jo_number: string;
  jo_id: string;
  customer_name: string;
  project_name: string;
  assigned_user_id: string;
}

export interface JobOrderStatusChangedPayload {
  jo_number: string;
  jo_id: string;
  old_status: string;
  new_status: string;
  stakeholder_user_ids: string[];
}

export interface InvoiceSentPayload {
  invoice_number: string;
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  due_date: string;
}

export interface InvoiceOverduePayload {
  invoice_number: string;
  invoice_id: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  due_date: string;
  days_overdue: string;
}

export interface IncidentCreatedPayload {
  incident_id: string;
  incident_type: string;
  severity: string;
  location: string;
  description: string;
  reporter_name: string;
  hse_manager_user_ids: string[];
}

export interface DocumentExpiringPayload {
  document_id: string;
  document_name: string;
  document_type: string;
  expiry_date: string;
  days_until_expiry: string;
  responsible_user_id: string;
}

export interface MaintenanceDuePayload {
  maintenance_id: string;
  asset_name: string;
  maintenance_type: string;
  due_date: string;
  last_maintenance_date: string;
  responsible_user_id: string;
}

export interface ApprovalRequiredPayload {
  approval_id: string;
  document_type: string;
  document_number: string;
  submitter_name: string;
  amount: string;
  approver_user_id: string;
}

// Union type for all event payloads
export type EventPayload =
  | JobOrderAssignedPayload
  | JobOrderStatusChangedPayload
  | InvoiceSentPayload
  | InvoiceOverduePayload
  | IncidentCreatedPayload
  | DocumentExpiringPayload
  | MaintenanceDuePayload
  | ApprovalRequiredPayload;

// ============================================================================
// Template Code Constants
// ============================================================================

export const TEMPLATE_CODES = {
  JO_ASSIGNED: 'JO_ASSIGNED',
  JO_STATUS_UPDATE: 'JO_STATUS_UPDATE',
  INVOICE_SENT: 'INVOICE_SENT',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',
  INCIDENT_REPORTED: 'INCIDENT_REPORTED',
  DOCUMENT_EXPIRING: 'DOCUMENT_EXPIRING',
  MAINTENANCE_DUE: 'MAINTENANCE_DUE',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
} as const;

export type TemplateCode = typeof TEMPLATE_CODES[keyof typeof TEMPLATE_CODES];

// ============================================================================
// Event Type Constants
// ============================================================================

export const EVENT_TYPES: EventType[] = [
  'job_order.assigned',
  'job_order.status_changed',
  'invoice.sent',
  'invoice.overdue',
  'incident.created',
  'document.expiring',
  'maintenance.due',
  'approval.required',
];

// Human-readable event type labels
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  'job_order.assigned': 'Job Order Assigned',
  'job_order.status_changed': 'Job Order Status Changed',
  'invoice.sent': 'Invoice Sent',
  'invoice.overdue': 'Invoice Overdue',
  'incident.created': 'Incident Created',
  'document.expiring': 'Document Expiring',
  'maintenance.due': 'Maintenance Due',
  'approval.required': 'Approval Required',
};

// ============================================================================
// Channel Constants
// ============================================================================

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['email', 'whatsapp', 'in_app', 'push'];

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  in_app: 'In-App',
  push: 'Push Notification',
};

// ============================================================================
// Status Constants
// ============================================================================

export const NOTIFICATION_STATUSES: NotificationStatus[] = ['pending', 'sent', 'delivered', 'failed', 'bounced'];

export const STATUS_LABELS: Record<NotificationStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  bounced: 'Bounced',
};

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  pending: ['sent', 'failed'],
  sent: ['delivered', 'failed', 'bounced'],
  delivered: [],
  failed: [],
  bounced: [],
};

// ============================================================================
// Digest Frequency Constants
// ============================================================================

export const DIGEST_FREQUENCIES: DigestFrequency[] = ['immediate', 'hourly', 'daily'];

export const DIGEST_FREQUENCY_LABELS: Record<DigestFrequency, string> = {
  immediate: 'Immediate',
  hourly: 'Hourly Digest',
  daily: 'Daily Digest',
};
