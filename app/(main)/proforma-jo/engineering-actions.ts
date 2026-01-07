'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  determineRequiredAssessments,
  calculateEngineeringStatus,
  canApprovePJO as canApprovePJOUtil,
  calculateTotalAdditionalCosts,
  canWaiveEngineeringReview,
} from '@/lib/engineering-utils'
import {
  notifyEngineeringAssigned,
  notifyEngineeringCompleted,
  notifyEngineeringWaived,
} from '@/lib/notifications/notification-triggers'
import type {
  EngineeringAssessment,
  AssessmentType,
  RiskLevel,
  EngineeringDecision,
  ComplexityFactor,
} from '@/types/engineering'

/**
 * Initialize engineering review for a PJO
 * Creates default assessments based on complexity factors
 */
export async function initializeEngineeringReview(
  pjoId: string,
  assignedTo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Fetch PJO to get complexity factors
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('id, pjo_number, complexity_factors, requires_engineering, engineering_status')
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return { success: false, error: 'PJO not found' }
  }

  // Check if engineering review is already initialized
  if (pjo.engineering_status && pjo.engineering_status !== 'not_required') {
    return { success: false, error: 'Engineering review already initialized' }
  }

  const now = new Date().toISOString()

  // Update PJO with engineering assignment
  const { error: updateError } = await supabase
    .from('proforma_job_orders')
    .update({
      requires_engineering: true,
      engineering_status: 'pending',
      engineering_assigned_to: assignedTo,
      engineering_assigned_at: now,
      updated_at: now,
    })
    .eq('id', pjoId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Determine which assessments to create
  const complexityFactors = pjo.complexity_factors as ComplexityFactor[] | null
  const assessmentTypes = determineRequiredAssessments(complexityFactors)

  // Create assessment records
  const assessmentsToInsert = assessmentTypes.map(type => ({
    pjo_id: pjoId,
    assessment_type: type,
    status: 'pending',
    assigned_to: assignedTo,
    assigned_at: now,
  }))

  const { error: insertError } = await supabase
    .from('engineering_assessments')
    .insert(assessmentsToInsert)

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // Send notification to assigned user
  try {
    const complexityFactors = pjo.complexity_factors as unknown as ComplexityFactor[] | null
    const complexityScore = complexityFactors 
      ? complexityFactors.reduce((sum, f) => sum + (f.weight || 0), 0) 
      : undefined
    
    await notifyEngineeringAssigned({
      pjo_id: pjoId,
      pjo_number: pjo.pjo_number,
      assigned_to: assignedTo,
      complexity_score: complexityScore,
    })
  } catch (e) {
    console.error('Failed to send assignment notification:', e)
  }

  revalidatePath(`/proforma-jo/${pjoId}`)
  revalidatePath('/proforma-jo')

  return { success: true }
}

/**
 * Start an assessment (change status to in_progress)
 */
export async function startAssessment(
  assessmentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Fetch assessment
  const { data: assessment, error: fetchError } = await supabase
    .from('engineering_assessments')
    .select('id, pjo_id, status')
    .eq('id', assessmentId)
    .single()

  if (fetchError || !assessment) {
    return { success: false, error: 'Assessment not found' }
  }

  if (assessment.status !== 'pending') {
    return { success: false, error: 'Assessment is not in pending status' }
  }

  // Update assessment status
  const { error: updateError } = await supabase
    .from('engineering_assessments')
    .update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Update PJO engineering status
  if (assessment.pjo_id) {
    await updatePJOEngineeringStatus(assessment.pjo_id)
  }

  revalidatePath(`/proforma-jo/${assessment.pjo_id}`)

  return { success: true }
}

/**
 * Complete an assessment with findings
 */
