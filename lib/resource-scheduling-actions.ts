'use server';

// =====================================================
// v0.60: ENGINEERING - RESOURCE SCHEDULING SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  EngineeringResource,
  ResourceWithDetails,
  ResourceAssignment,
  AssignmentWithDetails,
  ResourceAvailability,
  ResourceSkill,
  ResourceInput,
  AssignmentInput,
  UnavailabilityInput,
  ResourceFilters,
  AssignmentFilters,
  CalendarFilters,
  UtilizationFilters,
  CalendarData,
  CalendarCell,
  UtilizationReport,
  WeeklyUtilization,
  ConflictResult,
  DateRange,
  RESOURCE_TYPE_PREFIXES,
} from '@/types/resource-scheduling';
import {
  validateResourceInput,
  validateAssignmentInput,
  validateUnavailabilityInput,
  detectConflicts,
  calculatePlannedHours,
  getDatesInRange,
  formatDateString,
  getWeekStart,
  calculateUtilization,
  countWorkingDays,
} from './resource-scheduling-utils';

// =====================================================
// RESOURCE ACTIONS
// =====================================================

export async function getResources(filters?: ResourceFilters): Promise<EngineeringResource[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('engineering_resources')
    .select('*')
    .eq('is_active', true)
    .order('resource_code');

  if (filters?.resource_type) {
    query = query.eq('resource_type', filters.resource_type);
  }

  if (filters?.is_available !== undefined) {
    query = query.eq('is_available', filters.is_available);
  }

  if (filters?.search) {
    query = query.or(`resource_name.ilike.%${filters.search}%,resource_code.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching resources:', error);
    throw new Error('Failed to fetch resources');
  }

  let resources = data || [];

  // Filter by skills (client-side since JSONB contains)
  if (filters?.skills && filters.skills.length > 0) {
    resources = resources.filter(r => {
      const resourceSkills = r.skills || [];
      return filters.skills!.every(skill => resourceSkills.includes(skill));
    });
  }

  return resources;
}

export async function getResourceById(id: string): Promise<ResourceWithDetails | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('engineering_resources')
    .select(`
      *,
      employees:employee_id (id, full_name, position),
      assets:asset_id (id, asset_code, asset_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching resource:', error);
    throw new Error('Failed to fetch resource');
  }

  // Get current assignments
  const { data: assignments } = await supabase
    .from('resource_assignments')
    .select('*')
    .eq('resource_id', id)
    .in('status', ['scheduled', 'in_progress'])
    .gte('end_date', formatDateString(new Date()))
    .order('start_date');

  return {
    ...data,
    employee: data.employees,
    asset: data.assets,
    current_assignments: assignments || []
  };
}


export async function createResource(input: ResourceInput): Promise<EngineeringResource> {
  const validation = validateResourceInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const supabase = await createClient();

  // Generate resource code
  const prefix = RESOURCE_TYPE_PREFIXES[input.resource_type];
  const year = new Date().getFullYear();
  
  // Get next sequence
  const { data: existingCodes } = await supabase
    .from('engineering_resources')
    .select('resource_code')
    .like('resource_code', `${prefix}-${year}-%`);

  const sequences = (existingCodes || [])
    .map(r => {
      const parts = r.resource_code.split('-');
      return parts.length === 3 ? parseInt(parts[2], 10) : 0;
    })
    .filter(n => n > 0);

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  const resourceCode = `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('engineering_resources')
    .insert({
      resource_type: input.resource_type,
      resource_code: resourceCode,
      resource_name: input.resource_name,
      description: input.description,
      employee_id: input.employee_id,
      asset_id: input.asset_id,
      skills: input.skills || [],
      certifications: input.certifications || [],
      capacity_unit: input.capacity_unit || 'hours',
      daily_capacity: input.daily_capacity || 8,
      hourly_rate: input.hourly_rate,
      daily_rate: input.daily_rate,
      base_location: input.base_location,
      is_available: input.is_available ?? true,
      unavailable_reason: input.unavailable_reason,
      unavailable_until: input.unavailable_until
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating resource:', error);
    throw new Error('Failed to create resource');
  }

  revalidatePath('/engineering/resources');
  return data;
}

export async function updateResource(id: string, input: ResourceInput): Promise<EngineeringResource> {
  const validation = validateResourceInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('engineering_resources')
    .update({
      resource_type: input.resource_type,
      resource_name: input.resource_name,
      description: input.description,
      employee_id: input.employee_id,
      asset_id: input.asset_id,
      skills: input.skills || [],
      certifications: input.certifications || [],
      capacity_unit: input.capacity_unit,
      daily_capacity: input.daily_capacity,
      hourly_rate: input.hourly_rate,
      daily_rate: input.daily_rate,
      base_location: input.base_location,
      is_available: input.is_available,
      unavailable_reason: input.unavailable_reason,
      unavailable_until: input.unavailable_until,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating resource:', error);
    throw new Error('Failed to update resource');
  }

  revalidatePath('/engineering/resources');
  revalidatePath(`/engineering/resources/${id}`);
  return data;
}

export async function deleteResource(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('engineering_resources')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deleting resource:', error);
    throw new Error('Failed to delete resource');
  }

  revalidatePath('/engineering/resources');
}

// =====================================================
// ASSIGNMENT ACTIONS
// =====================================================

export async function getAssignments(filters?: AssignmentFilters): Promise<AssignmentWithDetails[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('resource_assignments')
    .select(`
      *,
      engineering_resources:resource_id (id, resource_code, resource_name, resource_type),
      projects:project_id (id, name, project_number),
      job_orders:job_order_id (id, jo_number),
      technical_assessments:assessment_id (id, assessment_number),
      route_surveys:route_survey_id (id, survey_number),
      journey_management_plans:jmp_id (id, jmp_number)
    `)
    .order('start_date', { ascending: false });

  if (filters?.resource_id) {
    query = query.eq('resource_id', filters.resource_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.date_from) {
    query = query.gte('end_date', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('start_date', filters.date_to);
  }

  if (filters?.target_type && filters?.target_id) {
    const targetColumn = `${filters.target_type}_id`;
    query = query.eq(targetColumn, filters.target_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assignments:', error);
    throw new Error('Failed to fetch assignments');
  }

  return (data || []).map(a => ({
    ...a,
    resource: a.engineering_resources,
    project: a.projects,
    job_order: a.job_orders,
    assessment: a.technical_assessments,
    route_survey: a.route_surveys,
    jmp: a.journey_management_plans
  }));
}

export async function getAssignmentById(id: string): Promise<AssignmentWithDetails | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('resource_assignments')
    .select(`
      *,
      engineering_resources:resource_id (id, resource_code, resource_name, resource_type),
      projects:project_id (id, name, project_number),
      job_orders:job_order_id (id, jo_number),
      technical_assessments:assessment_id (id, assessment_number),
      route_surveys:route_survey_id (id, survey_number),
      journey_management_plans:jmp_id (id, jmp_number),
      user_profiles:assigned_by (id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching assignment:', error);
    throw new Error('Failed to fetch assignment');
  }

  return {
    ...data,
    resource: data.engineering_resources,
    project: data.projects,
    job_order: data.job_orders,
    assessment: data.technical_assessments,
    route_survey: data.route_surveys,
    jmp: data.journey_management_plans,
    assigned_by_user: data.user_profiles
  };
}


export async function createAssignment(
  input: AssignmentInput,
  forceCreate: boolean = false
): Promise<{ assignment: ResourceAssignment; conflicts?: ConflictResult }> {
  const validation = validateAssignmentInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const supabase = await createClient();

  // Get resource for capacity
  const { data: resource } = await supabase
    .from('engineering_resources')
    .select('*')
    .eq('id', input.resource_id)
    .single();

  if (!resource) {
    throw new Error('Resource not found');
  }

  // Get existing assignments and unavailability
  const { data: existingAssignments } = await supabase
    .from('resource_assignments')
    .select('*')
    .eq('resource_id', input.resource_id)
    .in('status', ['scheduled', 'in_progress']);

  const { data: unavailability } = await supabase
    .from('resource_availability')
    .select('*')
    .eq('resource_id', input.resource_id)
    .eq('is_available', false);

  // Check for conflicts
  const conflicts = detectConflicts(
    input.resource_id,
    input.start_date,
    input.end_date,
    existingAssignments || [],
    unavailability || []
  );

  if (conflicts.has_conflict && !forceCreate) {
    return { assignment: null as any, conflicts };
  }

  // Calculate planned hours if not provided
  const plannedHours = input.planned_hours ?? 
    calculatePlannedHours(input.start_date, input.end_date, resource.daily_capacity);

  // Map target type to column
  const targetColumn = input.target_type === 'job_order' ? 'job_order_id' :
                       input.target_type === 'route_survey' ? 'route_survey_id' :
                       input.target_type === 'jmp' ? 'jmp_id' :
                       input.target_type === 'assessment' ? 'assessment_id' :
                       'project_id';

  const { data, error } = await supabase
    .from('resource_assignments')
    .insert({
      resource_id: input.resource_id,
      [targetColumn]: input.target_id,
      task_description: input.task_description,
      start_date: input.start_date,
      end_date: input.end_date,
      start_time: input.start_time,
      end_time: input.end_time,
      planned_hours: plannedHours,
      work_location: input.work_location,
      notes: input.notes,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    throw new Error('Failed to create assignment');
  }

  revalidatePath('/engineering/resources');
  return { assignment: data, conflicts: conflicts.has_conflict ? conflicts : undefined };
}

export async function updateAssignment(id: string, input: AssignmentInput): Promise<ResourceAssignment> {
  const validation = validateAssignmentInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const supabase = await createClient();

  // Map target type to column
  const targetColumn = input.target_type === 'job_order' ? 'job_order_id' :
                       input.target_type === 'route_survey' ? 'route_survey_id' :
                       input.target_type === 'jmp' ? 'jmp_id' :
                       input.target_type === 'assessment' ? 'assessment_id' :
                       'project_id';

  // Clear all target columns first, then set the correct one
  const { data, error } = await supabase
    .from('resource_assignments')
    .update({
      resource_id: input.resource_id,
      project_id: null,
      job_order_id: null,
      assessment_id: null,
      route_survey_id: null,
      jmp_id: null,
      [targetColumn]: input.target_id,
      task_description: input.task_description,
      start_date: input.start_date,
      end_date: input.end_date,
      start_time: input.start_time,
      end_time: input.end_time,
      planned_hours: input.planned_hours,
      work_location: input.work_location,
      notes: input.notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment:', error);
    throw new Error('Failed to update assignment');
  }

  revalidatePath('/engineering/resources');
  return data;
}

export async function deleteAssignment(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('resource_assignments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting assignment:', error);
    throw new Error('Failed to delete assignment');
  }

  revalidatePath('/engineering/resources');
}

export async function updateAssignmentStatus(
  id: string, 
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
): Promise<ResourceAssignment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('resource_assignments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment status:', error);
    throw new Error('Failed to update assignment status');
  }

  revalidatePath('/engineering/resources');
  return data;
}

export async function recordActualHours(id: string, actualHours: number): Promise<ResourceAssignment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('resource_assignments')
    .update({ actual_hours: actualHours, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error recording actual hours:', error);
    throw new Error('Failed to record actual hours');
  }

  revalidatePath('/engineering/resources');
  return data;
}


// =====================================================
// AVAILABILITY ACTIONS
// =====================================================

export async function getAvailability(
  resourceId: string, 
  dateRange: DateRange
): Promise<ResourceAvailability[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('resource_availability')
    .select('*')
    .eq('resource_id', resourceId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)
    .order('date');

  if (error) {
    console.error('Error fetching availability:', error);
    throw new Error('Failed to fetch availability');
  }

  return data || [];
}

export async function setUnavailability(input: UnavailabilityInput): Promise<{ 
  created: number; 
  conflicts: ResourceAssignment[] 
}> {
  const validation = validateUnavailabilityInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.map(e => e.message).join(', '));
  }

  const supabase = await createClient();

  // Check for conflicting assignments
  const { data: assignments } = await supabase
    .from('resource_assignments')
    .select('*')
    .eq('resource_id', input.resource_id)
    .in('status', ['scheduled', 'in_progress']);

  const conflicts = (assignments || []).filter(a => {
    return input.dates.some(date => {
      const d = new Date(date);
      const start = new Date(a.start_date);
      const end = new Date(a.end_date);
      return d >= start && d <= end;
    });
  });

  // Upsert unavailability records
  const records = input.dates.map(date => ({
    resource_id: input.resource_id,
    date,
    is_available: false,
    available_hours: 0,
    unavailability_type: input.unavailability_type,
    notes: input.notes
  }));

  const { error } = await supabase
    .from('resource_availability')
    .upsert(records, { onConflict: 'resource_id,date' });

  if (error) {
    console.error('Error setting unavailability:', error);
    throw new Error('Failed to set unavailability');
  }

  revalidatePath('/engineering/resources');
  return { created: records.length, conflicts };
}

