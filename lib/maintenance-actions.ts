'use server';

// =====================================================
// v0.42: EQUIPMENT - MAINTENANCE TRACKING SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  MaintenanceType,
  MaintenanceSchedule,
  MaintenanceRecord,
  MaintenancePart,
  UpcomingMaintenance,
  MaintenanceCostSummary,
  MaintenanceDashboardStats,
  MaintenanceRecordInput,
  MaintenanceScheduleInput,
  MaintenanceHistoryFilters,
  MaintenanceTypeRow,
  MaintenanceScheduleRow,
  MaintenanceRecordRow,
  MaintenancePartRow,
  UpcomingMaintenanceRow,
  MaintenanceCostSummaryRow,
  transformMaintenanceTypeRow,
  transformMaintenanceScheduleRow,
  transformMaintenanceRecordRow,
  transformMaintenancePartRow,
  transformUpcomingMaintenanceRow,
  transformMaintenanceCostSummaryRow,
} from '@/types/maintenance';
import { calculatePartsCost, validateMaintenanceRecordInput, validateMaintenanceScheduleInput } from './maintenance-utils';

// =====================================================
// MAINTENANCE TYPES
// =====================================================

export async function getMaintenanceTypes(): Promise<MaintenanceType[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching maintenance types:', error);
    return [];
  }

  return (data || []).map((row) => transformMaintenanceTypeRow(row as unknown as MaintenanceTypeRow));
}

export async function getMaintenanceTypeById(id: string): Promise<MaintenanceType | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching maintenance type:', error);
    return null;
  }

  return transformMaintenanceTypeRow(data as unknown as MaintenanceTypeRow);
}

// =====================================================
// MAINTENANCE SCHEDULES
// =====================================================

