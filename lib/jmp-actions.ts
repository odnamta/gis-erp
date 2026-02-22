'use server';

// =====================================================
// v0.57: JOURNEY MANAGEMENT PLAN SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  JourneyManagementPlan,
  JmpWithRelations,
  JmpFormData,
  JmpCheckpoint,
  CheckpointFormData,
  JmpRiskAssessment,
  RiskFormData,
  JmpStatusCounts,
  JmpFilters,
  PostJourneyData,
  JmpRow,
  JmpCheckpointRow,
  JmpRiskRow,
  JmpStatus,
  RiskCategory,
  Likelihood,
  Consequence,
  RiskLevel,
} from '@/types/jmp';
import {
  mapRowToJmp,
  mapJmpToRow,
  mapRowToCheckpoint,
  calculateRiskLevel,
  isValidStatusTransition,
} from '@/lib/jmp-utils';

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a new JMP
 */
export async function createJmp(data: JmpFormData): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();

    // Generate JMP number: JMP-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { count } = await supabase
      .from('journey_management_plans')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    const seq = String((count || 0) + 1).padStart(4, '0');
    const jmpNumber = `JMP-${yearMonth}-${seq}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      jmp_number: jmpNumber,
      journey_title: data.journeyTitle,
      journey_description: data.journeyDescription || null,
      cargo_description: data.cargoDescription,
      total_length_m: data.totalLengthM || null,
      total_width_m: data.totalWidthM || null,
      total_height_m: data.totalHeightM || null,
      total_weight_tons: data.totalWeightTons || null,
      origin_location: data.originLocation,
      destination_location: data.destinationLocation,
      route_distance_km: data.routeDistanceKm || null,
      planned_departure: data.plannedDeparture || null,
      planned_arrival: data.plannedArrival || null,
      journey_duration_hours: data.journeyDurationHours || null,
      movement_windows: data.movementWindows || [],
      convoy_configuration: data.convoyConfiguration || null,
      convoy_commander_id: data.convoyCommanderId || null,
      drivers: data.drivers || [],
      escort_details: data.escortDetails || null,
      radio_frequencies: data.radioFrequencies || [],
      emergency_contacts: data.emergencyContacts || [],
      contingency_plans: data.contingencyPlans || [],
      emergency_procedures: data.emergencyProcedures || null,
      nearest_hospitals: data.nearestHospitals || [],
      nearest_workshops: data.nearestWorkshops || [],
      permits: data.permits || [],
      weather_restrictions: data.weatherRestrictions || null,
      go_no_go_criteria: data.goNoGoCriteria || null,
      route_survey_id: data.routeSurveyId || null,
      job_order_id: data.jobOrderId || null,
      project_id: data.projectId || null,
      customer_id: data.customerId || null,
      status: 'draft',
    };

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error creating JMP:', error);
    return { success: false, error: 'Failed to create JMP' };
  }
}

/**
 * Update an existing JMP
 */
export async function updateJmp(
  id: string,
  data: Partial<JmpFormData>
): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.journeyTitle !== undefined) updateData.journey_title = data.journeyTitle;
    if (data.journeyDescription !== undefined) updateData.journey_description = data.journeyDescription || null;
    if (data.cargoDescription !== undefined) updateData.cargo_description = data.cargoDescription;
    if (data.totalLengthM !== undefined) updateData.total_length_m = data.totalLengthM || null;
    if (data.totalWidthM !== undefined) updateData.total_width_m = data.totalWidthM || null;
    if (data.totalHeightM !== undefined) updateData.total_height_m = data.totalHeightM || null;
    if (data.totalWeightTons !== undefined) updateData.total_weight_tons = data.totalWeightTons || null;
    if (data.originLocation !== undefined) updateData.origin_location = data.originLocation;
    if (data.destinationLocation !== undefined) updateData.destination_location = data.destinationLocation;
    if (data.routeDistanceKm !== undefined) updateData.route_distance_km = data.routeDistanceKm || null;
    if (data.plannedDeparture !== undefined) updateData.planned_departure = data.plannedDeparture || null;
    if (data.plannedArrival !== undefined) updateData.planned_arrival = data.plannedArrival || null;
    if (data.journeyDurationHours !== undefined) updateData.journey_duration_hours = data.journeyDurationHours || null;
    if (data.movementWindows !== undefined) updateData.movement_windows = data.movementWindows;
    if (data.convoyConfiguration !== undefined) updateData.convoy_configuration = data.convoyConfiguration || null;
    if (data.convoyCommanderId !== undefined) updateData.convoy_commander_id = data.convoyCommanderId || null;
    if (data.drivers !== undefined) updateData.drivers = data.drivers;
    if (data.escortDetails !== undefined) updateData.escort_details = data.escortDetails || null;
    if (data.radioFrequencies !== undefined) updateData.radio_frequencies = data.radioFrequencies;
    if (data.emergencyContacts !== undefined) updateData.emergency_contacts = data.emergencyContacts;
    if (data.contingencyPlans !== undefined) updateData.contingency_plans = data.contingencyPlans;
    if (data.emergencyProcedures !== undefined) updateData.emergency_procedures = data.emergencyProcedures || null;
    if (data.nearestHospitals !== undefined) updateData.nearest_hospitals = data.nearestHospitals;
    if (data.nearestWorkshops !== undefined) updateData.nearest_workshops = data.nearestWorkshops;
    if (data.permits !== undefined) updateData.permits = data.permits;
    if (data.weatherRestrictions !== undefined) updateData.weather_restrictions = data.weatherRestrictions || null;
    if (data.goNoGoCriteria !== undefined) updateData.go_no_go_criteria = data.goNoGoCriteria || null;
    if (data.routeSurveyId !== undefined) updateData.route_survey_id = data.routeSurveyId || null;
    if (data.jobOrderId !== undefined) updateData.job_order_id = data.jobOrderId || null;
    if (data.projectId !== undefined) updateData.project_id = data.projectId || null;
    if (data.customerId !== undefined) updateData.customer_id = data.customerId || null;

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath(`/engineering/jmp/${id}`);
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error updating JMP:', error);
    return { success: false, error: 'Failed to update JMP' };
  }
}

/**
 * Delete a JMP (only draft status)
 */
export async function deleteJmp(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    // Check status first
    const { data: jmp, error: fetchError } = await supabase
      .from('journey_management_plans')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (jmp.status !== 'draft') {
      return { success: false, error: 'Only draft JMPs can be deleted' };
    }

    const { error } = await supabase
      .from('journey_management_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    return { success: true };
  } catch (error) {
    console.error('Error deleting JMP:', error);
    return { success: false, error: 'Failed to delete JMP' };
  }
}

/**
 * Create JMP from route survey (pre-populate data)
 */
export async function createJmpFromSurvey(surveyId: string): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();
    
    // Fetch survey data
    const { data: survey, error: surveyError } = await supabase
      .from('route_surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (surveyError) throw surveyError;

    // Create JMP with pre-populated data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      route_survey_id: surveyId,
      job_order_id: survey.job_order_id || null,
      project_id: survey.project_id || null,
      customer_id: survey.customer_id || null,
      journey_title: `Journey - ${survey.cargo_description}`,
      cargo_description: survey.cargo_description,
      total_length_m: survey.total_length_m || null,
      total_width_m: survey.total_width_m || null,
      total_height_m: survey.total_height_m || null,
      total_weight_tons: survey.total_weight_tons || null,
      origin_location: survey.origin_location,
      destination_location: survey.destination_location,
      route_distance_km: survey.route_distance_km || null,
      status: 'draft',
    };

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error creating JMP from survey:', error);
    return { success: false, error: 'Failed to create JMP from survey' };
  }
}


/**
 * Get JMP by ID with relations
 */
export async function getJmpById(id: string): Promise<JmpWithRelations | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('journey_management_plans')
      .select(`
        *,
        customer:customers(id, name),
        project:projects(id, name),
        jobOrder:job_orders(id, jo_number),
        routeSurvey:route_surveys(id, survey_number),
        convoyCommander:employees!convoy_commander_id(id, full_name, phone)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Fetch checkpoints
    const { data: checkpoints } = await supabase
      .from('jmp_checkpoints')
      .select('*')
      .eq('jmp_id', id)
      .order('checkpoint_order');

    // Fetch risks
    const { data: risks } = await supabase
      .from('jmp_risk_assessment')
      .select('*')
      .eq('jmp_id', id);

    const jmp = mapRowToJmp(data as unknown as JmpRow);
    return {
      ...jmp,
      customer: data.customer || undefined,
      project: data.project || undefined,
      jobOrder: data.jobOrder || undefined,
      routeSurvey: data.routeSurvey || undefined,
      convoyCommander: data.convoyCommander ? {
        id: data.convoyCommander.id,
        full_name: data.convoyCommander.full_name,
        phone: data.convoyCommander.phone || undefined,
      } : undefined,
      checkpoints: checkpoints?.map((cp) => mapRowToCheckpoint(cp as unknown as JmpCheckpointRow)) || [],
      risks: risks?.map((r) => ({
        id: r.id,
        jmpId: r.jmp_id,
        riskCategory: r.risk_category as RiskCategory,
        riskDescription: r.risk_description,
        likelihood: r.likelihood as Likelihood,
        consequence: r.consequence as Consequence,
        riskLevel: r.risk_level as RiskLevel,
        controlMeasures: r.control_measures,
        residualRiskLevel: (r.residual_risk_level as RiskLevel) || undefined,
        responsible: r.responsible || undefined,
        createdAt: r.created_at || '',
      })) || [],
    };
  } catch (error) {
    console.error('Error fetching JMP:', error);
    return null;
  }
}

