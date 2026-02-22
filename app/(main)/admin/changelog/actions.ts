'use server';

/**
 * Changelog Server Actions
 * Task 7.1: Create changelog server actions
 * Requirement 7.3: Insert, update, delete changelog entries
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ChangelogEntryInput } from '@/types/changelog';

interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * Create a new changelog entry
 */
export async function createChangelogEntry(data: ChangelogEntryInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Get current user and profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabase as any)
      .from('changelog_entries')
      .insert({
        version: data.version || null,
        title: data.title,
        description: data.description || null,
        category: data.category,
        is_major: data.is_major || false,
        published_at: data.published_at || new Date().toISOString(),
        created_by: profile?.id || user.id,
      })
      .select('id')
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/changelog');
    revalidatePath('/admin/changelog');
    
    return { success: true, id: result?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update an existing changelog entry
 */
export async function updateChangelogEntry(id: string, data: ChangelogEntryInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('changelog_entries')
      .update({
        version: data.version || null,
        title: data.title,
        description: data.description || null,
        category: data.category,
        is_major: data.is_major || false,
        published_at: data.published_at,
      })
      .eq('id', id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/changelog');
    revalidatePath('/admin/changelog');
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Delete a changelog entry
 */
export async function deleteChangelogEntry(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('changelog_entries')
      .delete()
      .eq('id', id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/changelog');
    revalidatePath('/admin/changelog');
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get all changelog entries for admin view
 */
export async function getChangelogEntries() {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('changelog_entries')
    .select('*')
    .order('published_at', { ascending: false });
  
  return data || [];
}
