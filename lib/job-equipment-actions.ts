'use server';

// =====================================================
// v0.45: EQUIPMENT - JOB INTEGRATION SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  JobEquipmentUsage,
  EquipmentRate,
  AddEquipmentInput,
  CompleteEquipmentUsageInput,
  JobEquipmentUsageRow,
  JobEquipmentUsageWithAssetRow,
  EquipmentRateRow,
  transformJobEquipmentUsageRow,
  transformJobEquipmentUsageWithAssetRow,
  transformEquipmentRateRow,
  RateType,
  JobEquipmentSummary,
} from '@/types/job-equipment';
import {
  validateEquipmentUsageInput,
  validateMeterReadings,
  validateUsageDates,
  calculateDepreciationCost,
  calculateUsageDays,
  calculateBillingAmount,
} from './job-equipment-utils';

// =====================================================
// EQUIPMENT USAGE MANAGEMENT
// =====================================================

/**
 * Add equipment to a job order
 */
export async function addEquipmentToJob(
  input: AddEquipmentInput
): Promise<{ success: boolean; data?: JobEquipmentUsage; error?: string }> {
  try {
    // Validate input
    const validation = validateEquipmentUsageInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if asset exists and is available
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, status, book_value, useful_life_years, category_id')
      .eq('id', input.assetId)
      .single();

    if (assetError || !asset) {
      return { success: false, error: 'Asset not found' };
    }

    if (asset.status !== 'active' && asset.status !== 'idle') {
      return {
        success: false,
        error: `Asset is not available (status: ${asset.status})`,
      };
    }

    // Check if job order exists
    const { data: jobOrder, error: joError } = await supabase
      .from('job_orders')
      .select('id, jo_number')
      .eq('id', input.jobOrderId)
      .single();

    if (joError || !jobOrder) {
      return { success: false, error: 'Job order not found' };
    }

    // Check for duplicate usage (same asset, same job, same start date)
    const { data: existingUsage } = await supabase
      .from('job_equipment_usage')
      .select('id')
      .eq('job_order_id', input.jobOrderId)
      .eq('asset_id', input.assetId)
      .eq('usage_start', input.usageStart)
      .single();

    if (existingUsage) {
      return {
        success: false,
        error: 'Equipment already assigned to this job for this date',
      };
    }

    // Get daily rate if not provided
    let dailyRate = input.dailyRate;
    if (dailyRate === undefined) {
      const rateResult = await getEquipmentRate(input.assetId, 'daily');
      dailyRate = rateResult.data?.rateAmount;
    }

    // Create equipment usage record
    const { data: usage, error: insertError } = await supabase
      .from('job_equipment_usage')
      .insert({
        job_order_id: input.jobOrderId,
        asset_id: input.assetId,
        usage_start: input.usageStart,
        start_km: input.startKm || null,
        start_hours: input.startHours || null,
        daily_rate: dailyRate || null,
        rate_type: input.rateType || 'daily',
        is_billable: input.isBillable !== false,
        notes: input.notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating equipment usage:', insertError);
      return { success: false, error: 'Failed to add equipment to job' };
    }

    // Create asset assignment record
    await supabase.from('asset_assignments').insert({
      asset_id: input.assetId,
      assignment_type: 'job_order',
      job_order_id: input.jobOrderId,
      assigned_from: input.usageStart,
      start_km: input.startKm || null,
      start_hours: input.startHours || null,
      assigned_by: user?.id || null,
    });

    // Update asset assigned_to_job_id
    await supabase
      .from('assets')
      .update({ assigned_to_job_id: input.jobOrderId })
      .eq('id', input.assetId);

    revalidatePath('/job-orders');
    revalidatePath(`/job-orders/${input.jobOrderId}`);
    revalidatePath('/equipment');

    return {
      success: true,
      data: transformJobEquipmentUsageRow(usage as JobEquipmentUsageRow),
    };
  } catch (error) {
    console.error('Error in addEquipmentToJob:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Complete equipment usage with end readings and costs
 */
export async function completeEquipmentUsage(
  input: CompleteEquipmentUsageInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the usage record
    const { data: usage, error: fetchError } = await supabase
      .from('job_equipment_usage')
      .select(`
        *,
        assets!inner (
          id, book_value, useful_life_years, category_id
        )
      `)
      .eq('id', input.usageId)
      .single();

    if (fetchError || !usage) {
      return { success: false, error: 'Equipment usage record not found' };
    }

    // Validate dates
    const dateValidation = validateUsageDates(usage.usage_start, input.usageEnd);
    if (!dateValidation.valid) {
      return { success: false, error: dateValidation.error };
    }

    // Validate meter readings
    const meterValidation = validateMeterReadings(
      usage.start_km,
      input.endKm,
      usage.start_hours,
      input.endHours
    );
    if (!meterValidation.valid) {
      return { success: false, error: meterValidation.error };
    }

    // Calculate usage days
    const usageDays = calculateUsageDays(usage.usage_start, input.usageEnd);

    // Calculate depreciation cost
    const asset = usage.assets;
    const depreciationCost = calculateDepreciationCost(
      asset.book_value || 0,
      asset.useful_life_years || 10,
      usageDays
    );

    // Calculate km and hours used
    const kmUsed = input.endKm && usage.start_km 
      ? input.endKm - usage.start_km 
      : null;
    const hoursUsed = input.endHours && usage.start_hours
      ? input.endHours - usage.start_hours
      : null;

    // Calculate billing amount if billable
    let billingAmount = input.billingAmount;
    if (billingAmount === undefined && usage.is_billable && usage.daily_rate) {
      billingAmount = calculateBillingAmount(
        usage.rate_type,
        usage.daily_rate,
        usageDays,
        hoursUsed,
        kmUsed
      );
    }

    // Update usage record
    const { error: updateError } = await supabase
      .from('job_equipment_usage')
      .update({
        usage_end: input.usageEnd,
        end_km: input.endKm || null,
        end_hours: input.endHours || null,
        depreciation_cost: depreciationCost,
        fuel_cost: input.fuelCost || 0,
        maintenance_cost: input.maintenanceCost || 0,
        operator_cost: input.operatorCost || 0,
        billing_amount: billingAmount || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.usageId);

    if (updateError) {
      console.error('Error completing equipment usage:', updateError);
      return { success: false, error: 'Failed to complete equipment usage' };
    }

    // Complete the asset assignment
    await supabase
      .from('asset_assignments')
      .update({
        assigned_to: input.usageEnd,
        end_km: input.endKm || null,
        end_hours: input.endHours || null,
      })
      .eq('job_order_id', usage.job_order_id)
      .eq('asset_id', usage.asset_id)
      .is('assigned_to', null);

    // Clear asset assigned_to_job_id
    await supabase
      .from('assets')
      .update({ 
        assigned_to_job_id: null,
        current_units: input.endKm || undefined,
      })
      .eq('id', usage.asset_id);

    // Update job equipment cost
    await updateJobEquipmentCost(usage.job_order_id);

    revalidatePath('/job-orders');
    revalidatePath(`/job-orders/${usage.job_order_id}`);
    revalidatePath('/equipment');

    return { success: true };
  } catch (error) {
    console.error('Error in completeEquipmentUsage:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get equipment usage for a job
 */
export async function getJobEquipmentUsage(
  jobOrderId: string
): Promise<{ success: boolean; data?: JobEquipmentUsage[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('job_equipment_usage')
      .select(`
        *,
        assets!inner (
          asset_code,
          asset_name,
          registration_number,
          book_value,
          useful_life_years,
          category_id
        )
      `)
      .eq('job_order_id', jobOrderId)
      .order('usage_start', { ascending: false });

    if (error) {
      console.error('Error fetching job equipment usage:', error);
      return { success: false, error: 'Failed to fetch equipment usage' };
    }

    // Transform the data
    const usages: JobEquipmentUsage[] = (data || []).map((row) => {
      const baseRow = row as JobEquipmentUsageRow;
      const asset = row.assets as {
        asset_code: string;
        asset_name: string;
        registration_number: string | null;
        book_value: number | null;
        useful_life_years: number | null;
        category_id: string | null;
      };

      return {
        ...transformJobEquipmentUsageRow(baseRow),
        asset: {
          assetCode: asset.asset_code,
          assetName: asset.asset_name,
          registrationNumber: asset.registration_number ?? undefined,
          bookValue: asset.book_value ?? undefined,
          usefulLifeYears: asset.useful_life_years ?? undefined,
          categoryId: asset.category_id ?? undefined,
        },
      };
    });

    return { success: true, data: usages };
  } catch (error) {
    console.error('Error in getJobEquipmentUsage:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update job order equipment cost (sum of all equipment usage costs)
 */
export async function updateJobEquipmentCost(
  jobOrderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get total equipment cost for the job
    const { data: usages, error: fetchError } = await supabase
      .from('job_equipment_usage')
      .select('total_cost')
      .eq('job_order_id', jobOrderId);

    if (fetchError) {
      console.error('Error fetching equipment costs:', fetchError);
      return { success: false, error: 'Failed to calculate equipment cost' };
    }

    const totalEquipmentCost = (usages || []).reduce(
      (sum, u) => sum + (u.total_cost || 0),
      0
    );

    // Update job order
    const { error: updateError } = await supabase
      .from('job_orders')
      .update({ equipment_cost: totalEquipmentCost })
      .eq('id', jobOrderId);

    if (updateError) {
      console.error('Error updating job equipment cost:', updateError);
      return { success: false, error: 'Failed to update job equipment cost' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateJobEquipmentCost:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// EQUIPMENT RATE MANAGEMENT
// =====================================================

/**
 * Get equipment rate for an asset
 * Property 5: Asset-specific rates take priority over category rates
 */
export async function getEquipmentRate(
  assetId: string,
  rateType: RateType
): Promise<{ success: boolean; data?: EquipmentRate; error?: string }> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // First, try to get asset-specific rate
    const { data: assetRate, error: assetRateError } = await supabase
      .from('equipment_rates')
      .select('*')
      .eq('asset_id', assetId)
      .eq('rate_type', rateType)
      .eq('is_active', true)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (!assetRateError && assetRate) {
      return {
        success: true,
        data: transformEquipmentRateRow(assetRate as EquipmentRateRow),
      };
    }

    // If no asset-specific rate, get the asset's category
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('category_id')
      .eq('id', assetId)
      .single();

    if (assetError || !asset?.category_id) {
      return { success: false, error: 'Asset or category not found' };
    }

    // Get category rate
    const { data: categoryRate, error: categoryRateError } = await supabase
      .from('equipment_rates')
      .select('*')
      .eq('category_id', asset.category_id)
      .eq('rate_type', rateType)
      .eq('is_active', true)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (categoryRateError || !categoryRate) {
      return { success: false, error: 'No rate configured for this equipment' };
    }

    return {
      success: true,
      data: transformEquipmentRateRow(categoryRate as EquipmentRateRow),
    };
  } catch (error) {
    console.error('Error in getEquipmentRate:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all equipment rates
 */
export async function getEquipmentRates(): Promise<{
  success: boolean;
  data?: EquipmentRate[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('equipment_rates')
      .select('*')
      .eq('is_active', true)
      .order('effective_from', { ascending: false });

    if (error) {
      console.error('Error fetching equipment rates:', error);
      return { success: false, error: 'Failed to fetch equipment rates' };
    }

    return {
      success: true,
      data: (data as EquipmentRateRow[]).map(transformEquipmentRateRow),
    };
  } catch (error) {
    console.error('Error in getEquipmentRates:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create or update equipment rate
 */
export async function upsertEquipmentRate(
  rate: Omit<EquipmentRate, 'id' | 'createdAt'>
): Promise<{ success: boolean; data?: EquipmentRate; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('equipment_rates')
      .upsert({
        asset_id: rate.assetId || null,
        category_id: rate.categoryId || null,
        rate_type: rate.rateType,
        rate_amount: rate.rateAmount,
        min_days: rate.minDays || null,
        includes_operator: rate.includesOperator,
        includes_fuel: rate.includesFuel,
        effective_from: rate.effectiveFrom,
        effective_to: rate.effectiveTo || null,
        is_active: rate.isActive,
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting equipment rate:', error);
      return { success: false, error: 'Failed to save equipment rate' };
    }

    revalidatePath('/equipment');

    return {
      success: true,
      data: transformEquipmentRateRow(data as EquipmentRateRow),
    };
  } catch (error) {
    console.error('Error in upsertEquipmentRate:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =====================================================
// SUMMARY QUERIES
// =====================================================

/**
 * Get job equipment summary
 */
export async function getJobEquipmentSummary(
  jobOrderId: string
): Promise<{ success: boolean; data?: JobEquipmentSummary; error?: string }> {
  try {
    const supabase = await createClient();

    // Get job order info
    const { data: jobOrder, error: joError } = await supabase
      .from('job_orders')
      .select(`
        id,
        jo_number,
        customers!inner (name)
      `)
      .eq('id', jobOrderId)
      .single();

    if (joError || !jobOrder) {
      return { success: false, error: 'Job order not found' };
    }

    // Get equipment usage summary
    const { data: usages, error: usageError } = await supabase
      .from('job_equipment_usage')
      .select('*')
      .eq('job_order_id', jobOrderId);

    if (usageError) {
      return { success: false, error: 'Failed to fetch equipment usage' };
    }

    const equipmentCount = usages?.length || 0;
    const totalEquipmentDays = (usages || []).reduce((sum, u) => {
      const days = u.usage_end
        ? calculateUsageDays(u.usage_start, u.usage_end)
        : calculateUsageDays(u.usage_start, null);
      return sum + days;
    }, 0);
    const totalKm = (usages || []).reduce(
      (sum, u) => sum + (u.km_used || 0),
      0
    );
    const totalHours = (usages || []).reduce(
      (sum, u) => sum + (u.hours_used || 0),
      0
    );
    const totalEquipmentCost = (usages || []).reduce(
      (sum, u) => sum + (u.total_cost || 0),
      0
    );
    const totalBilling = (usages || [])
      .filter((u) => u.is_billable)
      .reduce((sum, u) => sum + (u.billing_amount || 0), 0);

    const equipmentMargin = totalBilling - totalEquipmentCost;
    const equipmentMarginPercent =
      totalBilling > 0
        ? Math.round((equipmentMargin / totalBilling) * 10000) / 100
        : 0;

    const customer = jobOrder.customers as { name: string };

    return {
      success: true,
      data: {
        jobOrderId,
        joNumber: jobOrder.jo_number,
        customerName: customer.name,
        equipmentCount,
        totalEquipmentDays,
        totalKm,
        totalHours,
        totalEquipmentCost,
        totalBilling,
        equipmentMargin,
        equipmentMarginPercent,
      },
    };
  } catch (error) {
    console.error('Error in getJobEquipmentSummary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete equipment usage record
 */
export async function deleteEquipmentUsage(
  usageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the usage record first
    const { data: usage, error: fetchError } = await supabase
      .from('job_equipment_usage')
      .select('job_order_id, asset_id')
      .eq('id', usageId)
      .single();

    if (fetchError || !usage) {
      return { success: false, error: 'Equipment usage record not found' };
    }

    // Delete the usage record
    const { error: deleteError } = await supabase
      .from('job_equipment_usage')
      .delete()
      .eq('id', usageId);

    if (deleteError) {
      console.error('Error deleting equipment usage:', deleteError);
      return { success: false, error: 'Failed to delete equipment usage' };
    }

    // Update job equipment cost
    await updateJobEquipmentCost(usage.job_order_id);

    revalidatePath('/job-orders');
    revalidatePath(`/job-orders/${usage.job_order_id}`);
    revalidatePath('/equipment');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteEquipmentUsage:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
