'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  EquipmentRequest,
  CreateEquipmentRequestInput,
  EquipmentRequestFilters,
} from '@/types/equipment-request';

async function generateRequestNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `EQR-${year}-`;

  const { data } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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

export async function getEquipmentRequests(
  filters?: EquipmentRequestFilters
): Promise<EquipmentRequest[]> {
  const supabase = await createClient();

  let query = supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch requester names
  const requesterIds = [...new Set((data as any[]).map((d: any) => d.requester_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', requesterIds);

  const profileMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (profiles || []).forEach((p: any) => profileMap.set(p.id, p)); // eslint-disable-line @typescript-eslint/no-explicit-any

  let result = (data as any[]).map((req: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...req,
    requester: profileMap.get(req.requester_id) || null,
  })) as EquipmentRequest[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.request_number.toLowerCase().includes(s) ||
        r.requester?.full_name?.toLowerCase().includes(s) ||
        r.equipment_name?.toLowerCase().includes(s) ||
        r.business_justification.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getEquipmentRequestById(id: string): Promise<EquipmentRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const req = data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch requester
  const { data: requester } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', req.requester_id)
    .single();

  // Fetch asset if linked
  let asset = null;
  if (req.asset_id) {
    const { data: a } = await supabase
      .from('assets')
      .select('id, asset_code, asset_name')
      .eq('id', req.asset_id)
      .single();
    asset = a;
  }

  // Fetch job order if linked
  let job_order = null;
  if (req.job_order_id) {
    const { data: jo } = await supabase
      .from('job_orders')
      .select('id, jo_number')
      .eq('id', req.job_order_id)
      .single();
    job_order = jo;
  }

  // Fetch checker
  let checker = null;
  if (req.checked_by) {
    const { data: c } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', req.checked_by)
      .single();
    checker = c;
  }

  // Fetch approver
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
    requester,
    asset,
    job_order,
    checker,
    approver,
  } as EquipmentRequest;
}

export async function submitEquipmentRequest(
  input: CreateEquipmentRequestInput
): Promise<{ success: boolean; data?: EquipmentRequest; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  if (!input.business_justification?.trim()) {
    return { success: false, error: 'Justifikasi kebutuhan harus diisi' };
  }
  if (!input.usage_start_date || !input.usage_end_date) {
    return { success: false, error: 'Tanggal penggunaan harus diisi' };
  }
  if (!input.asset_id && !input.equipment_name?.trim()) {
    return { success: false, error: 'Pilih aset atau isi nama peralatan yang dibutuhkan' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();
  const requestNumber = await generateRequestNumber();

  const { data, error } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      request_number: requestNumber,
      requester_id: profileId,
      asset_id: input.asset_id || null,
      equipment_name: input.equipment_name || null,
      usage_start_date: input.usage_start_date,
      usage_end_date: input.usage_end_date,
      job_order_id: input.job_order_id || null,
      business_justification: input.business_justification,
      priority: input.priority || 'normal',
      notes: input.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Gagal mengajukan permintaan peralatan' };
  }

  revalidatePath('/equipment/requests');
  return { success: true, data: data as unknown as EquipmentRequest };
}

export async function checkEquipmentRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'assets.edit')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan tidak dalam status pending' };
  }

  const { error } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'checked',
      checked_by: profileId,
      checked_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal memverifikasi permintaan' };
  }

  revalidatePath('/equipment/requests');
  revalidatePath(`/equipment/requests/${id}`);
  return { success: true };
}

export async function approveEquipmentRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'assets.edit')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || !['pending', 'checked'].includes((req as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan harus dalam status pending atau diperiksa' };
  }

  const { error } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'approved',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menyetujui permintaan' };
  }

  revalidatePath('/equipment/requests');
  revalidatePath(`/equipment/requests/${id}`);
  return { success: true };
}

export async function rejectEquipmentRequest(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'assets.edit')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  if (!reason?.trim()) return { success: false, error: 'Alasan penolakan harus diisi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || !['pending', 'checked'].includes((req as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan harus dalam status pending atau diperiksa' };
  }

  const { error } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'rejected',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menolak permintaan' };
  }

  revalidatePath('/equipment/requests');
  revalidatePath(`/equipment/requests/${id}`);
  return { success: true };
}

export async function cancelEquipmentRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: req } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya permintaan pending yang bisa dibatalkan' };
  }

  const { error } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal membatalkan permintaan' };
  }

  revalidatePath('/equipment/requests');
  revalidatePath(`/equipment/requests/${id}`);
  return { success: true };
}

export async function getEquipmentRequestStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('equipment_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('is_active', true);

  const all = (data || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    total: all.length,
    pending: all.filter((r) => r.status === 'pending' || r.status === 'checked').length,
    approved: all.filter((r) => r.status === 'approved').length,
    rejected: all.filter((r) => r.status === 'rejected').length,
  };
}
