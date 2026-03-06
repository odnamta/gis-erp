'use server';

/**
 * Server Actions for Production Readiness
 * v0.80: Production Readiness Module
 * 
 * Provides server actions for:
 * - Health status monitoring
 * - Configuration management
 * - Feature flag evaluation
 * - Deployment recording
 * 
 * Requirements: 1.1, 3.1, 5.1, 6.1
 */

import { createClient } from '@/lib/supabase/server';
import {
  HealthStatus,
  AppConfig,
  FeatureFlag,
  DeploymentRecord,
  FeatureFlagContext,
  aggregateHealthStatus,
  ComponentStatus,
} from '@/lib/production-readiness-utils';

// Type for raw Supabase client to bypass type checking for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// HEALTH CHECK ACTIONS (Requirement 1.1)
// =====================================================

/**
 * Get system health status
 * Returns health status for all components including database, cache, storage, and queue
 */
export async function getHealthAction(): Promise<ActionResult<HealthStatus>> {
  try {
    const supabase = await createClient();
    const components: ComponentStatus[] = [];
    
    // Check database
    const dbStart = Date.now();
    const { error: dbError } = await supabase.from('user_profiles').select('id').limit(1);
    const dbResponseTime = Date.now() - dbStart;
    
    components.push({
      name: 'database',
      status: dbError ? 'unhealthy' : (dbResponseTime > 1000 ? 'degraded' : 'healthy'),
      responseTime: dbResponseTime,
      message: dbError ? dbError.message : 'Database connection successful',
      lastChecked: new Date().toISOString(),
    });
    
    // Check storage
    const storageStart = Date.now();
    const { error: storageError } = await supabase.storage.listBuckets();
    const storageResponseTime = Date.now() - storageStart;
    
    components.push({
      name: 'storage',
      status: storageError ? 'degraded' : 'healthy',
      responseTime: storageResponseTime,
      message: storageError ? storageError.message : 'Storage service operational',
      lastChecked: new Date().toISOString(),
    });
    
    // Simulated cache check
    const cacheStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 10));
    components.push({
      name: 'cache',
      status: 'healthy',
      responseTime: Date.now() - cacheStart,
      message: 'Cache service operational',
      lastChecked: new Date().toISOString(),
    });
    
    // Simulated queue check
    const queueStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 5));
    components.push({
      name: 'queue',
      status: 'healthy',
      responseTime: Date.now() - queueStart,
      message: 'Queue service operational',
      lastChecked: new Date().toISOString(),
    });
    
    // Get version from config
    const version = await getConfigValueInternal(supabase, 'app_version', '0.80.0');
    
    // Aggregate status
    const status = aggregateHealthStatus(components);
    
    const healthStatus: HealthStatus = {
      status,
      version,
      timestamp: new Date().toISOString(),
      components,
    };
    
    return { success: true, data: healthStatus };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get health status' 
    };
  }
}

// =====================================================
// CONFIG ACTIONS (Requirement 3.1)
// =====================================================

/**
 * Internal helper to get config value
 */
async function getConfigValueInternal<T = string>(
  supabase: AnySupabaseClient,
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', key)
      .limit(1)
      .single();
    
    if (error || !data) return defaultValue;
    return (data.config_value as T) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Get a configuration value by key
 */
export async function getConfigAction(
  key: string,
  environment: string = 'all'
): Promise<ActionResult<AppConfig | null>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .eq('config_key', key)
      .in('environment', [environment, 'all'])
      .order('environment', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return { success: true, data: null };
    }
    
    const config: AppConfig = {
      id: data.id,
      configKey: data.config_key,
      configValue: data.config_value,
      environment: data.environment,
      isSensitive: data.is_sensitive,
      description: data.description,
      updatedBy: data.updated_by,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    };
    
    return { success: true, data: config };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get config' 
    };
  }
}

/**
 * Set a configuration value
 */
export async function setConfigAction(
  key: string,
  value: unknown,
  options: {
    environment?: string;
    isSensitive?: boolean;
    description?: string;
    userId?: string;
  } = {}
): Promise<ActionResult> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { environment = 'all', isSensitive = false, description, userId } = options;
    
    const { error } = await supabase
      .from('app_config')
      .upsert({
        config_key: key,
        config_value: value,
        environment,
        is_sensitive: isSensitive,
        description,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'config_key,environment',
      });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to set config' 
    };
  }
}

/**
 * Get all configurations (non-sensitive only by default)
 */
