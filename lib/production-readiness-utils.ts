/**
 * Production Readiness Utilities
 * Health checks, config management, feature flags, and deployment tracking
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type HealthStatusLevel = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentStatus {
  name: string;
  status: HealthStatusLevel;
  responseTime?: number;
  message?: string;
  lastChecked: string;
}

export interface HealthStatus {
  status: HealthStatusLevel;
  version: string;
  timestamp: string;
  components: ComponentStatus[];
  metrics?: {
    databaseSize?: number;
    activeConnections?: number;
    errorCount?: number;
    uptime?: number;
  };
}

export interface AppConfig {
  id: string;
  configKey: string;
  configValue: unknown;
  environment: string;
  isSensitive: boolean;
  description?: string;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  flagKey: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  targetUsers: string[];
  targetRoles: string[];
  rolloutPercentage: number;
  enableAt?: string;
  disableAt?: string;
  metadata: Record<string, unknown>;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface FeatureFlagContext {
  userId?: string;
  userRole?: string;
}


export interface DeploymentRecord {
  id: string;
  version: string;
  environment: string;
  deployedAt: string;
  deployedBy?: string;
  deployedByName?: string;
  changelog?: string;
  status: 'success' | 'failed' | 'rolled_back';
  isRollback: boolean;
  rollbackReason?: string;
  rollbackTargetVersion?: string;
  commitHash?: string;
  buildNumber?: string;
  metadata: Record<string, unknown>;
}

export interface StartupCheckResult {
  success: boolean;
  checks: {
    name: string;
    passed: boolean;
    error?: string;
  }[];
  errors: string[];
  timestamp: string;
}

// ============================================================================
// Health Check Functions (Requirements: 1.3, 2.2, 2.3, 2.4, 2.5)
// ============================================================================

/**
 * Get overall health status with component checks
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const components: ComponentStatus[] = [];
  
  // Check database
  const dbStatus = await checkDatabase();
  components.push(dbStatus);
  
  // Check cache (simulated)
  const cacheStatus = await checkCache();
  components.push(cacheStatus);
  
  // Check storage
  const storageStatus = await checkStorage();
  components.push(storageStatus);
  
  // Check queue (simulated)
  const queueStatus = await checkQueue();
  components.push(queueStatus);
  
  // Aggregate status
  const status = aggregateHealthStatus(components);
  
  // Get version from config
  const version = await getConfigValue('app_version', '0.80.0');
  
  return {
    status,
    version,
    timestamp: new Date().toISOString(),
    components,
    metrics: await getHealthMetrics(),
  };
}

/**
 * Check database connectivity and health
 */
export async function checkDatabase(): Promise<ComponentStatus> {
  const startTime = Date.now();
  const name = 'database';
  
  try {
    const supabase = createClient();
    const { error } = await supabase.from('system_health').select('id').limit(1);
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        name,
        status: 'unhealthy',
        responseTime,
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
    
    // Determine status based on response time
    const status: HealthStatusLevel = responseTime > 1000 ? 'degraded' : 'healthy';
    
    return {
      name,
      status,
      responseTime,
      message: 'Database connection successful',
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Unknown database error',
      lastChecked: new Date().toISOString(),
    };
  }
}


/**
 * Check cache service health (simulated)
 */
