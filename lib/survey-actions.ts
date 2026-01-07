'use server';

// =====================================================
// v0.56: ROUTE SURVEY SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  RouteSurvey,
  RouteWaypoint,
  SurveyChecklistItem,
  SurveyFormData,
  WaypointFormData,
  FeasibilityAssessment,
  ChecklistStatus,
  SurveyStatus,
  RouteSurveyWithRelations,
  RouteSurveyRow,
  RouteWaypointRow,
  SurveyChecklistItemRow,
} from '@/types/survey';
import {
  rowToSurvey,
  rowToWaypoint,
  rowToChecklistItem,
  validateSurveyData,
  validateWaypointData,
  validateFeasibilityData,
} from '@/lib/survey-utils';

// =====================================================
// SURVEY CRUD OPERATIONS
// =====================================================

export async function createSurvey(data: SurveyFormData): Promise<{ success: boolean; data?: RouteSurvey; error?: string }> {
  try {
    const validation = validateSurveyData(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: survey, error } = await supabase
      .from('route_surveys')
      .insert({
        quotation_id: data.quotationId || null,
        project_id: data.projectId || null,
        customer_id: data.customerId || null,
        cargo_description: data.cargoDescription,
        cargo_length_m: data.cargoLengthM || null,
        cargo_width_m: data.cargoWidthM || null,
        cargo_height_m: data.cargoHeightM || null,
        cargo_weight_tons: data.cargoWeightTons || null,
        transport_config: data.transportConfig || null,
        total_length_m: data.totalLengthM || null,
        total_width_m: data.totalWidthM || null,
        total_height_m: data.totalHeightM || null,
        total_weight_tons: data.totalWeightTons || null,
        axle_configuration: data.axleConfiguration || null,
        ground_clearance_m: data.groundClearanceM || null,
        turning_radius_m: data.turningRadiusM || null,
        origin_location: data.originLocation,
        origin_address: data.originAddress || null,
        origin_coordinates: data.originCoordinates || null,
        destination_location: data.destinationLocation,
        destination_address: data.destinationAddress || null,
        destination_coordinates: data.destinationCoordinates || null,
        surveyor_id: data.surveyorId || null,
        survey_date: data.surveyDate || null,
        notes: data.notes || null,
        status: 'requested',
        requested_by: user.id,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating survey:', error);
      return { success: false, error: error.message };
    }

    // Initialize checklist from template
    await initializeSurveyChecklist(survey.id);

    revalidatePath('/engineering/surveys');
    return { success: true, data: rowToSurvey(survey as unknown as RouteSurveyRow) };
  } catch (error) {
    console.error('Error in createSurvey:', error);
    return { success: false, error: 'Failed to create survey' };
  }
}

export async function getSurvey(id: string): Promise<{ success: boolean; data?: RouteSurvey; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: survey, error } = await supabase
      .from('route_surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: rowToSurvey(survey as unknown as RouteSurveyRow) };
  } catch (error) {
    console.error('Error in getSurvey:', error);
    return { success: false, error: 'Failed to get survey' };
  }
}