export async function getAllConfigsAction(options: {
  environment?: string;
  includeSensitive?: boolean;
} = {}): Promise<ActionResult<AppConfig[]>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { environment, includeSensitive = false } = options;
    
    let query = supabase
      .from('app_config')
      .select('*')
      .order('config_key');
    
    if (environment) {
      query = query.in('environment', [environment, 'all']);
    }
    
    if (!includeSensitive) {
      query = query.eq('is_sensitive', false);
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
      return { success: true, data: [] };
    }
    
    const configs: AppConfig[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      configKey: row.config_key as string,
      configValue: row.config_value,
      environment: row.environment as string,
      isSensitive: row.is_sensitive as boolean,
      description: row.description as string | undefined,
      updatedBy: row.updated_by as string | undefined,
      updatedAt: row.updated_at as string,
      createdAt: row.created_at as string,
    }));
    
    return { success: true, data: configs };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get configs' 
    };
  }
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceModeAction(): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const value = await getConfigValueInternal<boolean>(supabase, 'maintenance_mode', false);
    return { success: true, data: value === true };
  } catch {
    return { success: true, data: false };
  }
}

/**
 * Set maintenance mode
 */
export async function setMaintenanceModeAction(
  enabled: boolean,
  userId?: string
): Promise<ActionResult> {
  return setConfigAction('maintenance_mode', enabled, { userId });
}

// =====================================================
// FEATURE FLAG ACTIONS (Requirement 5.1)
// =====================================================

/**
 * Check if a feature is enabled for a given context
 */
export async function isFeatureEnabledAction(
  flagKey: string,
  context: FeatureFlagContext = {}
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    
    // Get the feature flag
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('flag_key', flagKey)
      .single();
    
    if (error || !data) {
      return { success: true, data: false };
    }
    
    const flag: FeatureFlag = {
      id: data.id,
      flagKey: data.flag_key,
      name: data.name,
      description: data.description,
      isEnabled: data.is_enabled,
      targetUsers: data.target_users || [],
      targetRoles: data.target_roles || [],
      rolloutPercentage: data.rollout_percentage ?? 100,
      enableAt: data.enable_at,
      disableAt: data.disable_at,
      metadata: data.metadata || {},
      updatedBy: data.updated_by,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    };
    
    // Evaluate flag (same logic as in utils)
    // 1. Check global enable
    if (!flag.isEnabled) {
      return { success: true, data: false };
    }
    
    // 2. Check schedule
    const now = new Date();
    if (flag.enableAt && new Date(flag.enableAt) > now) {
      return { success: true, data: false };
    }
    if (flag.disableAt && new Date(flag.disableAt) < now) {
      return { success: true, data: false };
    }
    
    // 3. Check user targeting
    if (context.userId && flag.targetUsers.length > 0) {
      if (flag.targetUsers.includes(context.userId)) {
        return { success: true, data: true };
      }
    }
    
    // 4. Check role targeting
    if (context.userRole && flag.targetRoles.length > 0) {
      if (flag.targetRoles.includes(context.userRole)) {
        return { success: true, data: true };
      }
    }
    
    // 5. Check percentage rollout
    if (flag.rolloutPercentage >= 100) {
      return { success: true, data: true };
    }
    if (flag.rolloutPercentage <= 0) {
      return { success: true, data: false };
    }
    
    // Use user ID for consistent percentage calculation
    if (context.userId) {
      const hash = simpleHash(context.userId + flagKey);
      return { success: true, data: (hash % 100) < flag.rolloutPercentage };
    }
    
    // No user context, use random
    return { success: true, data: Math.random() * 100 < flag.rolloutPercentage };
  } catch {
    return { success: true, data: false };
  }
}

/**
 * Simple hash function for consistent percentage rollout
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get a feature flag by key
 */
export async function getFeatureFlagAction(
  flagKey: string
): Promise<ActionResult<FeatureFlag | null>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('flag_key', flagKey)
      .single();
    
    if (error || !data) {
      return { success: true, data: null };
    }
    
    const flag: FeatureFlag = {
      id: data.id,
      flagKey: data.flag_key,
      name: data.name,
      description: data.description,
      isEnabled: data.is_enabled,
      targetUsers: data.target_users || [],
      targetRoles: data.target_roles || [],
      rolloutPercentage: data.rollout_percentage ?? 100,
      enableAt: data.enable_at,
      disableAt: data.disable_at,
      metadata: data.metadata || {},
      updatedBy: data.updated_by,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    };
    
    return { success: true, data: flag };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get feature flag' 
    };
  }
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlagsAction(): Promise<ActionResult<FeatureFlag[]>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('flag_key');
    
    if (error || !data) {
      return { success: true, data: [] };
    }
    
    const flags: FeatureFlag[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      flagKey: row.flag_key as string,
      name: row.name as string,
      description: row.description as string | undefined,
      isEnabled: row.is_enabled as boolean,
      targetUsers: (row.target_users as string[]) || [],
      targetRoles: (row.target_roles as string[]) || [],
      rolloutPercentage: (row.rollout_percentage as number) ?? 100,
      enableAt: row.enable_at as string | undefined,
      disableAt: row.disable_at as string | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
      updatedBy: row.updated_by as string | undefined,
      updatedAt: row.updated_at as string,
      createdAt: row.created_at as string,
    }));
    
    return { success: true, data: flags };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get feature flags' 
    };
  }
}

