'use server';

// =====================================================
// v0.46: HSE - INCIDENT REPORTING SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  Incident,
  IncidentCategory,
  IncidentPerson,
  IncidentHistoryEntry,
  IncidentStatistics,
  IncidentDashboardSummary,
  ReportIncidentInput,
  AddPersonInput,
  AddActionInput,
  UpdateRootCauseInput,
  CloseIncidentInput,
  IncidentFilters,
  IncidentAction,
  ActionStatus,
  ContributingFactor,
  IncidentRow,
  IncidentCategoryRow,
  IncidentPersonRow,
  IncidentHistoryRow,
  transformIncidentRow,
  transformCategoryRow,
  transformPersonRow,
  transformHistoryRow,
} from '@/types/incident';
import {
  validateIncidentInput,
  calculateDaysSinceLastLTI,
  calculateMonthlyTrend,
  countBySeverity,
  calculateTotalDaysLost,
  getOpenInvestigationsCount,
} from './incident-utils';
import {
  notifyIncidentReported,
  notifyInvestigatorAssigned,
  notifyActionAssigned,
  notifyIncidentClosed,
} from './notifications/incident-notifications';

// Type helper for tables not yet in database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

// Helper function to bypass type checking for incident tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromIncidentTable = (supabase: any, table: string) => supabase.from(table) as AnyTable;

// =====================================================
// INCIDENT CATEGORIES
// =====================================================

/**
 * Get all active incident categories
 */
