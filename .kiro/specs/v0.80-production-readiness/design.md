# Design Document: Production Readiness

## Overview

This design document outlines the architecture for v0.80 Production Readiness - the final preparation for production deployment of Gama ERP. The system provides health monitoring, centralized configuration, feature flags, and deployment tracking to ensure reliable production operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /api/health │  │ /api/config │  │ /api/feature-flags      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
┌─────────▼────────────────▼─────────────────────▼────────────────┐
│                     Service Layer                                │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Health_Check_    │  │ Config_      │  │ Feature_Flag_    │   │
│  │ System           │  │ Manager      │  │ Service          │   │
│  └────────┬─────────┘  └──────┬───────┘  └────────┬─────────┘   │
│           │                   │                   │              │
│  ┌────────▼─────────┐  ┌──────▼───────┐  ┌───────▼──────────┐   │
│  │ Startup_         │  │ Deployment_  │  │ Shutdown_        │   │
│  │ Validator        │  │ Tracker      │  │ Handler          │   │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                     │                   │
┌─────────▼─────────────────────▼───────────────────▼─────────────┐
│                     Database Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ system_health│  │ app_config   │  │ feature_flags        │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ deployment_history                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Health Check System

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: {
    database: ComponentStatus;
    cache: ComponentStatus;
    storage: ComponentStatus;
    queue: ComponentStatus;
  };
  version: string;
}

interface ComponentStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
}

interface SystemHealthRecord {
  id: string;
  timestamp: Date;
  db_connections_active: number;
  db_connections_idle: number;
  db_size_mb: number;
  largest_tables: Record<string, number>;
  avg_query_time_ms: number;
  slow_queries_count: number;
  cache_hit_rate: number;
  pending_jobs: number;
  failed_jobs: number;
  errors_last_hour: number;
  metrics: Record<string, unknown>;
}

// Health check functions
async function getHealthStatus(): Promise<HealthStatus>;
async function checkDatabase(): Promise<ComponentStatus>;
async function checkCache(): Promise<ComponentStatus>;
async function checkStorage(): Promise<ComponentStatus>;
async function checkQueue(): Promise<ComponentStatus>;
async function recordHealthMetrics(metrics: Partial<SystemHealthRecord>): Promise<void>;
```

### Config Manager

```typescript
interface AppConfig {
  id: string;
  config_key: string;
  config_value: unknown;
  description?: string;
  environment: 'all' | 'development' | 'staging' | 'production';
  is_sensitive: boolean;
  updated_at: Date;
  updated_by?: string;
}

// Config functions
async function getConfig<T>(key: string): Promise<T | null>;
async function setConfig(key: string, value: unknown, updatedBy?: string): Promise<void>;
async function getAllConfigs(environment?: string): Promise<AppConfig[]>;
async function isMaintenanceMode(): Promise<boolean>;
async function setMaintenanceMode(enabled: boolean, updatedBy?: string): Promise<void>;
```

### Feature Flag Service

```typescript
interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description?: string;
  is_enabled: boolean;
  enabled_for_users: string[];
  enabled_for_roles: string[];
  enabled_percentage: number;
  enable_at?: Date;
  disable_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface FeatureFlagContext {
  userId?: string;
  userRole?: string;
}

// Feature flag functions
async function isFeatureEnabled(flagKey: string, context?: FeatureFlagContext): Promise<boolean>;
async function getFeatureFlag(flagKey: string): Promise<FeatureFlag | null>;
async function getAllFeatureFlags(): Promise<FeatureFlag[]>;
async function updateFeatureFlag(flagKey: string, updates: Partial<FeatureFlag>): Promise<void>;
```

### Deployment Tracker

```typescript
interface DeploymentRecord {
  id: string;
  version: string;
  environment: string;
  deployed_at: Date;
  deployed_by?: string;
  changelog?: string;
  migration_notes?: string;
  status: 'success' | 'failed' | 'rolled_back';
  rollback_to?: string;
  rollback_at?: Date;
  rollback_reason?: string;
}