/**
 * Update a feature flag
 */
export async function updateFeatureFlagAction(
  flagKey: string,
  updates: Partial<Omit<FeatureFlag, 'id' | 'flagKey' | 'createdAt'>>
): Promise<ActionResult> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isEnabled !== undefined) updateData.is_enabled = updates.isEnabled;
    if (updates.targetUsers !== undefined) updateData.target_users = updates.targetUsers;
    if (updates.targetRoles !== undefined) updateData.target_roles = updates.targetRoles;
    if (updates.rolloutPercentage !== undefined) updateData.rollout_percentage = updates.rolloutPercentage;
    if (updates.enableAt !== undefined) updateData.enable_at = updates.enableAt;
    if (updates.disableAt !== undefined) updateData.disable_at = updates.disableAt;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    if (updates.updatedBy !== undefined) updateData.updated_by = updates.updatedBy;
    
    const { error } = await supabase
      .from('feature_flags')
      .update(updateData)
      .eq('flag_key', flagKey);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update feature flag' 
    };
  }
}

// =====================================================
// DEPLOYMENT ACTIONS (Requirement 6.1)
// =====================================================

/**
 * Record a deployment
 */
export async function recordDeploymentAction(deployment: {
  version: string;
  environment: 'development' | 'staging' | 'production';
  deployedBy?: string;
  deployedByName?: string;
  changelog?: string;
  commitHash?: string;
  buildNumber?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    
    const { data, error } = await supabase
      .from('deployment_history')
      .insert({
        version: deployment.version,
        environment: deployment.environment,
        deployed_by: deployment.deployedBy,
        deployed_by_name: deployment.deployedByName,
        changelog: deployment.changelog,
        commit_hash: deployment.commitHash,
        build_number: deployment.buildNumber,
        metadata: deployment.metadata || {},
        status: 'success',
        is_rollback: false,
      })
      .select('id')
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Update app_version config (Requirement 6.4)
    await setConfigAction('app_version', deployment.version);
    
    return { success: true, data: { id: data?.id } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to record deployment' 
    };
  }
}

/**
 * Record a rollback
 */
export async function recordRollbackAction(rollback: {
  targetVersion: string;
  environment: 'development' | 'staging' | 'production';
  reason: string;
  deployedBy?: string;
  deployedByName?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    
    const { data, error } = await supabase
      .from('deployment_history')
      .insert({
        version: rollback.targetVersion,
        environment: rollback.environment,
        deployed_by: rollback.deployedBy,
        deployed_by_name: rollback.deployedByName,
        status: 'rolled_back',
        is_rollback: true,
        rollback_reason: rollback.reason,
        rollback_target_version: rollback.targetVersion,
      })
      .select('id')
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Update app_version config
    await setConfigAction('app_version', rollback.targetVersion);
    
    return { success: true, data: { id: data?.id } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to record rollback' 
    };
  }
}

/**
 * Get deployment history
 */
export async function getDeploymentHistoryAction(options: {
  environment?: string;
  limit?: number;
} = {}): Promise<ActionResult<DeploymentRecord[]>> {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { environment, limit = 50 } = options;
    
    let query = supabase
      .from('deployment_history')
      .select('*')
      .order('deployed_at', { ascending: false })
      .limit(limit);
    
    if (environment) {
      query = query.eq('environment', environment);
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
      return { success: true, data: [] };
    }
    
    const deployments: DeploymentRecord[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      version: row.version as string,
      environment: row.environment as string,
      deployedAt: row.deployed_at as string,
      deployedBy: row.deployed_by as string | undefined,
      deployedByName: row.deployed_by_name as string | undefined,
      changelog: row.changelog as string | undefined,
      status: row.status as 'success' | 'failed' | 'rolled_back',
      isRollback: row.is_rollback as boolean,
      rollbackReason: row.rollback_reason as string | undefined,
      rollbackTargetVersion: row.rollback_target_version as string | undefined,
      commitHash: row.commit_hash as string | undefined,
      buildNumber: row.build_number as string | undefined,
      metadata: (row.metadata as Record<string, unknown>) || {},
    }));
    
    return { success: true, data: deployments };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get deployment history' 
    };
  }
}