export async function getIncidentCategories(): Promise<{
  success: boolean;
  data?: IncidentCategory[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await fromIncidentTable(supabase, 'incident_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching incident categories:', error);
      return { success: false, error: 'Failed to fetch incident categories' };
    }

    return {
      success: true,
      data: (data as IncidentCategoryRow[]).map(transformCategoryRow),
    };
  } catch (error) {
    console.error('Error in getIncidentCategories:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// INCIDENT CRUD OPERATIONS
// =====================================================

/**
 * Report a new incident
 */
export async function reportIncident(
  input: ReportIncidentInput,
  persons: AddPersonInput[] = []
): Promise<{ success: boolean; data?: Incident; error?: string }> {
  try {
    // Validate input
    const validation = validateIncidentInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get employee ID for the user
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!employee) {
      return { success: false, error: 'Employee profile not found' };
    }

    // Get category to check if investigation is required
    const { data: category } = await fromIncidentTable(supabase, 'incident_categories')
      .select('requires_investigation')
      .eq('id', input.categoryId)
      .single();

    // Create incident
    const { data: incident, error: insertError } = await fromIncidentTable(supabase, 'incidents')
      .insert({
        category_id: input.categoryId,
        severity: input.severity,
        incident_type: input.incidentType,
        incident_date: input.incidentDate,
        incident_time: input.incidentTime || null,
        location_type: input.locationType,
        location_name: input.locationName || null,
        location_address: input.locationAddress || null,
        gps_coordinates: input.gpsCoordinates || null,
        title: input.title,
        description: input.description,
        immediate_actions: input.immediateActions || null,
        job_order_id: input.jobOrderId || null,
        asset_id: input.assetId || null,
        reported_by: employee.id,
        supervisor_id: input.supervisorId || null,
        investigation_required: category?.requires_investigation ?? true,
        status: 'reported',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating incident:', insertError);
      return { success: false, error: 'Failed to report incident' };
    }

    // Add persons involved
    if (persons.length > 0) {
      const personRecords = persons.map((p) => ({
        incident_id: incident.id,
        person_type: p.personType,
        employee_id: p.employeeId || null,
        person_name: p.personName || null,
        person_company: p.personCompany || null,
        person_phone: p.personPhone || null,
        injury_type: p.injuryType || null,
        injury_description: p.injuryDescription || null,
        body_part: p.bodyPart || null,
        treatment: p.treatment || null,
        days_lost: p.daysLost || 0,
        statement: p.statement || null,
      }));

      await fromIncidentTable(supabase, 'incident_persons').insert(personRecords);
    }

    // Log history
    await logIncidentHistory(
      incident.id,
      'created',
      'Insiden dilaporkan',
      null,
      'reported',
      user.id
    );

    // Notify supervisor if assigned
    if (input.supervisorId) {
      await fromIncidentTable(supabase, 'incidents')
        .update({ supervisor_notified_at: new Date().toISOString() })
        .eq('id', incident.id);
    }

    // Send notifications to HSE team and supervisor
    await notifyIncidentReported(
      incident.id,
      incident.incident_number,
      input.title,
      input.severity,
      input.supervisorId
    );

    revalidatePath('/hse');
    revalidatePath('/hse/incidents');

    return {
      success: true,
      data: transformIncidentRow(incident as IncidentRow),
    };
  } catch (error) {
    console.error('Error in reportIncident:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get incident by ID
 */
export async function getIncident(
  id: string
): Promise<{ success: boolean; data?: Incident; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await fromIncidentTable(supabase, 'incidents')
      .select(`
        *,
        incident_categories!inner (category_code, category_name),
        employees!incidents_reported_by_fkey (full_name),
        investigator:employees!incidents_investigator_id_fkey (full_name),
        supervisor:employees!incidents_supervisor_id_fkey (full_name),
        job_orders (jo_number),
        assets (asset_code, asset_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching incident:', error);
      return { success: false, error: 'Incident not found' };
    }

    // Get persons involved
    const { data: persons } = await fromIncidentTable(supabase, 'incident_persons')
      .select(`
        *,
        employees (full_name)
      `)
      .eq('incident_id', id);

    // Transform the data
    const incident = transformIncidentRow(data as IncidentRow);
    
    // Add related data
    const category = data.incident_categories as { category_code: string; category_name: string };
    const reporter = data.employees as { full_name: string } | null;
    const investigator = data.investigator as { full_name: string } | null;
    const supervisor = data.supervisor as { full_name: string } | null;
    const jobOrder = data.job_orders as { jo_number: string } | null;
    const asset = data.assets as { asset_code: string; asset_name: string } | null;

    incident.categoryCode = category.category_code;
    incident.categoryName = category.category_name;
    incident.reportedByName = reporter?.full_name;
    incident.investigatorName = investigator?.full_name;
    incident.supervisorName = supervisor?.full_name;
    incident.jobOrderNumber = jobOrder?.jo_number;
    incident.assetCode = asset?.asset_code;
    incident.assetName = asset?.asset_name;

    // Transform persons
    if (persons) {
      incident.persons = persons.map((p: IncidentPersonRow & { employees?: { full_name: string } | null }) => {
        const person = transformPersonRow(p as IncidentPersonRow);
        const emp = p.employees as { full_name: string } | null;
        person.employeeName = emp?.full_name;
        return person;
      });
    }

    return { success: true, data: incident };
  } catch (error) {
    console.error('Error in getIncident:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get incidents list with filters
 */
export async function getIncidents(
  filters: IncidentFilters = {}
): Promise<{ success: boolean; data?: Incident[]; error?: string }> {
  try {
    const supabase = await createClient();

    let query = fromIncidentTable(supabase, 'incidents')
      .select(`
        *,
        incident_categories!inner (category_code, category_name),
        employees!incidents_reported_by_fkey (full_name),
        investigator:employees!incidents_investigator_id_fkey (full_name)
      `)
      .order('incident_date', { ascending: false });

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.severity) {
      if (Array.isArray(filters.severity)) {
        query = query.in('severity', filters.severity);
      } else {
        query = query.eq('severity', filters.severity);
      }
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.incidentType) {
      query = query.eq('incident_type', filters.incidentType);
    }

    if (filters.dateFrom) {
      query = query.gte('incident_date', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('incident_date', filters.dateTo);
    }

    if (filters.reportedBy) {
      query = query.eq('reported_by', filters.reportedBy);
    }

    if (filters.investigatorId) {
      query = query.eq('investigator_id', filters.investigatorId);
    }

    if (filters.jobOrderId) {
      query = query.eq('job_order_id', filters.jobOrderId);
    }

    if (filters.assetId) {
      query = query.eq('asset_id', filters.assetId);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,incident_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching incidents:', error);
      return { success: false, error: 'Failed to fetch incidents' };
    }

    // Transform the data
    const incidents = (data || []).map((row: IncidentRow & { incident_categories: { category_code: string; category_name: string }; employees: { full_name: string } | null; investigator: { full_name: string } | null }) => {
      const incident = transformIncidentRow(row as IncidentRow);
      const category = row.incident_categories as { category_code: string; category_name: string };
      const reporter = row.employees as { full_name: string } | null;
      const investigator = row.investigator as { full_name: string } | null;

      incident.categoryCode = category.category_code;
      incident.categoryName = category.category_name;
      incident.reportedByName = reporter?.full_name;
      incident.investigatorName = investigator?.full_name;

      return incident;
    });

    return { success: true, data: incidents };
  } catch (error) {
    console.error('Error in getIncidents:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// INVESTIGATION FUNCTIONS
// =====================================================

/**
 * Start investigation for an incident
 */
export async function startInvestigation(
  incidentId: string,
  investigatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Get incident details for notification
    const { data: incidentData } = await fromIncidentTable(supabase, 'incidents')
      .select('incident_number, title')
      .eq('id', incidentId)
      .single();

    // Update incident
    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        status: 'under_investigation',
        investigator_id: investigatorId,
        investigation_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId)
      .eq('status', 'reported');

    if (error) {
      console.error('Error starting investigation:', error);
      return { success: false, error: 'Failed to start investigation' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'investigation_started',
      'Investigasi dimulai',
      'reported',
      'under_investigation',
      user?.id
    );

    // Notify investigator
    if (incidentData) {
      await notifyInvestigatorAssigned(
        incidentId,
        incidentData.incident_number,
        incidentData.title,
        investigatorId
      );
    }

    revalidatePath('/hse');
    revalidatePath('/hse/incidents');
    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in startInvestigation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update root cause analysis
 */
export async function updateRootCause(
  incidentId: string,
  input: UpdateRootCauseInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        root_cause: input.rootCause,
        contributing_factors: input.contributingFactors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Error updating root cause:', error);
      return { success: false, error: 'Failed to update root cause' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'root_cause_updated',
      'Root cause analysis diperbarui',
      null,
      input.rootCause,
      user?.id
    );

    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in updateRootCause:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Complete investigation
 */
export async function completeInvestigation(
  incidentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Get incident to check root cause
    const { data: incident } = await fromIncidentTable(supabase, 'incidents')
      .select('root_cause')
      .eq('id', incidentId)
      .single();

    if (!incident?.root_cause) {
      return { success: false, error: 'Root cause must be documented before completing investigation' };
    }

    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        status: 'pending_actions',
        investigation_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId)
      .eq('status', 'under_investigation');

    if (error) {
      console.error('Error completing investigation:', error);
      return { success: false, error: 'Failed to complete investigation' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'investigation_completed',
      'Investigasi selesai',
      'under_investigation',
      'pending_actions',
      user?.id
    );

    revalidatePath('/hse');
    revalidatePath('/hse/incidents');
    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in completeInvestigation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// ACTION MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Add corrective action to incident
 */
export async function addCorrectiveAction(
  incidentId: string,
  action: AddActionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Get current actions and incident details
    const { data: incident } = await fromIncidentTable(supabase, 'incidents')
      .select('corrective_actions, incident_number')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    // Get responsible person name
    const { data: responsible } = await supabase
      .from('employees')
      .select('full_name')
      .eq('id', action.responsibleId)
      .single();

    const newAction: IncidentAction = {
      id: crypto.randomUUID(),
      description: action.description,
      responsibleId: action.responsibleId,
      responsibleName: responsible?.full_name,
      dueDate: action.dueDate,
      status: 'pending',
    };

    const currentActions = (incident.corrective_actions || []) as IncidentAction[];
    const updatedActions = [...currentActions, newAction];

    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        corrective_actions: updatedActions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Error adding corrective action:', error);
      return { success: false, error: 'Failed to add corrective action' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'corrective_action_added',
      `Tindakan korektif ditambahkan: ${action.description}`,
      null,
      null,
      user?.id
    );

    // Notify responsible person
    await notifyActionAssigned(
      incidentId,
      incident.incident_number,
      action.description,
      action.responsibleId,
      'corrective',
      action.dueDate
    );

    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in addCorrectiveAction:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Add preventive action to incident
 */
export async function addPreventiveAction(
  incidentId: string,
  action: AddActionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Get current actions and incident details
    const { data: incident } = await fromIncidentTable(supabase, 'incidents')
      .select('preventive_actions, incident_number')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    // Get responsible person name
    const { data: responsible } = await supabase
      .from('employees')
      .select('full_name')
      .eq('id', action.responsibleId)
      .single();

    const newAction: IncidentAction = {
      id: crypto.randomUUID(),
      description: action.description,
      responsibleId: action.responsibleId,
      responsibleName: responsible?.full_name,
      dueDate: action.dueDate,
      status: 'pending',
    };

    const currentActions = (incident.preventive_actions || []) as IncidentAction[];
    const updatedActions = [...currentActions, newAction];

    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        preventive_actions: updatedActions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Error adding preventive action:', error);
      return { success: false, error: 'Failed to add preventive action' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'preventive_action_added',
      `Tindakan preventif ditambahkan: ${action.description}`,
      null,
      null,
      user?.id
    );

    // Notify responsible person
    await notifyActionAssigned(
      incidentId,
      incident.incident_number,
      action.description,
      action.responsibleId,
      'preventive',
      action.dueDate
    );

    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in addPreventiveAction:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Complete an action
 */
export async function completeAction(
  incidentId: string,
  actionId: string,
  actionType: 'corrective' | 'preventive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const field = actionType === 'corrective' ? 'corrective_actions' : 'preventive_actions';

    // Get current actions
    const { data: incident } = await fromIncidentTable(supabase, 'incidents')
      .select(field)
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    const actions = (incident[field] || []) as IncidentAction[];
    const actionIndex = actions.findIndex((a) => a.id === actionId);

    if (actionIndex === -1) {
      return { success: false, error: 'Action not found' };
    }

    // Update action status
    actions[actionIndex] = {
      ...actions[actionIndex],
      status: 'completed',
      completedAt: new Date().toISOString(),
    };

    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        [field]: actions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Error completing action:', error);
      return { success: false, error: 'Failed to complete action' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'action_completed',
      `Tindakan ${actionType === 'corrective' ? 'korektif' : 'preventif'} diselesaikan: ${actions[actionIndex].description}`,
      'pending',
      'completed',
      user?.id
    );

    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in completeAction:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// CLOSURE FUNCTIONS
// =====================================================

/**
 * Close an incident
 */
export async function closeIncident(
  incidentId: string,
  input: CloseIncidentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Get incident to validate closure
    const { data: incident } = await fromIncidentTable(supabase, 'incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    // Check if can close
    const incidentData = transformIncidentRow(incident as IncidentRow);
    
    // Get persons for validation
    const { data: persons } = await fromIncidentTable(supabase, 'incident_persons')
      .select('*')
      .eq('incident_id', incidentId);

    incidentData.persons = (persons || []).map((p: IncidentPersonRow) => transformPersonRow(p as IncidentPersonRow));

    // Import canCloseIncident from utils
    const { canCloseIncident } = await import('./incident-utils');
    const closeValidation = canCloseIncident(incidentData);

    if (!closeValidation.canClose) {
      return { success: false, error: closeValidation.reason };
    }

    // Close the incident
    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user?.id,
        closure_notes: input.closureNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Error closing incident:', error);
      return { success: false, error: 'Failed to close incident' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'closed',
      `Insiden ditutup: ${input.closureNotes}`,
      incident.status,
      'closed',
      user?.id
    );

    // Notify reporter that incident is closed
    await notifyIncidentClosed(
      incidentId,
      incident.incident_number,
      incident.title,
      incident.reported_by
    );

    revalidatePath('/hse');
    revalidatePath('/hse/incidents');
    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in closeIncident:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reject an incident report
 */
export async function rejectIncident(
  incidentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data: incident } = await fromIncidentTable(supabase, 'incidents')
      .select('status')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    if (incident.status !== 'reported') {
      return { success: false, error: 'Only reported incidents can be rejected' };
    }

    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        status: 'rejected',
        closure_notes: reason,
        closed_at: new Date().toISOString(),
        closed_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('Error rejecting incident:', error);
      return { success: false, error: 'Failed to reject incident' };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'rejected',
      `Insiden ditolak: ${reason}`,
      'reported',
      'rejected',
      user?.id
    );

    revalidatePath('/hse');
    revalidatePath('/hse/incidents');
    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in rejectIncident:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// PERSON MANAGEMENT
// =====================================================

/**
 * Add person to incident
 */
export async function addPersonToIncident(
  incidentId: string,
  person: AddPersonInput
): Promise<{ success: boolean; data?: IncidentPerson; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await fromIncidentTable(supabase, 'incident_persons')
      .insert({
        incident_id: incidentId,
        person_type: person.personType,
        employee_id: person.employeeId || null,
        person_name: person.personName || null,
        person_company: person.personCompany || null,
        person_phone: person.personPhone || null,
        injury_type: person.injuryType || null,
        injury_description: person.injuryDescription || null,
        body_part: person.bodyPart || null,
        treatment: person.treatment || null,
        days_lost: person.daysLost || 0,
        statement: person.statement || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding person to incident:', error);
      return { success: false, error: 'Failed to add person' };
    }

    revalidatePath(`/hse/incidents/${incidentId}`);

    return {
      success: true,
      data: transformPersonRow(data as IncidentPersonRow),
    };
  } catch (error) {
    console.error('Error in addPersonToIncident:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Remove person from incident
 */
export async function removePersonFromIncident(
  personId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get incident ID first
    const { data: person } = await fromIncidentTable(supabase, 'incident_persons')
      .select('incident_id')
      .eq('id', personId)
      .single();

    if (!person) {
      return { success: false, error: 'Person not found' };
    }

    const { error } = await fromIncidentTable(supabase, 'incident_persons')
      .delete()
      .eq('id', personId);

    if (error) {
      console.error('Error removing person from incident:', error);
      return { success: false, error: 'Failed to remove person' };
    }

    revalidatePath(`/hse/incidents/${person.incident_id}`);

    return { success: true };
  } catch (error) {
    console.error('Error in removePersonFromIncident:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// HISTORY FUNCTIONS
// =====================================================

/**
 * Get incident history
 */
export async function getIncidentHistory(
  incidentId: string
): Promise<{ success: boolean; data?: IncidentHistoryEntry[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await fromIncidentTable(supabase, 'incident_history')
      .select(`
        *,
        user_profiles (full_name)
      `)
      .eq('incident_id', incidentId)
      .order('performed_at', { ascending: false });

    if (error) {
      console.error('Error fetching incident history:', error);
      return { success: false, error: 'Failed to fetch history' };
    }

    const history = (data || []).map((row: IncidentHistoryRow & { user_profiles?: { full_name: string } | null }) => {
      const entry = transformHistoryRow(row as IncidentHistoryRow);
      const user = row.user_profiles as { full_name: string } | null;
      entry.performedByName = user?.full_name;
      return entry;
    });

    return { success: true, data: history };
  } catch (error) {
    console.error('Error in getIncidentHistory:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Log incident history entry
 */
async function logIncidentHistory(
  incidentId: string,
  actionType: string,
  description: string,
  previousValue: string | null,
  newValue: string | null,
  performedBy?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    await fromIncidentTable(supabase, 'incident_history').insert({
      incident_id: incidentId,
      action_type: actionType,
      description,
      previous_value: previousValue,
      new_value: newValue,
      performed_by: performedBy || null,
    });
  } catch (error) {
    console.error('Error logging incident history:', error);
  }
}

// =====================================================
// STATISTICS FUNCTIONS
// =====================================================

/**
 * Get incident statistics for dashboard
 */
export async function getIncidentStatistics(
  year?: number,
  month?: number
): Promise<{ success: boolean; data?: IncidentStatistics; error?: string }> {
  try {
    const supabase = await createClient();

    const currentYear = year || new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // Get all incidents for the year
    const { data: incidents, error } = await fromIncidentTable(supabase, 'incidents')
      .select(`
        *,
        incident_persons (person_type, days_lost)
      `)
      .gte('incident_date', startDate)
      .lte('incident_date', endDate)
      .neq('status', 'rejected');

    if (error) {
      console.error('Error fetching incident statistics:', error);
      return { success: false, error: 'Failed to fetch statistics' };
    }

    // Transform incidents
    const transformedIncidents: Incident[] = (incidents || []).map((row: IncidentRow & { incident_persons?: IncidentPersonRow[] }) => {
      const incident = transformIncidentRow(row as IncidentRow);
      incident.persons = (row.incident_persons || []).map((p: IncidentPersonRow) => 
        transformPersonRow(p)
      );
      return incident;
    });

    // Filter by month if specified
    let filteredIncidents = transformedIncidents;
    if (month) {
      filteredIncidents = transformedIncidents.filter((inc) => {
        const incMonth = new Date(inc.incidentDate).getMonth() + 1;
        return incMonth === month;
      });
    }

    // Calculate statistics
    const totalIncidents = filteredIncidents.length;
    const nearMisses = filteredIncidents.filter((inc) => inc.incidentType === 'near_miss').length;
    const injuries = filteredIncidents.filter(
      (inc) => inc.incidentType === 'accident' && inc.persons?.some((p) => p.personType === 'injured')
    ).length;
    const daysLost = calculateTotalDaysLost(filteredIncidents);
    const openInvestigations = getOpenInvestigationsCount(filteredIncidents);
    const daysSinceLastLTI = calculateDaysSinceLastLTI(transformedIncidents);
    const bySeverity = countBySeverity(filteredIncidents);

    // Count by category
    const byCategory: Record<string, number> = {};
    filteredIncidents.forEach((inc) => {
      const key = inc.categoryName || inc.categoryId;
      byCategory[key] = (byCategory[key] || 0) + 1;
    });

    // Calculate monthly trend (last 6 months)
    const monthlyTrend = calculateMonthlyTrend(transformedIncidents, 6);

    return {
      success: true,
      data: {
        totalIncidents,
        nearMisses,
        injuries,
        daysLost,
        openInvestigations,
        daysSinceLastLTI,
        bySeverity,
        byCategory,
        monthlyTrend,
      },
    };
  } catch (error) {
    console.error('Error in getIncidentStatistics:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get dashboard summary
 */
export async function getIncidentDashboardSummary(): Promise<{
  success: boolean;
  data?: IncidentDashboardSummary;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Get open incidents count
    const { count: openIncidents } = await fromIncidentTable(supabase, 'incidents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['reported', 'under_investigation', 'pending_actions']);

    // Get under investigation count
    const { count: underInvestigation } = await fromIncidentTable(supabase, 'incidents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'under_investigation');

    // Get near misses MTD
    const { count: nearMissesMTD } = await fromIncidentTable(supabase, 'incidents')
      .select('*', { count: 'exact', head: true })
      .eq('incident_type', 'near_miss')
      .gte('incident_date', startOfMonth)
      .lte('incident_date', endOfMonth)
      .neq('status', 'rejected');

    // Get injuries MTD (accidents with injured persons)
    const { data: accidentsMTD } = await fromIncidentTable(supabase, 'incidents')
      .select(`
        id,
        incident_persons!inner (person_type)
      `)
      .eq('incident_type', 'accident')
      .gte('incident_date', startOfMonth)
      .lte('incident_date', endOfMonth)
      .neq('status', 'rejected');

    const injuriesMTD = (accidentsMTD || []).filter((inc: { incident_persons: { person_type: string }[] }) =>
      inc.incident_persons.some((p) => p.person_type === 'injured')
    ).length;

    // Get all incidents for LTI calculation
    const { data: allIncidents } = await fromIncidentTable(supabase, 'incidents')
      .select(`
        *,
        incident_persons (person_type, days_lost)
      `)
      .eq('incident_type', 'accident')
      .neq('status', 'rejected');

    const transformedIncidents: Incident[] = (allIncidents || []).map((row: IncidentRow & { incident_persons?: IncidentPersonRow[] }) => {
      const incident = transformIncidentRow(row as IncidentRow);
      incident.persons = (row.incident_persons || []).map((p: IncidentPersonRow) =>
        transformPersonRow(p)
      );
      return incident;
    });

    const daysSinceLastLTI = calculateDaysSinceLastLTI(transformedIncidents);

    return {
      success: true,
      data: {
        openIncidents: openIncidents || 0,
        underInvestigation: underInvestigation || 0,
        nearMissesMTD: nearMissesMTD || 0,
        injuriesMTD,
        daysSinceLastLTI,
      },
    };
  } catch (error) {
    console.error('Error in getIncidentDashboardSummary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
