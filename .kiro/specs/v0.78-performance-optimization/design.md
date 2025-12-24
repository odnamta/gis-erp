# Design Document

## Overview

This design document outlines the architecture and implementation approach for Performance Optimization (v0.78) in the Gama ERP system. The optimization strategy focuses on four key areas: database indexing, materialized views for reporting, an in-memory caching layer, and query optimization utilities. These improvements will significantly reduce query latency, minimize database load, and ensure the system can handle production-scale workloads efficiently.

## Architecture

The performance optimization architecture consists of three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  React/Next.js  │  │  Server Actions │  │   API Routes    │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                ▼                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Caching Layer                            ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │ Memory Cache │  │ Cache Utils  │  │ Cache Invalidate │  ││
│  │  │  (Map-based) │  │  (withCache) │  │    (patterns)    │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                │                                │
│                                ▼                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 Query Optimization Layer                    ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │Query Builder │  │  Pagination  │  │  Search Utils    │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Supabase PostgreSQL                       ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │   Indexes    │  │ Materialized │  │    Functions     │  ││
│  │  │ (Composite,  │  │    Views     │  │ (get_dashboard_  │  ││
│  │  │  Partial,    │  │ (mv_monthly_ │  │  stats, refresh_ │  ││
│  │  │    GIN)      │  │  revenue,    │  │  materialized_   │  ││
│  │  │              │  │  mv_customer │  │     views)       │  ││
│  │  │              │  │  _summary)   │  │                  │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Connection Pooling: transaction mode, pool_size=15             │
│  Statement Timeout: 30 seconds                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Indexes

#### Composite Indexes
```sql
-- Job orders by customer and status (most common dashboard query)
CREATE INDEX idx_job_orders_customer_status 
  ON job_orders(customer_id, status) 
  WHERE is_active = TRUE;

-- Invoices by customer, status, and date (AR aging queries)
CREATE INDEX idx_invoices_customer_status_date 
  ON invoices(customer_id, status, invoice_date DESC) 
  WHERE is_active = TRUE;

-- Quotations by status and date (sales pipeline queries)
CREATE INDEX idx_quotations_status_date 
  ON quotations(status, created_at DESC) 
  WHERE is_active = TRUE;

-- PJOs by project and status (project detail queries)
CREATE INDEX idx_pjo_project_status 
  ON proforma_job_orders(project_id, status) 
  WHERE is_active = TRUE;
```

#### Partial Indexes
```sql
-- Active customers only (dropdown lists)
CREATE INDEX idx_active_customers 
  ON customers(name) 
  WHERE is_active = TRUE;

-- Active employees only (assignment dropdowns)
CREATE INDEX idx_active_employees 
  ON employees(full_name) 
  WHERE is_active = TRUE;
```

#### Full-Text Search Indexes
```sql
-- Customer search by name and code
CREATE INDEX idx_customers_search 
  ON customers 
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(code, '')));

-- Job order search by number and notes
CREATE INDEX idx_job_orders_search 
  ON job_orders 
  USING GIN (to_tsvector('english', jo_number || ' ' || COALESCE(notes, '')));
```

### 2. Materialized Views

#### Monthly Revenue View
```sql
CREATE MATERIALIZED VIEW mv_monthly_revenue AS
SELECT 
  DATE_TRUNC('month', completed_at)::DATE as month,
  customer_id,
  COUNT(*) as job_count,
  SUM(total_revenue) as total_revenue,
  SUM(total_cost) as total_cost,
  SUM(total_revenue - total_cost) as gross_profit
FROM job_orders
WHERE status = 'completed'
  AND completed_at >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', completed_at), customer_id;

CREATE UNIQUE INDEX idx_mv_monthly_revenue 
  ON mv_monthly_revenue(month, customer_id);
```

