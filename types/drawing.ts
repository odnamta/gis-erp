// Engineering Drawing Management Types

// Drawing category type
export interface DrawingCategory {
  id: string;
  category_code: string;
  category_name: string;
  description: string | null;
  numbering_prefix: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

// Drawing status type
export type DrawingStatus = 
  | 'draft' 
  | 'for_review' 
  | 'for_approval' 
  | 'approved' 
  | 'issued' 
  | 'superseded';

// Drawing file type
export type DrawingFileType = 'dwg' | 'pdf' | 'dxf';

// Change reason type
export type ChangeReason = 
  | 'initial' 
  | 'client_request' 
  | 'design_change' 
  | 'correction' 
  | 'as_built';

// Transmittal purpose type
export type TransmittalPurpose = 
  | 'for_approval' 
  | 'for_construction' 
  | 'for_information' 
  | 'for_review' 
  | 'as_built';

// Transmittal status type
export type TransmittalStatus = 'draft' | 'sent' | 'acknowledged';

// Distribution list item
export interface DistributionItem {
  name: string;
  company: string;
  email: string;
  copies: number;
}

// Main drawing interface
export interface Drawing {
  id: string;
  drawing_number: string;
  category_id: string;
  project_id: string | null;
  job_order_id: string | null;
  assessment_id: string | null;
  route_survey_id: string | null;
  jmp_id: string | null;
  title: string;
  description: string | null;
  scale: string | null;
  paper_size: string;
  current_revision: string;
  revision_count: number;
  file_url: string | null;
  file_type: DrawingFileType | null;
  file_size_kb: number | null;
  thumbnail_url: string | null;
  status: DrawingStatus;
  drafted_by: string | null;
  drafted_at: string | null;
  checked_by: string | null;
  checked_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  issued_by: string | null;
  issued_at: string | null;
  distribution_list: DistributionItem[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Drawing with joined data
export interface DrawingWithDetails extends Drawing {
  category?: DrawingCategory;
  project?: { id: string; name: string };
  job_order?: { id: string; jo_number: string };
  drafted_by_employee?: { id: string; full_name: string };
  checked_by_employee?: { id: string; full_name: string };
  approved_by_employee?: { id: string; full_name: string };
  issued_by_employee?: { id: string; full_name: string };
}

// Drawing revision interface
export interface DrawingRevision {
  id: string;
  drawing_id: string;
  revision_number: string;
  revision_date: string;
  change_description: string;
  change_reason: ChangeReason | null;
  file_url: string | null;
  drafted_by: string | null;
  checked_by: string | null;
  approved_by: string | null;
  is_current: boolean;
  created_at: string;
}

// Drawing revision with employee details
export interface DrawingRevisionWithDetails extends DrawingRevision {
  drafted_by_employee?: { id: string; full_name: string };
  checked_by_employee?: { id: string; full_name: string };
  approved_by_employee?: { id: string; full_name: string };
}

// Transmittal drawing item
export interface TransmittalDrawingItem {
  drawing_id: string;
  drawing_number: string;
  title: string;
  revision: string;
  copies: number;
}

// Drawing transmittal interface
export interface DrawingTransmittal {
  id: string;
  transmittal_number: string;
  recipient_company: string;
  recipient_name: string | null;
  recipient_email: string | null;
  purpose: TransmittalPurpose;
  project_id: string | null;
  job_order_id: string | null;
  drawings: TransmittalDrawingItem[];
  cover_letter: string | null;
  status: TransmittalStatus;
  sent_at: string | null;
  sent_by: string | null;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
}

// Transmittal with joined data
export interface DrawingTransmittalWithDetails extends DrawingTransmittal {
  project?: { id: string; name: string };
  job_order?: { id: string; jo_number: string };
  sent_by_user?: { id: string; full_name: string };
}

// Form input types
export interface DrawingFormInput {
  category_id: string;
  project_id?: string;
  job_order_id?: string;
  assessment_id?: string;
  route_survey_id?: string;
  jmp_id?: string;
  title: string;
  description?: string;
  scale?: string;
  paper_size?: string;
}

export interface RevisionFormInput {
  change_description: string;
  change_reason?: ChangeReason;
}

export interface TransmittalFormInput {
  recipient_company: string;
  recipient_name?: string;
  recipient_email?: string;
  purpose: TransmittalPurpose;
  project_id?: string;
  job_order_id?: string;
  drawings: TransmittalDrawingItem[];
  cover_letter?: string;
  notes?: string;
}

// Filter types
export interface DrawingFilters {
  search?: string;
  category_id?: string;
  project_id?: string;
  status?: DrawingStatus;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Status transition map
export const VALID_STATUS_TRANSITIONS: Record<DrawingStatus, DrawingStatus[]> = {
  draft: ['for_review'],
  for_review: ['for_approval', 'draft'],
  for_approval: ['approved', 'for_review'],
  approved: ['issued'],
  issued: ['superseded'],
  superseded: [],
};

// Status labels for display
export const STATUS_LABELS: Record<DrawingStatus, string> = {
  draft: 'Draft',
  for_review: 'For Review',
  for_approval: 'For Approval',
  approved: 'Approved',
  issued: 'Issued',
  superseded: 'Superseded',
};

// Purpose labels for display
export const PURPOSE_LABELS: Record<TransmittalPurpose, string> = {
  for_approval: 'For Approval',
  for_construction: 'For Construction',
  for_information: 'For Information',
  for_review: 'For Review',
  as_built: 'As-Built',
};

// Change reason labels
export const CHANGE_REASON_LABELS: Record<ChangeReason, string> = {
  initial: 'Initial Issue',
  client_request: 'Client Request',
  design_change: 'Design Change',
  correction: 'Correction',
  as_built: 'As-Built Update',
};

// Valid file extensions
export const VALID_FILE_EXTENSIONS = ['dwg', 'pdf', 'dxf'];

// Paper sizes
export const PAPER_SIZES = ['A0', 'A1', 'A2', 'A3', 'A4'];
