'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  HSCode,
  HSCodeInput,
  HSPreferentialRate,
  PreferentialRateInput,
  FTACode,
  HSCodeRow,
  HSPreferentialRateRow,
} from '@/types/hs-codes';
import { transformHSCode, transformPreferentialRate, isValidFTACode } from '@/lib/hs-utils';

// Get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Log search selection for history
export async function logHSCodeSearch(
  searchTerm: string,
  selectedHSCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { error } = await supabase
      .from('hs_code_search_history')
      .insert({
        user_id: userId,
        search_term: searchTerm,
        selected_hs_code: selectedHSCode,
      });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error logging HS code search:', error);
    return { success: false, error: 'Failed to log search' };
  }
}

// Create new HS code (admin only)
export async function createHSCode(
  data: HSCodeInput
): Promise<{ success: boolean; data?: HSCode; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: result, error } = await supabase
      .from('hs_codes')
      .insert({
        hs_code: data.hsCode,
        heading_id: data.headingId,
        description: data.description,
        description_id: data.descriptionId,
        statistical_unit: data.statisticalUnit,
        mfn_rate: data.mfnRate ?? 0,
        ppn_rate: data.ppnRate ?? 11,
        ppnbm_rate: data.ppnbmRate ?? 0,
        pph_import_rate: data.pphImportRate ?? 2.5,
        has_restrictions: data.hasRestrictions ?? false,
        restriction_type: data.restrictionType,
        issuing_authority: data.issuingAuthority,
        has_export_restrictions: data.hasExportRestrictions ?? false,
        export_restriction_type: data.exportRestrictionType,
      })
      .select(`
        *,
        heading:hs_headings(
          *,
          chapter:hs_chapters(*)
        )
      `)
      .single();
    
    if (error) throw error;
    
    revalidatePath('/customs/hs-codes');
    
    return { success: true, data: transformHSCode(result as HSCodeRow) };
  } catch (error) {
    console.error('Error creating HS code:', error);
    return { success: false, error: 'Failed to create HS code' };
  }
}