interface RecordDeploymentParams {
  version: string;
  environment: string;
  changelog?: string;
  deployedBy?: string;
}

// Deployment functions
async function recordDeployment(params: RecordDeploymentParams): Promise<void>;
async function recordRollback(deploymentId: string, targetVersion: string, reason: string): Promise<void>;
async function getDeploymentHistory(environment?: string): Promise<DeploymentRecord[]>;
async function getLatestDeployment(environment: string): Promise<DeploymentRecord | null>;
```

### Startup Validator

```typescript
interface StartupCheckResult {
  success: boolean;
  errors: string[];
  checks: {
    database: boolean;
    envVars: boolean;
    tables: boolean;
  };
}

// Startup functions
async function runStartupChecks(): Promise<StartupCheckResult>;
async function checkDatabaseConnection(): Promise<boolean>;
async function checkRequiredEnvVars(): Promise<string[]>;
async function checkRequiredTables(): Promise<string[]>;
```

### Shutdown Handler

```typescript
// Shutdown functions
async function gracefulShutdown(): Promise<void>;
function registerShutdownHandlers(): void;
```

## Data Models

### system_health Table

```sql
CREATE TABLE system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  db_connections_active INTEGER,
  db_connections_idle INTEGER,
  db_size_mb DECIMAL(10,2),
  largest_tables JSONB,
  avg_query_time_ms DECIMAL(10,2),
  slow_queries_count INTEGER,
  cache_hit_rate DECIMAL(5,2),
  pending_jobs INTEGER,
  failed_jobs INTEGER,
  errors_last_hour INTEGER,
  metrics JSONB DEFAULT '{}'
);

CREATE INDEX idx_system_health_timestamp ON system_health(timestamp DESC);
```

### app_config Table

```sql
CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  environment VARCHAR(20) DEFAULT 'all',
  is_sensitive BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_app_config_key ON app_config(config_key);
CREATE INDEX idx_app_config_env ON app_config(environment);
```

### feature_flags Table

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(100) UNIQUE NOT NULL,
  flag_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  enabled_for_users JSONB DEFAULT '[]',
  enabled_for_roles JSONB DEFAULT '[]',
  enabled_percentage INTEGER DEFAULT 0,
  enable_at TIMESTAMPTZ,
  disable_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);
```

### deployment_history Table

