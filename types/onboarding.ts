// =====================================================
// v0.36: ONBOARDING CHECKLIST SYSTEM TYPES
// =====================================================

export type OnboardingCategory = 'profile' | 'explore' | 'first_action' | 'advanced';
export type CompletionType = 'manual' | 'auto_route' | 'auto_action' | 'auto_count';
export type ProgressStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export const ONBOARDING_CATEGORIES: OnboardingCategory[] = ['profile', 'explore', 'first_action', 'advanced'];
export const COMPLETION_TYPES: CompletionType[] = ['manual', 'auto_route', 'auto_action', 'auto_count'];
export const PROGRESS_STATUSES: ProgressStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];

export const CATEGORY_LABELS: Record<OnboardingCategory, string> = {
  profile: 'Profile Setup',
  explore: 'Explore the System',
  first_action: 'First Actions',
  advanced: 'Advanced Features',
};

export const CATEGORY_ICONS: Record<OnboardingCategory, string> = {
  profile: '👤',
  explore: '🔍',
  first_action: '🎬',
  advanced: '🚀',
};

export interface OnboardingStep {
  id: string;
  step_code: string;
  step_name: string;
  description: string | null;
  category: OnboardingCategory;
  step_order: number;
  applicable_roles: string[];
  completion_type: CompletionType;
  completion_route: string | null;
  completion_action: string | null;
  completion_count: number;
  completion_table: string | null;
  icon: string | null;
  action_label: string | null;
  action_route: string | null;
  points: number;
  badge_on_complete: string | null;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
}

export interface OnboardingProgress {
  id: string;
  user_id: string;
  step_id: string;
  status: ProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  current_count: number;
  created_at: string;
}

export interface OnboardingStatus {
  id: string;
  user_id: string;
  total_steps: number;
  completed_steps: number;
  skipped_steps: number;
  total_points: number;
  is_onboarding_complete: boolean;
  onboarding_completed_at: string | null;
  show_onboarding_widget: boolean;
  show_welcome_modal: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProgressWithStep extends OnboardingProgress {
  step: OnboardingStep;
}

export interface UserOnboardingData {
  status: OnboardingStatus | null;
  steps: OnboardingProgressWithStep[];
  stepsByCategory: Record<OnboardingCategory, OnboardingProgressWithStep[]>;
  nextSteps: OnboardingProgressWithStep[];
  percentComplete: number;
}

export interface OnboardingStepCardProps {
  progress: OnboardingProgressWithStep;
  onAction?: () => void;
  showPoints?: boolean;
}

export interface OnboardingProgressBarProps {
  completed: number;
  total: number;
  points?: number;
  showPoints?: boolean;
}

export interface OnboardingWidgetProps {
  userId: string;
  onHide?: () => void;
  maxSteps?: number;
}
