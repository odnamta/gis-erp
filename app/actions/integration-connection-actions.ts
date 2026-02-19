// =====================================================
// v0.69: INTEGRATION CONNECTION SERVER ACTIONS
// Server actions for managing integration connections
// Requirements: 1.1, 1.3
// =====================================================
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  type IntegrationConnection,
  type CreateConnectionInput,
  type UpdateConnectionInput,
  type ConnectionTestResult,
} from '@/types/integration';
import { validateConnectionInput } from '@/lib/integration-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// CREATE INTEGRATION CONNECTION
// Requirements: 1.1 - Store connection_code, connection_name, integration_type, provider, and encrypted credentials
// =====================================================

/**
 * Creates a new integration connection
 * @param input - Connection creation input
 * @returns Action result with created connection or error
 */
export async function createIntegrationConnection(
  input: CreateConnectionInput
): Promise<ActionResult<IntegrationConnection>> {
  try {
    // Validate input
    const validation = validateConnectionInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const supabase = await createClient();

    // Get current user for created_by field
    const { data: { user } } = await supabase.auth.getUser();

    // Get user profile (FK references user_profiles.id, not auth UUID)
    const { data: connProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user?.id || '')
      .single();

    const insertData = {
      connection_code: input.connection_code,
      connection_name: input.connection_name,
      integration_type: input.integration_type,
      provider: input.provider,
      credentials: input.credentials || null,
      config: input.config || {},
      is_active: input.is_active ?? true,
      access_token: input.access_token || null,
      refresh_token: input.refresh_token || null,
      token_expires_at: input.token_expires_at || null,
      created_by: connProfile?.id || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('integration_connections')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Connection code already exists' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/integrations');
    return { success: true, data: data as IntegrationConnection };
  } catch (err) {
    console.error('Error creating integration connection:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to create integration connection' 
    };
  }
}

// =====================================================
// UPDATE INTEGRATION CONNECTION
// Requirements: 1.1 - Update connection configuration
// =====================================================

/**
 * Updates an existing integration connection
 * @param id - Connection ID
 * @param input - Connection update input
 * @returns Action result with updated connection or error
 */
export async function updateIntegrationConnection(
  id: string,
  input: UpdateConnectionInput
): Promise<ActionResult<IntegrationConnection>> {
  try {
    if (!id) {
      return { success: false, error: 'Connection ID is required' };
    }

    const supabase = await createClient();

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};
    
    if (input.connection_code !== undefined) updateData.connection_code = input.connection_code;
    if (input.connection_name !== undefined) updateData.connection_name = input.connection_name;
    if (input.integration_type !== undefined) updateData.integration_type = input.integration_type;
    if (input.provider !== undefined) updateData.provider = input.provider;
    if (input.credentials !== undefined) updateData.credentials = input.credentials;
    if (input.config !== undefined) updateData.config = input.config;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.last_sync_at !== undefined) updateData.last_sync_at = input.last_sync_at;
    if (input.last_error !== undefined) updateData.last_error = input.last_error;
    if (input.access_token !== undefined) updateData.access_token = input.access_token;
    if (input.refresh_token !== undefined) updateData.refresh_token = input.refresh_token;
    if (input.token_expires_at !== undefined) updateData.token_expires_at = input.token_expires_at;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('integration_connections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Connection not found' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/integrations');
    revalidatePath(`/settings/integrations/${id}`);
    return { success: true, data: data as IntegrationConnection };
  } catch (err) {
    console.error('Error updating integration connection:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to update integration connection' 
    };
  }
}

// =====================================================
// DELETE INTEGRATION CONNECTION
// Requirements: 1.1 - Remove connection
// =====================================================

/**
 * Deletes an integration connection
 * @param id - Connection ID
 * @returns Action result indicating success or error
 */
