'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  Employee,
  EmployeeWithRelations,
  EmployeeFilters,
  EmployeeFormData,
  EmployeeStatus,
  Department,
  Position,
} from '@/types/employees';
import { isValidEmployeeStatus, isValidEmploymentType, hasCircularReporting, generateEmployeeCode } from '@/lib/employee-utils';
import { invalidateEmployeeCache } from '@/lib/cached-queries';
import { logActivity } from '@/lib/activity-logger';

/**
 * Get all employees with optional filters
 */
export async function getEmployees(
  filters?: EmployeeFilters
): Promise<{ data: EmployeeWithRelations[] | null; error: string | null }> {
  const supabase = await createClient();

  // Use explicit relationship names to avoid PGRST201 ambiguous relationship error
  // departments has two FKs: employees_department_id_fkey and fk_department_manager
  // For self-joins, use column name syntax (employees!reporting_to) not FK constraint name
  let query = supabase
    .from('employees')
    .select(`
      *,
      department:departments!employees_department_id_fkey(id, department_code, department_name),
      position:positions(id, position_code, position_name, level),
      reporting_manager:employees!reporting_to(full_name, employee_code)
    `)
    .order('employee_code');

  if (filters?.departmentId) {
    query = query.eq('department_id', filters.departmentId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching employees:', error);
    return { data: null, error: error.message };
  }

  return { data: (data || []) as unknown as EmployeeWithRelations[], error: null };
}

/**
 * Get single employee by ID
 */
export async function getEmployee(
  id: string
): Promise<{ data: EmployeeWithRelations | null; error: string | null }> {
  const supabase = await createClient();

  // Use explicit relationship names to avoid PGRST201 ambiguous relationship error
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      department:departments!employees_department_id_fkey(id, department_code, department_name),
      position:positions(id, position_code, position_name, level),
      reporting_manager:employees!reporting_to(full_name, employee_code)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee:', error);
    return { data: null, error: error.message };
  }

  return { data: data as unknown as EmployeeWithRelations, error: null };
}


/**
 * Create new employee
 */
export async function createEmployee(
  formData: EmployeeFormData
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  const supabase = await createClient();

  // Validate required fields
  if (!formData.full_name?.trim()) {
    return { success: false, error: 'Employee name is required' };
  }

  if (!formData.join_date) {
    return { success: false, error: 'Join date is required' };
  }

  // Validate employment type
  if (!isValidEmploymentType(formData.employment_type)) {
    return { success: false, error: 'Invalid employment type' };
  }

  // Get current user for created_by
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user profile ID
  let createdBy = null;
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    createdBy = profile?.id;
  }

  // Check for circular reporting if reporting_to is set
  if (formData.reporting_to) {
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, reporting_to');
    
    // For new employee, we just need to ensure reporting_to exists
    const { data: manager } = await supabase
      .from('employees')
      .select('id')
      .eq('id', formData.reporting_to)
      .single();
    
    if (!manager) {
      return { success: false, error: 'Selected manager does not exist' };
    }
  }

  // Get current employee count for code generation
  const { count: employeeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true });

  // Generate employee code
  const employee_code = generateEmployeeCode(employeeCount || 0);

  // Prepare insert data
  const insertData = {
    employee_code,
    full_name: formData.full_name.trim(),
    nickname: formData.nickname?.trim() || null,
    id_number: formData.id_number?.trim() || null,
    tax_id: formData.tax_id?.trim() || null,
    date_of_birth: formData.date_of_birth || null,
    place_of_birth: formData.place_of_birth?.trim() || null,
    gender: formData.gender || null,
    religion: formData.religion?.trim() || null,
    marital_status: formData.marital_status || null,
    phone: formData.phone?.trim() || null,
    email: formData.email?.trim() || null,
    address: formData.address?.trim() || null,
    city: formData.city?.trim() || null,
    emergency_contact_name: formData.emergency_contact_name?.trim() || null,
    emergency_contact_phone: formData.emergency_contact_phone?.trim() || null,
    emergency_contact_relation: formData.emergency_contact_relation?.trim() || null,
    department_id: formData.department_id || null,
    position_id: formData.position_id || null,
    employment_type: formData.employment_type,
    join_date: formData.join_date,
    end_date: formData.end_date || null,
    reporting_to: formData.reporting_to || null,
    base_salary: formData.base_salary || null,
    bank_name: formData.bank_name?.trim() || null,
    bank_account: formData.bank_account?.trim() || null,
    bank_account_name: formData.bank_account_name?.trim() || null,
    photo_url: formData.photo_url || null,
    notes: formData.notes?.trim() || null,
    created_by: createdBy,
    status: 'active',
  };

  const { data, error } = await supabase
    .from('employees')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    return { success: false, error: error.message };
  }

  // Invalidate employee cache (Requirement 6.5)
  invalidateEmployeeCache();

  // Log activity (v0.13.1)
  if (user && data) {
    logActivity(user.id, 'create', 'employee', data.id, { name: formData.full_name })
  }

  revalidatePath('/hr/employees');
  return { success: true, employee: data as unknown as Employee };
}