// Update HS code (admin only)
export async function updateHSCode(
  id: string,
  data: Partial<HSCodeInput>
): Promise<{ success: boolean; data?: HSCode; error?: string }> {
  try {
    const supabase = await createClient();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.hsCode !== undefined) updateData.hs_code = data.hsCode;
    if (data.headingId !== undefined) updateData.heading_id = data.headingId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.descriptionId !== undefined) updateData.description_id = data.descriptionId;
    if (data.statisticalUnit !== undefined) updateData.statistical_unit = data.statisticalUnit;
    if (data.mfnRate !== undefined) updateData.mfn_rate = data.mfnRate;
    if (data.ppnRate !== undefined) updateData.ppn_rate = data.ppnRate;
    if (data.ppnbmRate !== undefined) updateData.ppnbm_rate = data.ppnbmRate;
    if (data.pphImportRate !== undefined) updateData.pph_import_rate = data.pphImportRate;
    if (data.hasRestrictions !== undefined) updateData.has_restrictions = data.hasRestrictions;
    if (data.restrictionType !== undefined) updateData.restriction_type = data.restrictionType;
    if (data.issuingAuthority !== undefined) updateData.issuing_authority = data.issuingAuthority;
    if (data.hasExportRestrictions !== undefined) updateData.has_export_restrictions = data.hasExportRestrictions;
    if (data.exportRestrictionType !== undefined) updateData.export_restriction_type = data.exportRestrictionType;
    
    const { data: result, error } = await supabase
      .from('hs_codes')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        heading:hs_headings(
          *,
          chapter:hs_chapters(*)
        )
      `)
      .single();
    
    if (error) throw error;
    
    revalidatePath('/customs/hs-codes');
    
    return { success: true, data: transformHSCode(result as HSCodeRow) };
  } catch (error) {
    console.error('Error updating HS code:', error);
    return { success: false, error: 'Failed to update HS code' };
  }
}

// Deactivate HS code (soft delete)
export async function deactivateHSCode(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('hs_codes')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/customs/hs-codes');
    
    return { success: true };
  } catch (error) {
    console.error('Error deactivating HS code:', error);
    return { success: false, error: 'Failed to deactivate HS code' };
  }
}

// Reactivate HS code
export async function reactivateHSCode(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('hs_codes')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
    
    revalidatePath('/customs/hs-codes');
    
    return { success: true };
  } catch (error) {
    console.error('Error reactivating HS code:', error);
    return { success: false, error: 'Failed to reactivate HS code' };
  }
}


// Create or update preferential rate
export async function upsertPreferentialRate(
  data: PreferentialRateInput
): Promise<{ success: boolean; data?: HSPreferentialRate; error?: string }> {
  try {
    const supabase = await createClient();
    
    if (!isValidFTACode(data.ftaCode)) {
      return { success: false, error: 'Invalid FTA code' };
    }
    
    const { data: result, error } = await supabase
      .from('hs_preferential_rates')
      .upsert({
        hs_code_id: data.hsCodeId,
        fta_code: data.ftaCode,
        preferential_rate: data.preferentialRate,
        effective_from: data.effectiveFrom,
        effective_to: data.effectiveTo,
        requires_coo: data.requiresCoo ?? true,
      }, {
        onConflict: 'hs_code_id,fta_code',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePath('/customs/hs-codes');
    
    return { success: true, data: transformPreferentialRate(result as HSPreferentialRateRow) };
  } catch (error) {
    console.error('Error upserting preferential rate:', error);
    return { success: false, error: 'Failed to save preferential rate' };
  }
}

// Delete preferential rate
export async function deletePreferentialRate(
  hsCodeId: string,
  ftaCode: FTACode
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('hs_preferential_rates')
      .delete()
      .eq('hs_code_id', hsCodeId)
      .eq('fta_code', ftaCode);
    
    if (error) throw error;
    
    revalidatePath('/customs/hs-codes');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting preferential rate:', error);
    return { success: false, error: 'Failed to delete preferential rate' };
  }
}

// Get frequently used HS codes for current user (server action version)
export async function getFrequentHSCodesAction(
  limit: number = 10
): Promise<{ success: boolean; data?: HSCode[]; error?: string }> {
  try {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: true, data: [] };
    }
    
    // Get last 100 searches for the user
    const { data: history, error: historyError } = await supabase
      .from('hs_code_search_history')
      .select('selected_hs_code')
      .eq('user_id', userId)
      .order('searched_at', { ascending: false })
      .limit(100);
    
    if (historyError) throw historyError;
    
    if (!history || history.length === 0) {
      return { success: true, data: [] };
    }
    
    // Count frequency
    const frequency: Record<string, number> = {};
    for (const { selected_hs_code } of history) {
      frequency[selected_hs_code] = (frequency[selected_hs_code] || 0) + 1;
    }
    
    // Get top codes
    const topCodes = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([code]) => code);
    
    if (topCodes.length === 0) {
      return { success: true, data: [] };
    }
    
    // Fetch HS code details
    const { data: hsCodes, error: hsError } = await supabase
      .from('hs_codes')
      .select(`
        *,
        heading:hs_headings(
          *,
          chapter:hs_chapters(*)
        )
      `)
      .in('hs_code', topCodes)
      .eq('is_active', true);
    
    if (hsError) throw hsError;
    
    if (!hsCodes) {
      return { success: true, data: [] };
    }
    
    // Sort by frequency
    const codeMap = new Map(hsCodes.map((row: HSCodeRow) => [row.hs_code, transformHSCode(row)]));
    const sortedCodes = topCodes
      .map(code => codeMap.get(code))
      .filter((code): code is HSCode => code !== undefined);
    
    return { success: true, data: sortedCodes };
  } catch (error) {
    console.error('Error getting frequent HS codes:', error);
    return { success: false, error: 'Failed to get frequent HS codes' };
  }
}

// Clear search history for current user
export async function clearSearchHistory(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const { error } = await supabase
      .from('hs_code_search_history')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing search history:', error);
    return { success: false, error: 'Failed to clear search history' };
  }
}
