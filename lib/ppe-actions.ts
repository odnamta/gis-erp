'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { addDays } from 'date-fns';
import {
  PPEType,
  PPEInventory,
  PPEIssuance,
  PPEInspection,
  CreatePPETypeInput,
  UpdatePPETypeInput,
  UpdateInventoryInput,
  IssuePPEInput,
  ReturnPPEInput,
  ReplacePPEInput,
  RecordInspectionInput,
  RecordPurchaseInput,
  PPEReplacementDue,
  EmployeePPEStatus,
  PPEDashboardMetrics,
} from '@/types/ppe';
import { isValidPPECategory, isValidPPECondition, isValidInspectionAction, isReusableCondition } from './ppe-utils';

// ============================================
// PPE Types Actions
// ============================================

export async function getPPETypes(includeInactive = false): Promise<PPEType[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('ppe_types')
    .select('*')
    .order('display_order', { ascending: true })
    .order('ppe_name', { ascending: true });
  
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to fetch PPE types: ${error.message}`);
  return (data || []) as unknown as PPEType[];
}

export async function getPPETypeById(id: string): Promise<PPEType | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('ppe_types')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch PPE type: ${error.message}`);
  }
  return data as unknown as PPEType;
}

export async function createPPEType(input: CreatePPETypeInput): Promise<PPEType> {
  const supabase = await createClient();
  
  // Validate category
  if (!isValidPPECategory(input.category)) {
    throw new Error('Invalid PPE category. Must be one of: head, eye, ear, respiratory, hand, body, foot, fall_protection');
  }
  
  const { data, error } = await supabase
    .from('ppe_types')
    .insert({
      ppe_code: input.ppe_code,
      ppe_name: input.ppe_name,
      description: input.description || null,
      category: input.category,
      replacement_interval_days: input.replacement_interval_days ?? null,
      is_mandatory: input.is_mandatory ?? false,
      has_sizes: input.has_sizes ?? true,
      available_sizes: input.available_sizes || [],
      unit_cost: input.unit_cost ?? null,
    })
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('PPE code already exists');
    }
    throw new Error(`Failed to create PPE type: ${error.message}`);
  }
  
  revalidatePath('/hse/ppe');
  return data as unknown as PPEType;
}

export async function updatePPEType(id: string, input: UpdatePPETypeInput): Promise<PPEType> {
  const supabase = await createClient();
  
  // Validate category if provided
  if (input.category && !isValidPPECategory(input.category)) {
    throw new Error('Invalid PPE category. Must be one of: head, eye, ear, respiratory, hand, body, foot, fall_protection');
  }
  
  const { data, error } = await supabase
    .from('ppe_types')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('PPE code already exists');
    }
    throw new Error(`Failed to update PPE type: ${error.message}`);
  }
  
  revalidatePath('/hse/ppe');
  return data as unknown as PPEType;
}

export async function deletePPEType(id: string): Promise<void> {
  const supabase = await createClient();
  
  // Check for active issuances
  const { count } = await supabase
    .from('ppe_issuance')
    .select('*', { count: 'exact', head: true })
    .eq('ppe_type_id', id)
    .eq('status', 'active');
  
  if (count && count > 0) {
    throw new Error('Cannot delete PPE type with active issuances');
  }
  
  // Soft delete
  const { error } = await supabase
    .from('ppe_types')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) throw new Error(`Failed to delete PPE type: ${error.message}`);
  
  revalidatePath('/hse/ppe');
}


// ============================================
// PPE Inventory Actions
// ============================================

export async function getPPEInventory(): Promise<PPEInventory[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('ppe_inventory')
    .select(`
      *,
      ppe_type:ppe_types(*)
    `)
    .order('updated_at', { ascending: false });
  
  if (error) throw new Error(`Failed to fetch PPE inventory: ${error.message}`);
  return (data || []) as unknown as PPEInventory[];
}

export async function getInventoryByTypeAndSize(
  ppeTypeId: string,
  size: string | null
): Promise<PPEInventory | null> {
  const supabase = await createClient();
  
  let query = supabase
    .from('ppe_inventory')
    .select('*')
    .eq('ppe_type_id', ppeTypeId);
  
  if (size) {
    query = query.eq('size', size);
  } else {
    query = query.is('size', null);
  }
  
  const { data, error } = await query.single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }
  return data as unknown as PPEInventory;
}

