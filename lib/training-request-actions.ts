'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature, ADMIN_ROLES } from '@/lib/permissions';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  TrainingRequest,
  CreateTrainingRequestInput,
  TrainingRequestFilters,
} from '@/types/training-request';

async function generateRequestNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `TR-${year}-`;

  const { data } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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

export async function getTrainingRequests(
  filters?: TrainingRequestFilters
): Promise<TrainingRequest[]> {
  const supabase = await createClient();

  let query = supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[TrainingRequest] fetch failed:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Fetch employee info
  const employeeIds = [...new Set((data as any[]).map((d: any) => d.employee_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, employee_code')
    .in('id', employeeIds);

  const empMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (employees || []).forEach((e: any) => empMap.set(e.id, e)); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch course info
  const courseIds = (data as any[]).map((d: any) => d.course_id).filter(Boolean); // eslint-disable-line @typescript-eslint/no-explicit-any
  const courseMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (courseIds.length > 0) {
    const { data: courses } = await supabase
      .from('safety_training_courses')
      .select('id, course_name')
      .in('id', [...new Set(courseIds)]);
    (courses || []).forEach((c: any) => courseMap.set(c.id, c)); // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  let result = (data as any[]).map((req: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...req,
    employee: empMap.get(req.employee_id) || null,
    course: req.course_id ? courseMap.get(req.course_id) || null : null,
  })) as TrainingRequest[];

  // Apply search filter in-memory
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.request_number.toLowerCase().includes(s) ||
        r.employee?.full_name?.toLowerCase().includes(s) ||
        r.custom_course_name?.toLowerCase().includes(s) ||
        r.course?.course_name?.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getTrainingRequestById(id: string): Promise<TrainingRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const req = data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch employee
  const { data: emp } = await supabase
    .from('employees')
    .select('id, full_name, employee_code')
    .eq('id', req.employee_id)
    .single();

  // Fetch course if exists
  let course = null;
  if (req.course_id) {
    const { data: c } = await supabase
      .from('safety_training_courses')
      .select('id, course_name')
      .eq('id', req.course_id)
      .single();
    course = c;
  }

  // Fetch approver if exists
  let approver = null;
  if (req.approved_by) {
    const { data: a } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', req.approved_by)
      .single();
    approver = a;
  }

  return {
    ...req,
    employee: emp || null,
    course,
    approver,
  } as TrainingRequest;
}

export async function submitTrainingRequest(
  input: CreateTrainingRequestInput
): Promise<{ success: boolean; data?: TrainingRequest; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  if (!input.employee_id) return { success: false, error: 'Karyawan harus dipilih' };
  if (!input.training_date_start) return { success: false, error: 'Tanggal training harus diisi' };
  if (!input.justification?.trim()) return { success: false, error: 'Justifikasi harus diisi' };

  const supabase = await createClient();
  const requestNumber = await generateRequestNumber();

  const { data, error } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      request_number: requestNumber,
      employee_id: input.employee_id,
      course_id: input.course_id || null,
      custom_course_name: input.custom_course_name || null,
      custom_course_description: input.custom_course_description || null,
      training_provider: input.training_provider || null,
      estimated_cost: input.estimated_cost || null,
      training_date_start: input.training_date_start,
      training_date_end: input.training_date_end || null,
      justification: input.justification,
      notes: input.notes || null,
      status: 'pending',
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[TrainingRequest] submit failed:', error);
    return { success: false, error: 'Gagal mengajukan permintaan training' };
  }

  revalidatePath('/hse/training/requests');
  return { success: true, data: data as unknown as TrainingRequest };
}

export async function approveTrainingRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hse.training.manage')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan tidak dalam status pending' };
  }

  const { error } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'approved',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[TrainingRequest] approve failed:', error);
    return { success: false, error: 'Gagal menyetujui permintaan' };
  }

  revalidatePath('/hse/training/requests');
  revalidatePath(`/hse/training/requests/${id}`);
  return { success: true };
}

export async function rejectTrainingRequest(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hse.training.manage')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  if (!reason?.trim()) {
    return { success: false, error: 'Alasan penolakan harus diisi' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan tidak dalam status pending' };
  }

  const { error } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'rejected',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id);

  if (error) {
    console.error('[TrainingRequest] reject failed:', error);
    return { success: false, error: 'Gagal menolak permintaan' };
  }

  revalidatePath('/hse/training/requests');
  revalidatePath(`/hse/training/requests/${id}`);
  return { success: true };
}

export async function cancelTrainingRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: req } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya permintaan pending yang bisa dibatalkan' };
  }

  const { error } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('[TrainingRequest] cancel failed:', error);
    return { success: false, error: 'Gagal membatalkan permintaan' };
  }

  revalidatePath('/hse/training/requests');
  revalidatePath(`/hse/training/requests/${id}`);
  return { success: true };
}

export async function deleteTrainingRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  // Fetch the request to check status and ownership
  const { data: req } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status, created_by')
    .eq('id', id)
    .single();

  if (!req) {
    return { success: false, error: 'Permintaan training tidak ditemukan' };
  }

  const reqData = req as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Only pending or draft requests can be deleted
  if (reqData.status !== 'pending' && reqData.status !== 'draft') {
    return { success: false, error: 'Hanya permintaan dengan status pending atau draft yang bisa dihapus' };
  }

  // Only the original requester or admin roles can delete
  const isRequester = reqData.created_by === profile.id;
  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(profile.role);
  if (!isRequester && !isAdmin) {
    return { success: false, error: 'Tidak memiliki akses untuk menghapus permintaan ini' };
  }

  // Soft delete
  const { error } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[TrainingRequest] delete failed:', error);
    return { success: false, error: 'Gagal menghapus permintaan training' };
  }

  revalidatePath('/hse/training/requests');
  revalidatePath(`/hse/training/requests/${id}`);
  return { success: true };
}

export async function getTrainingRequestStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('training_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('is_active', true);

  const all = (data || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    total: all.length,
    pending: all.filter((r) => r.status === 'pending').length,
    approved: all.filter((r) => r.status === 'approved').length,
    rejected: all.filter((r) => r.status === 'rejected').length,
  };
}
