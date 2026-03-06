'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ShippingLine, ShippingLineFormData } from '@/types/agency';
import { Json } from '@/types/database';
import {
  generateShippingLineCode,
  validateShippingLine,
} from '@/lib/agency-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// SHIPPING LINE ACTIONS
// =====================================================

export async function getShippingLines(): Promise<ActionResult<ShippingLine[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shipping_lines')
      .select('*')
      .eq('is_active', true)
      .order('line_name');

    if (error) throw error;

    const lines: ShippingLine[] = (data || []).map(mapDbToShippingLine);
    return { success: true, data: lines };
  } catch {
    return { success: false, error: 'Failed to fetch shipping lines' };
  }
}

export async function getShippingLineById(id: string): Promise<ActionResult<ShippingLine>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shipping_lines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Shipping line not found' };

    return { success: true, data: mapDbToShippingLine(data) };
  } catch {
    return { success: false, error: 'Failed to fetch shipping line' };
  }
}

export async function createShippingLine(formData: ShippingLineFormData): Promise<ActionResult<ShippingLine>> {
  try {
    const validation = validateShippingLine(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();

    // Get existing codes to ensure uniqueness
    const { data: existingLines } = await supabase
      .from('shipping_lines')
      .select('line_code');

    const existingCodes = (existingLines || []).map(l => l.line_code);
    const lineCode = formData.lineCode || generateShippingLineCode(formData.lineName, existingCodes);

    const dbData = mapShippingLineToDb(formData, lineCode);

    const { data, error } = await supabase
      .from('shipping_lines')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/shipping-lines');
    return { success: true, data: mapDbToShippingLine(data) };
  } catch {
    return { success: false, error: 'Failed to create shipping line' };
  }
}

export async function updateShippingLine(id: string, formData: ShippingLineFormData): Promise<ActionResult<ShippingLine>> {
  try {
    const validation = validateShippingLine(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();

    // Get existing line to preserve code if not provided
    const { data: existing } = await supabase
      .from('shipping_lines')
      .select('line_code')
      .eq('id', id)
      .single();

    const lineCode = formData.lineCode || existing?.line_code || '';
    const dbData = mapShippingLineToDb(formData, lineCode);

    const { data, error } = await supabase
      .from('shipping_lines')
      .update({ ...dbData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/shipping-lines');
    revalidatePath(`/agency/shipping-lines/${id}`);
    return { success: true, data: mapDbToShippingLine(data) };
  } catch {
    return { success: false, error: 'Failed to update shipping line' };
  }
}

export async function deleteShippingLine(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Soft delete
    const { error } = await supabase
      .from('shipping_lines')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/shipping-lines');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete shipping line' };
  }
}

export async function toggleShippingLinePreferred(id: string): Promise<ActionResult<ShippingLine>> {
  try {
    const supabase = await createClient();

    // Get current state
    const { data: current } = await supabase
      .from('shipping_lines')
      .select('is_preferred')
      .eq('id', id)
      .single();

    if (!current) return { success: false, error: 'Shipping line not found' };

    const { data, error } = await supabase
      .from('shipping_lines')
      .update({ is_preferred: !current.is_preferred, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/shipping-lines');
    return { success: true, data: mapDbToShippingLine(data) };
  } catch {
    return { success: false, error: 'Failed to toggle preferred status' };
  }
}

// =====================================================
// MAPPING FUNCTIONS (DB <-> TypeScript)
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToShippingLine(db: any): ShippingLine {
  return {
    id: db.id,
    lineCode: db.line_code,
    lineName: db.line_name,
    headOfficeAddress: db.head_office_address,
    headOfficeCountry: db.head_office_country,
    website: db.website,
    bookingPortalUrl: db.booking_portal_url,
    trackingUrl: db.tracking_url,
    localAgentName: db.local_agent_name,
    localAgentAddress: db.local_agent_address,
    localAgentPhone: db.local_agent_phone,
    localAgentEmail: db.local_agent_email,
    contacts: db.contacts || [],
    servicesOffered: db.services_offered || [],
    routesServed: db.routes_served || [],
    paymentTerms: db.payment_terms,
    creditLimit: db.credit_limit,
    creditDays: db.credit_days,
    serviceRating: db.service_rating,
    reliabilityScore: db.reliability_score,
    isPreferred: db.is_preferred,
    isActive: db.is_active,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapShippingLineToDb(data: ShippingLineFormData, lineCode: string) {
  return {
    line_code: lineCode,
    line_name: data.lineName,
    head_office_address: data.headOfficeAddress || null,
    head_office_country: data.headOfficeCountry || null,
    website: data.website || null,
    booking_portal_url: data.bookingPortalUrl || null,
    tracking_url: data.trackingUrl || null,
    local_agent_name: data.localAgentName || null,
    local_agent_address: data.localAgentAddress || null,
    local_agent_phone: data.localAgentPhone || null,
    local_agent_email: data.localAgentEmail || null,
    contacts: data.contacts as unknown as Json,
    services_offered: data.servicesOffered as unknown as Json,
    routes_served: data.routesServed as unknown as Json,
    payment_terms: data.paymentTerms || null,
    credit_limit: data.creditLimit || null,
    credit_days: data.creditDays || null,
    service_rating: data.serviceRating || null,
    is_preferred: data.isPreferred,
    notes: data.notes || null,
  };
}