export async function updateInventory(id: string, input: UpdateInventoryInput): Promise<PPEInventory> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('ppe_inventory')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to update inventory: ${error.message}`);
  
  revalidatePath('/hse/ppe/inventory');
  return data as unknown as PPEInventory;
}

export async function adjustStock(
  ppeTypeId: string,
  size: string | null,
  adjustment: number,
  _reason: string
): Promise<PPEInventory> {
  const supabase = await createClient();
  
  // Get or create inventory record
  const inventory = await getInventoryByTypeAndSize(ppeTypeId, size);
  
  if (!inventory) {
    // Create new inventory record
    const { data: newInventory, error: createError } = await supabase
      .from('ppe_inventory')
      .insert({
        ppe_type_id: ppeTypeId,
        size: size,
        quantity_in_stock: Math.max(0, adjustment),
        reorder_level: 5,
      })
      .select()
      .single();
    
    if (createError) throw new Error(`Failed to create inventory: ${createError.message}`);
    
    revalidatePath('/hse/ppe/inventory');
    return newInventory as unknown as PPEInventory;
  }
  
  // Update existing inventory
  const newQuantity = Math.max(0, (inventory.quantity_in_stock || 0) + adjustment);
  
  const { data, error } = await supabase
    .from('ppe_inventory')
    .update({
      quantity_in_stock: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to adjust stock: ${error.message}`);
  
  revalidatePath('/hse/ppe/inventory');
  return data as unknown as PPEInventory;
}

export async function recordPurchase(input: RecordPurchaseInput): Promise<PPEInventory> {
  const supabase = await createClient();
  
  // Get or create inventory record
  const inventory = await getInventoryByTypeAndSize(input.ppe_type_id, input.size || null);
  
  if (!inventory) {
    // Create new inventory record
    const { data: newInventory, error: createError } = await supabase
      .from('ppe_inventory')
      .insert({
        ppe_type_id: input.ppe_type_id,
        size: input.size || null,
        quantity_in_stock: input.quantity,
        reorder_level: 5,
        storage_location: input.storage_location || null,
        last_purchase_date: input.purchase_date,
        last_purchase_qty: input.quantity,
        last_purchase_cost: input.unit_cost * input.quantity,
      })
      .select()
      .single();
    
    if (createError) throw new Error(`Failed to create inventory: ${createError.message}`);
    
    revalidatePath('/hse/ppe/inventory');
    return newInventory as unknown as PPEInventory;
  }
  
  // Update existing inventory
  const { data, error } = await supabase
    .from('ppe_inventory')
    .update({
      quantity_in_stock: (inventory.quantity_in_stock || 0) + input.quantity,
      storage_location: input.storage_location || inventory.storage_location,
      last_purchase_date: input.purchase_date,
      last_purchase_qty: input.quantity,
      last_purchase_cost: input.unit_cost * input.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to record purchase: ${error.message}`);
  
  revalidatePath('/hse/ppe/inventory');
  return data as unknown as PPEInventory;
}

export async function getLowStockItems(): Promise<PPEInventory[]> {
  const supabase = await createClient();
  
  // Since we can't easily do quantity < reorder_level in Supabase,
  // we'll fetch all and filter client-side
  const { data: allInventory, error: fetchError } = await supabase
    .from('ppe_inventory')
    .select(`
      *,
      ppe_type:ppe_types(*)
    `);
  
  if (fetchError) throw new Error(`Failed to fetch inventory: ${fetchError.message}`);
  
  return ((allInventory || []).filter(item => (item.quantity_in_stock || 0) < (item.reorder_level || 0))) as unknown as PPEInventory[];
}


// ============================================
// PPE Issuance Actions
// ============================================

export async function getPPEIssuances(filters?: {
  employeeId?: string;
  ppeTypeId?: string;
  status?: string;
}): Promise<PPEIssuance[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('ppe_issuance')
    .select(`
      *,
      employee:employees(id, employee_code, full_name, status),
      ppe_type:ppe_types(*),
      issued_by_user:user_profiles!ppe_issuance_issued_by_fkey(id, full_name, email)
    `)
    .order('issued_date', { ascending: false });
  
  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  if (filters?.ppeTypeId) {
    query = query.eq('ppe_type_id', filters.ppeTypeId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to fetch PPE issuances: ${error.message}`);
  return (data || []) as unknown as PPEIssuance[];
}

export async function getPPEIssuanceById(id: string): Promise<PPEIssuance | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('ppe_issuance')
    .select(`
      *,
      employee:employees(id, employee_code, full_name, status),
      ppe_type:ppe_types(*),
      issued_by_user:user_profiles!ppe_issuance_issued_by_fkey(id, full_name, email),
      inspections:ppe_inspections(
        *,
        inspected_by_user:user_profiles!ppe_inspections_inspected_by_fkey(id, full_name, email)
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch PPE issuance: ${error.message}`);
  }
  return data as unknown as PPEIssuance;
}

