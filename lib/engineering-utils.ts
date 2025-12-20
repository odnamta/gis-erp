// Engineering Flag System Utility Functions

import {
  EngineeringStatus,
  AssessmentType,
  AssessmentStatus,
  EngineeringAssessment,
  ComplexityFactor,
  ENGINEERING_REQUIRED_THRESHOLD,
  ROUTE_ASSESSMENT_FACTORS,
  PERMIT_ASSESSMENT_FACTORS,
  JMP_ASSESSMENT_FACTORS,
} from '@/types/engineering';

/**
 * Check if a PJO requires engineering review based on complexity score
 * Property 1: For any complexity_score >= 20, returns true; otherwise false
 */
export function checkEngineeringRequired(complexityScore: number | null | undefined): boolean {
  if (complexityScore === null || complexityScore === undefined) {
    return false;
  }
  return complexityScore >= ENGINEERING_REQUIRED_THRESHOLD;
}

/**
 * Determine which assessments to create based on complexity factors
 * Property 5: Assessment creation based on complexity factors
 * - Always creates technical_review
 * - Creates route_survey if factors include new_route or challenging_terrain
 * - Creates permit_check if factors include special_permits
 * - Creates jmp_creation if factors include over_length, over_width, or over_height
 */
export function determineRequiredAssessments(
  complexityFactors: ComplexityFactor[] | null | undefined
): AssessmentType[] {
  const assessments: AssessmentType[] = ['technical_review'];
  
  if (!complexityFactors || complexityFactors.length === 0) {
    return assessments;
  }

  const factorCodes = complexityFactors.map(f => f.criteria_code);

  // Check for route survey factors
  if (factorCodes.some(code => ROUTE_ASSESSMENT_FACTORS.includes(code))) {
    assessments.push('route_survey');
  }

  // Check for permit check factors
  if (factorCodes.some(code => PERMIT_ASSESSMENT_FACTORS.includes(code))) {
    assessments.push('permit_check');
  }

  // Check for JMP creation factors
  if (factorCodes.some(code => JMP_ASSESSMENT_FACTORS.includes(code))) {
    assessments.push('jmp_creation');
  }

  return assessments;
}

/**
 * Calculate overall engineering status from assessments
 * Property 8: Engineering status calculation from assessments
 * - If all assessments are completed, status is 'completed'
 * - If any assessment is in_progress and none are pending, status is 'in_progress'
 * - Otherwise, status is 'pending'
 */
export function calculateEngineeringStatus(
  assessments: Pick<EngineeringAssessment, 'status'>[] | null | undefined
): EngineeringStatus {
  if (!assessments || assessments.length === 0) {
    return 'pending';
  }

  // Filter out cancelled assessments
  const activeAssessments = assessments.filter(a => a.status !== 'cancelled');
  
  if (activeAssessments.length === 0) {
    return 'pending';
  }

  const allCompleted = activeAssessments.every(a => a.status === 'completed');
  if (allCompleted) {
    return 'completed';
  }

  const anyInProgress = activeAssessments.some(a => a.status === 'in_progress');
  const nonePending = !activeAssessments.some(a => a.status === 'pending');
  
  if (anyInProgress && nonePending) {
    return 'in_progress';
  }

  return 'pending';
}

/**
 * Check if a PJO can be approved based on engineering status
 * Property 15: Approval blocking logic
 * - If requires_engineering is false, approval is allowed
 * - If requires_engineering is true and status is completed/waived, approval is allowed
 * - If requires_engineering is true and status is pending/in_progress, approval is blocked
 */
export function canApprovePJO(pjo: {
  requires_engineering: boolean | null;
  engineering_status: string | null;
}): { canApprove: boolean; reason?: string } {
  // If engineering is not required, allow approval
  if (!pjo.requires_engineering) {
    return { canApprove: true };
  }

  const status = pjo.engineering_status as EngineeringStatus;

  // If engineering is completed or waived, allow approval
  if (status === 'completed' || status === 'waived') {
    return { canApprove: true };
  }

  // Block approval with reason
  const statusLabel = status === 'in_progress' ? 'in progress' : status || 'pending';
  return {
    canApprove: false,
    reason: `Engineering review is ${statusLabel}. Must be completed or waived before approval.`,
  };
}

/**
 * Calculate total additional costs from completed assessments
 */
export function calculateTotalAdditionalCosts(
  assessments: Pick<EngineeringAssessment, 'status' | 'additional_cost_estimate'>[] | null | undefined
): number {
  if (!assessments || assessments.length === 0) {
    return 0;
  }

  return assessments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + (a.additional_cost_estimate || 0), 0);
}

/**
 * Get the highest risk level from assessments
 */
export function getHighestRiskLevel(
  assessments: Pick<EngineeringAssessment, 'status' | 'risk_level'>[] | null | undefined
): string | null {
  if (!assessments || assessments.length === 0) {
    return null;
  }

  const riskOrder = ['critical', 'high', 'medium', 'low'];
  const completedAssessments = assessments.filter(a => a.status === 'completed' && a.risk_level);

  for (const risk of riskOrder) {
    if (completedAssessments.some(a => a.risk_level === risk)) {
      return risk;
    }
  }

  return null;
}

/**
 * Check if user has permission to waive engineering review
 * Only managers and above can waive
 */
export function canWaiveEngineeringReview(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  const managerRoles = ['manager', 'super_admin', 'owner', 'admin'];
  return managerRoles.includes(userRole.toLowerCase());
}

/**
 * Check if user can complete engineering assessments
 * Engineering staff and managers can complete assessments
 */
export function canCompleteAssessment(
  userRole: string | null | undefined,
  userId: string | null | undefined,
  assignedTo: string | null | undefined
): boolean {
  if (!userRole || !userId) return false;
  
  // Managers can complete any assessment
  const managerRoles = ['manager', 'super_admin', 'owner', 'admin'];
  if (managerRoles.includes(userRole.toLowerCase())) {
    return true;
  }

  // Assigned user can complete their own assessment
  if (assignedTo && userId === assignedTo) {
    return true;
  }

  // Engineering role can complete assessments
  if (userRole.toLowerCase() === 'engineer' || userRole.toLowerCase() === 'engineering') {
    return true;
  }

  return false;
}

/**
 * Format complexity factors for display
 */
export function formatComplexityFactors(
  factors: ComplexityFactor[] | null | undefined
): string[] {
  if (!factors || factors.length === 0) {
    return [];
  }

  return factors.map(f => f.criteria_name);
}

/**
 * Get assessment completion percentage
 */
export function getAssessmentCompletionPercentage(
  assessments: Pick<EngineeringAssessment, 'status'>[] | null | undefined
): number {
  if (!assessments || assessments.length === 0) {
    return 0;
  }

  const activeAssessments = assessments.filter(a => a.status !== 'cancelled');
  if (activeAssessments.length === 0) {
    return 0;
  }

  const completed = activeAssessments.filter(a => a.status === 'completed').length;
  return Math.round((completed / activeAssessments.length) * 100);
}
