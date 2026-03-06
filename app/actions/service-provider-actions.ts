'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ServiceProvider, ServiceProviderFormData } from '@/types/agency';
import { Json } from '@/types/database';
import {
  generateProviderCode,
  validateServiceProvider,
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    return { success: false, error: 'Failed to delete service provider' };
  }
}

// =====================================================
// MAPPING FUNCTIONS (DB <-> TypeScript)
// =====================================================

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