export async function checkCache(): Promise<ComponentStatus> {
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 10));
  
  return {
    name: 'cache',
    status: 'healthy',
    responseTime: Date.now() - startTime,
    message: 'Cache service operational',
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Check storage service health
 */
export async function checkStorage(): Promise<ComponentStatus> {
  const startTime = Date.now();
  const name = 'storage';
  
  try {
    const supabase = createClient();
    const { error } = await supabase.storage.listBuckets();
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        name,
        status: 'degraded',
        responseTime,
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
    
    return {
      name,
      status: 'healthy',
      responseTime,
      message: 'Storage service operational',
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Storage check failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check queue service health (simulated)
 */
export async function checkQueue(): Promise<ComponentStatus> {
  const startTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 5));
  
  return {
    name: 'queue',
    status: 'healthy',
    responseTime: Date.now() - startTime,
    message: 'Queue service operational',
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Aggregate component statuses into overall health status
 * Rules:
 * - If any component is unhealthy -> overall unhealthy
 * - If any component is degraded -> overall degraded
 * - Otherwise -> healthy
 */
export function aggregateHealthStatus(components: ComponentStatus[]): HealthStatusLevel {
  if (components.length === 0) return 'healthy';
  
  if (components.some(c => c.status === 'unhealthy')) return 'unhealthy';
  if (components.some(c => c.status === 'degraded')) return 'degraded';
  
  return 'healthy';
}

/**
 * Get health metrics from database
 */
async function getHealthMetrics(): Promise<HealthStatus['metrics']> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('system_health')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = data as any;
      return {
        databaseSize: row.database_size,
        activeConnections: row.active_connections,
        errorCount: row.error_count,
      };
    }
    return {};
  } catch {
    return {};
  }
}


// ============================================================================
// Config Manager Functions (Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3)
// ============================================================================

/**
 * Get a configuration value by key
 */
export async function getConfig(
  key: string,
  environment: string = 'all'
): Promise<AppConfig | null> {
  const supabase = createClient();
  
  // Try environment-specific first, then fall back to 'all'
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('config_key', key)
    .in('environment', [environment, 'all'])
    .order('environment', { ascending: false }) // Prefer specific environment
    .limit(1)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    configKey: data.config_key,
    configValue: data.config_value,
    environment: data.environment,
    isSensitive: data.is_sensitive,
    description: data.description ?? undefined,
    updatedBy: data.updated_by ?? undefined,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
  };
}

/**
 * Get a configuration value, returning just the value
 */
export async function getConfigValue<T = string>(
  key: string,
  defaultValue: T,
  environment: string = 'all'
): Promise<T> {
  const config = await getConfig(key, environment);
  return (config?.configValue as T) ?? defaultValue;
}

/**
 * Set a configuration value
 */