export async function deleteIntegrationConnection(
  id: string
): Promise<ActionResult<void>> {
  try {
    if (!id) {
      return { success: false, error: 'Connection ID is required' };
    }

    const supabase = await createClient();

    // Check if connection has any sync mappings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mappings } = await (supabase as any)
      .from('sync_mappings')
      .select('id')
      .eq('connection_id', id)
      .limit(1);

    if (mappings && mappings.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete connection with existing sync mappings. Delete mappings first.' 
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('integration_connections')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/integrations');
    return { success: true };
  } catch (err) {
    console.error('Error deleting integration connection:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to delete integration connection' 
    };
  }
}

// =====================================================
// TEST INTEGRATION CONNECTION
// Requirements: 1.3 - Validate credentials and return connection status
// =====================================================

/**
 * Tests an integration connection by validating credentials
 * @param id - Connection ID
 * @returns Action result with test result or error
 */
export async function testIntegrationConnection(
  id: string
): Promise<ActionResult<ConnectionTestResult>> {
  try {
    if (!id) {
      return { success: false, error: 'Connection ID is required' };
    }

    const supabase = await createClient();
    const startTime = Date.now();

    // Get connection details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connection, error: fetchError } = await (supabase as any)
      .from('integration_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !connection) {
      return { 
        success: false, 
        error: fetchError?.code === 'PGRST116' ? 'Connection not found' : fetchError?.message || 'Connection not found'
      };
    }

    const conn = connection as IntegrationConnection;
    const responseTime = Date.now() - startTime;

    // Check OAuth token expiration
    if (conn.access_token && conn.token_expires_at) {
      const expiresAt = new Date(conn.token_expires_at).getTime();
      if (expiresAt <= Date.now()) {
        // Update connection with error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('integration_connections')
          .update({ last_error: 'OAuth token expired' })
          .eq('id', id);

        return {
          success: true,
          data: {
            success: false,
            message: 'OAuth token expired. Please re-authenticate.',
            response_time_ms: responseTime,
            error: 'TOKEN_EXPIRED',
          },
        };
      }
    }

    // Check if credentials are configured
    if (!conn.access_token && !conn.credentials) {
      return {
        success: true,
        data: {
          success: false,
          message: 'No credentials configured for this connection.',
          response_time_ms: responseTime,
          error: 'NO_CREDENTIALS',
        },
      };
    }

    // Simulate connection test based on provider
    // In a real implementation, this would make an actual API call to the provider
    const testResult = await performProviderTest(conn);

    // Update connection status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('integration_connections')
      .update({ 
        last_error: testResult.success ? null : testResult.error,
        last_sync_at: testResult.success ? new Date().toISOString() : conn.last_sync_at,
      })
      .eq('id', id);

    return {
      success: true,
      data: {
        success: testResult.success,
        message: testResult.success 
          ? 'Connection test successful' 
          : `Connection test failed: ${testResult.error}`,
        response_time_ms: Date.now() - startTime,
        error: testResult.error,
      },
    };
  } catch (err) {
    console.error('Error testing integration connection:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to test integration connection' 
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Performs a provider-specific connection test
 * In production, this would make actual API calls to verify credentials
 */
async function performProviderTest(
  connection: IntegrationConnection
): Promise<{ success: boolean; error?: string }> {
  // Simulate provider-specific tests
  // In a real implementation, this would:
  // - For 'accurate': Call Accurate Online API health endpoint
  // - For 'google_drive': Verify OAuth token with Google API
  // - For GPS providers: Ping the tracking API
  
  switch (connection.provider) {
    case 'accurate':
      // Verify Accurate Online credentials
      if (!connection.credentials?.api_key) {
        return { success: false, error: 'API key not configured' };
      }
      // Simulate successful test
      return { success: true };

    case 'google_drive':
    case 'dropbox':
      // Verify OAuth tokens
      if (!connection.access_token) {
        return { success: false, error: 'OAuth token not configured' };
      }
      return { success: true };

    case 'google_sheets':
      // Verify OAuth tokens
      if (!connection.access_token) {
        return { success: false, error: 'OAuth token not configured' };
      }
      return { success: true };

    case 'whatsapp':
    case 'telegram':
    case 'slack':
      // Verify messaging credentials
      if (!connection.credentials?.api_key && !connection.access_token) {
        return { success: false, error: 'API credentials not configured' };
      }
      return { success: true };

    default:
      // Generic test for custom integrations
      if (!connection.credentials && !connection.access_token) {
        return { success: false, error: 'No credentials configured' };
      }
      return { success: true };
  }
}

// =====================================================
// ADDITIONAL HELPER ACTIONS
// =====================================================

/**
 * Gets a single integration connection by ID
 */
export async function getIntegrationConnection(
  id: string
): Promise<ActionResult<IntegrationConnection>> {
  try {
    if (!id) {
      return { success: false, error: 'Connection ID is required' };
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('integration_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { 
        success: false, 
        error: error.code === 'PGRST116' ? 'Connection not found' : error.message 
      };
    }

    return { success: true, data: data as IntegrationConnection };
  } catch (err) {
    console.error('Error fetching integration connection:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to fetch integration connection' 
    };
  }
}

/**
 * Lists all integration connections with optional filtering
 */
export async function listIntegrationConnections(filters?: {
  integration_type?: string;
  provider?: string;
  is_active?: boolean;
}): Promise<ActionResult<IntegrationConnection[]>> {
  try {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('integration_connections')
      .select('*');

    if (filters?.integration_type) {
      query = query.eq('integration_type', filters.integration_type);
    }
    if (filters?.provider) {
      query = query.eq('provider', filters.provider);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as IntegrationConnection[] };
  } catch (err) {
    console.error('Error listing integration connections:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to list integration connections' 
    };
  }
}

/**
 * Toggles the active status of a connection
 */
export async function toggleIntegrationConnectionActive(
  id: string
): Promise<ActionResult<IntegrationConnection>> {
  try {
    if (!id) {
      return { success: false, error: 'Connection ID is required' };
    }

    const supabase = await createClient();

    // Get current status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current, error: fetchError } = await (supabase as any)
      .from('integration_connections')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: 'Connection not found' };
    }

    // Toggle status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('integration_connections')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/integrations');
    return { success: true, data: data as IntegrationConnection };
  } catch (err) {
    console.error('Error toggling integration connection:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to toggle integration connection' 
    };
  }
}