```sql
CREATE TABLE deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL,
  environment VARCHAR(20) NOT NULL,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_by VARCHAR(200),
  changelog TEXT,
  migration_notes TEXT,
  status VARCHAR(20) DEFAULT 'success',
  rollback_to VARCHAR(50),
  rollback_at TIMESTAMPTZ,
  rollback_reason TEXT
);

CREATE INDEX idx_deployment_history_env ON deployment_history(environment);
CREATE INDEX idx_deployment_history_version ON deployment_history(version);
CREATE INDEX idx_deployment_history_deployed_at ON deployment_history(deployed_at DESC);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Health Status Aggregation

*For any* set of component statuses, the overall health status SHALL be:
- 'unhealthy' if any component is 'unhealthy'
- 'degraded' if any component is 'degraded' and none are 'unhealthy'
- 'healthy' only if all components are 'healthy'

**Validates: Requirements 1.3, 2.4, 2.5**

### Property 2: Health Metrics Recording Round-Trip

*For any* health check performed, the system SHALL store a record in system_health with a timestamp, and querying the table immediately after SHALL return a record with timestamp within 1 second of the check time.

**Validates: Requirements 1.1, 1.2**

### Property 3: Health Response Structure Completeness

*For any* health check response, the response SHALL contain status for all four components (database, cache, storage, queue), each with a latencyMs value, and SHALL include the application version string.

**Validates: Requirements 2.2, 2.3, 2.6**

### Property 4: Config Round-Trip Consistency

*For any* configuration key-value pair stored via setConfig, calling getConfig with the same key SHALL return the exact same value (JSON equality).

**Validates: Requirements 3.1, 4.2, 4.3**

### Property 5: Config Environment Filtering

*For any* configuration with a specific environment setting, getAllConfigs filtered by that environment SHALL include the config, and getAllConfigs filtered by a different environment SHALL NOT include it (unless environment is 'all').

**Validates: Requirements 3.2**

### Property 6: Sensitive Config Protection

*For any* configuration marked as sensitive (is_sensitive = true), the config value SHALL NOT appear in any log output or public API response that lists configurations.

**Validates: Requirements 3.3**

### Property 7: Config Audit Trail

*For any* configuration update via setConfig with an updatedBy parameter, the stored record SHALL have updated_at within 1 second of the update time and updated_by matching the provided value.

**Validates: Requirements 3.4**

### Property 8: Feature Flag Evaluation Priority

*For any* feature flag and user context, the evaluation SHALL follow this priority order:
1. If is_enabled is false, return false (global disable)
2. If current time is before enable_at or after disable_at, return false (schedule)
3. If userId is in enabled_for_users, return true (user targeting)
4. If userRole is in enabled_for_roles, return true (role targeting)
5. If enabled_percentage > 0, use deterministic hash to decide (percentage rollout)
6. Otherwise, return is_enabled

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 9: Deployment Recording Side Effects

*For any* deployment recorded via recordDeployment, the app_version config SHALL be updated to match the deployment version, and the deployment_history table SHALL contain a record with the provided version, environment, and deployer.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 10: Startup Validation Completeness

*For any* startup check execution, the result SHALL indicate success only if:
- Database connection succeeds
- All required environment variables are present
- All required tables exist

If any check fails, the errors array SHALL contain a descriptive message for each failure.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 11: DB Health Function Output

*For any* call to check_system_health() PostgreSQL function, the returned JSONB SHALL contain:
- status field with value 'healthy', 'degraded', or 'warning'
- database object with size_mb and connections
- errors_last_hour count
- version string

And a new record SHALL be inserted into system_health table.

**Validates: Requirements 9.2, 9.3, 9.4**

## Error Handling

### Health Check Errors

- If a component check times out (>5s), mark component as 'degraded' with timeout message
- If a component check throws an error, mark component as 'unhealthy' with error message
- Never let health check endpoint itself fail - always return a valid response

### Config Errors

- If config key not found, return null (not an error)
- If config value is invalid JSON, log error and return null
- If database unavailable, throw error (critical failure)

### Feature Flag Errors

- If flag not found, return false (feature disabled by default)
- If evaluation fails, log error and return false (fail closed)
- If database unavailable, use cached values if available

### Startup Errors

- Collect all errors before returning (don't fail fast)
- Provide actionable error messages
- Log all errors at ERROR level

## Testing Strategy

### Unit Tests

- Test status aggregation logic with various component combinations
- Test config get/set operations
- Test feature flag evaluation with different contexts
- Test startup check individual validators

### Property-Based Tests

Use fast-check for property-based testing with minimum 100 iterations per property:

1. **Health Status Aggregation**: Generate random component statuses, verify aggregation rules
2. **Config Round-Trip**: Generate random config values, verify storage and retrieval
3. **Feature Flag Evaluation**: Generate random flags and contexts, verify priority order
4. **Startup Validation**: Generate various environment states, verify error collection

### Integration Tests

- Test /api/health endpoint returns valid response
- Test config updates persist across requests
- Test feature flag changes take effect immediately
- Test deployment recording updates version config

### Test Configuration

```typescript
// vitest.config.ts additions
export default defineConfig({
  test: {
    // Property tests need more time
    testTimeout: 30000,
  },
});
```

Each property test MUST be annotated with:
- **Feature: v0.80-production-readiness, Property N: [Property Title]**
- **Validates: Requirements X.Y**