#### Customer Summary View
```sql
CREATE MATERIALIZED VIEW mv_customer_summary AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  COUNT(DISTINCT jo.id) as total_jobs,
  COUNT(DISTINCT jo.id) FILTER (WHERE jo.status = 'completed') as completed_jobs,
  SUM(jo.total_revenue) FILTER (WHERE jo.status = 'completed') as total_revenue,
  MAX(jo.completed_at) as last_job_date,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('sent', 'partial', 'overdue')) as open_invoices,
  SUM(i.total_amount - i.paid_amount) FILTER (WHERE i.status IN ('sent', 'partial', 'overdue')) as outstanding_ar
FROM customers c
LEFT JOIN job_orders jo ON c.id = jo.customer_id
LEFT JOIN invoices i ON c.id = i.customer_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX idx_mv_customer_summary 
  ON mv_customer_summary(customer_id);
```

### 3. Database Functions

#### Dashboard Stats Function
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  active_jobs BIGINT,
  revenue_mtd DECIMAL,
  profit_mtd DECIMAL,
  pending_invoices BIGINT,
  ar_outstanding DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM job_orders WHERE status IN ('in_progress', 'on_hold')),
    (SELECT COALESCE(SUM(total_revenue), 0) FROM job_orders 
     WHERE status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)),
    (SELECT COALESCE(SUM(total_revenue - total_cost), 0) FROM job_orders 
     WHERE status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)),
    (SELECT COUNT(*) FROM invoices WHERE status IN ('sent', 'partial', 'overdue')),
    (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices 
     WHERE status IN ('sent', 'partial', 'overdue'));
END;
$$ LANGUAGE plpgsql;
```

#### Refresh Materialized Views Function
```sql
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_summary;
END;
$$ LANGUAGE plpgsql;
```

### 4. Caching Layer Interface

```typescript
// lib/cache-utils.ts

interface CacheConfig {
  ttlSeconds: number;
  staleWhileRevalidate?: boolean;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
  createdAt: number;
}

interface CacheStats {
  size: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestEntryAge: number | null;
}

// Core cache functions
function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config?: CacheConfig
): Promise<T>;

function invalidateCache(pattern?: string): void;

function getCacheStats(): CacheStats;

// Pre-configured cached queries
function getCachedCustomerList(): Promise<Customer[]>;
function getCachedEmployeeList(): Promise<Employee[]>;
function getCachedDashboardStats(): Promise<DashboardStats>;
```

### 5. Query Optimizer Interface

```typescript
// lib/query-utils.ts

interface QueryOptions {
  select?: string;
  filters?: Record<string, any>;
  search?: string;
  searchFields?: string[];
  pagination?: { page: number; limit: number };
  sort?: { field: string; order: 'asc' | 'desc' };
}

interface QueryResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

function buildOptimizedQuery<T>(
  table: string,
  options: QueryOptions
): PostgrestFilterBuilder<T>;

async function executeOptimizedQuery<T>(
  table: string,
  options: QueryOptions
): Promise<QueryResult<T>>;
```

### 6. Performance Monitoring Interface

```typescript
// lib/performance-utils.ts

interface SlowQueryLog {
  query: string;
  executionTime: number;
  timestamp: Date;
  table: string;
}

interface PerformanceMetrics {
  cacheStats: CacheStats;
  slowQueries: SlowQueryLog[];
  avgQueryTime: number;
}

