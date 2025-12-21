'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  SkillCategory,
  Skill,
  EmployeeSkill,
  SkillGapAnalysis,
  ExpiringCertification,
  EmployeeSkillFormData,
  BulkSkillAssignment,
} from '@/types/skills';

// ============================================
// SKILL CATEGORIES
// ============================================

export async function getSkillCategories(): Promise<SkillCategory[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skill_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  
  if (error) {
    console.error('Error fetching skill categories:', error);
    return [];
  }
  
  return data || [];
}

// ============================================
// SKILLS
// ============================================

export async function getSkills(): Promise<Skill[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skills')
    .select(`
      *,
      category:skill_categories(*)
    `)
    .eq('is_active', true)
    .order('skill_name');
  
  if (error) {
    console.error('Error fetching skills:', error);
    return [];
  }
  
  return data || [];
}

export async function getSkillById(id: string): Promise<Skill | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skills')
    .select(`
      *,
      category:skill_categories(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching skill:', error);
    return null;
  }
  
  return data;
}

// ============================================
// EMPLOYEE SKILLS
// ============================================

export async function getEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('employee_skills')
    .select(`
      *,
      skill:skills(
        *,
        category:skill_categories(*)
      )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching employee skills:', error);
    return [];
  }
  
  return data || [];
}

export async function addEmployeeSkill(
  formData: EmployeeSkillFormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('employee_skills')
    .insert({
      employee_id: formData.employee_id,
      skill_id: formData.skill_id,
      level: formData.level,
      is_certified: formData.is_certified,
      certification_number: formData.certification_number || null,
      certification_date: formData.certification_date || null,
      expiry_date: formData.expiry_date || null,
      notes: formData.notes || null,
    });
  
  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Employee already has this skill assigned' };
    }
    console.error('Error adding employee skill:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/hr/skills');
  revalidatePath(`/hr/employees/${formData.employee_id}`);
  return { success: true };
}

export async function updateEmployeeSkill(
  id: string,
  formData: Partial<EmployeeSkillFormData>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('employee_skills')
    .update({
      level: formData.level,
      is_certified: formData.is_certified,
      certification_number: formData.certification_number || null,
      certification_date: formData.certification_date || null,
      expiry_date: formData.expiry_date || null,
      notes: formData.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating employee skill:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/hr/skills');
  return { success: true };
}

export async function deleteEmployeeSkill(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('employee_skills')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting employee skill:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/hr/skills');
  return { success: true };
}

export async function bulkAssignSkill(
  data: BulkSkillAssignment
): Promise<{ success: boolean; error?: string; assigned: number }> {
  const supabase = await createClient();
  
  const records = data.employee_ids.map(employeeId => ({
    employee_id: employeeId,
    skill_id: data.skill_id,
    level: data.level,
    is_certified: data.is_certified,
    certification_number: data.certification_number || null,
    certification_date: data.certification_date || null,
    expiry_date: data.expiry_date || null,
  }));
  
  const { error, data: inserted } = await supabase
    .from('employee_skills')
    .upsert(records, { onConflict: 'employee_id,skill_id' })
    .select();
  
  if (error) {
    console.error('Error bulk assigning skill:', error);
    return { success: false, error: error.message, assigned: 0 };
  }
  
  revalidatePath('/hr/skills');
  return { success: true, assigned: inserted?.length || 0 };
}

// ============================================
// GAP ANALYSIS
// ============================================

export async function getSkillGapAnalysis(): Promise<SkillGapAnalysis[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skill_gap_analysis')
    .select('*')
    .order('gap_percent', { ascending: false, nullsFirst: false });
  
  if (error) {
    console.error('Error fetching skill gap analysis:', error);
    return [];
  }
  
  return data || [];
}

// ============================================
// EXPIRING CERTIFICATIONS
// ============================================

export async function getExpiringCertifications(
  daysAhead: number = 60
): Promise<ExpiringCertification[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('expiring_certifications')
    .select('*')
    .lte('days_until_expiry', daysAhead)
    .order('days_until_expiry');
  
  if (error) {
    console.error('Error fetching expiring certifications:', error);
    return [];
  }
  
  return data || [];
}

// ============================================
// EMPLOYEES WITH SKILLS
// ============================================

export async function getEmployeesWithSkillCount(): Promise<
  { employee_id: string; full_name: string; employee_code: string; skill_count: number }[]
> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      full_name,
      employee_code,
      employee_skills(count)
    `)
    .eq('status', 'active')
    .order('full_name');
  
  if (error) {
    console.error('Error fetching employees with skill count:', error);
    return [];
  }
  
  return (data || []).map(emp => ({
    employee_id: emp.id,
    full_name: emp.full_name,
    employee_code: emp.employee_code,
    skill_count: (emp.employee_skills as { count: number }[])?.[0]?.count || 0,
  }));
}

// ============================================
// STATS
// ============================================

export async function getSkillsStats(): Promise<{
  totalSkills: number;
  totalCategories: number;
  employeesWithSkills: number;
  expiringCertifications: number;
  skillGaps: number;
}> {
  const supabase = await createClient();
  
  const [skillsRes, categoriesRes, employeeSkillsRes, expiringRes, gapsRes] = await Promise.all([
    supabase.from('skills').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('skill_categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('employee_skills').select('employee_id', { count: 'exact', head: true }),
    supabase.from('expiring_certifications').select('id', { count: 'exact', head: true }).lte('days_until_expiry', 60),
    supabase.from('skill_gap_analysis').select('skill_id').gt('gap_percent', 0),
  ]);
  
  return {
    totalSkills: skillsRes.count || 0,
    totalCategories: categoriesRes.count || 0,
    employeesWithSkills: employeeSkillsRes.count || 0,
    expiringCertifications: expiringRes.count || 0,
    skillGaps: gapsRes.data?.length || 0,
  };
}

// ============================================
// EMPLOYEES FOR SELECTION
// ============================================

export async function getActiveEmployees(): Promise<
  { id: string; full_name: string; employee_code: string; department_id: string | null }[]
> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, employee_code, department_id')
    .eq('status', 'active')
    .order('full_name');
  
  if (error) {
    console.error('Error fetching active employees:', error);
    return [];
  }
  
  return data || [];
}