export async function getSurveyWithRelations(id: string): Promise<{ success: boolean; data?: RouteSurveyWithRelations; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: survey, error } = await supabase
      .from('route_surveys')
      .select(`
        *,
        customer:customers(id, name),
        quotation:quotations(id, quotation_number),
        project:projects(id, name),
        surveyor:employees(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Get waypoints
    const { data: waypoints } = await supabase
      .from('route_waypoints')
      .select('*')
      .eq('survey_id', id)
      .order('waypoint_order');

    // Get checklist
    const { data: checklist } = await supabase
      .from('route_survey_checklist')
      .select('*')
      .eq('survey_id', id)
      .order('created_at');

    const surveyData = rowToSurvey(survey as unknown as RouteSurveyRow);
    return {
      success: true,
      data: {
        ...surveyData,
        customer: survey.customer ?? undefined,
        quotation: survey.quotation ?? undefined,
        project: survey.project ?? undefined,
        surveyor: survey.surveyor ?? undefined,
        waypoints: waypoints?.map(w => rowToWaypoint(w as unknown as RouteWaypointRow)) || [],
        checklist: checklist?.map(c => rowToChecklistItem(c as unknown as SurveyChecklistItemRow)) || [],
      },
    };
  } catch (error) {
    console.error('Error in getSurveyWithRelations:', error);
    return { success: false, error: 'Failed to get survey' };
  }
}

export async function getSurveys(): Promise<{ success: boolean; data?: RouteSurvey[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: surveys, error } = await supabase
      .from('route_surveys')
      .select(`
        *,
        customer:customers(id, name),
        surveyor:employees(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: surveys.map(s => rowToSurvey(s as unknown as RouteSurveyRow)) };
  } catch (error) {
    console.error('Error in getSurveys:', error);
    return { success: false, error: 'Failed to get surveys' };
  }
}

export async function updateSurvey(
  id: string,
  data: Partial<SurveyFormData>
): Promise<{ success: boolean; data?: RouteSurvey; error?: string }> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.quotationId !== undefined) updateData.quotation_id = data.quotationId || null;
    if (data.projectId !== undefined) updateData.project_id = data.projectId || null;
    if (data.customerId !== undefined) updateData.customer_id = data.customerId || null;
    if (data.cargoDescription !== undefined) updateData.cargo_description = data.cargoDescription;
    if (data.cargoLengthM !== undefined) updateData.cargo_length_m = data.cargoLengthM;
    if (data.cargoWidthM !== undefined) updateData.cargo_width_m = data.cargoWidthM;
    if (data.cargoHeightM !== undefined) updateData.cargo_height_m = data.cargoHeightM;
    if (data.cargoWeightTons !== undefined) updateData.cargo_weight_tons = data.cargoWeightTons;
    if (data.transportConfig !== undefined) updateData.transport_config = data.transportConfig;
    if (data.totalLengthM !== undefined) updateData.total_length_m = data.totalLengthM;
    if (data.totalWidthM !== undefined) updateData.total_width_m = data.totalWidthM;
    if (data.totalHeightM !== undefined) updateData.total_height_m = data.totalHeightM;
    if (data.totalWeightTons !== undefined) updateData.total_weight_tons = data.totalWeightTons;
    if (data.axleConfiguration !== undefined) updateData.axle_configuration = data.axleConfiguration;
    if (data.groundClearanceM !== undefined) updateData.ground_clearance_m = data.groundClearanceM;
    if (data.turningRadiusM !== undefined) updateData.turning_radius_m = data.turningRadiusM;
    if (data.originLocation !== undefined) updateData.origin_location = data.originLocation;
    if (data.originAddress !== undefined) updateData.origin_address = data.originAddress;
    if (data.originCoordinates !== undefined) updateData.origin_coordinates = data.originCoordinates;
    if (data.destinationLocation !== undefined) updateData.destination_location = data.destinationLocation;
    if (data.destinationAddress !== undefined) updateData.destination_address = data.destinationAddress;
    if (data.destinationCoordinates !== undefined) updateData.destination_coordinates = data.destinationCoordinates;
    if (data.surveyorId !== undefined) updateData.surveyor_id = data.surveyorId || null;
    if (data.surveyDate !== undefined) updateData.survey_date = data.surveyDate || null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: survey, error } = await supabase
      .from('route_surveys')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/engineering/surveys');
    revalidatePath(`/engineering/surveys/${id}`);
    return { success: true, data: rowToSurvey(survey as unknown as RouteSurveyRow) };
  } catch (error) {
    console.error('Error in updateSurvey:', error);
    return { success: false, error: 'Failed to update survey' };
  }
}

export async function deleteSurvey(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('route_surveys')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/engineering/surveys');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteSurvey:', error);
    return { success: false, error: 'Failed to delete survey' };
  }
}

// =====================================================
// SURVEY STATUS OPERATIONS
// =====================================================