function logSlowQuery(log: SlowQueryLog): void;
function getPerformanceMetrics(): PerformanceMetrics;
function clearSlowQueryLogs(): void;
```

## Data Models

### Cache Entry Structure
```typescript
interface CacheEntry<T> {
  data: T;           // The cached data
  expiry: number;    // Unix timestamp when entry expires
  createdAt: number; // Unix timestamp when entry was created
}
```

### Dashboard Stats Structure
```typescript
interface DashboardStats {
  active_jobs: number;
  revenue_mtd: number;
  profit_mtd: number;
  pending_invoices: number;
  ar_outstanding: number;
}
```

### Monthly Revenue Structure
```typescript
interface MonthlyRevenue {
  month: string;        // YYYY-MM-DD format
  customer_id: string;
  job_count: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
}
```

### Customer Summary Structure
```typescript
interface CustomerSummary {
  customer_id: string;
  customer_name: string;
  total_jobs: number;
  completed_jobs: number;
  total_revenue: number;
  last_job_date: string | null;
  open_invoices: number;
  outstanding_ar: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cache TTL Behavior

*For any* cache entry with a configured TTL, if the entry is requested before the TTL expires, the cached data should be returned without calling the fetcher; if requested after the TTL expires, the fetcher should be called and the cache updated with fresh data.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 2: Cache Invalidation

*For any* cache containing entries, calling invalidateCache with a pattern should remove all entries whose keys contain that pattern, and calling invalidateCache without a pattern should remove all entries.

**Validates: Requirements 5.4, 5.5**

### Property 3: Mutation-Triggered Cache Invalidation

*For any* mutation operation (create, update, delete) on customers, employees, job orders, or invoices, the corresponding cache entries should be invalidated immediately after the mutation completes.

**Validates: Requirements 6.4, 6.5, 6.6**

### Property 4: Query Optimizer Filtering

*For any* query with filters containing exact match values, array values, or null checks, the resulting query should correctly apply all non-empty filters and return only records matching all specified conditions.

**Validates: Requirements 7.1**

### Property 5: Query Optimizer Search

*For any* query with a search term and specified search fields, the resulting query should return records where at least one of the specified fields contains the search term (case-insensitive).

**Validates: Requirements 7.2**

### Property 6: Query Optimizer Pagination

*For any* query with pagination parameters (page, limit), the result should contain at most `limit` records starting from offset `(page - 1) * limit`, and the total count should reflect all matching records regardless of pagination.

**Validates: Requirements 7.3, 7.5**

### Property 7: Query Optimizer Sorting

*For any* query with sort parameters (field, order), the resulting records should be ordered by the specified field in the specified direction (ascending or descending).

**Validates: Requirements 7.4**

### Property 8: Query Optimizer Empty Filter Handling

*For any* query with filters containing empty strings, null values, or undefined values, those filters should be skipped and not affect the query results.

**Validates: Requirements 7.6**

### Property 9: Slow Query Logging

*For any* query that takes longer than 1 second to execute, the system should log an entry containing the query text, execution time in milliseconds, and timestamp.

**Validates: Requirements 9.1, 9.3**

### Property 10: Cache Hit Rate Tracking

*For any* sequence of cache operations, the cache hit rate should equal the number of cache hits divided by the total number of cache requests (hits + misses).

**Validates: Requirements 9.2**

## Error Handling

### Database Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Connection timeout | Log error, return cached data if available, retry with exponential backoff |
| Query timeout (30s) | Log slow query, return error to caller with timeout message |
| Index not found | Log warning, query proceeds without index (degraded performance) |
| Materialized view stale | Return stale data, trigger async refresh |

### Cache Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Cache miss | Fetch from database, populate cache, return data |
| Fetcher failure | Log error, return cached stale data if available, otherwise propagate error |
| Invalidation failure | Log warning, continue operation (cache will expire naturally) |

### Query Builder Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Invalid filter type | Skip filter, log warning |
| Invalid sort field | Use default sort, log warning |
| Pagination out of bounds | Return empty result with correct count |

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Cache Utils Tests**
   - Cache entry creation with correct TTL
   - Cache hit returns data without fetcher call
   - Cache miss calls fetcher and stores result
   - Pattern-based invalidation removes matching entries
   - Full invalidation clears all entries
   - Cache stats calculation accuracy

2. **Query Builder Tests**
   - Filter application for different value types
   - Search query construction
   - Pagination offset calculation
   - Sort order application
   - Empty filter handling

3. **Performance Monitoring Tests**
   - Slow query detection threshold
   - Log entry format validation
   - Hit rate calculation

### Property-Based Tests

Property-based tests will use `fast-check` to verify universal properties:

1. **Cache Behavior Properties**
   - Generate random cache keys, values, and TTLs
   - Verify TTL expiration behavior
   - Verify invalidation patterns

2. **Query Builder Properties**
   - Generate random filter configurations
   - Verify filter application correctness
   - Generate random pagination parameters
   - Verify pagination bounds

3. **Monitoring Properties**
   - Generate random query execution times
   - Verify slow query detection
   - Generate random cache operation sequences
   - Verify hit rate calculation

### Test Configuration

```typescript
// vitest.config.ts additions
export default defineConfig({
  test: {
    // Property tests need more iterations
    testTimeout: 30000,
  },
});
```

Each property test should run a minimum of 100 iterations to ensure comprehensive coverage.