export async function completeAssessment(
  assessmentId: string,
  data: {
    findings: string
    recommendations: string
    risk_level: RiskLevel
    additional_cost_estimate?: number
    cost_justification?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Validate required fields
  if (!data.findings?.trim()) {
    return { success: false, error: 'Findings are required' }
  }
  if (!data.recommendations?.trim()) {
    return { success: false, error: 'Recommendations are required' }
  }
  if (!data.risk_level) {
    return { success: false, error: 'Risk level is required' }
  }

  // Fetch assessment
  const { data: assessment, error: fetchError } = await supabase
    .from('engineering_assessments')
    .select('id, pjo_id, status')
    .eq('id', assessmentId)
    .single()

  if (fetchError || !assessment) {
    return { success: false, error: 'Assessment not found' }
  }

  if (assessment.status === 'completed') {
    return { success: false, error: 'Assessment is already completed' }
  }

  const now = new Date().toISOString()

  // Update assessment
  const { error: updateError } = await supabase
    .from('engineering_assessments')
    .update({
      findings: data.findings.trim(),
      recommendations: data.recommendations.trim(),
      risk_level: data.risk_level,
      additional_cost_estimate: data.additional_cost_estimate || null,
      cost_justification: data.cost_justification?.trim() || null,
      status: 'completed',
      completed_at: now,
      completed_by: user.id,
      updated_at: now,
    })
    .eq('id', assessmentId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Update PJO engineering status
  if (assessment.pjo_id) {
    await updatePJOEngineeringStatus(assessment.pjo_id)
  }

  revalidatePath(`/proforma-jo/${assessment.pjo_id}`)

  return { success: true }
}

/**
 * Complete the entire engineering review
 */
export async function completeEngineeringReview(
  pjoId: string,
  data: {
    overall_risk_level: RiskLevel
    decision: EngineeringDecision
    engineering_notes: string
    apply_additional_costs: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Validate required fields
  if (!data.overall_risk_level) {
    return { success: false, error: 'Overall risk level is required' }
  }
  if (!data.decision) {
    return { success: false, error: 'Decision is required' }
  }
  if (!data.engineering_notes?.trim()) {
    return { success: false, error: 'Engineering notes are required' }
  }

  // Fetch PJO
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('id, pjo_number, created_by, requires_engineering')
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return { success: false, error: 'PJO not found' }
  }

  if (!pjo.requires_engineering) {
    return { success: false, error: 'PJO does not require engineering review' }
  }

  const now = new Date().toISOString()

  // Update PJO engineering status
  const { error: updateError } = await supabase
    .from('proforma_job_orders')
    .update({
      engineering_status: 'completed',
      engineering_completed_at: now,
      engineering_completed_by: user.id,
      engineering_notes: data.engineering_notes.trim(),
      updated_at: now,
    })
    .eq('id', pjoId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Apply additional costs if requested
  if (data.apply_additional_costs) {
    const { data: assessments } = await supabase
      .from('engineering_assessments')
      .select('additional_cost_estimate, status')
      .eq('pjo_id', pjoId)

    const typedAssessments = (assessments || []) as Pick<EngineeringAssessment, 'status' | 'additional_cost_estimate'>[]
    const totalAdditionalCost = calculateTotalAdditionalCosts(typedAssessments)

    if (totalAdditionalCost > 0) {
      // Add cost item to PJO
      await supabase.from('pjo_cost_items').insert({
        pjo_id: pjoId,
        category: 'other',
        description: 'Engineering Assessment - Additional Costs',
        estimated_amount: totalAdditionalCost,
        notes: `Added from engineering review. Decision: ${data.decision}`,
        status: 'estimated',
      })

      // Update PJO total_cost_estimated
      const { data: allCosts } = await supabase
        .from('pjo_cost_items')
        .select('estimated_amount')
        .eq('pjo_id', pjoId)

      const newTotal = allCosts?.reduce((sum, c) => sum + c.estimated_amount, 0) || 0

      await supabase
        .from('proforma_job_orders')
        .update({ total_cost_estimated: newTotal })
        .eq('id', pjoId)
    }
  }

  // Send notification to PJO creator
  if (pjo.created_by) {
    try {
      await notifyEngineeringCompleted({
        pjo_id: pjoId,
        pjo_number: pjo.pjo_number,
        decision: data.decision,
        overall_risk_level: data.overall_risk_level,
        completed_by: user.id,
        created_by: pjo.created_by,
      })
    } catch (e) {
      console.error('Failed to send completion notification:', e)
    }
  }

  revalidatePath(`/proforma-jo/${pjoId}`)
  revalidatePath('/proforma-jo')

  return { success: true }
}

/**
 * Waive engineering review (Manager+ only)
 */
export async function waiveEngineeringReview(
  pjoId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Validate reason
  if (!reason?.trim()) {
    return { success: false, error: 'Waiver reason is required' }
  }

  // Check user role
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!canWaiveEngineeringReview(userProfile?.role)) {
    return { success: false, error: 'Only managers can waive engineering review' }
  }

  // Fetch PJO
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('id, pjo_number, engineering_status')
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return { success: false, error: 'PJO not found' }
  }

  if (pjo.engineering_status === 'completed') {
    return { success: false, error: 'Engineering review is already completed' }
  }

  const now = new Date().toISOString()

  // Update PJO
  const { error: updateError } = await supabase
    .from('proforma_job_orders')
    .update({
      engineering_status: 'waived',
      engineering_waived_reason: reason.trim(),
      engineering_completed_at: now,
      engineering_completed_by: user.id,
      updated_at: now,
    })
    .eq('id', pjoId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    action_type: 'engineering_waived',
    document_type: 'pjo',
    document_id: pjoId,
    document_number: pjo.pjo_number,
    user_id: user.id,
    user_name: user.email || 'Unknown User',
    details: { reason: reason.trim() },
  })

  // Send notification to managers
  try {
    await notifyEngineeringWaived({
      pjo_id: pjoId,
      pjo_number: pjo.pjo_number,
      waived_by: user.id,
      waived_reason: reason.trim(),
    })
  } catch (e) {
    console.error('Failed to send waiver notification:', e)
  }

  revalidatePath(`/proforma-jo/${pjoId}`)
  revalidatePath('/proforma-jo')

  return { success: true }
}