export async function getMaintenanceSchedules(assetId?: string): Promise<MaintenanceSchedule[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('maintenance_schedules')
    .select(`
      *,
      maintenance_type:maintenance_types(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (assetId) {
    query = query.eq('asset_id', assetId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching maintenance schedules:', error);
    return [];
  }

  return (data || []).map(row => ({
    ...transformMaintenanceScheduleRow(row as unknown as MaintenanceScheduleRow),
    maintenanceType: row.maintenance_type ? transformMaintenanceTypeRow(row.maintenance_type as unknown as MaintenanceTypeRow) : undefined,
  }));
}


export async function createMaintenanceSchedule(
  input: MaintenanceScheduleInput
): Promise<{ success: boolean; error?: string; schedule?: MaintenanceSchedule }> {
  const validation = validateMaintenanceScheduleInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('maintenance_schedules')
    .insert({
      asset_id: input.assetId,
      maintenance_type_id: input.maintenanceTypeId,
      trigger_type: input.triggerType,
      trigger_value: input.triggerValue,
      trigger_date: input.triggerDate,
      next_due_km: input.nextDueKm,
      next_due_date: input.nextDueDate || input.triggerDate,
      warning_km: input.warningKm || 1000,
      warning_days: input.warningDays || 14,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating maintenance schedule:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/equipment/maintenance');
  return { success: true, schedule: transformMaintenanceScheduleRow(data as unknown as MaintenanceScheduleRow) };
}

export async function updateMaintenanceSchedule(
  id: string,
  input: Partial<MaintenanceScheduleInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.triggerType) updateData.trigger_type = input.triggerType;
  if (input.triggerValue !== undefined) updateData.trigger_value = input.triggerValue;
  if (input.triggerDate) updateData.trigger_date = input.triggerDate;
  if (input.nextDueKm !== undefined) updateData.next_due_km = input.nextDueKm;
  if (input.nextDueDate) updateData.next_due_date = input.nextDueDate;
  if (input.warningKm !== undefined) updateData.warning_km = input.warningKm;
  if (input.warningDays !== undefined) updateData.warning_days = input.warningDays;

  const { error } = await supabase
    .from('maintenance_schedules')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating maintenance schedule:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/equipment/maintenance');
  return { success: true };
}

export async function deleteMaintenanceSchedule(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('maintenance_schedules')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting maintenance schedule:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/equipment/maintenance');
  return { success: true };
}

// =====================================================
// UPCOMING MAINTENANCE
// =====================================================

export async function getUpcomingMaintenance(): Promise<UpcomingMaintenance[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('upcoming_maintenance')
    .select('*')
    .in('status', ['overdue', 'due_soon']);

  if (error) {
    console.error('Error fetching upcoming maintenance:', error);
    return [];
  }

  return (data || []).map((row) => transformUpcomingMaintenanceRow(row as unknown as UpcomingMaintenanceRow));
}

export async function getAllUpcomingMaintenance(): Promise<UpcomingMaintenance[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('upcoming_maintenance')
    .select('*');

  if (error) {
    console.error('Error fetching all upcoming maintenance:', error);
    return [];
  }

  return (data || []).map((row) => transformUpcomingMaintenanceRow(row as unknown as UpcomingMaintenanceRow));
}


// =====================================================
// MAINTENANCE RECORDS
// =====================================================

export async function createMaintenanceRecord(
  input: MaintenanceRecordInput
): Promise<{ success: boolean; error?: string; record?: MaintenanceRecord }> {
  const validation = validateMaintenanceRecordInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Calculate parts cost
  const partsCost = calculatePartsCost(input.parts);

  // Generate record number
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('maintenance_records')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);
  const recordNumber = `MNT-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

  // Insert maintenance record
  const { data: record, error: recordError } = await supabase
    .from('maintenance_records')
    .insert({
      record_number: recordNumber,
      asset_id: input.assetId,
      maintenance_type_id: input.maintenanceTypeId,
      schedule_id: input.scheduleId,
      maintenance_date: input.maintenanceDate,
      odometer_km: input.odometerKm,
      hour_meter: input.hourMeter,
      performed_at: input.performedAt,
      workshop_name: input.workshopName,
      workshop_address: input.workshopAddress,
      description: input.description,
      findings: input.findings,
      recommendations: input.recommendations,
      technician_name: input.technicianName,
      technician_employee_id: input.technicianEmployeeId,
      labor_cost: input.laborCost,
      parts_cost: partsCost,
      external_cost: input.externalCost,
      bkk_id: input.bkkId,
      photos: input.photos || [],
      documents: input.documents || [],
      notes: input.notes,
      status: 'completed',
      created_by: user?.id,
    })
    .select()
    .single();

  if (recordError) {
    console.error('Error creating maintenance record:', recordError);
    return { success: false, error: recordError.message };
  }

  // Insert parts if any
  if (input.parts.length > 0) {
    const partsToInsert = input.parts.map(part => ({
      maintenance_record_id: record.id,
      part_number: part.partNumber,
      part_name: part.partName,
      quantity: part.quantity,
      unit: part.unit,
      unit_price: part.unitPrice,
      supplier: part.supplier,
      warranty_months: part.warrantyMonths,
    }));

    const { error: partsError } = await supabase
      .from('maintenance_parts')
      .insert(partsToInsert);

    if (partsError) {
      console.error('Error inserting maintenance parts:', partsError);
      // Don't fail the whole operation, parts can be added later
    }
  }

  // Update asset odometer if provided
  if (input.odometerKm) {
    await supabase
      .from('assets')
      .update({ current_units: input.odometerKm })
      .eq('id', input.assetId);
  }

  // Update schedule next due if this was from a schedule
  if (input.scheduleId) {
    await updateNextMaintenanceDue(input.scheduleId, input.odometerKm, input.maintenanceDate);
  }

  // v0.44: Create cost tracking record for maintenance cost (Task 5.1)
  const totalMaintenanceCost = (input.laborCost || 0) + partsCost + (input.externalCost || 0);
  if (totalMaintenanceCost > 0) {
    await supabase.from('asset_cost_tracking').insert({
      asset_id: input.assetId,
      cost_type: 'maintenance',
      cost_date: input.maintenanceDate,
      amount: totalMaintenanceCost,
      reference_type: 'maintenance_record',
      reference_id: record.id,
      notes: input.description || null,
      created_by: user?.id || null,
    });
  }

  revalidatePath('/equipment/maintenance');
  revalidatePath('/equipment/costing');
  revalidatePath(`/equipment/${input.assetId}`);
  
  return { success: true, record: transformMaintenanceRecordRow(record as unknown as MaintenanceRecordRow) };
}

async function updateNextMaintenanceDue(
  scheduleId: string,
  currentKm?: number,
  completedDate?: string
): Promise<void> {
  const supabase = await createClient();

  // Get the schedule with its maintenance type
  const { data: schedule, error } = await supabase
    .from('maintenance_schedules')
    .select(`
      *,
      maintenance_type:maintenance_types(*)
    `)
    .eq('id', scheduleId)
    .single();

  if (error || !schedule) {
    console.error('Error fetching schedule for update:', error);
    return;
  }

  const updates: Record<string, unknown> = {};

  switch (schedule.trigger_type) {
    case 'km':
      if (currentKm && schedule.trigger_value) {
        updates.next_due_km = currentKm + schedule.trigger_value;
      }
      break;
    case 'days':
      if (schedule.trigger_value) {
        const nextDate = new Date(completedDate || new Date());
        nextDate.setDate(nextDate.getDate() + schedule.trigger_value);
        updates.next_due_date = nextDate.toISOString().split('T')[0];
      }
      break;
    case 'date':
      // For specific date types like KIR, add 6 months
      const next = new Date(completedDate || new Date());
      next.setMonth(next.getMonth() + 6);
      updates.next_due_date = next.toISOString().split('T')[0];
      break;
    case 'hours':
      // Similar to km but for hour meter
      break;
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('maintenance_schedules')
      .update(updates)
      .eq('id', scheduleId);
  }
}


export async function getMaintenanceRecordById(id: string): Promise<MaintenanceRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('maintenance_records')
    .select(`
      *,
      maintenance_type:maintenance_types(*),
      parts:maintenance_parts(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching maintenance record:', error);
    return null;
  }

  return {
    ...transformMaintenanceRecordRow(data as unknown as MaintenanceRecordRow),
    maintenanceType: data.maintenance_type ? transformMaintenanceTypeRow(data.maintenance_type as unknown as MaintenanceTypeRow) : undefined,
    parts: (data.parts || []).map((row: unknown) => transformMaintenancePartRow(row as MaintenancePartRow)),
  };
}

export async function getMaintenanceHistory(
  filters: MaintenanceHistoryFilters = {},
  limit: number = 50
): Promise<MaintenanceRecord[]> {
  const supabase = await createClient();

  let query = supabase
    .from('maintenance_records')
    .select(`
      *,
      maintenance_type:maintenance_types(type_name),
      asset:assets(asset_code, asset_name)
    `)
    .order('maintenance_date', { ascending: false })
    .limit(limit);

  if (filters.assetId) {
    query = query.eq('asset_id', filters.assetId);
  }
  if (filters.maintenanceTypeId) {
    query = query.eq('maintenance_type_id', filters.maintenanceTypeId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('maintenance_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('maintenance_date', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching maintenance history:', error);
    return [];
  }

  return (data || []).map(row => ({
    ...transformMaintenanceRecordRow(row as unknown as MaintenanceRecordRow),
    maintenanceType: row.maintenance_type ? { typeName: row.maintenance_type.type_name } as MaintenanceType : undefined,
    asset: row.asset,
  })) as MaintenanceRecord[];
}

export async function getAssetMaintenanceHistory(
  assetId: string,
  limit: number = 20
): Promise<MaintenanceRecord[]> {
  return getMaintenanceHistory({ assetId }, limit);
}

// =====================================================
// MAINTENANCE PARTS
// =====================================================

export async function getMaintenanceParts(recordId: string): Promise<MaintenancePart[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('maintenance_parts')
    .select('*')
    .eq('maintenance_record_id', recordId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching maintenance parts:', error);
    return [];
  }

  return (data || []).map((row) => transformMaintenancePartRow(row as unknown as MaintenancePartRow));
}

// =====================================================
// COST SUMMARY
// =====================================================

export async function getMaintenanceCostSummary(
  year: number,
  month?: number
): Promise<MaintenanceCostSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('maintenance_cost_summary')
    .select('*');

  if (month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    query = query.eq('month', startDate);
  } else {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte('month', startDate).lte('month', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching maintenance cost summary:', error);
    return [];
  }

  return (data || []).map((row) => transformMaintenanceCostSummaryRow(row as unknown as MaintenanceCostSummaryRow));
}

export async function getCostMTD(): Promise<number> {
  const supabase = await createClient();
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = startOfMonth.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('maintenance_records')
    .select('total_cost')
    .eq('status', 'completed')
    .gte('maintenance_date', startDate);

  if (error) {
    console.error('Error fetching cost MTD:', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + (row.total_cost || 0), 0);
}


// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getMaintenanceDashboardStats(): Promise<MaintenanceDashboardStats> {
  const supabase = await createClient();

  // Get upcoming maintenance counts
  const { data: upcomingData } = await supabase
    .from('upcoming_maintenance')
    .select('status');

  const overdueCount = (upcomingData || []).filter(item => item.status === 'overdue').length;
  const dueSoonCount = (upcomingData || []).filter(item => item.status === 'due_soon').length;

  // Get in-progress count
  const { count: inProgressCount } = await supabase
    .from('maintenance_records')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_progress');

  // Get cost MTD
  const costMTD = await getCostMTD();

  return {
    overdueCount,
    dueSoonCount,
    inProgressCount: inProgressCount || 0,
    costMTD,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export async function getActiveSchedulesCount(assetId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('maintenance_schedules')
    .select('*', { count: 'exact', head: true })
    .eq('asset_id', assetId)
    .eq('is_active', true);

  if (error) {
    console.error('Error counting active schedules:', error);
    return 0;
  }

  return count || 0;
}

export async function getMaintenanceRecordsCount(assetId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('maintenance_records')
    .select('*', { count: 'exact', head: true })
    .eq('asset_id', assetId)
    .eq('status', 'completed');

  if (error) {
    console.error('Error counting maintenance records:', error);
    return 0;
  }

  return count || 0;
}

export async function getTotalMaintenanceCost(assetId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('maintenance_records')
    .select('total_cost')
    .eq('asset_id', assetId)
    .eq('status', 'completed');

  if (error) {
    console.error('Error calculating total maintenance cost:', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + (row.total_cost || 0), 0);
}
