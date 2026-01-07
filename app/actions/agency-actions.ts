'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  ShippingLine,
  ShippingLineFormData,
  PortAgent,
  PortAgentFormData,
  ServiceProvider,
  ServiceProviderFormData,
  ShippingRate,
  ShippingRateFormData,
  Port,
  AgentFeedback,
} from '@/types/agency';
import { Json } from '@/types/database';
import {
  generateShippingLineCode,
  generateAgentCode,
  generateProviderCode,
  validateShippingLine,
  validatePortAgent,
  validateServiceProvider,
  validateShippingRate,
} from '@/lib/agency-utils';
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
  } catch (error) {
    console.error('Error fetching shipping lines:', error);
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
  } catch (error) {
    console.error('Error fetching shipping line:', error);
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
  } catch (error) {
    console.error('Error creating shipping line:', error);
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
  } catch (error) {
    console.error('Error updating shipping line:', error);
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
  } catch (error) {
    console.error('Error deleting shipping line:', error);
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
  } catch (error) {
    console.error('Error toggling preferred status:', error);
    return { success: false, error: 'Failed to toggle preferred status' };
  }
}


// =====================================================
// PORT AGENT ACTIONS
// =====================================================

export async function getPortAgents(): Promise<ActionResult<PortAgent[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('port_agents')
      .select('*')
      .eq('is_active', true)
      .order('port_country')
      .order('agent_name');

    if (error) throw error;

    const agents: PortAgent[] = (data || []).map(mapDbToPortAgent);
    return { success: true, data: agents };
  } catch (error) {
    console.error('Error fetching port agents:', error);
    return { success: false, error: 'Failed to fetch port agents' };
  }
}

export async function getPortAgentById(id: string): Promise<ActionResult<PortAgent>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('port_agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Port agent not found' };

    return { success: true, data: mapDbToPortAgent(data) };
  } catch (error) {
    console.error('Error fetching port agent:', error);
    return { success: false, error: 'Failed to fetch port agent' };
  }
}

export async function getPortAgentsByPort(portCode: string): Promise<ActionResult<PortAgent[]>> {
  try {
    const supabase = await createClient();
    
    // First get port by code
    const { data: port } = await supabase
      .from('ports')
      .select('id, port_name')
      .eq('port_code', portCode)
      .single();

    if (!port) return { success: true, data: [] };

    const { data, error } = await supabase
      .from('port_agents')
      .select('*')
      .eq('port_id', port.id)
      .eq('is_active', true)
      .order('is_preferred', { ascending: false })
      .order('service_rating', { ascending: false });

    if (error) throw error;

    const agents: PortAgent[] = (data || []).map(mapDbToPortAgent);
    return { success: true, data: agents };
  } catch (error) {
    console.error('Error fetching port agents:', error);
    return { success: false, error: 'Failed to fetch port agents' };
  }
}