export async function setConfig(
  key: string,
  value: unknown,
  options: {
    environment?: string;
    isSensitive?: boolean;
    description?: string;
    userId?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { environment = 'all', isSensitive = false, description, userId } = options;
  
  const { error } = await supabase
    .from('app_config')
    .upsert({
      config_key: key,
      config_value: value as unknown,
      environment,
      is_sensitive: isSensitive,
      description,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    } as never, {
      onConflict: 'config_key,environment',
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Get all configurations, optionally filtering sensitive ones
 */
export async function getAllConfigs(options: {
  environment?: string;
  includeSensitive?: boolean;
} = {}): Promise<AppConfig[]> {
  const supabase = createClient();
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
  
  if (error || !data) return [];
  
  return data.map(row => ({
    id: row.id,
    configKey: row.config_key,
    configValue: row.config_value,
    environment: row.environment,
    isSensitive: row.is_sensitive,
    description: row.description ?? undefined,
    updatedBy: row.updated_by ?? undefined,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  })) as AppConfig[];
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const value = await getConfigValue<boolean>('maintenance_mode', false);
  return value === true;
}

/**
 * Set maintenance mode
 */
export async function setMaintenanceMode(
  enabled: boolean,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  return setConfig('maintenance_mode', enabled, { userId });
}


// ============================================================================
// Feature Flag Service (Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6)
// ============================================================================

/**
 * Get a feature flag by key
 */
export async function getFeatureFlag(flagKey: string): Promise<FeatureFlag | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_key', flagKey)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    flagKey: data.flag_key,
    name: data.name,
    description: data.description ?? undefined,
    isEnabled: data.is_enabled,
    targetUsers: data.target_users || [],
    targetRoles: data.target_roles || [],
    rolloutPercentage: data.rollout_percentage ?? 100,
    enableAt: data.enable_at ?? undefined,
    disableAt: data.disable_at ?? undefined,
    metadata: (data.metadata || {}) as Record<string, unknown>,
    updatedBy: data.updated_by ?? undefined,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
  };
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('flag_key');
  
  if (error || !data) return [];
  
  return data.map(row => ({
    id: row.id,
    flagKey: row.flag_key,
    name: row.name,
    description: row.description ?? undefined,
    isEnabled: row.is_enabled,
    targetUsers: row.target_users || [],
    targetRoles: row.target_roles || [],
    rolloutPercentage: row.rollout_percentage ?? 100,
    enableAt: row.enable_at ?? undefined,
    disableAt: row.disable_at ?? undefined,
    metadata: (row.metadata || {}) as Record<string, unknown>,
    updatedBy: row.updated_by ?? undefined,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  })) as FeatureFlag[];
}

/**
 * Update a feature flag
 */
export async function updateFeatureFlag(
  flagKey: string,
  updates: Partial<Omit<FeatureFlag, 'id' | 'flagKey' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
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
}

/**
 * Simple hash function for consistent percentage rollout
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a feature is enabled for a given context
 * Evaluation priority (Requirement 5.6):
 * 1. Global disable (is_enabled = false)
 * 2. Schedule (enable_at, disable_at)
 * 3. User targeting
 * 4. Role targeting
 * 5. Percentage rollout
 */
export async function isFeatureEnabled(
  flagKey: string,
  context: FeatureFlagContext = {}
): Promise<boolean> {
  const flag = await getFeatureFlag(flagKey);
  
  if (!flag) return false;
  
  // 1. Check global enable
  if (!flag.isEnabled) return false;
  
  // 2. Check schedule
  const now = new Date();
  if (flag.enableAt && new Date(flag.enableAt) > now) return false;
  if (flag.disableAt && new Date(flag.disableAt) < now) return false;
  
  // 3. Check user targeting
  if (context.userId && flag.targetUsers.length > 0) {
    if (flag.targetUsers.includes(context.userId)) return true;
  }
  
  // 4. Check role targeting
  if (context.userRole && flag.targetRoles.length > 0) {
    if (flag.targetRoles.includes(context.userRole)) return true;
  }
  
  // 5. Check percentage rollout
  if (flag.rolloutPercentage >= 100) return true;
  if (flag.rolloutPercentage <= 0) return false;
  
  // Use user ID for consistent percentage calculation
  if (context.userId) {
    const hash = simpleHash(context.userId + flagKey);
    return (hash % 100) < flag.rolloutPercentage;
  }
  
  // No user context, use random
  return Math.random() * 100 < flag.rolloutPercentage;
}


// ============================================================================
// Deployment Tracker Functions (Requirements: 6.1, 6.2, 6.3, 6.4)
// ============================================================================

/**
 * Record a deployment
 */
export async function recordDeployment(deployment: {
  version: string;
  environment: 'development' | 'staging' | 'production';
  deployedBy?: string;
  deployedByName?: string;
  changelog?: string;
  commitHash?: string;
  buildNumber?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  
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
      metadata: (deployment.metadata || {}) as unknown,
      status: 'success',
      is_rollback: false,
    } as never)
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update app_version config (Requirement 6.4)
  await setConfig('app_version', deployment.version);
  
  return { success: true, id: data?.id };
}

/**
 * Record a rollback
 */
export async function recordRollback(rollback: {
  targetVersion: string;
  environment: 'development' | 'staging' | 'production';
  reason: string;
  deployedBy?: string;
  deployedByName?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  
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
    } as never)
    .select('id')
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Update app_version config
  await setConfig('app_version', rollback.targetVersion);
  
  return { success: true, id: data?.id };
}

/**
 * Get deployment history
 */
export async function getDeploymentHistory(options: {
  environment?: string;
  limit?: number;
} = {}): Promise<DeploymentRecord[]> {
  const supabase = createClient();
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
  
  if (error || !data) return [];
  
  return data.map(row => ({
    id: row.id,
    version: row.version,
    environment: row.environment,
    deployedAt: row.deployed_at,
    deployedBy: row.deployed_by ?? undefined,
    deployedByName: row.deployed_by_name ?? undefined,
    changelog: row.changelog ?? undefined,
    status: row.status as 'success' | 'failed' | 'rolled_back',
    isRollback: row.is_rollback,
    rollbackReason: row.rollback_reason ?? undefined,
    rollbackTargetVersion: row.rollback_target_version ?? undefined,
    commitHash: row.commit_hash ?? undefined,
    buildNumber: row.build_number ?? undefined,
    metadata: (row.metadata || {}) as Record<string, unknown>,
  })) as DeploymentRecord[];
}


