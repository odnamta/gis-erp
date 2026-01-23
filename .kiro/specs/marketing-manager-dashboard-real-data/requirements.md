# Requirements Document

## Introduction

This feature converts the Marketing Manager dashboard from mock/placeholder data to real Supabase database queries. The Marketing Manager (Hutami) needs a functional dashboard showing real-time sales pipeline metrics, customer data, and engineering department status. The implementation follows the established pattern from the Finance Manager dashboard conversion.

## Glossary

- **Dashboard**: The Marketing Manager's main view displaying key performance indicators and metrics
- **Marketing_Manager_Data_Service**: Server-side service that fetches and caches dashboard metrics from Supabase
- **Cache_Service**: The dashboard caching utility providing 5-minute TTL caching for performance
- **Quotation**: A sales proposal sent to customers with pricing and scope details
- **Pipeline**: The collection of active quotations at various stages (draft, submitted, won, lost)
- **Win_Rate**: Percentage of closed quotations that resulted in won status
- **MTD**: Month-to-date, referring to data from the start of the current month
- **Customer**: A company or entity that receives quotations and job orders

## Requirements

### Requirement 1: Sales Pipeline Metrics

**User Story:** As a Marketing Manager, I want to see real-time sales pipeline metrics, so that I can track quotation performance and sales progress.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL query the quotations table and return the count of quotations created this month
2. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL calculate the total quoted value (sum of total_revenue) for quotations created this month
3. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the count of quotations with status 'won' this month
4. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the count of quotations with status 'lost' this month
5. WHEN calculating win rate, THE Marketing_Manager_Data_Service SHALL compute (won quotations / total closed quotations) * 100 where closed means status is 'won' or 'lost'
6. IF no closed quotations exist this month, THEN THE Marketing_Manager_Data_Service SHALL return 0 for win rate

### Requirement 2: Customer Metrics

**User Story:** As a Marketing Manager, I want to see customer statistics, so that I can understand customer acquisition and portfolio composition.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the total count of active customers
2. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the count of customers created this month (new customers)
3. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return a breakdown of customers by customer_type field

### Requirement 3: Revenue Metrics (Permission-Gated)

**User Story:** As a Marketing Manager, I want to see revenue metrics from won deals, so that I can track sales performance against targets.

#### Acceptance Criteria

1. THE Marketing_Manager_Data_Service SHALL only include revenue metrics if the marketing_manager role has can_see_revenue permission set to true
2. WHEN revenue is visible, THE Marketing_Manager_Data_Service SHALL calculate revenue MTD from quotations with status 'won' and outcome_date in current month
3. WHEN revenue is visible, THE Marketing_Manager_Data_Service SHALL calculate average deal size as (total won revenue / count of won quotations)
4. IF no won quotations exist, THEN THE Marketing_Manager_Data_Service SHALL return 0 for average deal size

### Requirement 4: Pipeline Status Breakdown

**User Story:** As a Marketing Manager, I want to see quotations grouped by status, so that I can understand the pipeline distribution.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return counts of quotations grouped by status (draft, engineering_review, ready, submitted, won, lost)
2. THE Dashboard SHALL display the pipeline breakdown in a visual format suitable for quick comprehension

### Requirement 5: Engineering Department Metrics

**User Story:** As a Marketing Manager, I want to see engineering department status, so that I can track quotations pending engineering review.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the count of quotations with status 'engineering_review'
2. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the count of active route surveys from the engineering module
3. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the count of active Journey Management Plans (JMPs)

### Requirement 6: Recent Activity Lists

**User Story:** As a Marketing Manager, I want to see recent quotations and customers, so that I can quickly access the latest activity.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the 5 most recently created quotations with id, quotation_number, title, customer name, status, and created_at
2. WHEN the dashboard loads, THE Marketing_Manager_Data_Service SHALL return the 5 most recently created customers with id, name, customer_type, and created_at

### Requirement 7: Data Caching

**User Story:** As a Marketing Manager, I want the dashboard to load quickly, so that I can access information without delays.

#### Acceptance Criteria

1. THE Marketing_Manager_Data_Service SHALL use the Cache_Service with a 5-minute TTL for all metrics
2. WHEN cached data exists and is not expired, THE Marketing_Manager_Data_Service SHALL return cached data without querying the database
3. WHEN cached data is expired or missing, THE Marketing_Manager_Data_Service SHALL fetch fresh data and update the cache
4. THE Dashboard SHALL load within 2 seconds under normal conditions

### Requirement 8: Dashboard Integration

**User Story:** As a Marketing Manager, I want the dashboard page to display real data, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN the dashboard page renders, THE Dashboard SHALL call the Marketing_Manager_Data_Service to fetch metrics
2. THE Dashboard SHALL replace all mock/placeholder values with real data from the service
3. THE Dashboard SHALL display currency values in IDR format with thousands separators
4. THE Dashboard SHALL maintain the existing visual design and layout while updating data sources