/**
 * Get JMP list with filters
 */
export async function getJmpList(filters: JmpFilters): Promise<JmpWithRelations[]> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('journey_management_plans')
      .select(`
        *,
        customer:customers(id, name),
        project:projects(id, name),
        jobOrder:job_orders(id, jo_number),
        convoyCommander:employees!convoy_commander_id(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.customerId !== 'all') {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters.dateFrom) {
      query = query.gte('planned_departure', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('planned_departure', filters.dateTo);
    }

    if (filters.search) {
      query = query.or(`jmp_number.ilike.%${filters.search}%,journey_title.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row) => ({
      ...mapRowToJmp(row as unknown as JmpRow),
      customer: row.customer || undefined,
      project: row.project || undefined,
      jobOrder: row.jobOrder || undefined,
      convoyCommander: row.convoyCommander || undefined,
    }));
  } catch (error) {
    console.error('Error fetching JMP list:', error);
    return [];
  }
}

/**
 * Get active journeys
 */
export async function getActiveJourneys(): Promise<JmpWithRelations[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('journey_management_plans')
      .select(`
        *,
        customer:customers(id, name),
        convoyCommander:employees!convoy_commander_id(id, full_name, phone)
      `)
      .eq('status', 'active')
      .order('actual_departure', { ascending: true });

    if (error) throw error;

    // Fetch checkpoints for each JMP
    const jmps = await Promise.all(
      (data || []).map(async (row) => {
        const { data: checkpoints } = await supabase
          .from('jmp_checkpoints')
          .select('*')
          .eq('jmp_id', row.id)
          .order('checkpoint_order');

        return {
          ...mapRowToJmp(row as unknown as JmpRow),
          customer: row.customer || undefined,
          convoyCommander: row.convoyCommander ? {
            id: row.convoyCommander.id,
            full_name: row.convoyCommander.full_name,
            phone: row.convoyCommander.phone || undefined,
          } : undefined,
          checkpoints: checkpoints?.map((cp) => mapRowToCheckpoint(cp as unknown as JmpCheckpointRow)) || [],
        };
      })
    );

    return jmps;
  } catch (error) {
    console.error('Error fetching active journeys:', error);
    return [];
  }
}