export async function createPortAgent(formData: PortAgentFormData): Promise<ActionResult<PortAgent>> {
  try {
    const validation = validatePortAgent(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();
    
    // Get existing codes
    const { data: existingAgents } = await supabase
      .from('port_agents')
      .select('agent_code');
    
    const existingCodes = (existingAgents || []).map(a => a.agent_code);
    
    // Get port code for agent code generation
    let portCode = 'PORT';
    if (formData.portId) {
      const { data: port } = await supabase
        .from('ports')
        .select('port_code')
        .eq('id', formData.portId)
        .single();
      if (port) portCode = port.port_code;
    }
    
    const agentCode = formData.agentCode || generateAgentCode(formData.agentName, portCode, existingCodes);
    const dbData = mapPortAgentToDb(formData, agentCode);
    
    const { data, error } = await supabase
      .from('port_agents')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/port-agents');
    return { success: true, data: mapDbToPortAgent(data) };
  } catch (error) {
    console.error('Error creating port agent:', error);
    return { success: false, error: 'Failed to create port agent' };
  }
}

export async function updatePortAgent(id: string, formData: PortAgentFormData): Promise<ActionResult<PortAgent>> {
  try {
    const validation = validatePortAgent(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();
    
    const { data: existing } = await supabase
      .from('port_agents')
      .select('agent_code')
      .eq('id', id)
      .single();

    const agentCode = formData.agentCode || existing?.agent_code || '';
    const dbData = mapPortAgentToDb(formData, agentCode);
    
    const { data, error } = await supabase
      .from('port_agents')
      .update({ ...dbData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/port-agents');
    revalidatePath(`/agency/port-agents/${id}`);
    return { success: true, data: mapDbToPortAgent(data) };
  } catch (error) {
    console.error('Error updating port agent:', error);
    return { success: false, error: 'Failed to update port agent' };
  }
}

export async function deletePortAgent(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('port_agents')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/port-agents');
    return { success: true };
  } catch (error) {
    console.error('Error deleting port agent:', error);
    return { success: false, error: 'Failed to delete port agent' };
  }
}

export async function submitAgentRating(
  agentId: string,
  rating: number,
  feedback?: string
): Promise<ActionResult<void>> {
  try {
    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Insert feedback
    const { error: feedbackError } = await supabase
      .from('agent_feedback')
      .insert({
        agent_id: agentId,
        rating,
        feedback,
        created_by: user.id,
      });

    if (feedbackError) throw feedbackError;

    // Calculate new average rating
    const { data: feedbacks } = await supabase
      .from('agent_feedback')
      .select('rating')
      .eq('agent_id', agentId);

    if (feedbacks && feedbacks.length > 0) {
      const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
      const roundedRating = Math.round(avgRating * 100) / 100;

      await supabase
        .from('port_agents')
        .update({ 
          service_rating: roundedRating, 
          rating_count: feedbacks.length,
          updated_at: new Date().toISOString() 
        })
        .eq('id', agentId);
    }

    revalidatePath(`/agency/port-agents/${agentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error submitting rating:', error);
    return { success: false, error: 'Failed to submit rating' };
  }
}


// =====================================================
// SERVICE PROVIDER ACTIONS
// =====================================================

export async function getServiceProviders(): Promise<ActionResult<ServiceProvider[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('agency_service_providers')
      .select('*')
      .eq('is_active', true)
      .order('provider_name');

    if (error) throw error;

    const providers: ServiceProvider[] = (data || []).map(mapDbToServiceProvider);
    return { success: true, data: providers };
  } catch (error) {
    console.error('Error fetching service providers:', error);
    return { success: false, error: 'Failed to fetch service providers' };
  }
}

export async function getServiceProviderById(id: string): Promise<ActionResult<ServiceProvider>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('agency_service_providers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Service provider not found' };

    return { success: true, data: mapDbToServiceProvider(data) };
  } catch (error) {
    console.error('Error fetching service provider:', error);
    return { success: false, error: 'Failed to fetch service provider' };
  }
}

export async function getServiceProvidersByType(providerType: string): Promise<ActionResult<ServiceProvider[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('agency_service_providers')
      .select('*')
      .eq('provider_type', providerType)
      .eq('is_active', true)
      .order('is_preferred', { ascending: false })
      .order('service_rating', { ascending: false });

    if (error) throw error;

    const providers: ServiceProvider[] = (data || []).map(mapDbToServiceProvider);
    return { success: true, data: providers };
  } catch (error) {
    console.error('Error fetching service providers:', error);
    return { success: false, error: 'Failed to fetch service providers' };
  }
}

export async function createServiceProvider(formData: ServiceProviderFormData): Promise<ActionResult<ServiceProvider>> {
  try {
    const validation = validateServiceProvider(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();
    
    const { data: existingProviders } = await supabase
      .from('agency_service_providers')
      .select('provider_code');
    
    const existingCodes = (existingProviders || []).map(p => p.provider_code);
    const providerCode = formData.providerCode || generateProviderCode(formData.providerName, formData.providerType, existingCodes);
    const dbData = mapServiceProviderToDb(formData, providerCode);
    
    const { data, error } = await supabase
      .from('agency_service_providers')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/service-providers');
    return { success: true, data: mapDbToServiceProvider(data) };
  } catch (error) {
    console.error('Error creating service provider:', error);
    return { success: false, error: 'Failed to create service provider' };
  }
}

export async function updateServiceProvider(id: string, formData: ServiceProviderFormData): Promise<ActionResult<ServiceProvider>> {
  try {
    const validation = validateServiceProvider(formData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.map(e => e.message).join(', ') };
    }

    const supabase = await createClient();
    
    const { data: existing } = await supabase
      .from('agency_service_providers')
      .select('provider_code')
      .eq('id', id)
      .single();

    const providerCode = formData.providerCode || existing?.provider_code || '';
    const dbData = mapServiceProviderToDb(formData, providerCode);
    
    const { data, error } = await supabase
      .from('agency_service_providers')
      .update({ ...dbData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/service-providers');
    revalidatePath(`/agency/service-providers/${id}`);
    return { success: true, data: mapDbToServiceProvider(data) };
  } catch (error) {
    console.error('Error updating service provider:', error);
    return { success: false, error: 'Failed to update service provider' };
  }
}

export async function deleteServiceProvider(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('agency_service_providers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/service-providers');
    return { success: true };
  } catch (error) {
    console.error('Error deleting service provider:', error);
    return { success: false, error: 'Failed to delete service provider' };
  }
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
  } catch (error) {
    console.error('Error fetching shipping rates:', error);
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
  } catch (error) {
    console.error('Error fetching shipping rate:', error);
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
  } catch (error) {
    console.error('Error searching shipping rates:', error);
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
  } catch (error) {
    console.error('Error finding best rate:', error);
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
  } catch (error) {
    console.error('Error creating shipping rate:', error);
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
  } catch (error) {
    console.error('Error updating shipping rate:', error);
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
  } catch (error) {
    console.error('Error deleting shipping rate:', error);
    return { success: false, error: 'Failed to delete shipping rate' };
  }
}

// =====================================================
// PORT ACTIONS
// =====================================================

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
  } catch (error) {
    console.error('Error fetching ports:', error);
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
  } catch (error) {
    console.error('Error fetching port:', error);
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
  } catch (error) {
    console.error('Error fetching ports:', error);
    return { success: false, error: 'Failed to fetch ports' };
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToPortAgent(db: any): PortAgent {
  return {
    id: db.id,
    agentCode: db.agent_code,
    agentName: db.agent_name,
    portId: db.port_id,
    portName: db.port_name,
    portCountry: db.port_country,
    address: db.address,
    phone: db.phone,
    email: db.email,
    website: db.website,
    contacts: db.contacts || [],
    services: db.services || [],
    customsLicense: db.customs_license,
    ppjkLicense: db.ppjk_license,
    otherLicenses: db.other_licenses || [],
    paymentTerms: db.payment_terms,
    currency: db.currency,
    bankName: db.bank_name,
    bankAccount: db.bank_account,
    bankSwift: db.bank_swift,
    serviceRating: db.service_rating,
    responseTimeHours: db.response_time_hours,
    ratingCount: db.rating_count,
    isPreferred: db.is_preferred,
    isActive: db.is_active,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapPortAgentToDb(data: PortAgentFormData, agentCode: string) {
  return {
    agent_code: agentCode,
    agent_name: data.agentName,
    port_id: data.portId || null,
    port_name: data.portName,
    port_country: data.portCountry,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    website: data.website || null,
    contacts: data.contacts as unknown as Json,
    services: data.services as unknown as Json,
    customs_license: data.customsLicense || null,
    ppjk_license: data.ppjkLicense || null,
    other_licenses: data.otherLicenses as unknown as Json,
    payment_terms: data.paymentTerms || null,
    currency: data.currency,
    bank_name: data.bankName || null,
    bank_account: data.bankAccount || null,
    bank_swift: data.bankSwift || null,
    service_rating: data.serviceRating || null,
    is_preferred: data.isPreferred,
    notes: data.notes || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToServiceProvider(db: any): ServiceProvider {
  return {
    id: db.id,
    providerCode: db.provider_code,
    providerName: db.provider_name,
    providerType: db.provider_type,
    city: db.city,
    province: db.province,
    country: db.country,
    address: db.address,
    phone: db.phone,
    email: db.email,
    contacts: db.contacts || [],
    servicesDetail: db.services_detail || [],
    coverageAreas: db.coverage_areas || [],
    paymentTerms: db.payment_terms,
    npwp: db.npwp,
    siup: db.siup,
    documents: db.documents || [],
    serviceRating: db.service_rating,
    isPreferred: db.is_preferred,
    isActive: db.is_active,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapServiceProviderToDb(data: ServiceProviderFormData, providerCode: string) {
  return {
    provider_code: providerCode,
    provider_name: data.providerName,
    provider_type: data.providerType,
    city: data.city || null,
    province: data.province || null,
    country: data.country,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    contacts: data.contacts as unknown as Json,
    services_detail: data.servicesDetail as unknown as Json,
    coverage_areas: data.coverageAreas as unknown as Json,
    payment_terms: data.paymentTerms || null,
    npwp: data.npwp || null,
    siup: data.siup || null,
    documents: data.documents as unknown as Json,
    service_rating: data.serviceRating || null,
    is_preferred: data.isPreferred,
    notes: data.notes || null,
  };
}

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
    hasRoRo: db.has_roro,
    maxDraftM: db.max_draft_m,
    maxVesselLoaM: db.max_vessel_loa_m,
    primaryAgentId: db.primary_agent_id,
    isActive: db.is_active,
    createdAt: db.created_at,
  };
}
