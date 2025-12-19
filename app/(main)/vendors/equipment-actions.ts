'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { VendorEquipment, EquipmentType, EquipmentCondition } from '@/types/vendors';

// Validation schema
const equipmentSchema = z.object({
  equipment_type: z.enum([
    'trailer_40ft',
    'trailer_20ft',
    'lowbed',
    'fuso',
    'wingbox',
    'crane',
    'forklift',
    'excavator',
    'other',
  ]),
  plate_number: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  year_made: z.number().int().min(1900).max(2100).optional().nullable(),
  capacity_kg: z.number().min(0).optional().nullable(),
  capacity_m3: z.number().min(0).optional().nullable(),
  capacity_description: z.string().optional().nullable(),
  length_m: z.number().min(0).optional().nullable(),
  width_m: z.number().min(0).optional().nullable(),
  height_m: z.number().min(0).optional().nullable(),
  daily_rate: z.number().min(0).optional().nullable(),
  rate_notes: z.string().optional().nullable(),
  is_available: z.boolean().default(true),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).default('good'),
  stnk_expiry: z.string().optional().nullable(),
  kir_expiry: z.string().optional().nullable(),
  insurance_expiry: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type EquipmentFormInput = z.infer<typeof equipmentSchema>;

/**
 * Get all equipment for a vendor
 */
export async function getVendorEquipment(vendorId: string): Promise<{
  data: VendorEquipment[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendor_equipment')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('equipment_type')
    .order('plate_number');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [] };
}

/**
 * Get equipment by ID
 */
export async function getEquipmentById(id: string): Promise<{
  data: VendorEquipment | null;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendor_equipment')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data };
}

/**
 * Get available equipment by type (for PJO cost item selection)
 */
export async function getAvailableEquipmentByType(
  vendorId: string,
  equipmentType?: EquipmentType
): Promise<{
  data: VendorEquipment[];
  error?: string;
}> {
  const supabase = await createClient();

  let query = supabase
    .from('vendor_equipment')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_available', true);

  if (equipmentType) {
    query = query.eq('equipment_type', equipmentType);
  }

  const { data, error } = await query.order('plate_number');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [] };
}

/**
 * Create new equipment
 */
export async function createEquipment(
  vendorId: string,
  input: EquipmentFormInput
): Promise<{
  data?: VendorEquipment;
  error?: string;
}> {
  const validation = equipmentSchema.safeParse(input);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendor_equipment')
    .insert({
      vendor_id: vendorId,
      equipment_type: input.equipment_type,
      plate_number: input.plate_number || null,
      brand: input.brand || null,
      model: input.model || null,
      year_made: input.year_made || null,
      capacity_kg: input.capacity_kg || null,
      capacity_m3: input.capacity_m3 || null,
      capacity_description: input.capacity_description || null,
      length_m: input.length_m || null,
      width_m: input.width_m || null,
      height_m: input.height_m || null,
      daily_rate: input.daily_rate || null,
      rate_notes: input.rate_notes || null,
      is_available: input.is_available,
      condition: input.condition,
      stnk_expiry: input.stnk_expiry || null,
      kir_expiry: input.kir_expiry || null,
      insurance_expiry: input.insurance_expiry || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/vendors/${vendorId}`);
  return { data };
}

/**
 * Update equipment
 */
export async function updateEquipment(
  id: string,
  vendorId: string,
  input: EquipmentFormInput
): Promise<{ error?: string }> {
  const validation = equipmentSchema.safeParse(input);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('vendor_equipment')
    .update({
      equipment_type: input.equipment_type,
      plate_number: input.plate_number || null,
      brand: input.brand || null,
      model: input.model || null,
      year_made: input.year_made || null,
      capacity_kg: input.capacity_kg || null,
      capacity_m3: input.capacity_m3 || null,
      capacity_description: input.capacity_description || null,
      length_m: input.length_m || null,
      width_m: input.width_m || null,
      height_m: input.height_m || null,
      daily_rate: input.daily_rate || null,
      rate_notes: input.rate_notes || null,
      is_available: input.is_available,
      condition: input.condition,
      stnk_expiry: input.stnk_expiry || null,
      kir_expiry: input.kir_expiry || null,
      insurance_expiry: input.insurance_expiry || null,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/vendors/${vendorId}`);
  return {};
}

/**
 * Delete equipment
 */
export async function deleteEquipment(
  id: string,
  vendorId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendor_equipment')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/vendors/${vendorId}`);
  return {};
}

/**
 * Toggle equipment availability
 */
export async function toggleEquipmentAvailability(
  id: string,
  vendorId: string,
  isAvailable: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('vendor_equipment')
    .update({
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/vendors/${vendorId}`);
  return {};
}
