'use server';

// =====================================================
// v0.44: EQUIPMENT - DEPRECIATION & COSTING SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AssetDepreciation,
  AssetCostTracking,
  AssetTCOSummary,
  CostTrackingInput,
  BatchDepreciationResult,
  CostBreakdown,
  AssetDepreciationRow,
  AssetCostTrackingRow,
  AssetTCOSummaryRow,
  transformDepreciationRow,
  transformCostTrackingRow,
  transformTCOSummaryRow,
} from '@/types/depreciation';
import {
  calculateDepreciation,
  validateDepreciationAmount,
  validateCostAmount,
  isValidCostType,
  getMonthPeriod,
  isEligibleForDepreciation,
  calculateCostBreakdown,
} from './depreciation-utils';

// =====================================================
// DEPRECIATION MANAGEMENT
// =====================================================

/**
 * Record depreciation for an asset
 * **Validates: Requirements 1.2, 1.3, 1.4, 8.1, 8.2, 8.3**
 */
export async function recordDepreciation(
  assetId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ success: boolean; data?: AssetDepreciation; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        id, status, purchase_price, book_value, salvage_value,
        depreciation_method, useful_life_years, accumulated_depreciation,
        depreciation_start_date
      `)
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return { success: false, error: 'Asset not found' };
    }

    // Check eligibility
    if (!isEligibleForDepreciation(asset.status, asset.depreciation_start_date, new Date(periodStart))) {
      return { success: false, error: 'Asset is not eligible for depreciation' };
    }

    // Check for existing depreciation record
    const { data: existing } = await supabase
      .from('asset_depreciation')
      .select('id')
      .eq('asset_id', assetId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .single();

    if (existing) {
      return { success: false, error: 'Depreciation already recorded for this period' };
    }

    // Calculate depreciation
    const beginningBookValue = asset.book_value ?? asset.purchase_price ?? 0;
    const salvageValue = asset.salvage_value ?? 0;
    const depreciationAmount = calculateDepreciation(
      asset.depreciation_method,
      asset.purchase_price,
      beginningBookValue,
      salvageValue,
      asset.useful_life_years
    );

    // Validate depreciation amount
    const validation = validateDepreciationAmount(depreciationAmount, beginningBookValue, salvageValue);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const endingBookValue = beginningBookValue - depreciationAmount;
    const newAccumulatedDepreciation = (asset.accumulated_depreciation ?? 0) + depreciationAmount;

    // Insert depreciation record
    const { data: depreciation, error: insertError } = await supabase
      .from('asset_depreciation')
      .insert({
        asset_id: assetId,
        depreciation_date: new Date().toISOString().split('T')[0],
        depreciation_method: asset.depreciation_method,
        period_start: periodStart,
        period_end: periodEnd,
        beginning_book_value: beginningBookValue,
        depreciation_amount: depreciationAmount,
        ending_book_value: endingBookValue,
        accumulated_depreciation: newAccumulatedDepreciation,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error recording depreciation:', insertError);
      return { success: false, error: 'Failed to record depreciation' };
    }

    // Update asset book_value and accumulated_depreciation
    await supabase
      .from('assets')
      .update({
        book_value: endingBookValue,
        accumulated_depreciation: newAccumulatedDepreciation,
      })
      .eq('id', assetId);

    // Create cost tracking record for depreciation
    if (depreciationAmount > 0) {
      await supabase.from('asset_cost_tracking').insert({
        asset_id: assetId,
        cost_type: 'depreciation',
        cost_date: periodEnd,
        amount: depreciationAmount,
        reference_type: 'depreciation',
        reference_id: depreciation.id,
        created_by: user?.id || null,
      });
    }

    revalidatePath('/equipment');
    revalidatePath('/equipment/costing');
    revalidatePath(`/equipment/${assetId}`);

    return {
      success: true,
      data: transformDepreciationRow(depreciation as AssetDepreciationRow),
    };
  } catch (error) {
    console.error('Error in recordDepreciation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


/**
 * Get depreciation history for an asset
 */
export async function getDepreciationHistory(
  assetId: string
): Promise<{ success: boolean; data?: AssetDepreciation[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('asset_depreciation')
      .select('*')
      .eq('asset_id', assetId)
      .order('period_start', { ascending: false });

    if (error) {
      console.error('Error fetching depreciation history:', error);
      return { success: false, error: 'Failed to fetch depreciation history' };
    }

    return {
      success: true,
      data: (data as AssetDepreciationRow[]).map(transformDepreciationRow),
    };
  } catch (error) {
    console.error('Error in getDepreciationHistory:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Run monthly depreciation batch processing
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**
 */
export async function runMonthlyDepreciation(
  year: number,
  month: number
): Promise<{ success: boolean; data?: BatchDepreciationResult; error?: string }> {
  try {
    const supabase = await createClient();
    const { start: periodStart, end: periodEnd } = getMonthPeriod(year, month);
    const processingDate = new Date(year, month - 1, 1);

    // Get all active assets with depreciation configured
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select(`
        id, status, purchase_price, book_value, salvage_value,
        depreciation_method, useful_life_years, accumulated_depreciation,
        depreciation_start_date
      `)
      .eq('status', 'active')
      .not('depreciation_start_date', 'is', null)
      .not('useful_life_years', 'is', null);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      return { success: false, error: 'Failed to fetch assets' };
    }

    const result: BatchDepreciationResult = {
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };

    for (const asset of assets || []) {
      // Check eligibility
      if (!isEligibleForDepreciation(asset.status, asset.depreciation_start_date, processingDate)) {
        result.skippedCount++;
        continue;
      }

      // Check for existing record
      const { data: existing } = await supabase
        .from('asset_depreciation')
        .select('id')
        .eq('asset_id', asset.id)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .single();

      if (existing) {
        result.skippedCount++;
        continue;
      }

      // Process depreciation
      const depResult = await recordDepreciation(asset.id, periodStart, periodEnd);
      
      if (depResult.success) {
        result.processedCount++;
      } else {
        result.errorCount++;
        result.errors.push({ assetId: asset.id, error: depResult.error || 'Unknown error' });
      }
    }

    // Refresh TCO view
    await refreshTCOView();

    revalidatePath('/equipment/costing');
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in runMonthlyDepreciation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


// =====================================================
// COST TRACKING MANAGEMENT
// =====================================================

/**
 * Record a cost for an asset
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */
export async function recordCost(
  input: CostTrackingInput
): Promise<{ success: boolean; data?: AssetCostTracking; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Validate cost type
    if (!isValidCostType(input.costType)) {
      return { success: false, error: 'Invalid cost type' };
    }

    // Validate amount
    const amountValidation = validateCostAmount(input.amount);
    if (!amountValidation.valid) {
      return { success: false, error: amountValidation.error };
    }

    // Check if asset exists
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id')
      .eq('id', input.assetId)
      .single();

    if (assetError || !asset) {
      return { success: false, error: 'Asset not found' };
    }

    // Insert cost record
    const { data: cost, error: insertError } = await supabase
      .from('asset_cost_tracking')
      .insert({
        asset_id: input.assetId,
        cost_type: input.costType,
        cost_date: input.costDate,
        amount: input.amount,
        reference_type: input.referenceType || null,
        reference_id: input.referenceId || null,
        notes: input.notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error recording cost:', insertError);
      return { success: false, error: 'Failed to record cost' };
    }

    revalidatePath('/equipment/costing');
    revalidatePath(`/equipment/${input.assetId}`);

    return {
      success: true,
      data: transformCostTrackingRow(cost as AssetCostTrackingRow),
    };
  } catch (error) {
    console.error('Error in recordCost:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


/**
 * Get cost history for an asset
 */
export async function getCostHistory(
  assetId?: string,
  costType?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ success: boolean; data?: AssetCostTracking[]; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('asset_cost_tracking')
      .select('*')
      .order('cost_date', { ascending: false });

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }
    if (costType && isValidCostType(costType)) {
      query = query.eq('cost_type', costType);
    }
    if (dateFrom) {
      query = query.gte('cost_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('cost_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cost history:', error);
      return { success: false, error: 'Failed to fetch cost history' };
    }

    return {
      success: true,
      data: (data as AssetCostTrackingRow[]).map(transformCostTrackingRow),
    };
  } catch (error) {
    console.error('Error in getCostHistory:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get cost breakdown for an asset or all assets
 */
export async function getCostBreakdown(
  assetId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ success: boolean; data?: CostBreakdown[]; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('asset_cost_tracking')
      .select('cost_type, amount');

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }
    if (dateFrom) {
      query = query.gte('cost_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('cost_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cost breakdown:', error);
      return { success: false, error: 'Failed to fetch cost breakdown' };
    }

    const costs = (data || []).map(row => ({
      costType: row.cost_type as import('@/types/depreciation').CostType,
      amount: row.amount,
    }));

    return {
      success: true,
      data: calculateCostBreakdown(costs),
    };
  } catch (error) {
    console.error('Error in getCostBreakdown:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


// =====================================================
// TCO QUERIES
// =====================================================

/**
 * Get TCO summary for all assets or filtered by category
 */
export async function getTCOSummary(
  categoryId?: string
): Promise<{ success: boolean; data?: AssetTCOSummary[]; error?: string }> {
  try {
    const supabase = await createClient();

    // First try to get from materialized view
    const query = supabase.from('asset_tco_summary').select('*');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching TCO summary:', error);
      return { success: false, error: 'Failed to fetch TCO summary' };
    }

    let summaries = (data as AssetTCOSummaryRow[]).map(transformTCOSummaryRow);

    // Filter by category if provided (client-side since view doesn't have category_id)
    if (categoryId) {
      // Get assets in category
      const { data: categoryAssets } = await supabase
        .from('assets')
        .select('id')
        .eq('category_id', categoryId);

      const assetIds = new Set((categoryAssets || []).map(a => a.id));
      summaries = summaries.filter(s => assetIds.has(s.assetId));
    }

    return { success: true, data: summaries };
  } catch (error) {
    console.error('Error in getTCOSummary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Refresh the TCO materialized view
 */
export async function refreshTCOView(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc('refresh_asset_tco_summary');

    if (error) {
      console.error('Error refreshing TCO view:', error);
      return { success: false, error: 'Failed to refresh TCO view' };
    }

    revalidatePath('/equipment/costing');
    return { success: true };
  } catch (error) {
    console.error('Error in refreshTCOView:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a cost tracking record
 */
export async function deleteCost(
  costId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('asset_cost_tracking')
      .delete()
      .eq('id', costId);

    if (error) {
      console.error('Error deleting cost:', error);
      return { success: false, error: 'Failed to delete cost' };
    }

    revalidatePath('/equipment/costing');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteCost:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
