// Engineering Flag System Types

export type EngineeringStatus =
  | 'not_required'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'waived';

export type AssessmentType =
  | 'route_survey'
  | 'technical_review'
  | 'permit_check'
  | 'jmp_creation';

export type AssessmentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type EngineeringDecision =
  | 'approved'
  | 'approved_with_conditions'
  | 'not_recommended'
  | 'rejected';

export interface EngineeringAssessment {
  id: string;
  pjo_id: string;
  assessment_type: AssessmentType;
  status: AssessmentStatus;
  assigned_to?: string | null;
  assigned_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  findings?: string | null;
  recommendations?: string | null;
  risk_level?: RiskLevel | null;
  attachment_urls: string[];
  additional_cost_estimate?: number | null;
  cost_justification?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngineeringReviewData {
  requires_engineering: boolean;
  engineering_status: EngineeringStatus;
  engineering_assigned_to?: string | null;
  engineering_assigned_at?: string | null;
  engineering_completed_at?: string | null;
  engineering_completed_by?: string | null;
  engineering_notes?: string | null;
  engineering_waived_reason?: string | null;
}

export interface AssessmentCompletionData {
  findings: string;
  recommendations: string;
  risk_level: RiskLevel;
  additional_cost_estimate?: number;
  cost_justification?: string;
}

export interface ReviewCompletionData {
  overall_risk_level: RiskLevel;
  decision: EngineeringDecision;
  engineering_notes: string;
  apply_additional_costs: boolean;
}

export interface ComplexityFactor {
  criteria_code: string;
  criteria_name: string;
  weight: number;
  detected_value?: string | number;
}

// Label constants for UI display
export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  route_survey: 'Route Survey',
  technical_review: 'Technical Review',
  permit_check: 'Permit Check',
  jmp_creation: 'JMP Creation',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ENGINEERING_STATUS_LABELS: Record<EngineeringStatus, string> = {
  not_required: 'Not Required',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  waived: 'Waived',
};

export const DECISION_LABELS: Record<EngineeringDecision, string> = {
  approved: 'Approved',
  approved_with_conditions: 'Approved with Conditions',
  not_recommended: 'Not Recommended',
  rejected: 'Rejected',
};

export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Complexity threshold for requiring engineering review
export const ENGINEERING_REQUIRED_THRESHOLD = 20;

// Complexity factor codes that trigger specific assessments
export const ROUTE_ASSESSMENT_FACTORS = ['new_route', 'challenging_terrain'];
export const PERMIT_ASSESSMENT_FACTORS = ['special_permits'];
export const JMP_ASSESSMENT_FACTORS = ['over_length', 'over_width', 'over_height'];