/**
 * Get JMP status counts
 */
export async function getJmpStatusCounts(): Promise<JmpStatusCounts> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('journey_management_plans')
      .select('status');

    if (error) throw error;

    const counts: JmpStatusCounts = {
      draft: 0,
      pending_review: 0,
      approved: 0,
      active: 0,
      completed: 0,
    };

    (data || []).forEach((row) => {
      if (row.status && row.status in counts) {
        counts[row.status as keyof JmpStatusCounts]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error fetching JMP status counts:', error);
    return { draft: 0, pending_review: 0, approved: 0, active: 0, completed: 0 };
  }
}


/**
 * Submit JMP for review
 */
export async function submitJmpForReview(
  id: string,
  preparedBy: string
): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();

    // Resolve auth UUID → user_profiles.id → employees.id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', preparedBy)
      .single();

    let employeeId: string | null = null;
    if (profile) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      employeeId = employee?.id || null;
    }

    // Check current status
    const { data: jmp, error: fetchError } = await supabase
      .from('journey_management_plans')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!isValidStatusTransition(jmp.status as JmpStatus, 'pending_review')) {
      return { success: false, error: `Cannot submit JMP from ${jmp.status} status` };
    }

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .update({
        status: 'pending_review',
        prepared_by: employeeId,
        prepared_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath(`/engineering/jmp/${id}`);
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error submitting JMP for review:', error);
    return { success: false, error: 'Failed to submit JMP for review' };
  }
}

