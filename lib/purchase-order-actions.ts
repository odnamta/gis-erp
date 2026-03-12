'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';
import { getCurrentProfileId } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import {
  PurchaseOrder,
  POLineItem,
  CreatePOInput,
  UpdatePOInput,
  POFilters,
} from '@/types/purchase-order';

async function generatePONumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const { data } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('po_number')
    .like('po_number', `${prefix}%`)
    .order('po_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNum = (data[0] as any).po_number as string; // eslint-disable-line @typescript-eslint/no-explicit-any
    const lastSeq = parseInt(lastNum.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

function calculateTotals(items: Omit<POLineItem, 'id' | 'po_id'>[]) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = Math.round(subtotal * 0.11); // 11% PPN
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}

export async function getPurchaseOrders(
  filters?: POFilters
): Promise<PurchaseOrder[]> {
  const supabase = await createClient();

  let query = supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[PO] fetch failed:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Fetch vendor info
  const vendorIds = [...new Set((data as any[]).map((d: any) => d.vendor_id))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: vendors } = await supabase
    .from('vendors' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, name, contact_person')
    .in('id', vendorIds);

  const vendorMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (vendors || []).forEach((v: any) => vendorMap.set(v.id, v)); // eslint-disable-line @typescript-eslint/no-explicit-any

  let result = (data as any[]).map((po: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...po,
    vendor: vendorMap.get(po.vendor_id) || null,
  })) as PurchaseOrder[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.po_number.toLowerCase().includes(s) ||
        r.vendor?.name?.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const po = data as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Fetch vendor
  const { data: vendor } = await supabase
    .from('vendors' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, name, contact_person')
    .eq('id', po.vendor_id)
    .single();

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('po_line_items' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('*')
    .eq('po_id', id)
    .order('sort_order', { ascending: true });

  // Fetch approver
  let approver = null;
  if (po.approved_by) {
    const { data: a } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', po.approved_by)
      .single();
    approver = a;
  }

  return {
    ...po,
    vendor: vendor || null,
    line_items: (lineItems || []) as unknown as POLineItem[],
    approver,
  } as PurchaseOrder;
}

export async function createPurchaseOrder(
  input: CreatePOInput
): Promise<{ success: boolean; data?: PurchaseOrder; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.po.create')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  if (!input.vendor_id) return { success: false, error: 'Vendor harus dipilih' };
  if (!input.order_date) return { success: false, error: 'Tanggal order harus diisi' };
  if (!input.line_items || input.line_items.length === 0) {
    return { success: false, error: 'Minimal satu item harus diisi' };
  }

  const supabase = await createClient();
  const poNumber = await generatePONumber();
  const { subtotal, taxAmount, totalAmount } = calculateTotals(input.line_items);

  // Insert PO header
  const { data: po, error: poError } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      po_number: poNumber,
      vendor_id: input.vendor_id,
      order_date: input.order_date,
      delivery_date: input.delivery_date || null,
      delivery_address: input.delivery_address || null,
      payment_terms: input.payment_terms || null,
      notes: input.notes || null,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'draft',
      created_by: profile!.id,
    })
    .select()
    .single();

  if (poError) {
    console.error('[PO] create failed:', poError);
    return { success: false, error: 'Gagal membuat Purchase Order' };
  }

  // Insert line items
  const lineItemsToInsert = input.line_items.map((item, idx) => ({
    po_id: (po as any).id, // eslint-disable-line @typescript-eslint/no-explicit-any
    item_description: item.item_description,
    quantity: item.quantity,
    unit: item.unit || 'pcs',
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price,
    notes: item.notes || null,
    sort_order: idx,
  }));

  const { error: itemsError } = await supabase
    .from('po_line_items' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert(lineItemsToInsert);

  if (itemsError) {
    console.error('[PO] insert line items failed:', itemsError);
    // PO was created but items failed - still return success with warning
  }

  revalidatePath('/vendors/purchase-orders');
  return { success: true, data: po as unknown as PurchaseOrder };
}

export async function updatePurchaseOrder(
  id: string,
  input: UpdatePOInput
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.po.create')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();

  // Check PO is draft
  const { data: existing } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!existing || (existing as any).status !== 'draft') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya PO dengan status draft yang bisa diedit' };
  }

  const updateData: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (input.vendor_id) updateData.vendor_id = input.vendor_id;
  if (input.order_date) updateData.order_date = input.order_date;
  if (input.delivery_date !== undefined) updateData.delivery_date = input.delivery_date || null;
  if (input.delivery_address !== undefined) updateData.delivery_address = input.delivery_address || null;
  if (input.payment_terms !== undefined) updateData.payment_terms = input.payment_terms || null;
  if (input.notes !== undefined) updateData.notes = input.notes || null;

  if (input.line_items && input.line_items.length > 0) {
    const { subtotal, taxAmount, totalAmount } = calculateTotals(input.line_items);
    updateData.subtotal = subtotal;
    updateData.tax_amount = taxAmount;
    updateData.total_amount = totalAmount;

    // Delete existing line items and re-insert
    await supabase.from('po_line_items' as any).delete().eq('po_id', id); // eslint-disable-line @typescript-eslint/no-explicit-any

    const lineItemsToInsert = input.line_items.map((item, idx) => ({
      po_id: id,
      item_description: item.item_description,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      notes: item.notes || null,
      sort_order: idx,
    }));

    await supabase.from('po_line_items' as any).insert(lineItemsToInsert); // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('[PO] update failed:', error);
    return { success: false, error: 'Gagal mengupdate Purchase Order' };
  }

  revalidatePath('/vendors/purchase-orders');
  revalidatePath(`/vendors/purchase-orders/${id}`);
  return { success: true };
}

export async function submitPurchaseOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.po.create')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();

  const { data: po } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!po || (po as any).status !== 'draft') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya PO draft yang bisa disubmit' };
  }

  const { error } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[PO] submit failed:', error);
    return { success: false, error: 'Gagal submit Purchase Order' };
  }

  revalidatePath('/vendors/purchase-orders');
  revalidatePath(`/vendors/purchase-orders/${id}`);
  return { success: true };
}

