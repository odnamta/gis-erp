'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PortAgent, PortAgentFormData } from '@/types/agency';
import { Json } from '@/types/database';
import {
  generateAgentCode,
  validatePortAgent,
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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

    // Get user profile (FK references user_profiles.id, not auth UUID)
    const { data: fbProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Insert feedback
    const { error: feedbackError } = await supabase
      .from('agent_feedback')
      .insert({
        agent_id: agentId,
        rating,
        feedback,
        created_by: fbProfile?.id || null,
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
  } catch {
    return { success: false, error: 'Failed to submit rating' };
  }
}

// =====================================================
// MAPPING FUNCTIONS (DB <-> TypeScript)
// =====================================================

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