/**
 * Approve JMP
 */
export async function approveJmp(
  id: string,
  approvedBy: string
): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();

    // Resolve auth UUID → user_profiles.id → employees.id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', approvedBy)
      .single();

    let employeeId: string | null = null;
    if (profile) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      employeeId = employee?.id || null;
    }

    // Check current status and convoy commander
    const { data: jmp, error: fetchError } = await supabase
      .from('journey_management_plans')
      .select('status, convoy_commander_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!isValidStatusTransition(jmp.status as JmpStatus, 'approved')) {
      return { success: false, error: `Cannot approve JMP from ${jmp.status} status` };
    }

    if (!jmp.convoy_commander_id) {
      return { success: false, error: 'Convoy commander must be assigned before approval' };
    }

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .update({
        status: 'approved',
        approved_by: employeeId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath(`/engineering/jmp/${id}`);
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error approving JMP:', error);
    return { success: false, error: 'Failed to approve JMP' };
  }
}

/**
 * Reject JMP (return to draft)
 */
export async function rejectJmp(
  id: string,
  reason: string
): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();
    
    // Check current status
    const { data: jmp, error: fetchError } = await supabase
      .from('journey_management_plans')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    if (!isValidStatusTransition(jmp.status as JmpStatus, 'draft')) {
      return { success: false, error: `Cannot reject JMP from ${jmp.status} status` };
    }

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .update({
        status: 'draft',
        journey_log: reason ? `Rejected: ${reason}` : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath(`/engineering/jmp/${id}`);
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error rejecting JMP:', error);
    return { success: false, error: 'Failed to reject JMP' };
  }
}

/**
 * Start journey execution
 */
export async function startJourney(id: string): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();
    
    // Check current status
    const { data: jmp, error: fetchError } = await supabase
      .from('journey_management_plans')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    if (!isValidStatusTransition(jmp.status as JmpStatus, 'active')) {
      return { success: false, error: `Cannot start journey from ${jmp.status} status` };
    }

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .update({
        status: 'active',
        actual_departure: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath('/engineering/jmp/active');
    revalidatePath(`/engineering/jmp/${id}`);
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error starting journey:', error);
    return { success: false, error: 'Failed to start journey' };
  }
}

