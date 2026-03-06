'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  Timesheet,
  CreateTimesheetInput,
  TimesheetFilters,
} from '@/types/timesheet';

async function generateTimesheetNumber(): Promise<string> {
  const supabase = await createClient();
  const now = new Date();
  const prefix = `TS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;

  const { data } = await supabase
    .from('timesheets' as any)
    .select('timesheet_number')
    .like('timesheet_number', `${prefix}%`)
    .order('timesheet_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNum = (data[0] as any).timesheet_number as string;
    const lastSeq = parseInt(lastNum.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

export async function getTimesheets(
  filters?: TimesheetFilters
): Promise<Timesheet[]> {
  const supabase = await createClient();

  let query = supabase
    .from('timesheets' as any)
    .select('*')
    .eq('is_active', true)
    .order('work_date', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch submitter names
  const submitterIds = [...new Set((data as any[]).map((d: any) => d.submitted_by).filter(Boolean))];
  const profileMap = new Map<string, any>();
  if (submitterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', submitterIds);
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
  }

  let result = (data as any[]).map((ts: any) => ({
    ...ts,
    submitter: profileMap.get(ts.submitted_by) || null,
  })) as Timesheet[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.timesheet_number.toLowerCase().includes(s) ||
        r.equipment_name.toLowerCase().includes(s) ||
        r.operator_name?.toLowerCase().includes(s) ||
        r.location?.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getTimesheetById(id: string): Promise<Timesheet | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('timesheets' as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const ts = data as any;

  // Fetch JO if linked
  let job_order = null;
  if (ts.jo_id) {
    const { data: jo } = await supabase
      .from('job_orders')
      .select('id, jo_number')
      .eq('id', ts.jo_id)
      .single();
    job_order = jo;
  }

  // Fetch submitter
  let submitter = null;
  if (ts.submitted_by) {
    const { data: u } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', ts.submitted_by)
      .single();
    submitter = u;
  }

  // Fetch approver
  let approver = null;
  if (ts.approved_by) {
    const { data: u } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', ts.approved_by)
      .single();
    approver = u;
  }

  return {
    ...ts,
    job_order,
    submitter,
    approver,
  } as Timesheet;
}

export async function createTimesheet(
  input: CreateTimesheetInput
): Promise<{ success: boolean; data?: Timesheet; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  if (!input.equipment_name?.trim()) return { success: false, error: 'Nama peralatan harus diisi' };
  if (!input.work_date) return { success: false, error: 'Tanggal kerja harus diisi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();
  const tsNumber = await generateTimesheetNumber();

  const { data, error } = await supabase
    .from('timesheets' as any)
    .insert({
      timesheet_number: tsNumber,
      jo_id: input.jo_id || null,
      equipment_name: input.equipment_name,
      operator_name: input.operator_name || null,
      work_date: input.work_date,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      hours_worked: input.hours_worked || 0,
      work_description: input.work_description || null,
      location: input.location || null,
      notes: input.notes || null,
      status: 'draft',
      created_by: profileId,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Gagal membuat timesheet' };
  }

  revalidatePath('/equipment/timesheets');
  return { success: true, data: data as unknown as Timesheet };
}

export async function submitTimesheet(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: ts } = await supabase
    .from('timesheets' as any)
    .select('status')
    .eq('id', id)
    .single();

  if (!ts || (ts as any).status !== 'draft') {
    return { success: false, error: 'Timesheet harus dalam status draft' };
  }

  const { error } = await supabase
    .from('timesheets' as any)
    .update({
      status: 'submitted',
      submitted_by: profileId,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal mengajukan timesheet' };
  }

  revalidatePath('/equipment/timesheets');
  revalidatePath(`/equipment/timesheets/${id}`);
  return { success: true };
}

export async function approveTimesheet(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: ts } = await supabase
    .from('timesheets' as any)
    .select('status')
    .eq('id', id)
    .single();

  if (!ts || (ts as any).status !== 'submitted') {
    return { success: false, error: 'Timesheet harus dalam status submitted' };
  }

  const { error } = await supabase
    .from('timesheets' as any)
    .update({
      status: 'approved',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menyetujui timesheet' };
  }

  revalidatePath('/equipment/timesheets');
  revalidatePath(`/equipment/timesheets/${id}`);
  return { success: true };
}

export async function rejectTimesheet(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: ts } = await supabase
    .from('timesheets' as any)
    .select('status')
    .eq('id', id)
    .single();

  if (!ts || (ts as any).status !== 'submitted') {
    return { success: false, error: 'Timesheet harus dalam status submitted' };
  }

  const { error } = await supabase
    .from('timesheets' as any)
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menolak timesheet' };
  }

  revalidatePath('/equipment/timesheets');
  revalidatePath(`/equipment/timesheets/${id}`);
  return { success: true };
}