export async function scheduleSurvey(
  id: string,
  surveyorId: string,
  surveyDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get surveyor name
    const { data: employee } = await supabase
      .from('employees')
      .select('full_name')
      .eq('id', surveyorId)
      .single();

    const { error } = await supabase
      .from('route_surveys')
      .update({
        surveyor_id: surveyorId,
        surveyor_name: employee?.full_name || null,
        survey_date: surveyDate,
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/engineering/surveys');
    revalidatePath(`/engineering/surveys/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in scheduleSurvey:', error);
    return { success: false, error: 'Failed to schedule survey' };
  }
}

export async function startSurvey(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('route_surveys')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/engineering/surveys');
    revalidatePath(`/engineering/surveys/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in startSurvey:', error);
    return { success: false, error: 'Failed to start survey' };
  }
}

export async function completeSurvey(
  id: string,
  assessment: FeasibilityAssessment
): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validateFeasibilityData(assessment);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const supabase = await createClient();
    
    const { error } = await supabase
      .from('route_surveys')
      .update({
        feasibility: assessment.feasibility,
        feasibility_notes: assessment.feasibilityNotes,
        route_distance_km: assessment.routeDistanceKm,
        estimated_travel_time_hours: assessment.estimatedTravelTimeHours,
        permits_required: assessment.permitsRequired as unknown as never,
        escort_required: assessment.escortRequired,
        escort_type: assessment.escortType || null,
        escort_vehicles_count: assessment.escortVehiclesCount || null,
        travel_time_restrictions: assessment.travelTimeRestrictions || null,
        survey_cost: assessment.surveyCost || null,
        permit_cost_estimate: assessment.permitCostEstimate || null,
        escort_cost_estimate: assessment.escortCostEstimate || null,
        road_repair_cost_estimate: assessment.roadRepairCostEstimate || null,
        total_route_cost_estimate: assessment.totalRouteCostEstimate,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/engineering/surveys');
    revalidatePath(`/engineering/surveys/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in completeSurvey:', error);
    return { success: false, error: 'Failed to complete survey' };
  }
}

export async function cancelSurvey(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('route_surveys')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/engineering/surveys');
    revalidatePath(`/engineering/surveys/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in cancelSurvey:', error);
    return { success: false, error: 'Failed to cancel survey' };
  }
}

export async function updateSurveyStatus(
  id: string,
  status: SurveyStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('route_surveys')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/engineering/surveys');
    revalidatePath(`/engineering/surveys/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateSurveyStatus:', error);
    return { success: false, error: 'Failed to update survey status' };
  }
}


// =====================================================
// WAYPOINT OPERATIONS
// =====================================================

export async function createWaypoint(
  surveyId: string,
  data: WaypointFormData
): Promise<{ success: boolean; data?: RouteWaypoint; error?: string }> {
  try {
    const validation = validateWaypointData(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const supabase = await createClient();
    
    // Get next order
    const { data: maxOrder } = await supabase
      .from('route_waypoints')
      .select('waypoint_order')
      .eq('survey_id', surveyId)
      .order('waypoint_order', { ascending: false })
      .limit(1)
      .single();

    const order = (maxOrder?.waypoint_order || 0) + 1;

    const { data: waypoint, error } = await supabase
      .from('route_waypoints')
      .insert({
        survey_id: surveyId,
        waypoint_order: order,
        waypoint_type: data.waypointType,
        location_name: data.locationName,
        coordinates: data.coordinates || null,
        km_from_start: data.kmFromStart || null,
        road_condition: data.roadCondition || null,
        road_width_m: data.roadWidthM || null,
        road_surface: data.roadSurface || null,
        vertical_clearance_m: data.verticalClearanceM || null,
        horizontal_clearance_m: data.horizontalClearanceM || null,
        bridge_name: data.bridgeName || null,
        bridge_capacity_tons: data.bridgeCapacityTons || null,
        bridge_width_m: data.bridgeWidthM || null,
        bridge_length_m: data.bridgeLengthM || null,
        turn_radius_available_m: data.turnRadiusAvailableM || null,
        turn_feasible: data.turnFeasible ?? null,
        obstacle_type: data.obstacleType || null,
        obstacle_description: data.obstacleDescription || null,
        action_required: data.actionRequired || null,
        action_cost_estimate: data.actionCostEstimate || null,
        action_responsible: data.actionResponsible || null,
        is_passable: data.isPassable ?? true,
        passable_notes: data.passableNotes || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/engineering/surveys/${surveyId}`);
    return { success: true, data: rowToWaypoint(waypoint as unknown as RouteWaypointRow) };
  } catch (error) {
    console.error('Error in createWaypoint:', error);
    return { success: false, error: 'Failed to create waypoint' };
  }
}

export async function updateWaypoint(
  id: string,
  data: Partial<WaypointFormData>
): Promise<{ success: boolean; data?: RouteWaypoint; error?: string }> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {};

    if (data.waypointType !== undefined) updateData.waypoint_type = data.waypointType;
    if (data.locationName !== undefined) updateData.location_name = data.locationName;
    if (data.coordinates !== undefined) updateData.coordinates = data.coordinates || null;
    if (data.kmFromStart !== undefined) updateData.km_from_start = data.kmFromStart;
    if (data.roadCondition !== undefined) updateData.road_condition = data.roadCondition || null;
    if (data.roadWidthM !== undefined) updateData.road_width_m = data.roadWidthM;
    if (data.roadSurface !== undefined) updateData.road_surface = data.roadSurface || null;
    if (data.verticalClearanceM !== undefined) updateData.vertical_clearance_m = data.verticalClearanceM;
    if (data.horizontalClearanceM !== undefined) updateData.horizontal_clearance_m = data.horizontalClearanceM;
    if (data.bridgeName !== undefined) updateData.bridge_name = data.bridgeName || null;
    if (data.bridgeCapacityTons !== undefined) updateData.bridge_capacity_tons = data.bridgeCapacityTons;
    if (data.bridgeWidthM !== undefined) updateData.bridge_width_m = data.bridgeWidthM;
    if (data.bridgeLengthM !== undefined) updateData.bridge_length_m = data.bridgeLengthM;
    if (data.turnRadiusAvailableM !== undefined) updateData.turn_radius_available_m = data.turnRadiusAvailableM;
    if (data.turnFeasible !== undefined) updateData.turn_feasible = data.turnFeasible;
    if (data.obstacleType !== undefined) updateData.obstacle_type = data.obstacleType || null;
    if (data.obstacleDescription !== undefined) updateData.obstacle_description = data.obstacleDescription || null;
    if (data.actionRequired !== undefined) updateData.action_required = data.actionRequired || null;
    if (data.actionCostEstimate !== undefined) updateData.action_cost_estimate = data.actionCostEstimate;
    if (data.actionResponsible !== undefined) updateData.action_responsible = data.actionResponsible || null;
    if (data.isPassable !== undefined) updateData.is_passable = data.isPassable;
    if (data.passableNotes !== undefined) updateData.passable_notes = data.passableNotes || null;

    const { data: waypoint, error } = await supabase
      .from('route_waypoints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/engineering/surveys/${waypoint.survey_id}`);
    return { success: true, data: rowToWaypoint(waypoint as unknown as RouteWaypointRow) };
  } catch (error) {
    console.error('Error in updateWaypoint:', error);
    return { success: false, error: 'Failed to update waypoint' };
  }
}

export async function deleteWaypoint(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get survey_id before deleting
    const { data: waypoint } = await supabase
      .from('route_waypoints')
      .select('survey_id, waypoint_order')
      .eq('id', id)
      .single();

    if (!waypoint) {
      return { success: false, error: 'Waypoint not found' };
    }

    const { error } = await supabase
      .from('route_waypoints')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Reorder remaining waypoints
    const { data: remainingWaypoints } = await supabase
      .from('route_waypoints')
      .select('id, waypoint_order')
      .eq('survey_id', waypoint.survey_id)
      .order('waypoint_order');

    if (remainingWaypoints) {
      for (let i = 0; i < remainingWaypoints.length; i++) {
        if (remainingWaypoints[i].waypoint_order !== i + 1) {
          await supabase
            .from('route_waypoints')
            .update({ waypoint_order: i + 1 })
            .eq('id', remainingWaypoints[i].id);
        }
      }
    }

    revalidatePath(`/engineering/surveys/${waypoint.survey_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteWaypoint:', error);
    return { success: false, error: 'Failed to delete waypoint' };
  }
}

export async function getWaypoints(surveyId: string): Promise<{ success: boolean; data?: RouteWaypoint[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: waypoints, error } = await supabase
      .from('route_waypoints')
      .select('*')
      .eq('survey_id', surveyId)
      .order('waypoint_order');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: waypoints.map(w => rowToWaypoint(w as unknown as RouteWaypointRow)) };
  } catch (error) {
    console.error('Error in getWaypoints:', error);
    return { success: false, error: 'Failed to get waypoints' };
  }
}

// =====================================================
// CHECKLIST OPERATIONS
// =====================================================

export async function initializeSurveyChecklist(surveyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get template items
    const { data: template, error: templateError } = await supabase
      .from('route_survey_checklist_template')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (templateError) {
      return { success: false, error: templateError.message };
    }

    if (!template || template.length === 0) {
      return { success: true }; // No template items
    }

    // Create checklist items
    const checklistItems = template.map((item) => ({
      survey_id: surveyId,
      category: item.category,
      check_item: item.check_item,
      status: 'pending',
    }));

    const { error } = await supabase
      .from('route_survey_checklist')
      .insert(checklistItems);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in initializeSurveyChecklist:', error);
    return { success: false, error: 'Failed to initialize checklist' };
  }
}

export async function updateChecklistItem(
  id: string,
  status: ChecklistStatus,
  notes?: string
): Promise<{ success: boolean; data?: SurveyChecklistItem; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { data: item, error } = await supabase
      .from('route_survey_checklist')
      .update({
        status,
        notes: notes || null,
        checked_by: user?.id || null,
        checked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/engineering/surveys/${item.survey_id}`);
    return { success: true, data: rowToChecklistItem(item as unknown as SurveyChecklistItemRow) };
  } catch (error) {
    console.error('Error in updateChecklistItem:', error);
    return { success: false, error: 'Failed to update checklist item' };
  }
}

