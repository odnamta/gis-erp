'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  TaskAssignment,
  CreateTaskAssignmentInput,
  TaskAssignmentFilters,
} from '@/types/task-assignment';

async function generateTaskAssignmentNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `ST-${year}-`;

  const { data } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('request_number')
    .like('request_number', `${prefix}%`)
    .order('request_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNum = (data[0] as any).request_number as string; // eslint-disable-line @typescript-eslint/no-explicit-any
    const lastSeq = parseInt(lastNum.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

export async function getTaskAssignments(
  filters?: TaskAssignmentFilters
): Promise<TaskAssignment[]> {
  const supabase = await createClient();

  let query = supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch employee info
  const employeeIds = [...new Set((data as any[]).map((d: any) => d.employee_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_code')
    .in('id', employeeIds);

  const empMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (employees || []).forEach((e: any) => empMap.set(e.id, e)); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch requester names
  const requesterIds = [...new Set((data as any[]).map((d: any) => d.requester_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', requesterIds);

  const profileMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (profiles || []).forEach((p: any) => profileMap.set(p.id, p)); // eslint-disable-line @typescript-eslint/no-explicit-any

  let result = (data as any[]).map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...row,
    employee: empMap.get(row.employee_id) || null,
    requester: profileMap.get(row.requester_id) || null,
  })) as TaskAssignment[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.request_number.toLowerCase().includes(s) ||
        r.employee?.full_name?.toLowerCase().includes(s) ||
        r.task_title.toLowerCase().includes(s) ||
        r.location.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getTaskAssignmentById(id: string): Promise<TaskAssignment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const row = data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch requester
  const { data: requester } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', row.requester_id)
    .single();

  // Fetch employee
  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, employee_code')
    .eq('id', row.employee_id)
    .single();

  // Fetch approver
  let approver = null;
  if (row.approved_by) {
    const { data: a } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', row.approved_by)
      .single();
    approver = a;
  }

  return {
    ...row,
    requester,
    employee,
    approver,
  } as TaskAssignment;
}

// Alias for backward compatibility
export const getTaskAssignment = getTaskAssignmentById;

export async function getEmployeesForTaskAssignment(): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('status', 'active')
    .order('full_name');

  if (error) return [];
  return (data || []).map((emp: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: emp.id,
    full_name: emp.full_name,
  }));
}

export async function createTaskAssignment(
  input: CreateTaskAssignmentInput
): Promise<{ success: boolean; data?: TaskAssignment; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hr.employees.edit')) {
    return { success: false, error: 'Tidak memiliki akses untuk membuat surat tugas' };
  }

  if (!input.task_title?.trim()) {
    return { success: false, error: 'Judul tugas harus diisi' };
  }
  if (!input.employee_id) {
    return { success: false, error: 'Karyawan harus dipilih' };
  }
  if (!input.task_description?.trim()) {
    return { success: false, error: 'Deskripsi tugas harus diisi' };
  }
  if (!input.purpose?.trim()) {
    return { success: false, error: 'Tujuan penugasan harus diisi' };
  }
  if (!input.location?.trim()) {
    return { success: false, error: 'Lokasi penugasan harus diisi' };
  }
  if (!input.start_date || !input.end_date) {
    return { success: false, error: 'Tanggal mulai dan selesai harus diisi' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();
  const requestNumber = await generateTaskAssignmentNumber();

  const { data, error } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      request_number: requestNumber,
      requester_id: profileId,
      employee_id: input.employee_id,
      task_title: input.task_title,
      task_description: input.task_description,
      purpose: input.purpose,
      location: input.location,
      start_date: input.start_date,
      end_date: input.end_date,
      budget_allocation: input.budget_allocation || null,
      priority: input.priority || 'normal',
      notes: input.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Gagal membuat surat tugas' };
  }

  revalidatePath('/hr/task-assignments');
  return { success: true, data: data as unknown as TaskAssignment };
}

export async function approveTaskAssignment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hr.employees.edit')) {
    return { success: false, error: 'Tidak memiliki akses untuk menyetujui surat tugas' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Surat tugas tidak dalam status menunggu' };
  }

  const { error } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'approved',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menyetujui surat tugas' };
  }

  revalidatePath('/hr/task-assignments');
  revalidatePath(`/hr/task-assignments/${id}`);
  return { success: true };
}

export async function rejectTaskAssignment(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hr.employees.edit')) {
    return { success: false, error: 'Tidak memiliki akses untuk menolak surat tugas' };
  }

  if (!reason?.trim()) return { success: false, error: 'Alasan penolakan harus diisi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Surat tugas tidak dalam status menunggu' };
  }

  const { error } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'rejected',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menolak surat tugas' };
  }

  revalidatePath('/hr/task-assignments');
  revalidatePath(`/hr/task-assignments/${id}`);
  return { success: true };
}

export async function completeTaskAssignment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hr.employees.edit')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();

  const { data: req } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'approved') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Surat tugas harus dalam status disetujui untuk diselesaikan' };
  }

  const { error } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menyelesaikan surat tugas' };
  }

  revalidatePath('/hr/task-assignments');
  revalidatePath(`/hr/task-assignments/${id}`);
  return { success: true };
}

export async function getTaskAssignmentStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  completed: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('task_assignments' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('is_active', true);

  const all = (data || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    total: all.length,
    pending: all.filter((r) => r.status === 'pending').length,
    approved: all.filter((r) => r.status === 'approved').length,
    completed: all.filter((r) => r.status === 'completed').length,
  };
}