export async function issuePPE(input: IssuePPEInput): Promise<PPEIssuance> {
  const supabase = await createClient();
  
  // Validate employee is active
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, status')
    .eq('id', input.employee_id)
    .single();
  
  if (empError || !employee) {
    throw new Error('Employee not found');
  }
  if (employee.status !== 'active') {
    throw new Error('Cannot issue PPE to inactive employee');
  }
  
  // Get PPE type for replacement interval
  const { data: ppeType, error: typeError } = await supabase
    .from('ppe_types')
    .select('*')
    .eq('id', input.ppe_type_id)
    .eq('is_active', true)
    .single();
  
  if (typeError || !ppeType) {
    throw new Error('PPE type not found or inactive');
  }
  
  // Check inventory
  const inventory = await getInventoryByTypeAndSize(input.ppe_type_id, input.size || null);
  const quantity = input.quantity || 1;
  
  if (inventory && (inventory.quantity_in_stock || 0) < quantity) {
    throw new Error(`Insufficient stock. Available: ${inventory.quantity_in_stock || 0}, Requested: ${quantity}`);
  }
  
  // Calculate replacement date
  let expectedReplacementDate: string | null = null;
  if (ppeType.replacement_interval_days) {
    expectedReplacementDate = addDays(
      new Date(input.issued_date),
      ppeType.replacement_interval_days
    ).toISOString().split('T')[0];
  }
  
  // Create issuance
  const { data, error } = await supabase
    .from('ppe_issuance')
    .insert({
      employee_id: input.employee_id,
      ppe_type_id: input.ppe_type_id,
      quantity: quantity,
      size: input.size || null,
      serial_number: input.serial_number || null,
      issued_date: input.issued_date,
      issued_by: input.issued_by || null,
      condition_at_issue: input.condition_at_issue || 'new',
      expected_replacement_date: expectedReplacementDate,
      notes: input.notes || null,
      status: 'active',
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to issue PPE: ${error.message}`);
  
  // Decrement inventory (Property 5: Stock Decrement on Issuance)
  if (inventory) {
    await adjustStock(input.ppe_type_id, input.size || null, -quantity, 'Issued to employee');
  }
  
  revalidatePath('/hse/ppe/issuance');
  revalidatePath('/hse/ppe/compliance');
  return data as unknown as PPEIssuance;
}

export async function returnPPE(id: string, input: ReturnPPEInput): Promise<PPEIssuance> {
  const supabase = await createClient();
  
  // Get current issuance
  const { data: issuance, error: fetchError } = await supabase
    .from('ppe_issuance')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError || !issuance) {
    throw new Error('PPE issuance not found');
  }
  
  if (issuance.status !== 'active') {
    throw new Error('PPE has already been returned');
  }
  
  // Update issuance
  const { data, error } = await supabase
    .from('ppe_issuance')
    .update({
      returned_date: input.returned_date,
      returned_condition: input.returned_condition,
      replacement_reason: input.replacement_reason || null,
      notes: input.notes || issuance.notes,
      status: 'returned',
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to return PPE: ${error.message}`);
  
  // Increment inventory if reusable (Property 6: Stock Increment on Return)
  if (isReusableCondition(input.returned_condition)) {
    await adjustStock(
      issuance.ppe_type_id,
      issuance.size,
      issuance.quantity || 1,
      'Returned in reusable condition'
    );
  }
  
  revalidatePath('/hse/ppe/issuance');
  revalidatePath('/hse/ppe/compliance');
  return data as unknown as PPEIssuance;
}

export async function replacePPE(id: string, input: ReplacePPEInput): Promise<PPEIssuance> {
  const supabase = await createClient();
  
  // Get current issuance
  const issuance = await getPPEIssuanceById(id);
  
  if (!issuance) {
    throw new Error('PPE issuance not found');
  }
  
  if (issuance.status !== 'active') {
    throw new Error('PPE has already been returned or replaced');
  }
  
  // Mark old issuance as replaced
  const { error: updateError } = await supabase
    .from('ppe_issuance')
    .update({
      returned_date: input.returned_date,
      returned_condition: input.returned_condition,
      replacement_reason: input.replacement_reason,
      notes: input.notes || issuance.notes,
      status: 'replaced',
    })
    .eq('id', id);
  
  if (updateError) throw new Error(`Failed to update old issuance: ${updateError.message}`);
  
  // Create new issuance
  const newIssuance = await issuePPE({
    employee_id: issuance.employee_id,
    ppe_type_id: issuance.ppe_type_id,
    quantity: issuance.quantity,
    size: input.new_size || issuance.size,
    serial_number: input.new_serial_number || null,
    issued_date: input.returned_date,
    issued_by: issuance.issued_by,
    condition_at_issue: input.new_condition_at_issue || 'new',
    notes: `Replacement for issuance ${id}`,
  });
  
  // Return old PPE to inventory if reusable
  if (isReusableCondition(input.returned_condition)) {
    await adjustStock(
      issuance.ppe_type_id,
      issuance.size,
      issuance.quantity,
      'Returned during replacement'
    );
  }
  
  revalidatePath('/hse/ppe/issuance');
  revalidatePath('/hse/ppe/compliance');
  return newIssuance;
}

export async function markPPELost(id: string, notes: string): Promise<PPEIssuance> {
  const supabase = await createClient();
  
  const { data: issuance, error: fetchError } = await supabase
    .from('ppe_issuance')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError || !issuance) {
    throw new Error('PPE issuance not found');
  }
  
  if (issuance.status !== 'active') {
    throw new Error('PPE is not currently active');
  }
  
  const { data, error } = await supabase
    .from('ppe_issuance')
    .update({
      status: 'lost',
      notes: notes,
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to mark PPE as lost: ${error.message}`);
  
  revalidatePath('/hse/ppe/issuance');
  revalidatePath('/hse/ppe/compliance');
  return data as unknown as PPEIssuance;
}

export async function markPPEDamaged(id: string, notes: string): Promise<PPEIssuance> {
  const supabase = await createClient();
  
  const { data: issuance, error: fetchError } = await supabase
    .from('ppe_issuance')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError || !issuance) {
    throw new Error('PPE issuance not found');
  }
  
  if (issuance.status !== 'active') {
    throw new Error('PPE is not currently active');
  }
  
  const { data, error } = await supabase
    .from('ppe_issuance')
    .update({
      status: 'damaged',
      notes: notes,
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to mark PPE as damaged: ${error.message}`);
  
  revalidatePath('/hse/ppe/issuance');
  revalidatePath('/hse/ppe/compliance');
  return data as unknown as PPEIssuance;
}


// ============================================
// PPE Inspection Actions
// ============================================

export async function getInspectionsByIssuance(issuanceId: string): Promise<PPEInspection[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('ppe_inspections')
    .select(`
      *,
      inspected_by_user:user_profiles!ppe_inspections_inspected_by_fkey(id, full_name, email)
    `)
    .eq('issuance_id', issuanceId)
    .order('inspection_date', { ascending: false });
  
  if (error) throw new Error(`Failed to fetch inspections: ${error.message}`);
  return (data || []) as unknown as PPEInspection[];
}

export async function recordInspection(input: RecordInspectionInput): Promise<PPEInspection> {
  const supabase = await createClient();
  
  // Validate condition
  if (!isValidPPECondition(input.condition)) {
    throw new Error('Invalid condition. Must be one of: new, good, fair, poor, failed');
  }
  
  // Validate action if provided
  if (input.action_required && !isValidInspectionAction(input.action_required)) {
    throw new Error('Invalid action. Must be one of: none, clean, repair, replace');
  }
  
  // Verify issuance exists and is active
  const { data: issuance, error: issuanceError } = await supabase
    .from('ppe_issuance')
    .select('id, status')
    .eq('id', input.issuance_id)
    .single();
  
  if (issuanceError || !issuance) {
    throw new Error('PPE issuance not found');
  }
  
  if (issuance.status !== 'active') {
    throw new Error('Cannot inspect PPE that is not actively issued');
  }
  
  const { data, error } = await supabase
    .from('ppe_inspections')
    .insert({
      issuance_id: input.issuance_id,
      inspection_date: input.inspection_date,
      condition: input.condition,
      findings: input.findings || null,
      action_required: input.action_required || 'none',
      inspected_by: input.inspected_by || null,
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to record inspection: ${error.message}`);
  
  revalidatePath('/hse/ppe/issuance');
  return data as unknown as PPEInspection;
}

export async function updateInspectionAction(
  id: string,
  actionTaken: string
): Promise<PPEInspection> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('ppe_inspections')
    .update({ action_taken: actionTaken })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to update inspection: ${error.message}`);
  
  revalidatePath('/hse/ppe/issuance');
  return data as unknown as PPEInspection;
}

// ============================================
// Compliance & Replacement Views
// ============================================

export async function getReplacementDue(): Promise<PPEReplacementDue[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('ppe_replacement_due')
    .select('*');
  
  if (error) throw new Error(`Failed to fetch replacement due: ${error.message}`);
  return (data || []) as unknown as PPEReplacementDue[];
}

export async function getEmployeePPEStatus(employeeId?: string): Promise<EmployeePPEStatus[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('employee_ppe_status')
    .select('*');
  
  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to fetch employee PPE status: ${error.message}`);
  return (data || []) as unknown as EmployeePPEStatus[];
}

// ============================================
// Dashboard Metrics
// ============================================

export async function getPPEDashboardMetrics(): Promise<PPEDashboardMetrics> {
  const supabase = await createClient();
  
  // Total active issuances
  const { count: totalActiveIssuances } = await supabase
    .from('ppe_issuance')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  // Replacements due soon (within 30 days but not overdue)
  const { data: dueSoon } = await supabase
    .from('ppe_issuance')
    .select('id, expected_replacement_date')
    .eq('status', 'active')
    .not('expected_replacement_date', 'is', null)
    .gte('expected_replacement_date', new Date().toISOString().split('T')[0])
    .lte('expected_replacement_date', addDays(new Date(), 30).toISOString().split('T')[0]);
  
  // Replacements overdue
  const { data: overdue } = await supabase
    .from('ppe_issuance')
    .select('id, expected_replacement_date')
    .eq('status', 'active')
    .not('expected_replacement_date', 'is', null)
    .lt('expected_replacement_date', new Date().toISOString().split('T')[0]);
  
  // Employees missing mandatory PPE
  const { data: missingPPE } = await supabase
    .from('employee_ppe_status')
    .select('employee_id')
    .eq('ppe_status', 'missing');
  
  const uniqueEmployeesMissing = new Set(missingPPE?.map(m => m.employee_id) || []);
  
  // Low stock items
  const lowStockItems = await getLowStockItems();
  
  // Total PPE types
  const { count: totalPPETypes } = await supabase
    .from('ppe_types')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  return {
    totalActiveIssuances: totalActiveIssuances || 0,
    replacementsDueSoon: dueSoon?.length || 0,
    replacementsOverdue: overdue?.length || 0,
    employeesMissingPPE: uniqueEmployeesMissing.size,
    lowStockItems: lowStockItems.length,
    totalPPETypes: totalPPETypes || 0,
  };
}
