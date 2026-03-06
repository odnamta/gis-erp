'use server';

// =====================================================
// INCIDENT CORE ACTIONS: CRUD + Workflows
// Split from incident-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeSearchInput } from '@/lib/utils/sanitize';
import {
  Incident,
  IncidentCategory,
  IncidentPerson,
  IncidentHistoryEntry,
  ReportIncidentInput,
  AddPersonInput,
  AddActionInput,
  CloseIncidentInput,
  IncidentFilters,
  IncidentAction,
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
} from './incident-utils';
import {
  notifyIncidentReported,
  notifyInvestigatorAssigned,
  notifyActionAssigned,
  notifyIncidentClosed,
} from './notifications/incident-notifications';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';

// Type helper for tables not yet in database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

// Helper function to bypass type checking for incident tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromIncidentTable = (supabase: any, table: string) => supabase.from(table) as AnyTable;

// Private helper: Log incident history entry
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
    console.error('[Incident] logIncidentHistory failed for incident', incidentId, ':', error instanceof Error ? error.message : error);
  }
}

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
      console.error('[Incident] getIncidentCategories failed:', error.code, error.message);
      return { success: false, error: `Failed to fetch incident categories: ${error.message}` };
    }

    return {
      success: true,
      data: (data as IncidentCategoryRow[]).map(transformCategoryRow),
    };
  } catch (error) {
    console.error('[Incident] getIncidentCategories unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

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

    // Get user profile (employees.user_id references user_profiles.id)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return { success: false, error: 'User profile not found. Please contact administrator.' };
    }

    // Get employee ID for the user
    // Try by profile PK first (employees.user_id may reference user_profiles.id)
    let employeeId: string | null = null;
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userProfile.id)
      .single();

    if (employee) {
      employeeId = employee.id;
    } else {
      // Fallback: try by auth UUID (some records may use auth.uid() directly)
      const { data: employeeByAuth } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (employeeByAuth) {
        employeeId = employeeByAuth.id;
      } else {
        // Auto-create minimal employee record from user_profiles
        const { data: newEmployee, error: empError } = await supabase
          .from('employees')
          .insert({
            user_id: userProfile.id,
            full_name: userProfile.full_name || user.email || 'Unknown',
            employee_code: `AUTO-${user.id.substring(0, 6).toUpperCase()}`,
            status: 'active',
            join_date: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single();

        if (empError || !newEmployee) {
          return { success: false, error: 'Unable to create employee profile for incident reporting. Please contact HR or administrator.' };
        }

        employeeId = newEmployee.id;
      }
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
        reported_by: employeeId,
        supervisor_id: input.supervisorId || null,
        investigation_required: category?.requires_investigation ?? true,
        status: 'reported',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Incident insert error:', insertError);
      return { success: false, error: `Gagal melaporkan insiden: ${insertError.message}` };
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

      const { error: personsError } = await fromIncidentTable(supabase, 'incident_persons').insert(personRecords);
      if (personsError) {
        console.error('[Incident] incident_persons insert failed for incident', incident.id, ':', personsError.code, personsError.message);
        // Incident was created but persons failed - report partial failure
        return {
          success: true,
          data: transformIncidentRow(incident as IncidentRow),
          error: `Insiden berhasil dibuat tetapi gagal menambahkan ${persons.length} orang terlibat: ${personsError.message}`,
        };
      }
    }

    // Log history (use userProfile.id, not auth UUID — FK references user_profiles.id)
    await logIncidentHistory(
      incident.id,
      'created',
      'Insiden dilaporkan',
      null,
      'reported',
      userProfile?.id
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
    console.error('reportIncident error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
      console.error('[Incident] getIncident failed:', error.code, error.message);
      return { success: false, error: `Incident not found: ${error.message}` };
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
    const categoryData = data.incident_categories as { category_code: string; category_name: string };
    const reporter = data.employees as { full_name: string } | null;
    const investigator = data.investigator as { full_name: string } | null;
    const supervisor = data.supervisor as { full_name: string } | null;
    const jobOrder = data.job_orders as { jo_number: string } | null;
    const asset = data.assets as { asset_code: string; asset_name: string } | null;

    incident.categoryCode = categoryData.category_code;
    incident.categoryName = categoryData.category_name;
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
    console.error('[Incident] getIncident unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
      const search = sanitizeSearchInput(filters.search);
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,incident_number.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('[Incident] getIncidents failed:', error.code, error.message);
      return { success: false, error: `Failed to fetch incidents: ${error.message}` };
    }

    // Transform the data
    const incidents = (data || []).map((row: IncidentRow & { incident_categories: { category_code: string; category_name: string } | null; employees: { full_name: string } | null; investigator: { full_name: string } | null }) => {
      const incident = transformIncidentRow(row as IncidentRow);
      const categoryData = row.incident_categories as { category_code: string; category_name: string } | null;
      const reporter = row.employees as { full_name: string } | null;
      const investigatorData = row.investigator as { full_name: string } | null;

      incident.categoryCode = categoryData?.category_code;
      incident.categoryName = categoryData?.category_name;
      incident.reportedByName = reporter?.full_name;
      incident.investigatorName = investigatorData?.full_name;

      return incident;
    });

    return { success: true, data: incidents };
  } catch (error) {
    console.error('[Incident] getIncidents unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.investigate')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

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
      console.error('[Incident] startInvestigation failed:', error.code, error.message);
      return { success: false, error: `Failed to start investigation: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'investigation_started',
      'Investigasi dimulai',
      'reported',
      'under_investigation',
      profileId ?? undefined
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
    console.error('[Incident] startInvestigation unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Update root cause analysis
 */
export async function updateRootCause(
  incidentId: string,
  input: { rootCause: string; contributingFactors?: unknown }
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

    const { error } = await fromIncidentTable(supabase, 'incidents')
      .update({
        root_cause: input.rootCause,
        contributing_factors: input.contributingFactors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('[Incident] updateRootCause failed:', error.code, error.message);
      return { success: false, error: `Failed to update root cause: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'root_cause_updated',
      'Root cause analysis diperbarui',
      null,
      input.rootCause,
      profileId ?? undefined
    );

    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('[Incident] updateRootCause unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Complete investigation
 */
export async function completeInvestigation(
  incidentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.investigate')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

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
      console.error('[Incident] completeInvestigation failed:', error.code, error.message);
      return { success: false, error: `Failed to complete investigation: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'investigation_completed',
      'Investigasi selesai',
      'under_investigation',
      'pending_actions',
      profileId ?? undefined
    );

    revalidatePath('/hse');
    revalidatePath('/hse/incidents');
    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('[Incident] completeInvestigation unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

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
      console.error('[Incident] addCorrectiveAction failed:', error.code, error.message);
      return { success: false, error: `Failed to add corrective action: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'corrective_action_added',
      `Tindakan korektif ditambahkan: ${action.description}`,
      null,
      null,
      profileId ?? undefined
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
    console.error('[Incident] addCorrectiveAction unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

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
      console.error('[Incident] addPreventiveAction failed:', error.code, error.message);
      return { success: false, error: `Failed to add preventive action: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'preventive_action_added',
      `Tindakan preventif ditambahkan: ${action.description}`,
      null,
      null,
      profileId ?? undefined
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
    console.error('[Incident] addPreventiveAction unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

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
      console.error('[Incident] completeAction failed:', error.code, error.message);
      return { success: false, error: `Failed to complete action: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'action_completed',
      `Tindakan ${actionType === 'corrective' ? 'korektif' : 'preventif'} diselesaikan: ${actions[actionIndex].description}`,
      'pending',
      'completed',
      profileId ?? undefined
    );

    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('[Incident] completeAction unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.investigate')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

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
        closed_by: profileId,
        closure_notes: input.closureNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('[Incident] closeIncident failed:', error.code, error.message);
      return { success: false, error: `Failed to close incident: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'closed',
      `Insiden ditutup: ${input.closureNotes}`,
      incident.status,
      'closed',
      profileId ?? undefined
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
    console.error('[Incident] closeIncident unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const profileId = await getCurrentProfileId();
    const supabase = await createClient();

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
        closed_by: profileId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.error('[Incident] rejectIncident failed:', error.code, error.message);
      return { success: false, error: `Failed to reject incident: ${error.message}` };
    }

    // Log history
    await logIncidentHistory(
      incidentId,
      'rejected',
      `Insiden ditolak: ${reason}`,
      'reported',
      'rejected',
      profileId ?? undefined
    );

    revalidatePath('/hse');
    revalidatePath('/hse/incidents');
    revalidatePath(`/hse/incidents/${incidentId}`);

    return { success: true };
  } catch (error) {
    console.error('[Incident] rejectIncident unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

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
      console.error('[Incident] addPersonToIncident failed:', error.code, error.message);
      return { success: false, error: `Failed to add person: ${error.message}` };
    }

    revalidatePath(`/hse/incidents/${incidentId}`);

    return {
      success: true,
      data: transformPersonRow(data as IncidentPersonRow),
    };
  } catch (error) {
    console.error('[Incident] addPersonToIncident unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Remove person from incident
 */
export async function removePersonFromIncident(
  personId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'hse.incidents.create')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

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
      console.error('[Incident] removePersonFromIncident failed:', error.code, error.message);
      return { success: false, error: `Failed to remove person: ${error.message}` };
    }

    revalidatePath(`/hse/incidents/${person.incident_id}`);

    return { success: true };
  } catch (error) {
    console.error('[Incident] removePersonFromIncident unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
      console.error('[Incident] getIncidentHistory failed:', error.code, error.message);
      return { success: false, error: `Failed to fetch history: ${error.message}` };
    }

    const history = (data || []).map((row: IncidentHistoryRow & { user_profiles?: { full_name: string } | null }) => {
      const entry = transformHistoryRow(row as IncidentHistoryRow);
      const userProfile = row.user_profiles as { full_name: string } | null;
      entry.performedByName = userProfile?.full_name;
      return entry;
    });

    return { success: true, data: history };
  } catch (error) {
    console.error('[Incident] getIncidentHistory unexpected error:', error);
    return { success: false, error: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
