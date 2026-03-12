'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  ReimbursementRequest,
  CreateReimbursementInput,
  ReimbursementFilters,
} from '@/types/reimbursement';

async function generateReimbursementNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `RB-${year}-`;

  const { data } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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

export async function getReimbursements(
  filters?: ReimbursementFilters
): Promise<ReimbursementRequest[]> {
  const supabase = await createClient();

  let query = supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Reimbursement] fetch failed:', error);
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

  let result = (data as any[]).map((req: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...req,
    employee: empMap.get(req.employee_id) || null,
  })) as ReimbursementRequest[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.request_number.toLowerCase().includes(s) ||
        r.employee?.full_name?.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getReimbursementById(id: string): Promise<ReimbursementRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
    employee: emp || null,
    checker,
    approver,
  } as ReimbursementRequest;
}

export async function submitReimbursement(
  input: CreateReimbursementInput
): Promise<{ success: boolean; data?: ReimbursementRequest; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  if (!input.employee_id) return { success: false, error: 'Karyawan harus dipilih' };
  if (!input.category) return { success: false, error: 'Kategori harus dipilih' };
  if (!input.amount || input.amount <= 0) return { success: false, error: 'Jumlah harus lebih dari 0' };
  if (!input.description?.trim()) return { success: false, error: 'Deskripsi harus diisi' };
  if (!input.receipt_date) return { success: false, error: 'Tanggal kwitansi harus diisi' };

  const supabase = await createClient();
  const requestNumber = await generateReimbursementNumber();

  const { data, error } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      request_number: requestNumber,
      employee_id: input.employee_id,
      category: input.category,
      amount: input.amount,
      description: input.description,
      receipt_date: input.receipt_date,
      receipt_url: input.receipt_url || null,
      notes: input.notes || null,
      status: 'pending',
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[Reimbursement] submit failed:', error);
    return { success: false, error: 'Gagal mengajukan reimbursement' };
  }

  revalidatePath('/hr/reimbursements');
  return { success: true, data: data as unknown as ReimbursementRequest };
}

export async function checkReimbursement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hr.reimbursement.approve')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan tidak dalam status pending' };
  }

  const { error } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'checked',
      checked_by: profileId,
      checked_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[Reimbursement] check failed:', error);
    return { success: false, error: 'Gagal memverifikasi reimbursement' };
  }

  revalidatePath('/hr/reimbursements');
  revalidatePath(`/hr/reimbursements/${id}`);
  return { success: true };
}

export async function approveReimbursement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hr.reimbursement.approve')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  // Accept both 'checked' (new flow) and 'pending' (backward compat for items without check step)
  if (!req || !['pending', 'checked'].includes((req as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan harus dalam status pending atau sudah diperiksa' };
  }

  const { error } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'approved',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[Reimbursement] approve failed:', error);
    return { success: false, error: 'Gagal menyetujui reimbursement' };
  }

  revalidatePath('/hr/reimbursements');
  revalidatePath(`/hr/reimbursements/${id}`);
  return { success: true };
}

export async function rejectReimbursement(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'hr.reimbursement.approve')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  if (!reason?.trim()) return { success: false, error: 'Alasan penolakan harus diisi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || !['pending', 'checked'].includes((req as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Permintaan harus dalam status pending atau sudah diperiksa' };
  }

  const { error } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'rejected',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id);

  if (error) {
    console.error('[Reimbursement] reject failed:', error);
    return { success: false, error: 'Gagal menolak reimbursement' };
  }

  revalidatePath('/hr/reimbursements');
  revalidatePath(`/hr/reimbursements/${id}`);
  return { success: true };
}

export async function markReimbursementPaid(
  id: string,
  paymentReference?: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'finance.reimbursement.pay')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: req } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'approved') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya reimbursement yang sudah disetujui yang bisa dibayar' };
  }

  const { error } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'paid',
      paid_by: profileId,
      paid_at: new Date().toISOString(),
      payment_reference: paymentReference || null,
    })
    .eq('id', id);

  if (error) {
    console.error('[Reimbursement] markPaid failed:', error);
    return { success: false, error: 'Gagal memproses pembayaran' };
  }

  revalidatePath('/hr/reimbursements');
  revalidatePath(`/hr/reimbursements/${id}`);
  return { success: true };
}

export async function cancelReimbursement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: req } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!req || (req as any).status !== 'pending') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya permintaan pending yang bisa dibatalkan' };
  }

  const { error } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('[Reimbursement] cancel failed:', error);
    return { success: false, error: 'Gagal membatalkan reimbursement' };
  }

  revalidatePath('/hr/reimbursements');
  revalidatePath(`/hr/reimbursements/${id}`);
  return { success: true };
}

export async function getReimbursementStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  paid: number;
  totalAmount: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('reimbursement_requests' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status, amount')
    .eq('is_active', true);

  const all = (data || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    total: all.length,
    pending: all.filter((r) => r.status === 'pending').length,
    approved: all.filter((r) => r.status === 'approved').length,
    paid: all.filter((r) => r.status === 'paid').length,
    totalAmount: all
      .filter((r) => r.status !== 'cancelled' && r.status !== 'rejected')
      .reduce((sum, r) => sum + (r.amount || 0), 0),
  };
}
