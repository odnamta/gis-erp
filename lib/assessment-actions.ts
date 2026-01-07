'use server';

// lib/assessment-actions.ts
// Server actions for Engineering Technical Assessments module (v0.58)

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  TechnicalAssessment,
  TechnicalAssessmentType,
  LiftingPlan,
  AxleLoadCalculation,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  CreateLiftingPlanInput,
  UpdateLiftingPlanInput,
  CreateAxleCalcInput,
  UpdateAxleCalcInput,
  AssessmentFilters,
  ActionResult,
  ConclusionType,
  AssessmentStatus,
} from '@/types/assessment';
import {
  validateAssessmentData,
  validateLiftingPlan,
  validateAxleCalculation,
  calculateTotalLiftedWeight,
  calculateUtilizationPercentage,
  calculateAxleLoads,
  calculateTotalWeight,
  isWithinLegalLimits,
  determinePermitRequired,
  getMaxSingleAxleLoad,
  getMaxTandemAxleLoad,
  canTransitionTo,
  isValidConclusion,
} from '@/lib/assessment-utils';

// ============================================
// Assessment Type Actions
// ============================================

export async function getAssessmentTypes(): Promise<TechnicalAssessmentType[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('technical_assessment_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching assessment types:', error);
    return [];
  }

  return (data || []) as unknown as TechnicalAssessmentType[];
}

export async function getAssessmentType(id: string): Promise<TechnicalAssessmentType | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('technical_assessment_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching assessment type:', error);
    return null;
  }

  return data as unknown as TechnicalAssessmentType;
}


// ============================================
// Assessment CRUD Actions
// ============================================