/**
 * Update employee
 */
export async function updateEmployee(
  id: string,
  formData: Partial<EmployeeFormData>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Validate required fields if provided
  if (formData.full_name !== undefined && !formData.full_name?.trim()) {
    return { success: false, error: 'Employee name is required' };
  }

  if (formData.employment_type && !isValidEmploymentType(formData.employment_type)) {
    return { success: false, error: 'Invalid employment type' };
  }

  // Check for circular reporting if reporting_to is being updated
  if (formData.reporting_to !== undefined) {
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, reporting_to');
    
    if (allEmployees && hasCircularReporting(id, formData.reporting_to || null, allEmployees as Employee[])) {
      return { success: false, error: 'Cannot set reporting manager: would create circular reporting' };
    }
  }

  // Prepare update data (exclude employee_code - it's immutable)
  const updateData: Record<string, unknown> = {};
  
  if (formData.full_name !== undefined) updateData.full_name = formData.full_name.trim();
  if (formData.nickname !== undefined) updateData.nickname = formData.nickname?.trim() || null;
  if (formData.id_number !== undefined) updateData.id_number = formData.id_number?.trim() || null;
  if (formData.tax_id !== undefined) updateData.tax_id = formData.tax_id?.trim() || null;
  if (formData.date_of_birth !== undefined) updateData.date_of_birth = formData.date_of_birth || null;
  if (formData.place_of_birth !== undefined) updateData.place_of_birth = formData.place_of_birth?.trim() || null;
  if (formData.gender !== undefined) updateData.gender = formData.gender || null;
  if (formData.religion !== undefined) updateData.religion = formData.religion?.trim() || null;
  if (formData.marital_status !== undefined) updateData.marital_status = formData.marital_status || null;
  if (formData.phone !== undefined) updateData.phone = formData.phone?.trim() || null;
  if (formData.email !== undefined) updateData.email = formData.email?.trim() || null;
  if (formData.address !== undefined) updateData.address = formData.address?.trim() || null;
  if (formData.city !== undefined) updateData.city = formData.city?.trim() || null;
  if (formData.emergency_contact_name !== undefined) updateData.emergency_contact_name = formData.emergency_contact_name?.trim() || null;
  if (formData.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = formData.emergency_contact_phone?.trim() || null;
  if (formData.emergency_contact_relation !== undefined) updateData.emergency_contact_relation = formData.emergency_contact_relation?.trim() || null;
  if (formData.department_id !== undefined) updateData.department_id = formData.department_id || null;
  if (formData.position_id !== undefined) updateData.position_id = formData.position_id || null;
  if (formData.employment_type !== undefined) updateData.employment_type = formData.employment_type;
  if (formData.join_date !== undefined) updateData.join_date = formData.join_date;
  if (formData.end_date !== undefined) updateData.end_date = formData.end_date || null;
  if (formData.reporting_to !== undefined) updateData.reporting_to = formData.reporting_to || null;
  if (formData.base_salary !== undefined) updateData.base_salary = formData.base_salary || null;
  if (formData.bank_name !== undefined) updateData.bank_name = formData.bank_name?.trim() || null;
  if (formData.bank_account !== undefined) updateData.bank_account = formData.bank_account?.trim() || null;
  if (formData.bank_account_name !== undefined) updateData.bank_account_name = formData.bank_account_name?.trim() || null;
  if (formData.photo_url !== undefined) updateData.photo_url = formData.photo_url || null;
  if (formData.notes !== undefined) updateData.notes = formData.notes?.trim() || null;

  const { error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating employee:', error);
    return { success: false, error: error.message };
  }

  // Invalidate employee cache (Requirement 6.5)
  invalidateEmployeeCache();

  // Log activity (v0.13.1)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    logActivity(user.id, 'update', 'employee', id, { name: formData.full_name })
  }

  revalidatePath('/hr/employees');
  revalidatePath(`/hr/employees/${id}`);
  return { success: true };
}


