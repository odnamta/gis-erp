// =====================================================
// v0.70: n8n SCHEDULED TASKS - DEPRECIATION RUN UTILITIES
// =====================================================

import {
  DepreciableAsset,
  DepreciationMethod,
  DepreciationRecord,
  DepreciationRunResult,
  DepreciationError,
  CreateDepreciationRecordInput,
} from '@/types/depreciation-run';

/**
 * Calculate straight-line monthly depreciation
 * Formula: (purchase_cost - salvage_value) / useful_life_months
 * 
 * **Validates: Requirements 7.2, 7.3**
 * 
 * @param asset - The depreciable asset
 * @returns Monthly depreciation amount, capped at (book_value - salvage_value)
 */
export function calculateStraightLineDepreciation(asset: DepreciableAsset): number {
  // Cannot depreciate if no useful life
  if (asset.useful_life_months <= 0) {
    return 0;
  }
  
  // Cannot depreciate if purchase cost is 0 or less
  if (asset.purchase_cost <= 0) {
    return 0;
  }
  
  // Calculate monthly depreciation
  const depreciableAmount = asset.purchase_cost - asset.salvage_value;
  const monthlyDepreciation = depreciableAmount / asset.useful_life_months;
  
  // Cap at remaining depreciable amount (book_value - salvage_value)
  const maxDepreciation = asset.book_value - asset.salvage_value;
  
  // Return 0 if already fully depreciated
  if (maxDepreciation <= 0) {
    return 0;
  }
  
  // Round to 2 decimal places and cap at max
  return Math.min(
    Math.round(monthlyDepreciation * 100) / 100,
    Math.round(maxDepreciation * 100) / 100
  );
}

/**
 * Calculate declining balance monthly depreciation
 * Formula: book_value * (2 / useful_life_months)
 * 
 * **Validates: Requirements 7.2, 7.3**
 * 
 * @param asset - The depreciable asset
 * @returns Monthly depreciation amount, capped at (book_value - salvage_value)
 */
export function calculateDecliningBalanceDepreciation(asset: DepreciableAsset): number {
  // Cannot depreciate if no useful life
  if (asset.useful_life_months <= 0) {
    return 0;
  }
  
  // Cannot depreciate if book value is 0 or less
  if (asset.book_value <= 0) {
    return 0;
  }
  
  // Calculate monthly rate (double declining balance)
  const monthlyRate = 2 / asset.useful_life_months;
  const monthlyDepreciation = asset.book_value * monthlyRate;
  
  // Cap at remaining depreciable amount (book_value - salvage_value)
  const maxDepreciation = asset.book_value - asset.salvage_value;
  
  // Return 0 if already fully depreciated
  if (maxDepreciation <= 0) {
    return 0;
  }
  
  // Round to 2 decimal places and cap at max
  return Math.min(
    Math.round(monthlyDepreciation * 100) / 100,
    Math.round(maxDepreciation * 100) / 100
  );
}

/**
 * Calculate depreciation based on asset's configured method
 * 
 * **Validates: Requirements 7.2, 7.3**
 * 
 * @param asset - The depreciable asset
 * @returns Monthly depreciation amount
 */
export function calculateDepreciation(asset: DepreciableAsset): number {
  switch (asset.depreciation_method) {
    case 'straight_line':
      return calculateStraightLineDepreciation(asset);
    case 'declining_balance':
      return calculateDecliningBalanceDepreciation(asset);
    default:
      // Default to straight line for unknown methods
      return calculateStraightLineDepreciation(asset);
  }
}

/**
 * Check if an asset is fully depreciated
 * An asset is fully depreciated when book_value equals salvage_value
 * 
 * **Validates: Requirements 7.6**
 * 
 * @param asset - The depreciable asset
 * @returns true if fully depreciated
 */
export function isFullyDepreciated(asset: DepreciableAsset): boolean {
  return asset.book_value <= asset.salvage_value;
}

/**
 * Calculate new book value after depreciation
 * Ensures book value never goes below salvage value
 * 
 * **Validates: Requirements 7.4**
 * 
 * @param currentBookValue - Current book value
 * @param depreciationAmount - Amount to depreciate
 * @param salvageValue - Minimum book value (salvage)
 * @returns New book value
 */
