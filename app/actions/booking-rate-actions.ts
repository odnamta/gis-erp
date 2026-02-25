'use server';

// =====================================================
// BOOKING RATE LOOKUP SERVER ACTIONS
// Split from booking-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import {
  ShippingRate,
  ShippingLine,
  Port,
  ShippingTerms,
  FreightCalculation,
  RateLookupParams,
  ContainerType,
  BookingContainer,
} from '@/types/agency';
import {
  calculateFreightBreakdown,
} from '@/lib/booking-utils';

// =====================================================
// RATE LOOKUP AND FREIGHT CALCULATION
// =====================================================

export async function lookupRates(params: RateLookupParams): Promise<ShippingRate[]> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return [];
    }

    const supabase = await createClient();

    let query = supabase
      .from('shipping_rates')
      .select(`
        *,
        shipping_lines:shipping_line_id(line_name, line_code),
        origin_port:origin_port_id(port_name, port_code),
        destination_port:destination_port_id(port_name, port_code)
      `)
      .eq('origin_port_id', params.originPortId)
      .eq('destination_port_id', params.destinationPortId)
      .eq('is_active', true)
      .gte('valid_to', new Date().toISOString().split('T')[0]);

    if (params.shippingLineId) {
      query = query.eq('shipping_line_id', params.shippingLineId);
    }

    if (params.containerTypes && params.containerTypes.length > 0) {
      query = query.in('container_type', params.containerTypes);
    }

    const { data, error } = await query.order('total_rate', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      shippingLineId: row.shipping_line_id,
      originPortId: row.origin_port_id,
      destinationPortId: row.destination_port_id,
      containerType: row.container_type as ContainerType,
      oceanFreight: row.ocean_freight,
      currency: row.currency || 'USD',
      baf: row.baf || 0,
      caf: row.caf || 0,
      pss: row.pss || 0,
      ens: row.ens || 0,
      otherSurcharges: row.other_surcharges || [],
      totalRate: row.total_rate,
      transitDays: row.transit_days,
      frequency: row.frequency,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      terms: row.terms as ShippingTerms,
      notes: row.notes,
      isActive: row.is_active,
      createdAt: row.created_at,
      shippingLine: row.shipping_lines as unknown as Partial<ShippingLine>,
      originPort: row.origin_port as unknown as Port,
      destinationPort: row.destination_port as unknown as Port,
    })) as unknown as ShippingRate[];
  } catch (error) {
    return [];
  }
}

export async function calculateFreight(rates: ShippingRate[], containers: BookingContainer[]): Promise<FreightCalculation> {
  return calculateFreightBreakdown(containers, rates);
}
