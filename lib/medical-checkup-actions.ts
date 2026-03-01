'use server';

// =====================================================
// HSE - MEDICAL CHECKUP (MCU) SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  MedicalCheckup,
  CreateMedicalCheckupInput,
  UpdateMedicalCheckupInput,
  MedicalCheckupFilters,
} from '@/types/medical-checkup';

// =====================================================
// GET MEDICAL CHECKUPS (LIST)
// =====================================================

export async function getMedicalCheckups(
  filters?: MedicalCheckupFilters
): Promise<MedicalCheckup[]> {
  const supabase = await createClient();

  let query = supabase
    .from('employee_medical_checkups' as any)
    .select(`
      *,
      employees!inner(employee_code, full_name, departments(department_name))
    `)
    .eq('is_active', true)
    .order('checkup_date', { ascending: false });

  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id);
  }

  if (filters?.medical_status) {
    query = query.eq('medical_status', filters.medical_status);
  }

  if (filters?.checkup_type) {
    query = query.eq('checkup_type', filters.checkup_type);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Gagal mengambil data medical checkup');
  }

  return ((data || []) as any[]).map((row) => ({
    ...row,
    employee_name: row.employees?.full_name,
    employee_code: row.employees?.employee_code,
    department_name: row.employees?.departments?.department_name,
    employees: undefined,
  }));
}

// =====================================================
// GET SINGLE MEDICAL CHECKUP
// =====================================================