export async function getChecklist(surveyId: string): Promise<{ success: boolean; data?: SurveyChecklistItem[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: checklist, error } = await supabase
      .from('route_survey_checklist')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: checklist.map(c => rowToChecklistItem(c as unknown as SurveyChecklistItemRow)) };
  } catch (error) {
    console.error('Error in getChecklist:', error);
    return { success: false, error: 'Failed to get checklist' };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export async function getEmployees(): Promise<{ success: boolean; data?: { id: string; full_name: string }[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, full_name')
      .order('full_name');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: employees };
  } catch (error) {
    console.error('Error in getEmployees:', error);
    return { success: false, error: 'Failed to get employees' };
  }
}

export async function getCustomers(): Promise<{ success: boolean; data?: { id: string; name: string }[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: customers };
  } catch (error) {
    console.error('Error in getCustomers:', error);
    return { success: false, error: 'Failed to get customers' };
  }
}

export async function getQuotations(): Promise<{ success: boolean; data?: { id: string; quotation_number: string }[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: quotations, error } = await supabase
      .from('quotations')
      .select('id, quotation_number')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: quotations };
  } catch (error) {
    console.error('Error in getQuotations:', error);
    return { success: false, error: 'Failed to get quotations' };
  }
}

export async function getProjects(): Promise<{ success: boolean; data?: { id: string; name: string }[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: projects };
  } catch (error) {
    console.error('Error in getProjects:', error);
    return { success: false, error: 'Failed to get projects' };
  }
}