export async function removeUnavailability(resourceId: string, date: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('resource_availability')
    .delete()
    .eq('resource_id', resourceId)
    .eq('date', date);

  if (error) {
    console.error('Error removing unavailability:', error);
    throw new Error('Failed to remove unavailability');
  }

  revalidatePath('/engineering/resources');
}

// =====================================================
// SKILLS ACTIONS
// =====================================================

export async function getSkills(): Promise<ResourceSkill[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('resource_skills')
    .select('*')
    .eq('is_active', true)
    .order('skill_category')
    .order('skill_name');

  if (error) {
    console.error('Error fetching skills:', error);
    throw new Error('Failed to fetch skills');
  }

  return data || [];
}

export async function createSkill(input: { 
  skill_code: string; 
  skill_name: string; 
  skill_category?: string 
}): Promise<ResourceSkill> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('resource_skills')
    .insert({
      skill_code: input.skill_code,
      skill_name: input.skill_name,
      skill_category: input.skill_category
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating skill:', error);
    throw new Error('Failed to create skill');
  }

  return data;
}

// =====================================================
// CALENDAR ACTIONS
// =====================================================

export async function getCalendarData(
  dateRange: DateRange,
  filters?: CalendarFilters
): Promise<CalendarData> {
  const supabase = await createClient();

  // Get resources
  let resourceQuery = supabase
    .from('engineering_resources')
    .select('*')
    .eq('is_active', true)
    .order('resource_type')
    .order('resource_name');

  if (filters?.resource_types && filters.resource_types.length > 0) {
    resourceQuery = resourceQuery.in('resource_type', filters.resource_types);
  }

  if (filters?.resource_ids && filters.resource_ids.length > 0) {
    resourceQuery = resourceQuery.in('id', filters.resource_ids);
  }

  const { data: resources, error: resourceError } = await resourceQuery;

  if (resourceError) {
    console.error('Error fetching resources for calendar:', resourceError);
    throw new Error('Failed to fetch calendar data');
  }

  let filteredResources = resources || [];

  // Filter by skills (client-side)
  if (filters?.skills && filters.skills.length > 0) {
    filteredResources = filteredResources.filter(r => {
      const resourceSkills = r.skills || [];
      return filters.skills!.every(skill => resourceSkills.includes(skill));
    });
  }

  // Get all resource IDs
  const resourceIds = filteredResources.map(r => r.id);

  // Get assignments for date range
  const { data: assignments } = await supabase
    .from('resource_assignments')
    .select('*')
    .in('resource_id', resourceIds)
    .in('status', ['scheduled', 'in_progress'])
    .lte('start_date', dateRange.end)
    .gte('end_date', dateRange.start);

  // Get unavailability for date range
  const { data: unavailability } = await supabase
    .from('resource_availability')
    .select('*')
    .in('resource_id', resourceIds)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end);

  // Generate dates array
  const dates = getDatesInRange(dateRange.start, dateRange.end);

  // Generate cells
  const cells = new Map<string, CalendarCell>();

  for (const resource of filteredResources) {
    for (const date of dates) {
      const key = `${resource.id}_${date}`;
      
      // Find unavailability for this date
      const unavail = (unavailability || []).find(
        u => u.resource_id === resource.id && u.date === date && !u.is_available
      );

      // Find assignments for this date
      const dayAssignments = (assignments || []).filter(a => {
        if (a.resource_id !== resource.id) return false;
        const d = new Date(date);
        const start = new Date(a.start_date);
        const end = new Date(a.end_date);
        return d >= start && d <= end;
      });

      // Calculate hours
      let assignedHours = 0;
      for (const a of dayAssignments) {
        const totalDays = countWorkingDays(a.start_date, a.end_date);
        if (totalDays > 0) {
          assignedHours += (a.planned_hours || 0) / totalDays;
        }
      }

      const availableHours = unavail ? 0 : resource.daily_capacity;
      const remainingHours = Math.max(0, availableHours - assignedHours);

      cells.set(key, {
        resource_id: resource.id,
        date,
        is_available: !unavail,
        available_hours: availableHours,
        assigned_hours: Math.round(assignedHours * 100) / 100,
        remaining_hours: Math.round(remainingHours * 100) / 100,
        assignments: dayAssignments,
        unavailability_type: unavail?.unavailability_type
      });
    }
  }

  return {
    resources: filteredResources,
    dates,
    cells
  };
}