/**
 * Complete journey
 */
export async function completeJourney(
  id: string,
  data: PostJourneyData
): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();
    
    // Check current status
    const { data: jmp, error: fetchError } = await supabase
      .from('journey_management_plans')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    if (!isValidStatusTransition(jmp.status as JmpStatus, 'completed')) {
      return { success: false, error: `Cannot complete journey from ${jmp.status} status` };
    }

    // Validate incident summary if incidents occurred
    if (data.incidentsOccurred && !data.incidentSummary?.trim()) {
      return { success: false, error: 'Incident summary is required when incidents occurred' };
    }

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .update({
        status: 'completed',
        actual_arrival: new Date().toISOString(),
        journey_log: data.journeyLog || null,
        incidents_occurred: data.incidentsOccurred,
        incident_summary: data.incidentSummary || null,
        lessons_learned: data.lessonsLearned || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath('/engineering/jmp/active');
    revalidatePath(`/engineering/jmp/${id}`);
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error completing journey:', error);
    return { success: false, error: 'Failed to complete journey' };
  }
}

/**
 * Cancel journey
 */
export async function cancelJourney(
  id: string,
  reason: string
): Promise<ActionResult<JourneyManagementPlan>> {
  try {
    const supabase = await createClient();
    
    // Check current status
    const { data: jmp, error: fetchError } = await supabase
      .from('journey_management_plans')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    if (!isValidStatusTransition(jmp.status as JmpStatus, 'cancelled')) {
      return { success: false, error: `Cannot cancel journey from ${jmp.status} status` };
    }

    const { data: result, error } = await supabase
      .from('journey_management_plans')
      .update({
        status: 'cancelled',
        journey_log: reason ? `Cancelled: ${reason}` : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath('/engineering/jmp/active');
    revalidatePath(`/engineering/jmp/${id}`);
    return { success: true, data: mapRowToJmp(result as unknown as JmpRow) };
  } catch (error) {
    console.error('Error cancelling journey:', error);
    return { success: false, error: 'Failed to cancel journey' };
  }
}


// =====================================================
// CHECKPOINT ACTIONS
// =====================================================

/**
 * Add checkpoint to JMP
 */
export async function addCheckpoint(
  jmpId: string,
  data: CheckpointFormData
): Promise<ActionResult<JmpCheckpoint>> {
  try {
    const supabase = await createClient();
    
    // Get next checkpoint order
    const { data: existing } = await supabase
      .from('jmp_checkpoints')
      .select('checkpoint_order')
      .eq('jmp_id', jmpId)
      .order('checkpoint_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].checkpoint_order + 1 : 1;

    const insertData = {
      jmp_id: jmpId,
      checkpoint_order: nextOrder,
      location_name: data.locationName,
      location_type: data.locationType,
      km_from_start: data.kmFromStart || null,
      coordinates: data.coordinates || null,
      planned_arrival: data.plannedArrival || null,
      planned_departure: data.plannedDeparture || null,
      stop_duration_minutes: data.stopDurationMinutes || null,
      activities: data.activities || null,
      report_required: data.reportRequired || false,
      report_to: data.reportTo || null,
      status: 'pending',
    };

    const { data: result, error } = await supabase
      .from('jmp_checkpoints')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/engineering/jmp/${jmpId}`);
    return { success: true, data: mapRowToCheckpoint(result as unknown as JmpCheckpointRow) };
  } catch (error) {
    console.error('Error adding checkpoint:', error);
    return { success: false, error: 'Failed to add checkpoint' };
  }
}

/**
 * Update checkpoint
 */
export async function updateCheckpoint(
  id: string,
  data: Partial<CheckpointFormData>
): Promise<ActionResult<JmpCheckpoint>> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {};

    if (data.locationName !== undefined) updateData.location_name = data.locationName;
    if (data.locationType !== undefined) updateData.location_type = data.locationType;
    if (data.kmFromStart !== undefined) updateData.km_from_start = data.kmFromStart || null;
    if (data.coordinates !== undefined) updateData.coordinates = data.coordinates || null;
    if (data.plannedArrival !== undefined) updateData.planned_arrival = data.plannedArrival || null;
    if (data.plannedDeparture !== undefined) updateData.planned_departure = data.plannedDeparture || null;
    if (data.stopDurationMinutes !== undefined) updateData.stop_duration_minutes = data.stopDurationMinutes || null;
    if (data.activities !== undefined) updateData.activities = data.activities || null;
    if (data.reportRequired !== undefined) updateData.report_required = data.reportRequired;
    if (data.reportTo !== undefined) updateData.report_to = data.reportTo || null;

    const { data: result, error } = await supabase
      .from('jmp_checkpoints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/engineering/jmp`);
    return { success: true, data: mapRowToCheckpoint(result as unknown as JmpCheckpointRow) };
  } catch (error) {
    console.error('Error updating checkpoint:', error);
    return { success: false, error: 'Failed to update checkpoint' };
  }
}

/**
 * Delete checkpoint
 */
export async function deleteCheckpoint(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('jmp_checkpoints')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    return { success: true };
  } catch (error) {
    console.error('Error deleting checkpoint:', error);
    return { success: false, error: 'Failed to delete checkpoint' };
  }
}

/**
 * Mark checkpoint arrival
 */
export async function markCheckpointArrival(
  id: string,
  actualTime?: string
): Promise<ActionResult<JmpCheckpoint>> {
  try {
    const supabase = await createClient();
    
    const { data: result, error } = await supabase
      .from('jmp_checkpoints')
      .update({
        actual_arrival: actualTime || new Date().toISOString(),
        status: 'arrived',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath('/engineering/jmp/active');
    return { success: true, data: mapRowToCheckpoint(result as unknown as JmpCheckpointRow) };
  } catch (error) {
    console.error('Error marking checkpoint arrival:', error);
    return { success: false, error: 'Failed to mark checkpoint arrival' };
  }
}

/**
 * Mark checkpoint departure
 */
export async function markCheckpointDeparture(
  id: string,
  actualTime?: string
): Promise<ActionResult<JmpCheckpoint>> {
  try {
    const supabase = await createClient();
    
    const { data: result, error } = await supabase
      .from('jmp_checkpoints')
      .update({
        actual_departure: actualTime || new Date().toISOString(),
        status: 'departed',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    revalidatePath('/engineering/jmp/active');
    return { success: true, data: mapRowToCheckpoint(result as unknown as JmpCheckpointRow) };
  } catch (error) {
    console.error('Error marking checkpoint departure:', error);
    return { success: false, error: 'Failed to mark checkpoint departure' };
  }
}


// =====================================================
// RISK ASSESSMENT ACTIONS
// =====================================================

/**
 * Add risk to JMP
 */
export async function addRisk(
  jmpId: string,
  data: RiskFormData
): Promise<ActionResult<JmpRiskAssessment>> {
  try {
    const supabase = await createClient();
    
    // Calculate risk level
    const riskLevel = calculateRiskLevel(data.likelihood, data.consequence);

    const insertData = {
      jmp_id: jmpId,
      risk_category: data.riskCategory,
      risk_description: data.riskDescription,
      likelihood: data.likelihood,
      consequence: data.consequence,
      risk_level: riskLevel,
      control_measures: data.controlMeasures,
      residual_risk_level: data.residualRiskLevel || null,
      responsible: data.responsible || null,
    };

    const { data: result, error } = await supabase
      .from('jmp_risk_assessment')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/engineering/jmp/${jmpId}`);
    return {
      success: true,
      data: {
        id: result.id,
        jmpId: result.jmp_id,
        riskCategory: result.risk_category as RiskCategory,
        riskDescription: result.risk_description,
        likelihood: result.likelihood as Likelihood,
        consequence: result.consequence as Consequence,
        riskLevel: result.risk_level as RiskLevel,
        controlMeasures: result.control_measures,
        residualRiskLevel: (result.residual_risk_level as RiskLevel) || undefined,
        responsible: result.responsible || undefined,
        createdAt: result.created_at || '',
      },
    };
  } catch (error) {
    console.error('Error adding risk:', error);
    return { success: false, error: 'Failed to add risk' };
  }
}

/**
 * Update risk
 */
export async function updateRisk(
  id: string,
  data: Partial<RiskFormData>
): Promise<ActionResult<JmpRiskAssessment>> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {};

    if (data.riskCategory !== undefined) updateData.risk_category = data.riskCategory;
    if (data.riskDescription !== undefined) updateData.risk_description = data.riskDescription;
    if (data.likelihood !== undefined) updateData.likelihood = data.likelihood;
    if (data.consequence !== undefined) updateData.consequence = data.consequence;
    if (data.controlMeasures !== undefined) updateData.control_measures = data.controlMeasures;
    if (data.residualRiskLevel !== undefined) updateData.residual_risk_level = data.residualRiskLevel || null;
    if (data.responsible !== undefined) updateData.responsible = data.responsible || null;

    // Recalculate risk level if likelihood or consequence changed
    if (data.likelihood !== undefined || data.consequence !== undefined) {
      const { data: existing } = await supabase
        .from('jmp_risk_assessment')
        .select('likelihood, consequence')
        .eq('id', id)
        .single();

      if (existing) {
        const likelihood = data.likelihood || (existing.likelihood as Likelihood);
        const consequence = data.consequence || (existing.consequence as Consequence);
        updateData.risk_level = calculateRiskLevel(likelihood, consequence);
      }
    }

    const { data: result, error } = await supabase
      .from('jmp_risk_assessment')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    return {
      success: true,
      data: {
        id: result.id,
        jmpId: result.jmp_id,
        riskCategory: result.risk_category as RiskCategory,
        riskDescription: result.risk_description,
        likelihood: result.likelihood as Likelihood,
        consequence: result.consequence as Consequence,
        riskLevel: result.risk_level as RiskLevel,
        controlMeasures: result.control_measures,
        residualRiskLevel: (result.residual_risk_level as RiskLevel) || undefined,
        responsible: result.responsible || undefined,
        createdAt: result.created_at || '',
      },
    };
  } catch (error) {
    console.error('Error updating risk:', error);
    return { success: false, error: 'Failed to update risk' };
  }
}

/**
 * Delete risk
 */
export async function deleteRisk(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('jmp_risk_assessment')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/engineering/jmp');
    return { success: true };
  } catch (error) {
    console.error('Error deleting risk:', error);
    return { success: false, error: 'Failed to delete risk' };
  }
}

/**
 * Get completed surveys for JMP creation
 */
export async function getCompletedSurveys(): Promise<{ id: string; survey_number: string; cargo_description: string; origin_location: string; destination_location: string }[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('route_surveys')
      .select('id, survey_number, cargo_description, origin_location, destination_location')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching completed surveys:', error);
    return [];
  }
}

/**
 * Get employees for convoy commander selection
 */
export async function getEmployeesForSelection(): Promise<{ id: string; full_name: string; phone?: string }[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, phone')
      .eq('status', 'active')
      .order('full_name');

    if (error) throw error;
    return (data || []).map(emp => ({
      id: emp.id,
      full_name: emp.full_name,
      phone: emp.phone || undefined,
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

/**
 * Get customers for selection
 */
export async function getCustomersForSelection(): Promise<{ id: string; name: string }[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}