/**
 * Fetch engineering assessments for a PJO
 */
export async function getEngineeringAssessments(
  pjoId: string
): Promise<{ data: EngineeringAssessment[] | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('engineering_assessments')
    .select(`
      *,
      assigned_user:user_profiles!engineering_assessments_assigned_to_fkey(id, full_name, email),
      completed_user:user_profiles!engineering_assessments_completed_by_fkey(id, full_name, email)
    `)
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as EngineeringAssessment[] }
}

/**
 * Add a new assessment to an existing engineering review
 */
export async function addAssessment(
  pjoId: string,
  assessmentType: AssessmentType,
  assignedTo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Check if PJO has engineering review
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select('requires_engineering, engineering_status')
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return { success: false, error: 'PJO not found' }
  }

  if (!pjo.requires_engineering) {
    return { success: false, error: 'PJO does not have engineering review' }
  }

  if (pjo.engineering_status === 'completed' || pjo.engineering_status === 'waived') {
    return { success: false, error: 'Engineering review is already completed' }
  }

  const now = new Date().toISOString()

  // Create assessment
  const { error: insertError } = await supabase
    .from('engineering_assessments')
    .insert({
      pjo_id: pjoId,
      assessment_type: assessmentType,
      status: 'pending',
      assigned_to: assignedTo,
      assigned_at: now,
    })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  // Update PJO status if needed
  await updatePJOEngineeringStatus(pjoId)

  revalidatePath(`/proforma-jo/${pjoId}`)

  return { success: true }
}

/**
 * Cancel an assessment
 */
export async function cancelAssessment(
  assessmentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Fetch assessment
  const { data: assessment, error: fetchError } = await supabase
    .from('engineering_assessments')
    .select('id, pjo_id, status')
    .eq('id', assessmentId)
    .single()

  if (fetchError || !assessment) {
    return { success: false, error: 'Assessment not found' }
  }

  if (assessment.status === 'completed') {
    return { success: false, error: 'Cannot cancel a completed assessment' }
  }

  // Update assessment status
  const { error: updateError } = await supabase
    .from('engineering_assessments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Update PJO engineering status
  if (assessment.pjo_id) {
    await updatePJOEngineeringStatus(assessment.pjo_id)
    revalidatePath(`/proforma-jo/${assessment.pjo_id}`)
  }

  return { success: true }
}

/**
 * Helper: Update PJO engineering status based on assessments
 */
async function updatePJOEngineeringStatus(pjoId: string): Promise<void> {
  const supabase = await createClient()

  const { data: assessments } = await supabase
    .from('engineering_assessments')
    .select('status')
    .eq('pjo_id', pjoId)

  const typedAssessments = (assessments || []) as Pick<EngineeringAssessment, 'status'>[]
  const newStatus = calculateEngineeringStatus(typedAssessments)

  // Only update if not already completed or waived
  const { data: pjo } = await supabase
    .from('proforma_job_orders')
    .select('engineering_status')
    .eq('id', pjoId)
    .single()

  if (pjo?.engineering_status !== 'completed' && pjo?.engineering_status !== 'waived') {
    await supabase
      .from('proforma_job_orders')
      .update({
        engineering_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pjoId)
  }
}

/**
 * Check if PJO can be approved (considering engineering status)
 */
export async function checkPJOApprovalStatus(
  pjoId: string
): Promise<{ canApprove: boolean; reason?: string }> {
  const supabase = await createClient()

  const { data: pjo, error } = await supabase
    .from('proforma_job_orders')
    .select('requires_engineering, engineering_status')
    .eq('id', pjoId)
    .single()

  if (error || !pjo) {
    return { canApprove: false, reason: 'PJO not found' }
  }

  return canApprovePJOUtil({
    requires_engineering: pjo.requires_engineering || false,
    engineering_status: pjo.engineering_status,
  })
}