export function calculateNewBookValue(
  currentBookValue: number,
  depreciationAmount: number,
  salvageValue: number
): number {
  const newValue = currentBookValue - depreciationAmount;
  // Ensure we never go below salvage value
  return Math.max(Math.round(newValue * 100) / 100, salvageValue);
}

/**
 * Validate depreciation calculation inputs
 * 
 * @param asset - The depreciable asset
 * @returns Validation result with error message if invalid
 */
export function validateDepreciationInputs(
  asset: DepreciableAsset
): { valid: boolean; error?: string } {
  if (asset.purchase_cost < 0) {
    return { valid: false, error: 'Purchase cost cannot be negative' };
  }
  
  if (asset.salvage_value < 0) {
    return { valid: false, error: 'Salvage value cannot be negative' };
  }
  
  if (asset.salvage_value > asset.purchase_cost) {
    return { valid: false, error: 'Salvage value cannot exceed purchase cost' };
  }
  
  if (asset.useful_life_months < 0) {
    return { valid: false, error: 'Useful life cannot be negative' };
  }
  
  if (asset.book_value < 0) {
    return { valid: false, error: 'Book value cannot be negative' };
  }
  
  return { valid: true };
}

/**
 * Create a depreciation record input from asset and calculated amount
 * 
 * @param asset - The depreciable asset
 * @param depreciationAmount - Calculated depreciation amount
 * @param periodDate - The period date for this depreciation
 * @returns Input for creating depreciation record
 */
export function createDepreciationRecordInput(
  asset: DepreciableAsset,
  depreciationAmount: number,
  periodDate: string
): CreateDepreciationRecordInput {
  const bookValueAfter = calculateNewBookValue(
    asset.book_value,
    depreciationAmount,
    asset.salvage_value
  );
  
  return {
    asset_id: asset.id,
    period_date: periodDate,
    depreciation_amount: depreciationAmount,
    book_value_before: asset.book_value,
    book_value_after: bookValueAfter,
    method_used: asset.depreciation_method,
  };
}

/**
 * Process a batch of assets for depreciation
 * This is a pure function that calculates depreciation for all assets
 * without side effects (database operations)
 * 
 * @param assets - Array of depreciable assets
 * @param periodDate - The period date for depreciation
 * @returns Array of depreciation record inputs and skipped assets
 */
export function processDepreciationBatch(
  assets: DepreciableAsset[],
  periodDate: string
): {
  records: CreateDepreciationRecordInput[];
  skipped: { asset: DepreciableAsset; reason: string }[];
} {
  const records: CreateDepreciationRecordInput[] = [];
  const skipped: { asset: DepreciableAsset; reason: string }[] = [];
  
  for (const asset of assets) {
    // Skip fully depreciated assets
    if (isFullyDepreciated(asset)) {
      skipped.push({ asset, reason: 'Fully depreciated' });
      continue;
    }
    
    // Validate inputs
    const validation = validateDepreciationInputs(asset);
    if (!validation.valid) {
      skipped.push({ asset, reason: validation.error || 'Invalid inputs' });
      continue;
    }
    
    // Calculate depreciation
    const depreciationAmount = calculateDepreciation(asset);
    
    // Skip if no depreciation to record
    if (depreciationAmount <= 0) {
      skipped.push({ asset, reason: 'No depreciation amount' });
      continue;
    }
    
    // Create record input
    records.push(createDepreciationRecordInput(asset, depreciationAmount, periodDate));
  }
  
  return { records, skipped };
}

/**
 * Calculate total depreciation from a batch result
 * 
 * @param records - Array of depreciation record inputs
 * @returns Total depreciation amount
 */