/**
 * Update employee status
 */
export async function updateEmployeeStatus(
  id: string,
  status: EmployeeStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  if (!isValidEmployeeStatus(status)) {
    return { success: false, error: 'Invalid employee status' };
  }

  const updateData: Record<string, unknown> = { status };

  // Add resignation details if status is resigned or terminated
  if (status === 'resigned' || status === 'terminated') {
    updateData.resignation_date = new Date().toISOString().split('T')[0];
    if (reason) {
      updateData.resignation_reason = reason;
    }
  }

  const { error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating employee status:', error);
    return { success: false, error: error.message };
  }

  // Invalidate employee cache (Requirement 6.5)
  invalidateEmployeeCache();

  revalidatePath('/hr/employees');
  revalidatePath(`/hr/employees/${id}`);
  return { success: true };
}

/**
 * Link employee to user account
 */
export async function linkEmployeeToUser(
  employeeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user exists
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!userProfile) {
    return { success: false, error: 'User profile not found' };
  }

  // Check if employee already linked
  const { data: employee } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .single();

  if (employee?.user_id) {
    return { success: false, error: 'Employee is already linked to a user account' };
  }

  const { error } = await supabase
    .from('employees')
    .update({ user_id: userId })
    .eq('id', employeeId);

  if (error) {
    console.error('Error linking employee to user:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/hr/employees');
  revalidatePath(`/hr/employees/${employeeId}`);
  return { success: true };
}

/**
 * Get all departments
 */
export async function getDepartments(): Promise<{ data: Department[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('department_name');

  if (error) {
    console.error('Error fetching departments:', error);
    return { data: null, error: error.message };
  }

  return { data: data as Department[], error: null };
}

/**
 * Get all positions, optionally filtered by department
 */
export async function getPositions(
  departmentId?: string
): Promise<{ data: Position[] | null; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('positions')
    .select('*')
    .eq('is_active', true)
    .order('position_name');

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching positions:', error);
    return { data: null, error: error.message };
  }

  return { data: data as Position[], error: null };
}

/**
 * Get employee count for code generation preview
 */
export async function getEmployeeCount(): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching employee count:', error);
    return { count: 0, error: error.message };
  }

  return { count: count || 0, error: null };
}

/**
 * Get employees for dropdown (minimal data)
 */
export async function getEmployeesForDropdown(): Promise<{
  data: { id: string; employee_code: string; full_name: string }[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('status', 'active')
    .order('full_name');

  if (error) {
    console.error('Error fetching employees for dropdown:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get users not linked to any employee (for linking)
 */
export async function getUnlinkedUsers(): Promise<{
  data: { id: string; email: string; full_name: string }[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get all user_ids that are already linked to employees
  const { data: linkedEmployees } = await supabase
    .from('employees')
    .select('user_id')
    .not('user_id', 'is', null);

  const linkedUserIds = linkedEmployees?.map((e) => e.user_id).filter(Boolean) || [];

  // Get user profiles not linked to any employee
  let query = supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .order('full_name');

  if (linkedUserIds.length > 0) {
    query = query.not('id', 'in', `(${linkedUserIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching unlinked users:', error);
    return { data: null, error: error.message };
  }

  return { data: (data || []) as unknown as { id: string; email: string; full_name: string }[], error: null };
}
