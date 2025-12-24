# Requirements Document

## Introduction

This document defines the requirements for Performance Optimization (v0.78) in the Gama ERP system. The feature focuses on optimizing database queries, implementing caching strategies, and improving overall system performance to handle production-level loads efficiently. This includes creating composite indexes, materialized views for reporting, an in-memory caching layer, and query optimization utilities.

## Glossary

- **Cache**: A temporary storage layer that holds frequently accessed data to reduce database queries
- **TTL (Time-To-Live)**: The duration for which cached data remains valid before requiring refresh
- **Materialized_View**: A database object containing pre-computed query results that can be refreshed periodically
- **Composite_Index**: A database index on multiple columns to optimize queries filtering on those columns
- **Partial_Index**: A database index that only includes rows matching a specified condition
- **Full_Text_Search_Index**: A specialized index enabling efficient text search across string columns
- **Cache_Invalidation**: The process of removing or updating stale data from the cache
- **Query_Optimizer**: A utility that builds efficient database queries with proper filtering, pagination, and sorting
- **Dashboard_Stats_Function**: A PostgreSQL function that returns aggregated dashboard metrics in a single call
- **Connection_Pooling**: A technique to reuse database connections for improved performance

## Requirements

### Requirement 1: Database Index Optimization

**User Story:** As a system administrator, I want optimized database indexes, so that common queries execute faster and the system remains responsive under load.

#### Acceptance Criteria

1. WHEN a query filters job_orders by customer_id and status, THE Database SHALL use the composite index idx_job_orders_customer_status to optimize the query
2. WHEN a query filters invoices by customer_id, status, and invoice_date, THE Database SHALL use the composite index idx_invoices_customer_status_date to optimize the query
3. WHEN a query filters quotations by status and created_at, THE Database SHALL use the composite index idx_quotations_status_date to optimize the query
4. WHEN a query filters proforma_job_orders by project_id and status, THE Database SHALL use the composite index idx_pjo_project_status to optimize the query
5. WHEN a query retrieves active customers by name, THE Database SHALL use the partial index idx_active_customers that only includes active records
6. WHEN a query retrieves active employees by full_name, THE Database SHALL use the partial index idx_active_employees that only includes active records

### Requirement 2: Full-Text Search Optimization

**User Story:** As a user, I want fast text search across customers and job orders, so that I can quickly find records by name, code, or number.

#### Acceptance Criteria

1. WHEN a user searches customers by name or code, THE Database SHALL use the GIN index idx_customers_search to perform efficient full-text search
2. WHEN a user searches job_orders by jo_number or notes, THE Database SHALL use the GIN index idx_job_orders_search to perform efficient full-text search
3. WHEN a full-text search is performed, THE System SHALL return results within 500ms for tables with up to 100,000 records

### Requirement 3: Materialized Views for Reporting

**User Story:** As a finance manager, I want pre-computed reporting data, so that dashboard and report queries execute quickly without impacting transactional performance.

#### Acceptance Criteria

1. THE Database SHALL maintain a materialized view mv_monthly_revenue containing monthly revenue, cost, and profit aggregations by customer
2. THE Database SHALL maintain a materialized view mv_customer_summary containing customer statistics including total jobs, completed jobs, total revenue, and outstanding AR
3. WHEN the refresh_materialized_views function is called, THE Database SHALL refresh all materialized views concurrently without blocking read queries
4. THE mv_monthly_revenue view SHALL include data from the last 2 years for trend analysis
5. THE mv_customer_summary view SHALL only include active customers

### Requirement 4: Dashboard Statistics Function

**User Story:** As a dashboard user, I want aggregated statistics loaded in a single query, so that the dashboard renders quickly without multiple round-trips to the database.

#### Acceptance Criteria

1. WHEN the get_dashboard_stats function is called, THE Database SHALL return active_jobs, revenue_mtd, profit_mtd, pending_invoices, and ar_outstanding in a single result
2. THE get_dashboard_stats function SHALL calculate revenue_mtd and profit_mtd from completed jobs in the current month
3. THE get_dashboard_stats function SHALL calculate pending_invoices and ar_outstanding from invoices with status sent, partial, or overdue
4. WHEN the dashboard loads, THE System SHALL call get_dashboard_stats instead of multiple separate queries

### Requirement 5: In-Memory Caching Layer

**User Story:** As a system user, I want frequently accessed data cached in memory, so that repeated requests are served instantly without database queries.

#### Acceptance Criteria

1. THE Cache SHALL store data with a configurable TTL (Time-To-Live) in seconds
2. WHEN cached data is requested and the TTL has not expired, THE Cache SHALL return the cached data without querying the database
3. WHEN cached data is requested and the TTL has expired, THE Cache SHALL fetch fresh data from the database and update the cache
4. WHEN the invalidateCache function is called with a pattern, THE Cache SHALL remove all entries matching that pattern
5. WHEN the invalidateCache function is called without a pattern, THE Cache SHALL clear all cached entries

### Requirement 6: Cached Common Queries

**User Story:** As a system user, I want common lookup data cached, so that dropdown lists and reference data load instantly.

#### Acceptance Criteria

1. THE System SHALL cache the active customer list with a 10-minute TTL
2. THE System SHALL cache the active employee list with a 10-minute TTL
3. THE System SHALL cache dashboard statistics with a 1-minute TTL
4. WHEN a customer is created, updated, or deleted, THE System SHALL invalidate the customer cache
5. WHEN an employee is created, updated, or deleted, THE System SHALL invalidate the employee cache
6. WHEN a job order or invoice status changes, THE System SHALL invalidate the dashboard stats cache

### Requirement 7: Query Optimization Utilities

**User Story:** As a developer, I want a standardized query builder, so that all queries follow optimization best practices consistently.

#### Acceptance Criteria

1. THE Query_Optimizer SHALL support filtering by exact match, array inclusion, and null checks
2. THE Query_Optimizer SHALL support text search across multiple specified fields using ilike
3. THE Query_Optimizer SHALL support pagination with page number and limit parameters
4. THE Query_Optimizer SHALL support sorting by any field in ascending or descending order
5. THE Query_Optimizer SHALL return the total count of matching records for pagination
6. WHEN filters contain empty or null values, THE Query_Optimizer SHALL skip those filters

### Requirement 8: Query Timeout and Connection Management

**User Story:** As a system administrator, I want query timeouts and connection pooling configured, so that long-running queries don't block the system and connections are efficiently reused.

#### Acceptance Criteria

1. THE Database SHALL enforce a 30-second statement timeout for all queries
2. IF a query exceeds the 30-second timeout, THEN THE Database SHALL terminate the query and return a timeout error
3. THE System SHALL use Supabase connection pooling in transaction mode with a pool size of 15
4. WHEN a database connection error occurs, THE System SHALL log the error and attempt to reconnect

### Requirement 9: Performance Monitoring

**User Story:** As a system administrator, I want performance metrics tracked, so that I can identify and address slow queries and cache inefficiencies.

#### Acceptance Criteria

1. THE System SHALL log queries that take longer than 1 second to execute
2. THE System SHALL track cache hit rate as the ratio of cache hits to total cache requests
3. WHEN a slow query is detected, THE System SHALL log the query text, execution time, and timestamp
4. THE System SHALL provide a function to retrieve current cache statistics including size, hit rate, and oldest entry