export function calculateTotalDepreciation(
  records: CreateDepreciationRecordInput[]
): number {
  const total = records.reduce((sum, record) => sum + record.depreciation_amount, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Get the first day of the current month as period date
 * 
 * @param date - Optional date to use (defaults to now)
 * @returns ISO date string for first of month (YYYY-MM-DD)
 */
export function getMonthlyPeriodDate(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // Convert to 1-indexed
  
  // Format as YYYY-MM-DD without timezone conversion
  return `${year}-${month.toString().padStart(2, '0')}-01`;
}


// =====================================================
// SERVER-SIDE DEPRECIATION PROCESSING FUNCTIONS
// These functions interact with the database
// =====================================================

import { createClient } from '@/lib/supabase/server';
import {
  DepreciableAssetRow,
  transformDepreciableAssetRow,
} from '@/types/depreciation-run';

// Type for asset depreciation record from database
interface AssetDepreciationDbRow {
  id: string;
  asset_id: string;
  period_start: string;
  depreciation_amount: number;
  beginning_book_value: number;
  ending_book_value: number;
  depreciation_method: string;
  created_at: string;
}

// Type for asset data from database
interface AssetDbRow {
  purchase_price: number | null;
  accumulated_depreciation: number | null;
}

/**
 * Get all assets eligible for depreciation
 * Fetches active assets with depreciation configuration
 * 
 * **Validates: Requirements 7.2**
 * 
 * @returns Array of depreciable assets
 */
export async function getDepreciableAssets(): Promise<DepreciableAsset[]> {
  const supabase = await createClient();
  
  // Use any type since 'assets' table may not be in generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('assets')
    .select(`
      id,
      asset_code,
      asset_name,
      purchase_price,
      salvage_value,
      useful_life_years,
      depreciation_method,
      book_value,
      accumulated_depreciation
    `)
    .eq('status', 'active')
    .not('depreciation_method', 'is', null)
    .not('useful_life_years', 'is', null)
    .gt('useful_life_years', 0);
  
  if (error) {
    console.error('Error fetching depreciable assets:', error);
    return [];
  }
  
  if (!data) {
    return [];
  }
  
  return (data as DepreciableAssetRow[]).map(transformDepreciableAssetRow);
}

/**
 * Create a depreciation record in the database
 * 
 * **Validates: Requirements 7.5**
 * 
 * @param asset - The depreciable asset
 * @param amount - Depreciation amount
 * @param periodDate - The period date for this depreciation
 * @returns Created depreciation record or null on error
 */
export async function createDepreciationRecord(
  asset: DepreciableAsset,
  amount: number,
  periodDate?: string
): Promise<DepreciationRecord | null> {
  const supabase = await createClient();
  const date = periodDate || getMonthlyPeriodDate();
  
  const bookValueAfter = calculateNewBookValue(
    asset.book_value,
    amount,
    asset.salvage_value
  );
  
  // Check if record already exists for this period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('asset_depreciation')
    .select('id')
    .eq('asset_id', asset.id)
    .eq('period_start', date)
    .single();
  
  if (existing) {
    return null;
  }
  
  // Get end of month for period_end
  const periodStart = new Date(date);
  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
  const periodEndStr = `${periodEnd.getFullYear()}-${(periodEnd.getMonth() + 1).toString().padStart(2, '0')}-${periodEnd.getDate().toString().padStart(2, '0')}`;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('asset_depreciation')
    .insert({
      asset_id: asset.id,
      depreciation_date: new Date().toISOString().split('T')[0],
      depreciation_method: asset.depreciation_method,
      period_start: date,
      period_end: periodEndStr,
      beginning_book_value: asset.book_value,
      depreciation_amount: amount,
      ending_book_value: bookValueAfter,
      accumulated_depreciation: asset.accumulated_depreciation + amount,
    })
    .select()
    .single();
  
  if (error || !data) {
    console.error('Error creating depreciation record:', error);
    return null;
  }
  
  const dbRow = data as AssetDepreciationDbRow;
  
  // Transform to our interface format
  const record: DepreciationRecord = {
    id: dbRow.id,
    asset_id: dbRow.asset_id,
    period_date: dbRow.period_start,
    depreciation_amount: dbRow.depreciation_amount,
    book_value_before: dbRow.beginning_book_value,
    book_value_after: dbRow.ending_book_value,
    method_used: dbRow.depreciation_method as DepreciationMethod,
    created_at: dbRow.created_at,
  };
  
  return record;
}

/**
 * Update an asset's book value after depreciation
 * 
 * **Validates: Requirements 7.4**
 * 
 * @param assetId - The asset ID
 * @param newBookValue - The new book value
 * @returns Success status
 */
export async function updateAssetBookValue(
  assetId: string,
  newBookValue: number
): Promise<boolean> {
  const supabase = await createClient();
  
  // First get current accumulated depreciation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: asset, error: fetchError } = await (supabase as any)
    .from('assets')
    .select('purchase_price, accumulated_depreciation')
    .eq('id', assetId)
    .single();
  
  if (fetchError || !asset) {
    console.error('Error fetching asset for book value update:', fetchError);
    return false;
  }
  
  const assetData = asset as AssetDbRow;
  
  // Calculate new accumulated depreciation
  const purchasePrice = assetData.purchase_price || 0;
  const newAccumulatedDepreciation = purchasePrice - newBookValue;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('assets')
    .update({
      book_value: newBookValue,
      accumulated_depreciation: Math.max(0, newAccumulatedDepreciation),
    })
    .eq('id', assetId);
  
  if (error) {
    console.error('Error updating asset book value:', error);
    return false;
  }
  
  return true;
}


/**
 * Run monthly depreciation for all eligible assets
 * This is the main entry point for the scheduled depreciation task
 * 
 * **Validates: Requirements 7.1, 7.7**
 * 
 * @param periodDate - Optional period date (defaults to first of current month)
 * @returns Depreciation run result with processed/skipped counts and records
 */
export async function runMonthlyDepreciation(
  periodDate?: string
): Promise<DepreciationRunResult> {
  const date = periodDate || getMonthlyPeriodDate();
  
  const result: DepreciationRunResult = {
    assets_processed: 0,
    assets_skipped: 0,
    total_depreciation_amount: 0,
    records_created: [],
    errors: [],
  };
  
  // Get all depreciable assets
  const assets = await getDepreciableAssets();
  
  if (assets.length === 0) {
    return result;
  }
  
  // Process each asset
  for (const asset of assets) {
    try {
      // Skip fully depreciated assets
      if (isFullyDepreciated(asset)) {
        result.assets_skipped++;
        continue;
      }
      
      // Validate inputs
      const validation = validateDepreciationInputs(asset);
      if (!validation.valid) {
        result.assets_skipped++;
        result.errors.push({
          asset_id: asset.id,
          asset_code: asset.asset_code,
          error_message: validation.error || 'Invalid inputs',
        });
        continue;
      }
      
      // Calculate depreciation
      const depreciationAmount = calculateDepreciation(asset);
      
      // Skip if no depreciation to record
      if (depreciationAmount <= 0) {
        result.assets_skipped++;
        continue;
      }
      
      // Create depreciation record
      const record = await createDepreciationRecord(asset, depreciationAmount, date);
      
      if (record) {
        // Update asset book value
        const updated = await updateAssetBookValue(asset.id, record.book_value_after);
        
        if (updated) {
          result.assets_processed++;
          result.total_depreciation_amount += depreciationAmount;
          result.records_created.push(record);
        } else {
          result.errors.push({
            asset_id: asset.id,
            asset_code: asset.asset_code,
            error_message: 'Failed to update asset book value',
          });
        }
      } else {
        // Record might already exist for this period
        result.assets_skipped++;
      }
    } catch (error) {
      result.errors.push({
        asset_id: asset.id,
        asset_code: asset.asset_code,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  // Round total depreciation
  result.total_depreciation_amount = Math.round(result.total_depreciation_amount * 100) / 100;
  
  return result;
}

/**
 * Get depreciation run summary for logging/reporting
 * 
 * @param result - Depreciation run result
 * @returns Summary object for logging
 */
export function getDepreciationRunSummary(result: DepreciationRunResult): Record<string, unknown> {
  return {
    assets_processed: result.assets_processed,
    assets_skipped: result.assets_skipped,
    total_depreciation_amount: result.total_depreciation_amount,
    records_created_count: result.records_created.length,
    error_count: result.errors.length,
    errors: result.errors.length > 0 ? result.errors : undefined,
  };
}
