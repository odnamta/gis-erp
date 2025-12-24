'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AgencyChargeType,
  AgencyChargeTypeRow,
  ChargeTypeFormData,
  ChargeCategory,
  ChargeTypeClass,
} from '@/types/agency';
import {
  transformChargeTypeRow,
  validateChargeTypeData,
} from '@/lib/cost-revenue-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// CHARGE TYPE ACTIONS
// =====================================================

/**
 * Get all charge types, optionally filtered by category and/or type.
 * Results are ordered by display_order for consistent presentation.
 * 
 * Property 4: Charge Type Ordering Consistency
 * Output is always sorted by display_order in ascending order.
 * 
 * @param category - Optional filter by charge category
 * @param type - Optional filter by charge type class
 * @returns Array of charge types sorted by display_order
 */
export async function getChargeTypes(
  category?: ChargeCategory,
  type?: ChargeTypeClass
): Promise<ActionResult<AgencyChargeType[]>> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('agency_charge_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('charge_name', { ascending: true });

    if (category) {
      query = query.eq('charge_category', category);
    }

    if (type) {
      // For 'both' type, we want to include items that are 'both' or match the specific type
      if (type === 'revenue') {
        query = query.in('charge_type', ['revenue', 'both']);
      } else if (type === 'cost') {
        query = query.in('charge_type', ['cost', 'both']);
      } else {
        query = query.eq('charge_type', type);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    const chargeTypes: AgencyChargeType[] = (data || []).map((row: AgencyChargeTypeRow) =>
      transformChargeTypeRow(row)
    );

    return { success: true, data: chargeTypes };
  } catch (error) {
    console.error('Error fetching charge types:', error);
    return { success: false, error: 'Failed to fetch charge types' };
  }
}

/**
 * Get all charge types including inactive ones.
 * Used for historical data reference.
 * 
 * Property 5: Soft-Delete Data Preservation
 * Deleted charge types remain retrievable for historical reference.
 * 
 * @param includeInactive - Whether to include inactive charge types
 * @returns Array of all charge types
 */
export async function getAllChargeTypes(
  includeInactive: boolean = false
): Promise<ActionResult<AgencyChargeType[]>> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('agency_charge_types')
      .select('*')
      .order('display_order', { ascending: true })
      .order('charge_name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    const chargeTypes: AgencyChargeType[] = (data || []).map((row: AgencyChargeTypeRow) =>
      transformChargeTypeRow(row)
    );

    return { success: true, data: chargeTypes };
  } catch (error) {
    console.error('Error fetching all charge types:', error);
    return { success: false, error: 'Failed to fetch charge types' };
  }
}

/**
 * Get a single charge type by ID.
 * Returns the charge type even if inactive for historical reference.
 * 
 * @param id - The charge type ID
 * @returns The charge type or null if not found
 */
export async function getChargeTypeById(
  id: string
): Promise<ActionResult<AgencyChargeType>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('agency_charge_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Charge type not found' };
      }
      throw error;
    }

    if (!data) {
      return { success: false, error: 'Charge type not found' };
    }

    return { success: true, data: transformChargeTypeRow(data as AgencyChargeTypeRow) };
  } catch (error) {
    console.error('Error fetching charge type:', error);
    return { success: false, error: 'Failed to fetch charge type' };
  }
}

/**
 * Create a new charge type.
 * 
 * @param formData - The charge type form data
 * @returns The created charge type
 */
export async function createChargeType(
  formData: ChargeTypeFormData
): Promise<ActionResult<AgencyChargeType>> {
  try {
    // Validate form data
    const validation = validateChargeTypeData(formData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
      };
    }

    const supabase = await createClient();

    // Check for duplicate charge code
    const { data: existing } = await supabase
      .from('agency_charge_types')
      .select('id')
      .eq('charge_code', formData.chargeCode)
      .single();

    if (existing) {
      return { success: false, error: 'A charge type with this code already exists' };
    }

    // Get max display_order if not provided
    let displayOrder = formData.displayOrder;
    if (displayOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('agency_charge_types')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      displayOrder = (maxOrder?.display_order || 0) + 10;
    }

    const dbData = {
      charge_code: formData.chargeCode,
      charge_name: formData.chargeName,
      charge_category: formData.chargeCategory,
      charge_type: formData.chargeType,
      default_currency: formData.defaultCurrency || 'IDR',
      is_taxable: formData.isTaxable ?? true,
      display_order: displayOrder,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('agency_charge_types')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/charge-types');
    return { success: true, data: transformChargeTypeRow(data as AgencyChargeTypeRow) };
  } catch (error) {
    console.error('Error creating charge type:', error);
    return { success: false, error: 'Failed to create charge type' };
  }
}