// ============================================================================
// Startup Validation (Requirements: 7.1, 7.2, 7.3, 7.4, 7.5)
// ============================================================================

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const REQUIRED_TABLES = [
  'user_profiles',
  'customers',
  'job_orders',
  'invoices',
];

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<{ passed: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    const { error } = await supabase.from('user_profiles').select('id').limit(1);
    if (error) {
      return { passed: false, error: `Database connection failed: ${error.message}` };
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, error: `Database connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

/**
 * Check required environment variables
 */
export function checkRequiredEnvVars(): { passed: boolean; error?: string } {
  const missing: string[] = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    return { passed: false, error: `Missing environment variables: ${missing.join(', ')}` };
  }
  
  return { passed: true };
}

/**
 * Check required database tables exist
 */
export async function checkRequiredTables(): Promise<{ passed: boolean; error?: string }> {
  const supabase = createClient();
  const missing: string[] = [];
  
  for (const table of REQUIRED_TABLES) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from(table).select('*').limit(0);
      if (error) {
        missing.push(table);
      }
    } catch {
      missing.push(table);
    }
  }
  
  if (missing.length > 0) {
    return { passed: false, error: `Missing required tables: ${missing.join(', ')}` };
  }
  
  return { passed: true };
}

/**
 * Run all startup checks
 */
export async function runStartupChecks(): Promise<StartupCheckResult> {
  const checks: { name: string; passed: boolean; error?: string }[] = [];
  const errors: string[] = [];
  
  // Check environment variables (sync)
  const envCheck = checkRequiredEnvVars();
  checks.push({ name: 'environment_variables', ...envCheck });
  if (!envCheck.passed && envCheck.error) errors.push(envCheck.error);
  
  // Check database connection
  const dbCheck = await checkDatabaseConnection();
  checks.push({ name: 'database_connection', ...dbCheck });
  if (!dbCheck.passed && dbCheck.error) errors.push(dbCheck.error);
  
  // Check required tables (only if DB connection passed)
  if (dbCheck.passed) {
    const tablesCheck = await checkRequiredTables();
    checks.push({ name: 'required_tables', ...tablesCheck });
    if (!tablesCheck.passed && tablesCheck.error) errors.push(tablesCheck.error);
  }
  
  return {
    success: errors.length === 0,
    checks,
    errors,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Graceful Shutdown (Requirements: 8.1, 8.2, 8.3)
// ============================================================================

let isShuttingDown = false;
const shutdownCallbacks: (() => Promise<void>)[] = [];

/**
 * Register a callback to run during shutdown
 */
export function onShutdown(callback: () => Promise<void>): void {
  shutdownCallbacks.push(callback);
}

/**
 * Perform graceful shutdown
 */
export async function gracefulShutdown(timeoutMs: number = 10000): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('[Shutdown] Initiating graceful shutdown...');
  
  const timeout = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs);
  });
  
  const cleanup = async () => {
    for (const callback of shutdownCallbacks) {
      try {
        await callback();
      } catch (err) {
        console.error('[Shutdown] Callback error:', err);
      }
    }
  };
  
  try {
    await Promise.race([cleanup(), timeout]);
    console.log('[Shutdown] Graceful shutdown completed');
  } catch (err) {
    console.error('[Shutdown] Forced shutdown after timeout:', err);
  }
}

/**
 * Register signal handlers for graceful shutdown
 */
export function registerShutdownHandlers(): void {
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
      console.log('[Shutdown] Received SIGTERM');
      gracefulShutdown();
    });
    
    process.on('SIGINT', () => {
      console.log('[Shutdown] Received SIGINT');
      gracefulShutdown();
    });
  }
}
