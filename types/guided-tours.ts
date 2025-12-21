/**
 * Guided Tours Types
 * v0.37: Training Mode / Guided Tours
 */

// Tour step placement options
export type TourStepPlacement = 'top' | 'bottom' | 'left' | 'right';

// Tour step action hints
export type TourStepAction = 'click' | 'input' | 'wait';

// Tour progress status
export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * A single step within a guided tour
 */
export interface TourStep {
  target: string;           // CSS selector for target element
  title: string;            // Step title
  content: string;          // Step description/instructions
  placement: TourStepPlacement;
  action?: TourStepAction;  // Optional action hint
  nextRoute?: string;       // Optional route to navigate to
}

/**
 * A guided tour definition
 */
export interface GuidedTour {
  id: string;
  tourCode: string;
  tourName: string;
  description: string | null;
  applicableRoles: string[];
  startRoute: string;
  steps: TourStep[];
  estimatedMinutes: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

/**
 * User's progress through a tour
 */
export interface TourProgress {
  id: string;
  userId: string;
  tourId: string;
  status: TourStatus;
  currentStep: number;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Combined tour with user's progress
 */
export interface TourWithProgress {
  tour: GuidedTour;
  progress: TourProgress | null;
}

/**
 * Database row type for guided_tours table
 */
export interface GuidedTourRow {
  id: string;
  tour_code: string;
  tour_name: string;
  description: string | null;
  applicable_roles: string[];
  start_route: string;
  steps: TourStep[];
  estimated_minutes: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

/**
 * Database row type for user_tour_progress table
 */
export interface TourProgressRow {
  id: string;
  user_id: string;
  tour_id: string;
  status: TourStatus;
  current_step: number;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Navigation state for tour controls
 */
export interface TourNavigationState {
  showBack: boolean;
  showNext: boolean;
  showFinish: boolean;
  showSkip: boolean;
}

/**
 * Result of advancing a tour step
 */
export interface AdvanceStepResult {
  step: TourStep | null;
  isComplete: boolean;
  stepIndex: number;
}

/**
 * Tour context value for React context
 */
export interface TourContextValue {
  isActive: boolean;
  currentTour: GuidedTour | null;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  startTour: (tourCode: string) => Promise<void>;
  nextStep: () => Promise<void>;
  prevStep: () => Promise<void>;
  skipTour: () => Promise<void>;
  endTour: () => void;
}
