// =====================================================
// v0.69: SYNC MAPPING ACTIONS
// Server actions for managing sync mappings
// =====================================================
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';
import {
  type SyncMapping,
  type CreateSyncMappingInput,
  type UpdateSyncMappingInput,
} from '@/types/integration';
import { validateSyncMappingInput } from '@/lib/integration-utils';
import { prepareSyncMappingForCreate, prepareSyncMappingForUpdate } from '@/lib/sync-mapping-utils';

/**
 * Creates a new sync mapping
 */
export async function createSyncMapping(input: CreateSyncMappingInput): Promise<{ success: boolean; data?: SyncMapping; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'admin.settings')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    const validation = validateSyncMappingInput(input);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };

    const prepared = prepareSyncMappingForCreate(input);
    if (!prepared.valid) return { success: false, error: prepared.errors.join(', ') };

    const supabase = await createClient();
    const { data, error } = await supabase.from('sync_mappings').insert(prepared.data as any).select().single(); // eslint-disable-line @typescript-eslint/no-explicit-any

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/integrations');
    return { success: true, data: data as unknown as SyncMapping };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates an existing sync mapping
 */
export async function updateSyncMapping(id: string, input: UpdateSyncMappingInput): Promise<{ success: boolean; data?: SyncMapping; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'admin.settings')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    if (!id) return { success: false, error: 'Mapping ID is required' };

    const updateData = prepareSyncMappingForUpdate(input);
    if (Object.keys(updateData).length === 0) return { success: false, error: 'No fields to update' };

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('sync_mappings').update(updateData).eq('id', id).select().single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/integrations');
    return { success: true, data: data as unknown as SyncMapping };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Deletes a sync mapping
 */
export async function deleteSyncMapping(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'admin.settings')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    if (!id) return { success: false, error: 'Mapping ID is required' };

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('sync_mappings').delete().eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/settings/integrations');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Gets a single sync mapping by ID
 */
export async function getSyncMapping(id: string): Promise<{ success: boolean; data?: SyncMapping; error?: string }> {
  try {
    if (!id) return { success: false, error: 'Mapping ID is required' };

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('sync_mappings').select('*').eq('id', id).single();

    if (error) return { success: false, error: error.code === 'PGRST116' ? 'Mapping not found' : error.message };
    return { success: true, data: data as unknown as SyncMapping };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Lists all sync mappings for a connection
 */
export async function listSyncMappings(connectionId: string): Promise<{ success: boolean; data?: SyncMapping[]; error?: string }> {
  try {
    if (!connectionId) return { success: false, error: 'Connection ID is required' };

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('sync_mappings')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as unknown as SyncMapping[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Toggles the active status of a sync mapping
 */
export async function toggleSyncMappingActive(id: string): Promise<{ success: boolean; data?: SyncMapping; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!canAccessFeature(profile, 'admin.settings')) {
      return { success: false, error: 'Tidak memiliki akses' };
    }

    if (!id) return { success: false, error: 'Mapping ID is required' };

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current, error: fetchError } = await supabase.from('sync_mappings').select('is_active').eq('id', id).single();
    if (fetchError || !current) return { success: false, error: 'Mapping not found' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('sync_mappings').update({ is_active: !current.is_active }).eq('id', id).select().single();
    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/integrations');
    return { success: true, data: data as unknown as SyncMapping };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
