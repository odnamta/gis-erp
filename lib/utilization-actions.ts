'use server';

// =====================================================
// v0.43: EQUIPMENT - UTILIZATION TRACKING SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AssetAssignment,
  AssetDailyLog,
  UtilizationSummary,
  AssetAvailability,
  AssignmentInput,
  DailyLogInput,
  CompleteAssignmentInput,
  AssetAssignmentRow,
  AssetDailyLogRow,
  UtilizationSummaryRow,
  AssetAvailabilityRow,
  CurrentAssignmentRow,
  transformAssignmentRow,
  transformCurrentAssignmentRow,
  transformDailyLogRow,
  transformUtilizationSummaryRow,
  transformAvailabilityRow,
} from '@/types/utilization';
import { validateAssignment, validateMeterReadings } from './utilization-utils';

// =====================================================
// ASSIGNMENT MANAGEMENT
// =====================================================

/**
 * Assign asset to a job order or other target
 */
export async function assignAsset(
  input: AssignmentInput
): Promise<{ success: boolean; data?: AssetAssignment; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if asset exists and get its status
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, status')
      .eq('id', input.assetId)
      .single();

    if (assetError || !asset) {
      return { success: false, error: 'Asset not found' };
    }

    // Check for existing open assignments
    const { data: existingAssignments } = await supabase
      .from('asset_assignments')
      .select('id')
      .eq('asset_id', input.assetId)
      .is('assigned_to', null);

    const hasOpenAssignment = (existingAssignments?.length ?? 0) > 0;

    // Validate assignment
    const validation = validateAssignment(asset.status, hasOpenAssignment);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Create assignment
    const { data: assignment, error: insertError } = await supabase
      .from('asset_assignments')
      .insert({
        asset_id: input.assetId,
        assignment_type: input.assignmentType,
        job_order_id: input.jobOrderId || null,
        project_id: input.projectId || null,
        employee_id: input.employeeId || null,
        location_id: input.locationId || null,
        assigned_from: input.assignedFrom,
        assigned_to: input.assignedTo || null,
        start_km: input.startKm || null,
        start_hours: input.startHours || null,
        notes: input.notes || null,
        assigned_by: user?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating assignment:', insertError);
      return { success: false, error: 'Failed to create assignment' };
    }

    // Update asset with job assignment if assigning to job order
    if (input.assignmentType === 'job_order' && input.jobOrderId) {
      await supabase
        .from('assets')
        .update({ assigned_to_job_id: input.jobOrderId })
        .eq('id', input.assetId);
    }

    revalidatePath('/equipment');
    revalidatePath('/equipment/utilization');
    revalidatePath(`/equipment/${input.assetId}`);

    return {
      success: true,
      data: transformAssignmentRow(assignment as AssetAssignmentRow),
    };
  } catch (error) {
    console.error('Error in assignAsset:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Complete an assignment with end readings
 */
export async function completeAssignment(
  input: CompleteAssignmentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the assignment
    const { data: assignment, error: fetchError } = await supabase
      .from('asset_assignments')
      .select('id, asset_id, start_km, start_hours, assignment_type, job_order_id')
      .eq('id', input.assignmentId)
      .single();

    if (fetchError || !assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    // Validate meter readings
    const meterValidation = validateMeterReadings(
      assignment.start_km ?? undefined,
      input.endKm,
      assignment.start_hours ?? undefined,
      input.endHours
    );
    if (!meterValidation.valid) {
      return { success: false, error: meterValidation.error };
    }

    // Update assignment with end date and readings
    const { error: updateError } = await supabase
      .from('asset_assignments')
      .update({
        assigned_to: new Date().toISOString(),
        end_km: input.endKm || null,
        end_hours: input.endHours || null,
      })
      .eq('id', input.assignmentId);

    if (updateError) {
      console.error('Error completing assignment:', updateError);
      return { success: false, error: 'Failed to complete assignment' };
    }

    // Clear asset job assignment if it was a job order assignment
    if (assignment.assignment_type === 'job_order') {
      await supabase
        .from('assets')
        .update({ assigned_to_job_id: null })
        .eq('id', assignment.asset_id);
    }

    // Update asset odometer if end_km provided
    if (input.endKm) {
      await supabase
        .from('assets')
        .update({ current_units: input.endKm })
        .eq('id', assignment.asset_id);
    }

    revalidatePath('/equipment');
    revalidatePath('/equipment/utilization');
    revalidatePath(`/equipment/${assignment.asset_id}`);

    return { success: true };
  } catch (error) {
    console.error('Error in completeAssignment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get assignments for an asset
 */
export async function getAssetAssignments(
  assetId: string
): Promise<{ success: boolean; data?: AssetAssignment[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('asset_assignments')
      .select('*')
      .eq('asset_id', assetId)
      .order('assigned_from', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
      return { success: false, error: 'Failed to fetch assignments' };
    }

    return {
      success: true,
      data: (data as AssetAssignmentRow[]).map(transformAssignmentRow),
    };
  } catch (error) {
    console.error('Error in getAssetAssignments:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get current (active) assignments
 */
export async function getCurrentAssignments(): Promise<{
  success: boolean;
  data?: AssetAssignment[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('current_asset_assignments')
      .select('*')
      .order('assigned_from', { ascending: false });

    if (error) {
      console.error('Error fetching current assignments:', error);
      return { success: false, error: 'Failed to fetch current assignments' };
    }

    return {
      success: true,
      data: (data as CurrentAssignmentRow[]).map(transformCurrentAssignmentRow),
    };
  } catch (error) {
    console.error('Error in getCurrentAssignments:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


// =====================================================
// DAILY LOG MANAGEMENT
// =====================================================

/**
 * Log daily utilization (upsert behavior)
 */
export async function logDailyUtilization(
  input: DailyLogInput
): Promise<{ success: boolean; data?: AssetDailyLog; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Validate meter readings
    const meterValidation = validateMeterReadings(
      input.startKm,
      input.endKm,
      input.startHours,
      input.endHours
    );
    if (!meterValidation.valid) {
      return { success: false, error: meterValidation.error };
    }

    // Upsert daily log
    const { data: log, error: upsertError } = await supabase
      .from('asset_daily_logs')
      .upsert(
        {
          asset_id: input.assetId,
          log_date: input.logDate,
          status: input.status,
          job_order_id: input.jobOrderId || null,
          start_km: input.startKm || null,
          end_km: input.endKm || null,
          start_hours: input.startHours || null,
          end_hours: input.endHours || null,
          fuel_liters: input.fuelLiters || null,
          fuel_cost: input.fuelCost || null,
          operator_employee_id: input.operatorEmployeeId || null,
          operator_name: input.operatorName || null,
          notes: input.notes || null,
          logged_by: user?.id || null,
        },
        {
          onConflict: 'asset_id,log_date',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error logging daily utilization:', upsertError);
      return { success: false, error: 'Failed to log daily utilization' };
    }

    // Update asset odometer if end_km provided
    if (input.endKm) {
      await supabase
        .from('assets')
        .update({ current_units: input.endKm })
        .eq('id', input.assetId);
    }

    revalidatePath('/equipment');
    revalidatePath('/equipment/utilization');
    revalidatePath(`/equipment/${input.assetId}`);

    return {
      success: true,
      data: transformDailyLogRow(log as AssetDailyLogRow),
    };
  } catch (error) {
    console.error('Error in logDailyUtilization:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get daily logs for an asset
 */
export async function getDailyLogs(
  assetId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ success: boolean; data?: AssetDailyLog[]; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('asset_daily_logs')
      .select('*')
      .eq('asset_id', assetId)
      .order('log_date', { ascending: false });

    if (dateFrom) {
      query = query.gte('log_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('log_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily logs:', error);
      return { success: false, error: 'Failed to fetch daily logs' };
    }

    return {
      success: true,
      data: (data as AssetDailyLogRow[]).map(transformDailyLogRow),
    };
  } catch (error) {
    console.error('Error in getDailyLogs:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


// =====================================================
// UTILIZATION DATA QUERIES
// =====================================================

/**
 * Get utilization summary for a month
 */
export async function getUtilizationSummary(
  month: string
): Promise<{ success: boolean; data?: UtilizationSummary[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('asset_utilization_monthly')
      .select('*')
      .eq('month', month)
      .order('utilization_rate', { ascending: false });

    if (error) {
      console.error('Error fetching utilization summary:', error);
      return { success: false, error: 'Failed to fetch utilization summary' };
    }

    return {
      success: true,
      data: (data as UtilizationSummaryRow[]).map(transformUtilizationSummaryRow),
    };
  } catch (error) {
    console.error('Error in getUtilizationSummary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get utilization trend for last N months
 */
export async function getUtilizationTrend(
  months: number = 6
): Promise<{
  success: boolean;
  data?: { month: string; averageRate: number }[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get last N months
    const monthStrings: string[] = [];
    const today = new Date();
    for (let i = 0; i < months; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      monthStrings.push(`${year}-${month}-01`);
    }

    const { data, error } = await supabase
      .from('asset_utilization_monthly')
      .select('month, utilization_rate')
      .in('month', monthStrings);

    if (error) {
      console.error('Error fetching utilization trend:', error);
      return { success: false, error: 'Failed to fetch utilization trend' };
    }

    // Group by month and calculate average
    const monthlyAverages = new Map<string, { total: number; count: number }>();
    
    for (const row of data || []) {
      const existing = monthlyAverages.get(row.month) || { total: 0, count: 0 };
      existing.total += row.utilization_rate || 0;
      existing.count += 1;
      monthlyAverages.set(row.month, existing);
    }

    const trend = monthStrings.reverse().map((month) => {
      const stats = monthlyAverages.get(month);
      return {
        month,
        averageRate: stats ? Math.round((stats.total / stats.count) * 10) / 10 : 0,
      };
    });

    return { success: true, data: trend };
  } catch (error) {
    console.error('Error in getUtilizationTrend:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get available assets with optional category filter
 */
export async function getAvailableAssets(
  categoryId?: string
): Promise<{ success: boolean; data?: AssetAvailability[]; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase.from('asset_availability').select('*');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('asset_code');

    if (error) {
      console.error('Error fetching available assets:', error);
      return { success: false, error: 'Failed to fetch available assets' };
    }

    return {
      success: true,
      data: (data as AssetAvailabilityRow[]).map(transformAvailabilityRow),
    };
  } catch (error) {
    console.error('Error in getAvailableAssets:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Refresh the utilization materialized view
 */
export async function refreshUtilizationView(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc('refresh_asset_utilization');

    if (error) {
      console.error('Error refreshing utilization view:', error);
      return { success: false, error: 'Failed to refresh utilization view' };
    }

    revalidatePath('/equipment/utilization');
    return { success: true };
  } catch (error) {
    console.error('Error in refreshUtilizationView:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
