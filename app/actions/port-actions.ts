'use server';

import { createClient } from '@/lib/supabase/server';
import { Port } from '@/types/agency';

// =====================================================
// PORT ACTIONS
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getPorts(): Promise<ActionResult<Port[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ports')
      .select('*')
      .eq('is_active', true)
      .order('country_name')
      .order('port_name');

    if (error) throw error;

    const ports: Port[] = (data || []).map(mapDbToPort);
    return { success: true, data: ports };
  } catch {
    return { success: false, error: 'Failed to fetch ports' };
  }
}

export async function getPortByCode(portCode: string): Promise<ActionResult<Port>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ports')
      .select('*')
      .eq('port_code', portCode)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Port not found' };

    return { success: true, data: mapDbToPort(data) };
  } catch {
    return { success: false, error: 'Failed to fetch port' };
  }
}

export async function getPortsByCountry(countryCode: string): Promise<ActionResult<Port[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ports')
      .select('*')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .order('port_name');

    if (error) throw error;

    const ports: Port[] = (data || []).map(mapDbToPort);
    return { success: true, data: ports };
  } catch {
    return { success: false, error: 'Failed to fetch ports' };
  }
}

// =====================================================
// MAPPING FUNCTIONS (DB <-> TypeScript)
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
