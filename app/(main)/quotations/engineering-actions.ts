'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  determineRequiredAssessments,
  calculateEngineeringStatus,
  calculateTotalAdditionalCosts,
  canWaiveEngineeringReview,
} from '@/lib/engineering-utils'
import {
  notifyQuotationEngineeringAssigned,
  notifyQuotationEngineeringCompleted,
} from '@/lib/notifications/notification-triggers'
import type {
  EngineeringAssessment,
  AssessmentType,
  RiskLevel,
  EngineeringDecision,
  ComplexityFactor,
} from '@/types/engineering'

/**
 * Initialize engineering review for a Quotation
 * Creates default assessments based on complexity factors
 */
export async function initializeQuotationEngineeringReview(
  quotationId: string,
  assignedTo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Fetch quotation to get complexity factors
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('id, quotation_number, complexity_factors, requires_engineering, engineering_status')
    .eq('id', quotationId)
    .single()

  if (quotationError || !quotation) {
    return { success: false, error: 'Quotation not found' }
  }

  // Check if engineering review is already initialized
  if (quotation.engineering_status && quotation.engineering_status !== 'not_required' && quotation.engineering_status !== 'pending') {
    return { success: false, error: 'Engineering review already initialized' }
  }

  const now = new Date().toISOString()

  // Update quotation with engineering assignment
  const { error: updateError } = await supabase
    .from('quotations')
    .update({
      requires_engineering: true,
      engineering_status: 'pending',
      engineering_assigned_to: assignedTo,
      engineering_assigned_at: now,
      updated_at: now,
    })
    .eq('id', quotationId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Determine which assessments to create
  const complexityFactors = quotation.complexity_factors as ComplexityFactor[] | null
  const assessmentTypes = determineRequiredAssessments(complexityFactors)

  // Create assessment records with quotation_id
  const assessmentsToInsert = assessmentTypes.map(type => ({
    quotation_id: quotationId,
    assessment_type: type,
    status: 'pending',
    assigned_to: assignedTo,
    assigned_at: now,
  }))

  if (assessmentsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('engineering_assessments')
      .insert(assessmentsToInsert)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  // Send notification to assigned user
  try {
    const complexityScore = complexityFactors 
      ? complexityFactors.reduce((sum, f) => sum + (f.weight || 0), 0) 
      : undefined
    
    await notifyQuotationEngineeringAssigned({
      quotation_id: quotationId,
      quotation_number: quotation.quotation_number,
      assigned_to: assignedTo,
      complexity_score: complexityScore,
    })
  } catch (e) {
    console.error('Failed to send assignment notification:', e)
  }

  revalidatePath(`/quotations/${quotationId}`)
  revalidatePath('/quotations')

  return { success: true }
}

/**
 * Start an assessment (change status to in_progress)
 */
export async function startQuotationAssessment(
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
    .select('id, quotation_id, status')
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

  // Update quotation engineering status
  if (assessment.quotation_id) {
    await updateQuotationEngineeringStatus(assessment.quotation_id)
    revalidatePath(`/quotations/${assessment.quotation_id}`)
  }

  return { success: true }
}

/**
 * Complete an assessment with findings
 */
export async function completeQuotationAssessment(
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
    .select('id, quotation_id, status')
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

  // Update quotation engineering status
  if (assessment.quotation_id) {
    await updateQuotationEngineeringStatus(assessment.quotation_id)
    revalidatePath(`/quotations/${assessment.quotation_id}`)
  }

  return { success: true }
}

/**
 * Complete the entire engineering review for a quotation
 */
export async function completeQuotationEngineeringReview(
  quotationId: string,
  data: {
    overall_risk_level: RiskLevel
    decision: EngineeringDecision
    engineering_notes: string
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

  // Fetch quotation
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('id, quotation_number, created_by, requires_engineering, status')
    .eq('id', quotationId)
    .single()

  if (quotationError || !quotation) {
    return { success: false, error: 'Quotation not found' }
  }

  if (!quotation.requires_engineering) {
    return { success: false, error: 'Quotation does not require engineering review' }
  }

  const now = new Date().toISOString()

  // Update quotation engineering status
  const { error: updateError } = await supabase
    .from('quotations')
    .update({
      engineering_status: 'completed',
      engineering_completed_at: now,
      engineering_completed_by: user.id,
      engineering_notes: data.engineering_notes.trim(),
      // Transition to ready status if currently in engineering_review
      status: quotation.status === 'engineering_review' ? 'ready' : quotation.status,
      updated_at: now,
    })
    .eq('id', quotationId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Send notification to quotation creator
  if (quotation.created_by) {
    try {
      await notifyQuotationEngineeringCompleted({
        quotation_id: quotationId,
        quotation_number: quotation.quotation_number,
        decision: data.decision,
        overall_risk_level: data.overall_risk_level,
        created_by: quotation.created_by,
      })
    } catch (e) {
      console.error('Failed to send completion notification:', e)
    }
  }

  revalidatePath(`/quotations/${quotationId}`)
  revalidatePath('/quotations')

  return { success: true }
}

/**
 * Waive engineering review for a quotation (Manager+ only)
 */
export async function waiveQuotationEngineeringReview(
  quotationId: string,
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

  // Fetch quotation
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('id, quotation_number, engineering_status, status')
    .eq('id', quotationId)
    .single()

  if (quotationError || !quotation) {
    return { success: false, error: 'Quotation not found' }
  }

  if (quotation.engineering_status === 'completed') {
    return { success: false, error: 'Engineering review is already completed' }
  }

  const now = new Date().toISOString()

  // Update quotation
  const { error: updateError } = await supabase
    .from('quotations')
    .update({
      engineering_status: 'waived',
      engineering_waived_reason: reason.trim(),
      engineering_completed_at: now,
      engineering_completed_by: user.id,
      // Transition to ready status if currently in engineering_review
      status: quotation.status === 'engineering_review' ? 'ready' : quotation.status,
      updated_at: now,
    })
    .eq('id', quotationId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    action_type: 'engineering_waived',
    document_type: 'quotation',
    document_id: quotationId,
    document_number: quotation.quotation_number,
    user_id: user.id,
    user_name: user.email || 'Unknown User',
    details: { reason: reason.trim() },
  })

  revalidatePath(`/quotations/${quotationId}`)
  revalidatePath('/quotations')

  return { success: true }
}

/**
 * Fetch engineering assessments for a quotation
 */
export async function getQuotationEngineeringAssessments(
  quotationId: string
): Promise<{ data: EngineeringAssessment[] | null; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('engineering_assessments')
    .select(`
      *,
      assigned_user:user_profiles!engineering_assessments_assigned_to_fkey(id, full_name, email),
      completed_user:user_profiles!engineering_assessments_completed_by_fkey(id, full_name, email)
    `)
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as EngineeringAssessment[] }
}

/**
 * Cancel an assessment
 */
export async function cancelQuotationAssessment(
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
    .select('id, quotation_id, status')
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

  // Update quotation engineering status
  if (assessment.quotation_id) {
    await updateQuotationEngineeringStatus(assessment.quotation_id)
    revalidatePath(`/quotations/${assessment.quotation_id}`)
  }

  return { success: true }
}

/**
 * Helper: Update quotation engineering status based on assessments
 */
async function updateQuotationEngineeringStatus(quotationId: string): Promise<void> {
  const supabase = await createClient()

  const { data: assessments } = await supabase
    .from('engineering_assessments')
    .select('status')
    .eq('quotation_id', quotationId)

  const typedAssessments = (assessments || []) as Pick<EngineeringAssessment, 'status'>[]
  const newStatus = calculateEngineeringStatus(typedAssessments)

  // Only update if not already completed or waived
  const { data: quotation } = await supabase
    .from('quotations')
    .select('engineering_status')
    .eq('id', quotationId)
    .single()

  if (quotation?.engineering_status !== 'completed' && quotation?.engineering_status !== 'waived') {
    await supabase
      .from('quotations')
      .update({
        engineering_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
  }
}
