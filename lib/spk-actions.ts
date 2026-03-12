'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  VendorWorkOrder,
  CreateSPKInput,
  SPKFilters,
} from '@/types/vendor-work-order';

async function generateSPKNumber(): Promise<string> {
  const supabase = await createClient();
  const now = new Date();
  const prefix = `SPK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;

  const { data } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('spk_number')
    .like('spk_number', `${prefix}%`)
    .order('spk_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNum = (data[0] as any).spk_number as string; // eslint-disable-line @typescript-eslint/no-explicit-any
    const lastSeq = parseInt(lastNum.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

export async function getSPKList(
  filters?: SPKFilters
): Promise<VendorWorkOrder[]> {
  const supabase = await createClient();

  let query = supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch vendor names
  const vendorIds = [...new Set((data as any[]).map((d: any) => d.vendor_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, vendor_name, vendor_code')
    .in('id', vendorIds);

  const vendorMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (vendors || []).forEach((v: any) => vendorMap.set(v.id, v)); // eslint-disable-line @typescript-eslint/no-explicit-any

  let result = (data as any[]).map((spk: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...spk,
    vendor: vendorMap.get(spk.vendor_id) || null,
  })) as VendorWorkOrder[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.spk_number.toLowerCase().includes(s) ||
        r.vendor?.vendor_name?.toLowerCase().includes(s) ||
        r.work_description.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getSPKById(id: string): Promise<VendorWorkOrder | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const spk = data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch vendor
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, vendor_name, vendor_code')
    .eq('id', spk.vendor_id)
    .single();

  // Fetch JO if linked
  let job_order = null;
  if (spk.jo_id) {
    const { data: jo } = await supabase
      .from('job_orders')
      .select('id, jo_number')
      .eq('id', spk.jo_id)
      .single();
    job_order = jo;
  }

  // Fetch issuer
  let issuer = null;
  if (spk.issued_by) {
    const { data: u } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', spk.issued_by)
      .single();
    issuer = u;
  }

  return {
    ...spk,
    vendor,
    job_order,
    issuer,
  } as VendorWorkOrder;
}

export async function createSPK(
  input: CreateSPKInput
): Promise<{ success: boolean; data?: VendorWorkOrder; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  if (!input.vendor_id) return { success: false, error: 'Vendor harus dipilih' };
  if (!input.work_description?.trim()) return { success: false, error: 'Deskripsi pekerjaan harus diisi' };
  if (!input.scheduled_start || !input.scheduled_end) {
    return { success: false, error: 'Jadwal pelaksanaan harus diisi' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();
  const spkNumber = await generateSPKNumber();

  const { data, error } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      spk_number: spkNumber,
      vendor_id: input.vendor_id,
      jo_id: input.jo_id || null,
      pjo_id: input.pjo_id || null,
      work_description: input.work_description,
      location: input.location || null,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
      agreed_amount: input.agreed_amount || 0,
      notes: input.notes || null,
      status: 'draft',
      created_by: profileId,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Gagal membuat SPK' };
  }

  revalidatePath('/vendors/work-orders');
  return { success: true, data: data as unknown as VendorWorkOrder };
}

export async function issueSPK(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: spk } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!spk || (spk as any).status !== 'draft') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'SPK harus dalam status draft untuk diterbitkan' };
  }

  const { error } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'issued',
      issued_by: profileId,
      issued_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menerbitkan SPK' };
  }

  revalidatePath('/vendors/work-orders');
  revalidatePath(`/vendors/work-orders/${id}`);
  return { success: true };
}

export async function completeSPK(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: spk } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!spk || !['issued', 'in_progress'].includes((spk as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'SPK harus dalam status issued atau in progress' };
  }

  const { error } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'completed' })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal menyelesaikan SPK' };
  }

  revalidatePath('/vendors/work-orders');
  revalidatePath(`/vendors/work-orders/${id}`);
  return { success: true };
}

export async function cancelSPK(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: spk } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!spk || !['draft', 'issued'].includes((spk as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya SPK draft atau issued yang bisa dibatalkan' };
  }

  const { error } = await supabase
    .from('vendor_work_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'Gagal membatalkan SPK' };
  }

  revalidatePath('/vendors/work-orders');
  revalidatePath(`/vendors/work-orders/${id}`);
  return { success: true };
}