// =====================================================
// UTILIZATION ACTIONS
// =====================================================

export async function getUtilizationReport(
  filters: UtilizationFilters
): Promise<UtilizationReport[]> {
  const supabase = await createClient();

  // Get resources
  let resourceQuery = supabase
    .from('engineering_resources')
    .select('*')
    .eq('is_active', true);

  if (filters.resource_type) {
    resourceQuery = resourceQuery.eq('resource_type', filters.resource_type);
  }

  if (filters.resource_ids && filters.resource_ids.length > 0) {
    resourceQuery = resourceQuery.in('id', filters.resource_ids);
  }

  const { data: resources, error: resourceError } = await resourceQuery;

  if (resourceError) {
    console.error('Error fetching resources for utilization:', resourceError);
    throw new Error('Failed to fetch utilization data');
  }

  const resourceIds = (resources || []).map(r => r.id);

  // Get assignments
  const { data: assignments } = await supabase
    .from('resource_assignments')
    .select('*')
    .in('resource_id', resourceIds)
    .lte('start_date', filters.date_to)
    .gte('end_date', filters.date_from);

  // Get unavailability
  const { data: unavailability } = await supabase
    .from('resource_availability')
    .select('*')
    .in('resource_id', resourceIds)
    .gte('date', filters.date_from)
    .lte('date', filters.date_to)
    .eq('is_available', false);

  // Calculate utilization for each resource
  const reports: UtilizationReport[] = [];

  for (const resource of resources || []) {
    const resourceAssignments = (assignments || []).filter(a => a.resource_id === resource.id);
    const resourceUnavailability = (unavailability || []).filter(u => u.resource_id === resource.id);

    // Calculate total available hours
    const dates = getDatesInRange(filters.date_from, filters.date_to);
    let totalAvailableHours = 0;
    
    for (const date of dates) {
      const dateObj = new Date(date);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      if (isWeekend) continue;

      const isUnavailable = resourceUnavailability.some(u => u.date === date);
      if (!isUnavailable) {
        totalAvailableHours += resource.daily_capacity;
      }
    }

    // Calculate total planned and actual hours
    let totalPlannedHours = 0;
    let totalActualHours = 0;

    for (const assignment of resourceAssignments) {
      if (assignment.status === 'cancelled') continue;

      // Calculate overlap with filter date range
      const overlapStart = new Date(Math.max(
        new Date(filters.date_from).getTime(),
        new Date(assignment.start_date).getTime()
      ));
      const overlapEnd = new Date(Math.min(
        new Date(filters.date_to).getTime(),
        new Date(assignment.end_date).getTime()
      ));

      const totalDays = countWorkingDays(assignment.start_date, assignment.end_date);
      const overlapDays = countWorkingDays(formatDateString(overlapStart), formatDateString(overlapEnd));

      if (totalDays > 0) {
        const ratio = overlapDays / totalDays;
        totalPlannedHours += (assignment.planned_hours || 0) * ratio;
        totalActualHours += (assignment.actual_hours || 0) * ratio;
      }
    }

    // Calculate weekly breakdown
    const weeklyBreakdown: WeeklyUtilization[] = [];
    let currentDate = new Date(filters.date_from);
    const endDate = new Date(filters.date_to);

    while (currentDate <= endDate) {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Calculate week metrics
      let weekAvailable = 0;
      let weekPlanned = 0;
      let weekActual = 0;

      const weekDates = getDatesInRange(
        formatDateString(weekStart),
        formatDateString(new Date(Math.min(weekEnd.getTime(), endDate.getTime())))
      );

      for (const date of weekDates) {
        const dateObj = new Date(date);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        if (isWeekend) continue;

        const isUnavailable = resourceUnavailability.some(u => u.date === date);
        if (!isUnavailable) {
          weekAvailable += resource.daily_capacity;
        }
      }

      for (const assignment of resourceAssignments) {
        if (assignment.status === 'cancelled') continue;

        const aStart = new Date(assignment.start_date);
        const aEnd = new Date(assignment.end_date);

        if (aStart <= weekEnd && aEnd >= weekStart) {
          const overlapStart = new Date(Math.max(weekStart.getTime(), aStart.getTime()));
          const overlapEnd = new Date(Math.min(weekEnd.getTime(), aEnd.getTime()));

          const totalDays = countWorkingDays(assignment.start_date, assignment.end_date);
          const overlapDays = countWorkingDays(formatDateString(overlapStart), formatDateString(overlapEnd));

          if (totalDays > 0) {
            const ratio = overlapDays / totalDays;
            weekPlanned += (assignment.planned_hours || 0) * ratio;
            weekActual += (assignment.actual_hours || 0) * ratio;
          }
        }
      }

      weeklyBreakdown.push({
        week_start: formatDateString(weekStart),
        planned_hours: Math.round(weekPlanned * 100) / 100,
        actual_hours: Math.round(weekActual * 100) / 100,
        available_hours: weekAvailable,
        utilization_percentage: Math.round(calculateUtilization(weekPlanned, weekAvailable) * 10) / 10
      });

      // Move to next week
      currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + 7);
    }

    const utilizationPercentage = calculateUtilization(totalPlannedHours, totalAvailableHours);

    reports.push({
      resource_id: resource.id,
      resource_code: resource.resource_code,
      resource_name: resource.resource_name,
      resource_type: resource.resource_type,
      total_planned_hours: Math.round(totalPlannedHours * 100) / 100,
      total_actual_hours: Math.round(totalActualHours * 100) / 100,
      total_available_hours: totalAvailableHours,
      utilization_percentage: Math.round(utilizationPercentage * 10) / 10,
      is_over_allocated: utilizationPercentage > 100,
      weekly_breakdown: weeklyBreakdown
    });
  }

  return reports;
}
