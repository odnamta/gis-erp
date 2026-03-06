'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ShippingLine, ShippingRate, ShippingRateFormData, Port } from '@/types/agency';
import { Json } from '@/types/database';
import { validateShippingRate } from '@/lib/agency-utils';
import { calculateTotalRate } from '@/lib/rate-calculation-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// MAPPING FUNCTIONS
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToPort(db: any): Port {
  return {
    id: db.id,
    portCode: db.port_code,
    portName: db.port_name,
    countryCode: db.country_code,
    countryName: db.country_name,
    portType: db.port_type,
    city: db.city,
    latitude: db.latitude,
    longitude: db.longitude,
    timezone: db.timezone,
    hasContainerTerminal: db.has_container_terminal,
    hasBreakbulkFacility: db.has_breakbulk_facility,
    hasRoRo: db.has_ro_ro,
    maxDraftM: db.max_draft_m,
    maxVesselLoaM: db.max_vessel_loa_m,
    primaryAgentId: db.primary_agent_id,
    isActive: db.is_active,
    createdAt: db.created_at,
  };
}

// =====================================================
// SHIPPING RATE ACTIONS
// =====================================================

export async function getShippingRates(): Promise<ActionResult<ShippingRate[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shipping_rates')
      .select(`
        *,
        shipping_lines!inner(id, line_code, line_name),
        origin:ports!shipping_rates_origin_port_id_fkey(id, port_code, port_name, country_name),
        destination:ports!shipping_rates_destination_port_id_fkey(id, port_code, port_name, country_name)
      `)
      .eq('is_active', true)
      .order('total_rate');

    if (error) throw error;

    const rates: ShippingRate[] = (data || []).map(mapDbToShippingRate);
    return { success: true, data: rates };
  } catch {
    return { success: false, error: 'Failed to fetch shipping rates' };
  }
}

export async function getShippingRateById(id: string): Promise<ActionResult<ShippingRate>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shipping_rates')
      .select(`
        *,
        shipping_lines!inner(id, line_code, line_name),
        origin:ports!shipping_rates_origin_port_id_fkey(id, port_code, port_name, country_name),
        destination:ports!shipping_rates_destination_port_id_fkey(id, port_code, port_name, country_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Shipping rate not found' };

    return { success: true, data: mapDbToShippingRate(data) };
  } catch {
    return { success: false, error: 'Failed to fetch shipping rate' };
  }
}

export async function searchShippingRates(
  originPortId: string,
  destinationPortId: string,
  containerType?: string,
  shippingLineId?: string
): Promise<ActionResult<ShippingRate[]>> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('shipping_rates')
      .select(`
        *,
        shipping_lines!inner(id, line_code, line_name),
        origin:ports!shipping_rates_origin_port_id_fkey(id, port_code, port_name, country_name),
        destination:ports!shipping_rates_destination_port_id_fkey(id, port_code, port_name, country_name)
      `)
      .eq('origin_port_id', originPortId)
      .eq('destination_port_id', destinationPortId)
      .eq('is_active', true)
      .lte('valid_from', today)
      .gte('valid_to', today);

    if (containerType) {
      query = query.eq('container_type', containerType);
    }
    if (shippingLineId) {
      query = query.eq('shipping_line_id', shippingLineId);
    }

    const { data, error } = await query.order('total_rate');

    if (error) throw error;

    const rates: ShippingRate[] = (data || []).map(mapDbToShippingRate);
    return { success: true, data: rates };
  } catch {
    return { success: false, error: 'Failed to search shipping rates' };
  }
}

export async function findBestRate(
  originPortId: string,
  destinationPortId: string,
  containerType: string
): Promise<ActionResult<{ best: ShippingRate | null; alternatives: ShippingRate[] }>> {
  try {
    const result = await searchShippingRates(originPortId, destinationPortId, containerType);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const rates = result.data;
    if (rates.length === 0) {
      return { success: true, data: { best: null, alternatives: [] } };
    }

    const best = rates[0];
    const alternatives = rates.slice(1, 4); // Up to 3 alternatives

    return { success: true, data: { best, alternatives } };
  } catch {
    return { success: false, error: 'Failed to find best rate' };
  }
}

export async function createShippingRate(formData: ShippingRateFormData): Promise<ActionResult<ShippingRate>> {
  try {
    const validation = validateShippingRate(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();

    // Calculate total rate
    const totalRate = calculateTotalRate(
      formData.oceanFreight,
      formData.baf || 0,
      formData.caf || 0,
      formData.pss || 0,
      formData.ens || 0,
      formData.otherSurcharges || []
    );

    const dbData = mapShippingRateToDb(formData, totalRate);

    const { data, error } = await supabase
      .from('shipping_rates')
      .insert(dbData)
      .select(`
        *,
        shipping_lines!inner(id, line_code, line_name),
        origin:ports!shipping_rates_origin_port_id_fkey(id, port_code, port_name, country_name),
        destination:ports!shipping_rates_destination_port_id_fkey(id, port_code, port_name, country_name)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/shipping-rates');
    return { success: true, data: mapDbToShippingRate(data) };
  } catch {
    return { success: false, error: 'Failed to create shipping rate' };
  }
}

