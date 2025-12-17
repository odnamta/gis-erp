'use server';

import { createClient } from '@/lib/supabase/server';
import { CompanySettings, DEFAULT_SETTINGS, SettingKey, SETTING_KEYS } from '@/types/company-settings';
import { rowsToSettings, validateRequiredFields } from '@/lib/company-settings-utils';
import { revalidatePath } from 'next/cache';

/**
 * Load all company settings from database
 */
export async function loadCompanySettings(): Promise<{
  success: boolean;
  data?: CompanySettings;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('company_settings')
      .select('key, value');
    
    if (error) {
      console.error('Error loading company settings:', error);
      return { success: false, error: error.message };
    }
    
    const settings = rowsToSettings(data || []);
    return { success: true, data: settings };
  } catch (err) {
    console.error('Unexpected error loading company settings:', err);
    return { success: false, error: 'Failed to load settings' };
  }
}

/**
 * Save company settings to database
 */
export async function saveCompanySettings(
  settings: Partial<CompanySettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate settings
    const validation = validateRequiredFields(settings);
    if (!validation.valid) {
      const errorMessages = Object.values(validation.errors).join(', ');
      return { success: false, error: errorMessages };
    }
    
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Upsert each setting
    const updates: Array<{ key: string; value: string | null }> = [];
    
    for (const key of SETTING_KEYS) {
      if (key in settings) {
        const value = settings[key as SettingKey];
        updates.push({
          key,
          value: value === null ? null : String(value),
        });
      }
    }
    
    if (updates.length === 0) {
      return { success: true };
    }
    
    // Upsert settings one by one (Supabase doesn't support bulk upsert with different values)
    for (const update of updates) {
      const { error } = await supabase
        .from('company_settings')
        .upsert(
          {
            key: update.key,
            value: update.value,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: 'key' }
        );
      
      if (error) {
        console.error(`Error saving setting ${update.key}:`, error);
        return { success: false, error: `Failed to save ${update.key}` };
      }
    }
    
    revalidatePath('/settings/company');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error saving company settings:', err);
    return { success: false, error: 'Failed to save settings' };
  }
}

/**
 * Upload company logo to Supabase Storage
 */
export async function uploadCompanyLogo(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('logo') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Logo must be PNG, JPG, or SVG format' };
    }
    
    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'Logo file size must not exceed 2MB' };
    }
    
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const filename = `company-logo-${Date.now()}.${ext}`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return { success: false, error: 'Failed to upload logo' };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('company-assets')
      .getPublicUrl(uploadData.path);
    
    // Update logo_url setting
    const { error: updateError } = await supabase
      .from('company_settings')
      .upsert(
        {
          key: 'logo_url',
          value: publicUrl,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: 'key' }
      );
    
    if (updateError) {
      console.error('Error updating logo_url setting:', updateError);
      return { success: false, error: 'Failed to save logo URL' };
    }
    
    revalidatePath('/settings/company');
    return { success: true, url: publicUrl };
  } catch (err) {
    console.error('Unexpected error uploading logo:', err);
    return { success: false, error: 'Failed to upload logo' };
  }
}

/**
 * Get a single setting value
 */
export async function getCompanySetting(key: SettingKey): Promise<string | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('company_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      return DEFAULT_SETTINGS[key]?.toString() ?? null;
    }
    
    return data.value;
  } catch {
    return DEFAULT_SETTINGS[key]?.toString() ?? null;
  }
}