export async function createAssessment(
  input: CreateAssessmentInput
): Promise<ActionResult<TechnicalAssessment>> {
  const validation = validateAssessmentData(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.map(e => e.message).join(', '),
    };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('technical_assessments')
    .insert({
      assessment_type_id: input.assessment_type_id,
      title: input.title,
      description: input.description || null,
      quotation_id: input.quotation_id || null,
      project_id: input.project_id || null,
      job_order_id: input.job_order_id || null,
      route_survey_id: input.route_survey_id || null,
      customer_id: input.customer_id || null,
      cargo_description: input.cargo_description || null,
      cargo_weight_tons: input.cargo_weight_tons || null,
      cargo_dimensions: input.cargo_dimensions as unknown || null,
      status: 'draft',
      revision_number: 1,
    } as any)
    .select(`
      *,
      assessment_type:technical_assessment_types(*),
      customer:customers(name),
      project:projects(name),
      quotation:quotations(quotation_number),
      job_order:job_orders(jo_number)
    `)
    .single();

  if (error) {
    console.error('Error creating assessment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  return { success: true, data: data as unknown as TechnicalAssessment };
}

export async function updateAssessment(
  id: string,
  input: UpdateAssessmentInput
): Promise<ActionResult<TechnicalAssessment>> {
  const supabase = await createClient();

  // Check if assessment exists and can be edited
  const { data: existing } = await supabase
    .from('technical_assessments')
    .select('status')
    .eq('id', id)
    .single();

  if (!existing) {
    return { success: false, error: 'Assessment not found' };
  }

  if (!['draft', 'in_progress', 'rejected'].includes(existing.status || '')) {
    return { success: false, error: 'Cannot edit assessment in current status' };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Only include fields that are provided
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.quotation_id !== undefined) updateData.quotation_id = input.quotation_id;
  if (input.project_id !== undefined) updateData.project_id = input.project_id;
  if (input.job_order_id !== undefined) updateData.job_order_id = input.job_order_id;
  if (input.route_survey_id !== undefined) updateData.route_survey_id = input.route_survey_id;
  if (input.customer_id !== undefined) updateData.customer_id = input.customer_id;
  if (input.cargo_description !== undefined) updateData.cargo_description = input.cargo_description;
  if (input.cargo_weight_tons !== undefined) updateData.cargo_weight_tons = input.cargo_weight_tons;
  if (input.cargo_dimensions !== undefined) updateData.cargo_dimensions = input.cargo_dimensions;
  if (input.assessment_data !== undefined) updateData.assessment_data = input.assessment_data;
  if (input.calculations !== undefined) updateData.calculations = input.calculations;
  if (input.equipment_recommended !== undefined) updateData.equipment_recommended = input.equipment_recommended;
  if (input.recommendations !== undefined) updateData.recommendations = input.recommendations;
  if (input.limitations !== undefined) updateData.limitations = input.limitations;
  if (input.assumptions !== undefined) updateData.assumptions = input.assumptions;

  const { data, error } = await supabase
    .from('technical_assessments')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      assessment_type:technical_assessment_types(*),
      customer:customers(name),
      project:projects(name),
      quotation:quotations(quotation_number),
      job_order:job_orders(jo_number)
    `)
    .single();

  if (error) {
    console.error('Error updating assessment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  revalidatePath(`/engineering/assessments/${id}`);
  return { success: true, data: data as unknown as TechnicalAssessment };
}

export async function deleteAssessment(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('technical_assessments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting assessment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  return { success: true };
}

export async function getAssessment(id: string): Promise<TechnicalAssessment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('technical_assessments')
    .select(`
      *,
      assessment_type:technical_assessment_types(*),
      customer:customers(name),
      project:projects(name),
      quotation:quotations(quotation_number),
      job_order:job_orders(jo_number),
      route_survey:route_surveys(survey_number),
      prepared_by_employee:employees!technical_assessments_prepared_by_fkey(full_name),
      reviewed_by_employee:employees!technical_assessments_reviewed_by_fkey(full_name),
      approved_by_employee:employees!technical_assessments_approved_by_fkey(full_name),
      lifting_plans(*),
      axle_calculations:axle_load_calculations(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching assessment:', error);
    return null;
  }

  return data as unknown as TechnicalAssessment;
}

export async function getAssessments(
  filters?: AssessmentFilters
): Promise<TechnicalAssessment[]> {
  const supabase = await createClient();

  let query = supabase
    .from('technical_assessments')
    .select(`
      *,
      assessment_type:technical_assessment_types(id, type_code, type_name),
      customer:customers(name),
      project:projects(name),
      quotation:quotations(quotation_number)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.assessment_type_id) {
    query = query.eq('assessment_type_id', filters.assessment_type_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }
  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters?.quotation_id) {
    query = query.eq('quotation_id', filters.quotation_id);
  }
  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to);
  }
  if (filters?.search) {
    query = query.or(`assessment_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assessments:', error);
    return [];
  }

  return (data || []) as unknown as TechnicalAssessment[];
}


// ============================================
// Workflow Actions
// ============================================

export async function submitForReview(
  id: string,
  preparedBy: string
): Promise<ActionResult<TechnicalAssessment>> {
  const supabase = await createClient();

  // Check current status
  const { data: existing } = await supabase
    .from('technical_assessments')
    .select('status')
    .eq('id', id)
    .single();

  if (!existing) {
    return { success: false, error: 'Assessment not found' };
  }

  if (!canTransitionTo((existing.status || '') as AssessmentStatus, 'pending_review')) {
    return { success: false, error: `Cannot submit for review from status: ${existing.status}` };
  }

  const { data, error } = await supabase
    .from('technical_assessments')
    .update({
      status: 'pending_review',
      prepared_by: preparedBy,
      prepared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      assessment_type:technical_assessment_types(*)
    `)
    .single();

  if (error) {
    console.error('Error submitting for review:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  revalidatePath(`/engineering/assessments/${id}`);
  return { success: true, data: data as unknown as TechnicalAssessment };
}

export async function reviewAssessment(
  id: string,
  reviewedBy: string
): Promise<ActionResult<TechnicalAssessment>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('technical_assessments')
    .update({
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      assessment_type:technical_assessment_types(*)
    `)
    .single();

  if (error) {
    console.error('Error recording review:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  revalidatePath(`/engineering/assessments/${id}`);
  return { success: true, data: data as unknown as TechnicalAssessment };
}

export async function approveAssessment(
  id: string,
  approvedBy: string,
  conclusion: ConclusionType,
  conclusionNotes?: string
): Promise<ActionResult<TechnicalAssessment>> {
  const supabase = await createClient();

  // Validate conclusion
  if (!isValidConclusion(conclusion)) {
    return { success: false, error: 'Invalid conclusion value' };
  }

  // Check current status
  const { data: existing } = await supabase
    .from('technical_assessments')
    .select('status')
    .eq('id', id)
    .single();

  if (!existing) {
    return { success: false, error: 'Assessment not found' };
  }

  if (!canTransitionTo((existing.status || '') as AssessmentStatus, 'approved')) {
    return { success: false, error: `Cannot approve from status: ${existing.status}` };
  }

  const { data, error } = await supabase
    .from('technical_assessments')
    .update({
      status: 'approved',
      conclusion,
      conclusion_notes: conclusionNotes || null,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      assessment_type:technical_assessment_types(*)
    `)
    .single();

  if (error) {
    console.error('Error approving assessment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  revalidatePath(`/engineering/assessments/${id}`);
  return { success: true, data: data as unknown as TechnicalAssessment };
}

export async function rejectAssessment(
  id: string,
  notes: string
): Promise<ActionResult<TechnicalAssessment>> {
  const supabase = await createClient();

  // Check current status
  const { data: existing } = await supabase
    .from('technical_assessments')
    .select('status')
    .eq('id', id)
    .single();

  if (!existing) {
    return { success: false, error: 'Assessment not found' };
  }

  if (!canTransitionTo((existing.status || '') as AssessmentStatus, 'rejected')) {
    return { success: false, error: `Cannot reject from status: ${existing.status}` };
  }

  const { data, error } = await supabase
    .from('technical_assessments')
    .update({
      status: 'rejected',
      revision_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      assessment_type:technical_assessment_types(*)
    `)
    .single();

  if (error) {
    console.error('Error rejecting assessment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  revalidatePath(`/engineering/assessments/${id}`);
  return { success: true, data: data as unknown as TechnicalAssessment };
}

export async function createRevision(
  id: string,
  revisionNotes: string
): Promise<ActionResult<TechnicalAssessment>> {
  if (!revisionNotes || revisionNotes.trim() === '') {
    return { success: false, error: 'Revision notes are required' };
  }

  const supabase = await createClient();

  // Get the original assessment
  const { data: original } = await supabase
    .from('technical_assessments')
    .select('*')
    .eq('id', id)
    .single();

  if (!original) {
    return { success: false, error: 'Assessment not found' };
  }

  if (original.status !== 'approved') {
    return { success: false, error: 'Can only create revision from approved assessment' };
  }

  // Mark original as superseded
  await supabase
    .from('technical_assessments')
    .update({ status: 'superseded', updated_at: new Date().toISOString() })
    .eq('id', id);

  // Create new revision
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newRevision, error } = await supabase
    .from('technical_assessments')
    .insert({
      assessment_type_id: original.assessment_type_id,
      quotation_id: original.quotation_id,
      project_id: original.project_id,
      job_order_id: original.job_order_id,
      route_survey_id: original.route_survey_id,
      customer_id: original.customer_id,
      title: original.title,
      description: original.description,
      cargo_description: original.cargo_description,
      cargo_weight_tons: original.cargo_weight_tons,
      cargo_dimensions: original.cargo_dimensions,
      assessment_data: original.assessment_data,
      calculations: original.calculations,
      equipment_recommended: original.equipment_recommended,
      recommendations: original.recommendations,
      limitations: original.limitations,
      assumptions: original.assumptions,
      status: 'draft',
      revision_number: (original.revision_number || 0) + 1,
      previous_revision_id: id,
      revision_notes: revisionNotes,
    } as any)
    .select(`
      *,
      assessment_type:technical_assessment_types(*)
    `)
    .single();

  if (error) {
    console.error('Error creating revision:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/engineering/assessments');
  revalidatePath(`/engineering/assessments/${id}`);
  return { success: true, data: newRevision as unknown as TechnicalAssessment };
}


// ============================================
// Lifting Plan Actions
// ============================================

export async function createLiftingPlan(
  input: CreateLiftingPlanInput
): Promise<ActionResult<LiftingPlan>> {
  const validation = validateLiftingPlan(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.map(e => e.message).join(', '),
    };
  }

  const supabase = await createClient();

  // Get next lift number
  const { data: existingPlans } = await supabase
    .from('lifting_plans')
    .select('lift_number')
    .eq('assessment_id', input.assessment_id)
    .order('lift_number', { ascending: false })
    .limit(1);

  const nextLiftNumber = input.lift_number || 
    (existingPlans && existingPlans.length > 0 && existingPlans[0].lift_number ? existingPlans[0].lift_number + 1 : 1);

  // Calculate derived values
  const riggingWeight = input.rigging_weight_tons || 0;
  const totalLiftedWeight = calculateTotalLiftedWeight(input.load_weight_tons, riggingWeight);
  
  let utilizationPercentage: number | null = null;
  if (input.crane_capacity_at_radius_tons && input.crane_capacity_at_radius_tons > 0) {
    utilizationPercentage = calculateUtilizationPercentage(
      totalLiftedWeight,
      input.crane_capacity_at_radius_tons
    );
  }

  const { data, error } = await supabase
    .from('lifting_plans')
    .insert({
      assessment_id: input.assessment_id,
      lift_number: nextLiftNumber,
      lift_description: input.lift_description || null,
      load_weight_tons: input.load_weight_tons,
      rigging_weight_tons: riggingWeight,
      total_lifted_weight_tons: totalLiftedWeight,
      crane_type: input.crane_type || null,
      crane_capacity_tons: input.crane_capacity_tons || null,
      crane_radius_m: input.crane_radius_m || null,
      crane_boom_length_m: input.crane_boom_length_m || null,
      crane_capacity_at_radius_tons: input.crane_capacity_at_radius_tons || null,
      utilization_percentage: utilizationPercentage,
      rigging_configuration: input.rigging_configuration || null,
      sling_type: input.sling_type || null,
      sling_capacity_tons: input.sling_capacity_tons || null,
      sling_quantity: input.sling_quantity || null,
      spreader_beam: input.spreader_beam || false,
      spreader_capacity_tons: input.spreader_capacity_tons || null,
      crane_position: input.crane_position || null,
      load_pickup_position: input.load_pickup_position || null,
      load_set_position: input.load_set_position || null,
      swing_radius_m: input.swing_radius_m || null,
      swing_clear: input.swing_clear || null,
      ground_bearing_required_kpa: input.ground_bearing_required_kpa || null,
      ground_preparation: input.ground_preparation || null,
      outrigger_mats: input.outrigger_mats ?? true,
      mat_size: input.mat_size || null,
      lift_drawing_url: input.lift_drawing_url || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating lifting plan:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/engineering/assessments/${input.assessment_id}`);
  return { success: true, data: data as unknown as LiftingPlan };
}

export async function updateLiftingPlan(
  id: string,
  input: UpdateLiftingPlanInput
): Promise<ActionResult<LiftingPlan>> {
  const supabase = await createClient();

  // Get existing plan to calculate derived values
  const { data: existing } = await supabase
    .from('lifting_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) {
    return { success: false, error: 'Lifting plan not found' };
  }

  const loadWeight = input.load_weight_tons ?? existing.load_weight_tons ?? 0;
  const riggingWeight = input.rigging_weight_tons ?? existing.rigging_weight_tons ?? 0;
  const totalLiftedWeight = calculateTotalLiftedWeight(loadWeight, riggingWeight);
  
  const capacityAtRadius = input.crane_capacity_at_radius_tons ?? existing.crane_capacity_at_radius_tons;
  let utilizationPercentage: number | null = null;
  if (capacityAtRadius && capacityAtRadius > 0) {
    utilizationPercentage = calculateUtilizationPercentage(totalLiftedWeight, capacityAtRadius);
  }

  const updateData: Record<string, unknown> = {
    total_lifted_weight_tons: totalLiftedWeight,
    utilization_percentage: utilizationPercentage,
  };

  // Only include fields that are provided
  if (input.lift_number !== undefined) updateData.lift_number = input.lift_number;
  if (input.lift_description !== undefined) updateData.lift_description = input.lift_description;
  if (input.load_weight_tons !== undefined) updateData.load_weight_tons = input.load_weight_tons;
  if (input.rigging_weight_tons !== undefined) updateData.rigging_weight_tons = input.rigging_weight_tons;
  if (input.crane_type !== undefined) updateData.crane_type = input.crane_type;
  if (input.crane_capacity_tons !== undefined) updateData.crane_capacity_tons = input.crane_capacity_tons;
  if (input.crane_radius_m !== undefined) updateData.crane_radius_m = input.crane_radius_m;
  if (input.crane_boom_length_m !== undefined) updateData.crane_boom_length_m = input.crane_boom_length_m;
  if (input.crane_capacity_at_radius_tons !== undefined) updateData.crane_capacity_at_radius_tons = input.crane_capacity_at_radius_tons;
  if (input.rigging_configuration !== undefined) updateData.rigging_configuration = input.rigging_configuration;
  if (input.sling_type !== undefined) updateData.sling_type = input.sling_type;
  if (input.sling_capacity_tons !== undefined) updateData.sling_capacity_tons = input.sling_capacity_tons;
  if (input.sling_quantity !== undefined) updateData.sling_quantity = input.sling_quantity;
  if (input.spreader_beam !== undefined) updateData.spreader_beam = input.spreader_beam;
  if (input.spreader_capacity_tons !== undefined) updateData.spreader_capacity_tons = input.spreader_capacity_tons;
  if (input.crane_position !== undefined) updateData.crane_position = input.crane_position;
  if (input.load_pickup_position !== undefined) updateData.load_pickup_position = input.load_pickup_position;
  if (input.load_set_position !== undefined) updateData.load_set_position = input.load_set_position;
  if (input.swing_radius_m !== undefined) updateData.swing_radius_m = input.swing_radius_m;
  if (input.swing_clear !== undefined) updateData.swing_clear = input.swing_clear;
  if (input.ground_bearing_required_kpa !== undefined) updateData.ground_bearing_required_kpa = input.ground_bearing_required_kpa;
  if (input.ground_preparation !== undefined) updateData.ground_preparation = input.ground_preparation;
  if (input.outrigger_mats !== undefined) updateData.outrigger_mats = input.outrigger_mats;
  if (input.mat_size !== undefined) updateData.mat_size = input.mat_size;
  if (input.lift_drawing_url !== undefined) updateData.lift_drawing_url = input.lift_drawing_url;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('lifting_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lifting plan:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/engineering/assessments/${existing.assessment_id}`);
  return { success: true, data: data as unknown as LiftingPlan };
}

export async function deleteLiftingPlan(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient();

  // Get assessment_id for revalidation
  const { data: existing } = await supabase
    .from('lifting_plans')
    .select('assessment_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('lifting_plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting lifting plan:', error);
    return { success: false, error: error.message };
  }

  if (existing) {
    revalidatePath(`/engineering/assessments/${existing.assessment_id}`);
  }
  return { success: true };
}

export async function getLiftingPlans(assessmentId: string): Promise<LiftingPlan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lifting_plans')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('lift_number', { ascending: true });

  if (error) {
    console.error('Error fetching lifting plans:', error);
    return [];
  }

  return (data || []) as unknown as LiftingPlan[];
}


// ============================================
// Axle Load Calculation Actions
// ============================================

export async function createAxleCalculation(
  input: CreateAxleCalcInput
): Promise<ActionResult<AxleLoadCalculation>> {
  const validation = validateAxleCalculation(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.map(e => e.message).join(', '),
    };
  }

  const supabase = await createClient();

  // Calculate axle loads if we have enough data
  let axleLoads = input.axle_loads || [];
  let totalWeight: number | null = null;
  let maxSingleAxle: number | null = null;
  let maxTandemAxle: number | null = null;
  let withinLimits: boolean | null = null;
  let permitRequired: boolean | null = null;

  if (input.trailer_axle_count && input.prime_mover_axle_count) {
    axleLoads = calculateAxleLoads({
      cargoWeightTons: input.cargo_weight_tons,
      trailerTareWeightTons: input.trailer_tare_weight_tons || 0,
      primeMoverWeightTons: input.prime_mover_weight_tons || 0,
      trailerAxleCount: input.trailer_axle_count,
      primeMoverAxleCount: input.prime_mover_axle_count,
      cogFromFrontM: input.cargo_cog_from_front_m,
    });

    totalWeight = calculateTotalWeight(
      input.cargo_weight_tons,
      input.trailer_tare_weight_tons || 0,
      input.prime_mover_weight_tons || 0
    );

    maxSingleAxle = getMaxSingleAxleLoad(axleLoads);
    maxTandemAxle = getMaxTandemAxleLoad(axleLoads);
    withinLimits = isWithinLegalLimits(axleLoads);
    permitRequired = determinePermitRequired(axleLoads);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('axle_load_calculations')
    .insert({
      assessment_id: input.assessment_id,
      configuration_name: input.configuration_name || null,
      trailer_type: input.trailer_type || null,
      trailer_axle_count: input.trailer_axle_count || null,
      trailer_axle_spacing_m: input.trailer_axle_spacing_m || null,
      trailer_tare_weight_tons: input.trailer_tare_weight_tons || null,
      prime_mover_type: input.prime_mover_type || null,
      prime_mover_axle_count: input.prime_mover_axle_count || null,
      prime_mover_weight_tons: input.prime_mover_weight_tons || null,
      cargo_weight_tons: input.cargo_weight_tons,
      cargo_cog_from_front_m: input.cargo_cog_from_front_m || null,
      axle_loads: axleLoads as unknown,
      total_weight_tons: totalWeight,
      max_single_axle_load_tons: maxSingleAxle,
      max_tandem_axle_load_tons: maxTandemAxle,
      within_legal_limits: withinLimits,
      permit_required: permitRequired,
      notes: input.notes || null,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating axle calculation:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/engineering/assessments/${input.assessment_id}`);
  return { success: true, data: data as unknown as AxleLoadCalculation };
}

export async function updateAxleCalculation(
  id: string,
  input: UpdateAxleCalcInput
): Promise<ActionResult<AxleLoadCalculation>> {
  const supabase = await createClient();

  // Get existing calculation
  const { data: existing } = await supabase
    .from('axle_load_calculations')
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) {
    return { success: false, error: 'Axle calculation not found' };
  }

  // Merge with existing values
  const cargoWeight = input.cargo_weight_tons ?? existing.cargo_weight_tons ?? 0;
  const trailerTare = input.trailer_tare_weight_tons ?? existing.trailer_tare_weight_tons ?? 0;
  const primeMoverWeight = input.prime_mover_weight_tons ?? existing.prime_mover_weight_tons ?? 0;
  const trailerAxles = input.trailer_axle_count ?? existing.trailer_axle_count;
  const primeMoverAxles = input.prime_mover_axle_count ?? existing.prime_mover_axle_count;

  // Recalculate if we have enough data
  let axleLoads = input.axle_loads || existing.axle_loads || [];
  let totalWeight: number | null = null;
  let maxSingleAxle: number | null = null;
  let maxTandemAxle: number | null = null;
  let withinLimits: boolean | null = null;
  let permitRequired: boolean | null = null;

  if (trailerAxles && primeMoverAxles) {
    axleLoads = calculateAxleLoads({
      cargoWeightTons: cargoWeight,
      trailerTareWeightTons: trailerTare,
      primeMoverWeightTons: primeMoverWeight,
      trailerAxleCount: trailerAxles,
      primeMoverAxleCount: primeMoverAxles,
      cogFromFrontM: input.cargo_cog_from_front_m ?? existing.cargo_cog_from_front_m ?? undefined,
    });

    totalWeight = calculateTotalWeight(cargoWeight, trailerTare, primeMoverWeight);
    maxSingleAxle = getMaxSingleAxleLoad(axleLoads);
    maxTandemAxle = getMaxTandemAxleLoad(axleLoads);
    withinLimits = isWithinLegalLimits(axleLoads);
    permitRequired = determinePermitRequired(axleLoads);
  }

  const updateData: Record<string, unknown> = {
    axle_loads: axleLoads,
    total_weight_tons: totalWeight,
    max_single_axle_load_tons: maxSingleAxle,
    max_tandem_axle_load_tons: maxTandemAxle,
    within_legal_limits: withinLimits,
    permit_required: permitRequired,
  };

  // Only include fields that are provided
  if (input.configuration_name !== undefined) updateData.configuration_name = input.configuration_name;
  if (input.trailer_type !== undefined) updateData.trailer_type = input.trailer_type;
  if (input.trailer_axle_count !== undefined) updateData.trailer_axle_count = input.trailer_axle_count;
  if (input.trailer_axle_spacing_m !== undefined) updateData.trailer_axle_spacing_m = input.trailer_axle_spacing_m;
  if (input.trailer_tare_weight_tons !== undefined) updateData.trailer_tare_weight_tons = input.trailer_tare_weight_tons;
  if (input.prime_mover_type !== undefined) updateData.prime_mover_type = input.prime_mover_type;
  if (input.prime_mover_axle_count !== undefined) updateData.prime_mover_axle_count = input.prime_mover_axle_count;
  if (input.prime_mover_weight_tons !== undefined) updateData.prime_mover_weight_tons = input.prime_mover_weight_tons;
  if (input.cargo_weight_tons !== undefined) updateData.cargo_weight_tons = input.cargo_weight_tons;
  if (input.cargo_cog_from_front_m !== undefined) updateData.cargo_cog_from_front_m = input.cargo_cog_from_front_m;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('axle_load_calculations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating axle calculation:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/engineering/assessments/${existing.assessment_id}`);
  return { success: true, data: data as unknown as AxleLoadCalculation };
}

export async function deleteAxleCalculation(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient();

  // Get assessment_id for revalidation
  const { data: existing } = await supabase
    .from('axle_load_calculations')
    .select('assessment_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('axle_load_calculations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting axle calculation:', error);
    return { success: false, error: error.message };
  }

  if (existing) {
    revalidatePath(`/engineering/assessments/${existing.assessment_id}`);
  }
  return { success: true };
}

export async function getAxleCalculations(assessmentId: string): Promise<AxleLoadCalculation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('axle_load_calculations')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching axle calculations:', error);
    return [];
  }

  return (data || []) as unknown as AxleLoadCalculation[];
}

// ============================================
// Helper Actions
// ============================================

export async function getAssessmentStatusCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('technical_assessments')
    .select('status');

  if (error) {
    console.error('Error fetching status counts:', error);
    return {};
  }

  const counts: Record<string, number> = {
    draft: 0,
    in_progress: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    superseded: 0,
    total: data?.length || 0,
  };

  data?.forEach(item => {
    if (item.status && item.status in counts) {
      counts[item.status]++;
    }
  });

  return counts;
}