export async function updateShippingRate(id: string, formData: ShippingRateFormData): Promise<ActionResult<ShippingRate>> {
  try {
    const validation = validateShippingRate(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();

    const totalRate = calculateTotalRate(
      formData.oceanFreight,
      formData.baf || 0,
      formData.caf || 0,
      formData.pss || 0,
      formData.ens || 0,
      formData.otherSurcharges || []
    );

    const dbData = mapShippingRateToDb(formData, totalRate);

    const { data, error } = await supabase
      .from('shipping_rates')
      .update({ ...dbData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        shipping_lines!inner(id, line_code, line_name),
        origin:ports!shipping_rates_origin_port_id_fkey(id, port_code, port_name, country_name),
        destination:ports!shipping_rates_destination_port_id_fkey(id, port_code, port_name, country_name)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/agency/shipping-rates');
    return { success: true, data: mapDbToShippingRate(data) };
  } catch {
    return { success: false, error: 'Failed to update shipping rate' };
  }
}

export async function deleteShippingRate(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('shipping_rates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/shipping-rates');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete shipping rate' };
  }
}

// =====================================================
// MAPPING FUNCTIONS (DB <-> TypeScript)
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToShippingRate(db: any): ShippingRate {
  return {
    id: db.id,
    shippingLineId: db.shipping_line_id,
    originPortId: db.origin_port_id,
    destinationPortId: db.destination_port_id,
    containerType: db.container_type,
    oceanFreight: db.ocean_freight,
    currency: db.currency,
    baf: db.baf || 0,
    caf: db.caf || 0,
    pss: db.pss || 0,
    ens: db.ens || 0,
    otherSurcharges: db.other_surcharges || [],
    totalRate: db.total_rate,
    transitDays: db.transit_days,
    frequency: db.frequency,
    validFrom: db.valid_from,
    validTo: db.valid_to,
    terms: db.terms,
    notes: db.notes,
    isActive: db.is_active,
    createdAt: db.created_at,
    // Joined fields
    shippingLine: db.shipping_lines ? {
      id: db.shipping_lines.id,
      lineCode: db.shipping_lines.line_code,
      lineName: db.shipping_lines.line_name,
    } as ShippingLine : undefined,
    originPort: db.origin ? mapDbToPort(db.origin) : undefined,
    destinationPort: db.destination ? mapDbToPort(db.destination) : undefined,
  };
}

function mapShippingRateToDb(data: ShippingRateFormData, totalRate: number) {
  return {
    shipping_line_id: data.shippingLineId,
    origin_port_id: data.originPortId,
    destination_port_id: data.destinationPortId,
    container_type: data.containerType,
    ocean_freight: data.oceanFreight,
    currency: data.currency,
    baf: data.baf || 0,
    caf: data.caf || 0,
    pss: data.pss || 0,
    ens: data.ens || 0,
    other_surcharges: (data.otherSurcharges || []) as unknown as Json,
    total_rate: totalRate,
    transit_days: data.transitDays || null,
    frequency: data.frequency || null,
    valid_from: data.validFrom,
    valid_to: data.validTo,
    terms: data.terms,
    notes: data.notes || null,
  };
}