export async function getMedicalCheckup(
  id: string
): Promise<MedicalCheckup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employee_medical_checkups' as any)
    .select(`
      *,
      employees!inner(employee_code, full_name, departments(department_name))
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Gagal mengambil data medical checkup');
  }

  const row = data as any;
  return {
    ...row,
    employee_name: row.employees?.full_name,
    employee_code: row.employees?.employee_code,
    department_name: row.employees?.departments?.department_name,
    employees: undefined,
  };
}

// =====================================================
// CREATE MEDICAL CHECKUP
// =====================================================

export async function createMedicalCheckup(
  input: CreateMedicalCheckupInput
): Promise<MedicalCheckup> {
  const supabase = await createClient();

  // Auto-calculate valid_from and valid_to
  const validFrom = input.valid_from || input.checkup_date;
  let validTo = input.valid_to || null;

  // For annual checkups, auto-set valid_to = checkup_date + 12 months
  if (!validTo && input.checkup_type === 'annual') {
    const date = new Date(input.checkup_date);
    date.setMonth(date.getMonth() + 12);
    validTo = date.toISOString().split('T')[0];
  }

  // For periodic checkups, also default to 12 months
  if (!validTo && input.checkup_type === 'periodic') {
    const date = new Date(input.checkup_date);
    date.setMonth(date.getMonth() + 12);
    validTo = date.toISOString().split('T')[0];
  }

  // For pre-employment, default to 6 months
  if (!validTo && input.checkup_type === 'pre_employment') {
    const date = new Date(input.checkup_date);
    date.setMonth(date.getMonth() + 6);
    validTo = date.toISOString().split('T')[0];
  }

  // Fallback: default 12 months if no valid_to set
  if (!validTo) {
    const date = new Date(input.checkup_date);
    date.setMonth(date.getMonth() + 12);
    validTo = date.toISOString().split('T')[0];
  }

  // Get current user profile for recorded_by
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single();

  const { data, error } = await supabase
    .from('employee_medical_checkups' as any)
    .insert({
      employee_id: input.employee_id,
      checkup_type: input.checkup_type,
      checkup_date: input.checkup_date,
      scheduled_date: input.scheduled_date || null,
      clinic_name: input.clinic_name,
      doctor_name: input.doctor_name,
      height_cm: input.height_cm ?? null,
      weight_kg: input.weight_kg ?? null,
      blood_pressure: input.blood_pressure || null,
      heart_rate: input.heart_rate ?? null,
      vision_left: input.vision_left || null,
      vision_right: input.vision_right || null,
      hearing_left: input.hearing_left || null,
      hearing_right: input.hearing_right || null,
      blood_test: input.blood_test ?? false,
      blood_test_result: input.blood_test_result || null,
      urine_test: input.urine_test ?? false,
      urine_test_result: input.urine_test_result || null,
      xray_performed: input.xray_performed ?? false,
      xray_result: input.xray_result || null,
      findings: input.findings || '',
      medical_status: input.medical_status,
      restrictions: input.restrictions || null,
      recommendations: input.recommendations || null,
      referral_required: input.referral_required ?? false,
      referral_to: input.referral_to || null,
      valid_from: validFrom,
      valid_to: validTo,
      status: input.status || 'completed',
      cost_idr: input.cost_idr ?? null,
      certificate_number: input.certificate_number || null,
      certificate_url: input.certificate_url || null,
      notes: input.notes || null,
      recorded_by: profile?.id || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Gagal membuat data medical checkup');
  }

  revalidatePath('/hse/medical-checkups');
  return data as unknown as MedicalCheckup;
}

// =====================================================
// UPDATE MEDICAL CHECKUP
// =====================================================

export async function updateMedicalCheckup(
  id: string,
  input: UpdateMedicalCheckupInput
): Promise<MedicalCheckup> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.checkup_type !== undefined) updateData.checkup_type = input.checkup_type;
  if (input.checkup_date !== undefined) updateData.checkup_date = input.checkup_date;
  if (input.scheduled_date !== undefined) updateData.scheduled_date = input.scheduled_date || null;
  if (input.clinic_name !== undefined) updateData.clinic_name = input.clinic_name;
  if (input.doctor_name !== undefined) updateData.doctor_name = input.doctor_name;
  if (input.height_cm !== undefined) updateData.height_cm = input.height_cm;
  if (input.weight_kg !== undefined) updateData.weight_kg = input.weight_kg;
  if (input.blood_pressure !== undefined) updateData.blood_pressure = input.blood_pressure;
  if (input.heart_rate !== undefined) updateData.heart_rate = input.heart_rate;
  if (input.vision_left !== undefined) updateData.vision_left = input.vision_left;
  if (input.vision_right !== undefined) updateData.vision_right = input.vision_right;
  if (input.hearing_left !== undefined) updateData.hearing_left = input.hearing_left;
  if (input.hearing_right !== undefined) updateData.hearing_right = input.hearing_right;
  if (input.blood_test !== undefined) updateData.blood_test = input.blood_test;
  if (input.blood_test_result !== undefined) updateData.blood_test_result = input.blood_test_result;
  if (input.urine_test !== undefined) updateData.urine_test = input.urine_test;
  if (input.urine_test_result !== undefined) updateData.urine_test_result = input.urine_test_result;
  if (input.xray_performed !== undefined) updateData.xray_performed = input.xray_performed;
  if (input.xray_result !== undefined) updateData.xray_result = input.xray_result;
  if (input.findings !== undefined) updateData.findings = input.findings;
  if (input.medical_status !== undefined) updateData.medical_status = input.medical_status;
  if (input.restrictions !== undefined) updateData.restrictions = input.restrictions;
  if (input.recommendations !== undefined) updateData.recommendations = input.recommendations;
  if (input.referral_required !== undefined) updateData.referral_required = input.referral_required;
  if (input.referral_to !== undefined) updateData.referral_to = input.referral_to;
  if (input.valid_from !== undefined) updateData.valid_from = input.valid_from;
  if (input.valid_to !== undefined) updateData.valid_to = input.valid_to;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.cost_idr !== undefined) updateData.cost_idr = input.cost_idr;
  if (input.certificate_number !== undefined) updateData.certificate_number = input.certificate_number;
  if (input.certificate_url !== undefined) updateData.certificate_url = input.certificate_url;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('employee_medical_checkups' as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Gagal mengupdate data medical checkup');
  }

  revalidatePath('/hse/medical-checkups');
  return data as unknown as MedicalCheckup;
}