/**
 * Update an existing charge type.
 * 
 * @param id - The charge type ID
 * @param formData - The updated charge type form data
 * @returns The updated charge type
 */
export async function updateChargeType(
  id: string,
  formData: Partial<ChargeTypeFormData>
): Promise<ActionResult<AgencyChargeType>> {
  try {
    const supabase = await createClient();

    // Get existing charge type
    const { data: existing } = await supabase
      .from('agency_charge_types')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Charge type not found' };
    }

    // Merge with existing data for validation
    const mergedData: ChargeTypeFormData = {
      chargeCode: formData.chargeCode ?? existing.charge_code,
      chargeName: formData.chargeName ?? existing.charge_name,
      chargeCategory: (formData.chargeCategory ?? existing.charge_category) as ChargeCategory,
      chargeType: (formData.chargeType ?? existing.charge_type) as ChargeTypeClass,
      defaultCurrency: formData.defaultCurrency ?? existing.default_currency,
      isTaxable: formData.isTaxable ?? existing.is_taxable,
      displayOrder: formData.displayOrder ?? existing.display_order,
    };

    // Validate merged data
    const validation = validateChargeTypeData(mergedData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
      };
    }

    // Check for duplicate charge code if it's being changed
    if (formData.chargeCode && formData.chargeCode !== existing.charge_code) {
      const { data: duplicate } = await supabase
        .from('agency_charge_types')
        .select('id')
        .eq('charge_code', formData.chargeCode)
        .neq('id', id)
        .single();

      if (duplicate) {
        return { success: false, error: 'A charge type with this code already exists' };
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (formData.chargeCode !== undefined) updateData.charge_code = formData.chargeCode;
    if (formData.chargeName !== undefined) updateData.charge_name = formData.chargeName;
    if (formData.chargeCategory !== undefined) updateData.charge_category = formData.chargeCategory;
    if (formData.chargeType !== undefined) updateData.charge_type = formData.chargeType;
    if (formData.defaultCurrency !== undefined) updateData.default_currency = formData.defaultCurrency;
    if (formData.isTaxable !== undefined) updateData.is_taxable = formData.isTaxable;
    if (formData.displayOrder !== undefined) updateData.display_order = formData.displayOrder;

    const { data, error } = await supabase
      .from('agency_charge_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/agency/charge-types');
    return { success: true, data: transformChargeTypeRow(data as AgencyChargeTypeRow) };
  } catch (error) {
    console.error('Error updating charge type:', error);
    return { success: false, error: 'Failed to update charge type' };
  }
}

/**
 * Soft-delete a charge type by setting is_active to false.
 * 
 * Property 5: Soft-Delete Data Preservation
 * The record remains in the database and is retrievable for historical reference.
 * 
 * @param id - The charge type ID
 * @returns Success status
 */
export async function deleteChargeType(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if charge type exists
    const { data: existing } = await supabase
      .from('agency_charge_types')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Charge type not found' };
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('agency_charge_types')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/charge-types');
    return { success: true };
  } catch (error) {
    console.error('Error deleting charge type:', error);
    return { success: false, error: 'Failed to delete charge type' };
  }
}

/**
 * Restore a soft-deleted charge type.
 * 
 * @param id - The charge type ID
 * @returns The restored charge type
 */
export async function restoreChargeType(id: string): Promise<ActionResult<AgencyChargeType>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('agency_charge_types')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'Charge type not found' };
    }

    revalidatePath('/agency/charge-types');
    return { success: true, data: transformChargeTypeRow(data as AgencyChargeTypeRow) };
  } catch (error) {
    console.error('Error restoring charge type:', error);
    return { success: false, error: 'Failed to restore charge type' };
  }
}

/**
 * Reorder charge types by updating their display_order values.
 * 
 * @param orderedIds - Array of charge type IDs in the desired order
 * @returns Success status
 */
export async function reorderChargeTypes(orderedIds: string[]): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Update display_order for each charge type
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: (index + 1) * 10, // Use increments of 10 for easier insertion
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('agency_charge_types')
        .update({ display_order: update.display_order })
        .eq('id', update.id);

      if (error) throw error;
    }

    revalidatePath('/agency/charge-types');
    return { success: true };
  } catch (error) {
    console.error('Error reordering charge types:', error);
    return { success: false, error: 'Failed to reorder charge types' };
  }
}