export async function approvePurchaseOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.po.approve')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: po } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!po || (po as any).status !== 'submitted') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya PO yang sudah disubmit yang bisa disetujui' };
  }

  const { error } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'approved',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[PO] approve failed:', error);
    return { success: false, error: 'Gagal menyetujui Purchase Order' };
  }

  revalidatePath('/vendors/purchase-orders');
  revalidatePath(`/vendors/purchase-orders/${id}`);
  return { success: true };
}

export async function rejectPurchaseOrder(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.po.approve')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  if (!reason?.trim()) return { success: false, error: 'Alasan penolakan harus diisi' };

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: po } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!po || (po as any).status !== 'submitted') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya PO yang sudah disubmit yang bisa ditolak' };
  }

  const { error } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'rejected',
      approved_by: profileId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id);

  if (error) {
    console.error('[PO] reject failed:', error);
    return { success: false, error: 'Gagal menolak Purchase Order' };
  }

  revalidatePath('/vendors/purchase-orders');
  revalidatePath(`/vendors/purchase-orders/${id}`);
  return { success: true };
}

export async function receivePurchaseOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'vendors.po.receive')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const profileId = await getCurrentProfileId();

  const { data: po } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!po || (po as any).status !== 'approved') { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya PO yang sudah disetujui yang bisa diterima' };
  }

  const { error } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({
      status: 'received',
      received_by: profileId,
      received_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[PO] receive failed:', error);
    return { success: false, error: 'Gagal menerima Purchase Order' };
  }

  revalidatePath('/vendors/purchase-orders');
  revalidatePath(`/vendors/purchase-orders/${id}`);
  return { success: true };
}

export async function cancelPurchaseOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await getUserProfile();
  if (!profile) return { success: false, error: 'Tidak terautentikasi' };

  const supabase = await createClient();

  const { data: po } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status')
    .eq('id', id)
    .single();

  if (!po || !['draft', 'submitted'].includes((po as any).status)) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return { success: false, error: 'Hanya PO draft atau submitted yang bisa dibatalkan' };
  }

  const { error } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[PO] cancel failed:', error);
    return { success: false, error: 'Gagal membatalkan Purchase Order' };
  }

  revalidatePath('/vendors/purchase-orders');
  revalidatePath(`/vendors/purchase-orders/${id}`);
  return { success: true };
}

export async function getPOStats(): Promise<{
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  totalValue: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('purchase_orders' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('status, total_amount')
    .eq('is_active', true);

  const all = (data || []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    total: all.length,
    draft: all.filter((r) => r.status === 'draft').length,
    submitted: all.filter((r) => r.status === 'submitted').length,
    approved: all.filter((r) => r.status === 'approved').length,
    totalValue: all
      .filter((r) => !['cancelled', 'rejected'].includes(r.status))
      .reduce((sum, r) => sum + (r.total_amount || 0), 0),
  };
}
