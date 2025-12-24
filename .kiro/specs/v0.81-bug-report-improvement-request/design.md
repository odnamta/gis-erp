# Design Document: Bug Report & Improvement Request System

## Overview

This design document outlines the architecture and implementation details for the Bug Report & Improvement Request System (v0.81). The system provides a user-friendly interface for team members to submit bugs, improvement requests, and questions directly from the application, with automatic context capture and a centralized admin dashboard for review and management.

## Architecture

The system follows a client-server architecture using Next.js App Router with Supabase as the backend:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  FeedbackButton    │  FeedbackModal    │  AdminDashboard        │
│  (Floating UI)     │  (Submission)     │  (Management)          │
└────────┬───────────┴────────┬──────────┴──────────┬─────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Utility Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  feedback-utils.ts  │  feedback-actions.ts  │  context-capture  │
└────────┬────────────┴────────┬──────────────┴────────┬──────────┘
         │                     │                       │
         ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  feedback_submissions  │  feedback_comments  │  Storage Bucket  │
│  feedback_status_history                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. FeedbackButton Component

Location: `components/feedback/feedback-button.tsx`

A floating action button that appears on all authenticated pages.

```typescript
interface FeedbackButtonProps {
  // No props - uses context for user data
}

// Internal state
interface FeedbackButtonState {
  isOpen: boolean;
  openTicketCount: number;
}
```

### 2. FeedbackModal Component

Location: `components/feedback/feedback-modal.tsx`

The main dialog for submitting feedback with tabbed interface.

```typescript
interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'bug' | 'improvement' | 'question';
}

interface FeedbackFormData {
  feedbackType: 'bug' | 'improvement' | 'question' | 'other';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  prioritySuggested?: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  currentBehavior?: string;
  desiredBehavior?: string;
  businessJustification?: string;
  affectedModule?: string;
  screenshots: ScreenshotData[];
}

interface ScreenshotData {
  dataUrl: string;
  filename?: string;
}
```

### 3. ScreenshotCapture Component

Location: `components/feedback/screenshot-capture.tsx`

Handles screenshot capture and upload functionality.

```typescript
interface ScreenshotCaptureProps {
  screenshots: ScreenshotData[];
  onScreenshotsChange: (screenshots: ScreenshotData[]) => void;
  onCaptureStart: () => void;
  onCaptureEnd: () => void;
}
```

### 4. FeedbackDashboard Component

Location: `components/feedback/feedback-dashboard.tsx`

Admin interface for managing all feedback submissions.

```typescript
interface FeedbackDashboardProps {
  // No props - fetches data internally
}

interface FeedbackFilters {
  type?: 'bug' | 'improvement' | 'question' | 'other';
  status?: FeedbackStatus;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  module?: string;
  search?: string;
}
```

### 5. FeedbackDetail Component

Location: `components/feedback/feedback-detail.tsx`

Detailed view of a single feedback submission.

```typescript
interface FeedbackDetailProps {
  feedbackId: string;
  onStatusChange?: () => void;
}
```

### 6. FeedbackComments Component

Location: `components/feedback/feedback-comments.tsx`

Comment thread for a feedback submission.

```typescript
interface FeedbackCommentsProps {
  feedbackId: string;
  isAdmin: boolean;
}

interface CommentFormData {
  commentText: string;
  isInternal: boolean;
}
```

## Data Models

### Database Schema

```sql
-- Feedback submissions table
CREATE TABLE feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('bug', 'improvement', 'question', 'other')),
  
  -- Submitter info
  submitted_by UUID REFERENCES user_profiles(id),
  submitted_by_name VARCHAR(200),
  submitted_by_email VARCHAR(200),
  submitted_by_role VARCHAR(50),
  submitted_by_department VARCHAR(100),
  
  -- Bug-specific fields
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  
  -- Improvement-specific fields
  current_behavior TEXT,
  desired_behavior TEXT,
  business_justification TEXT,
  
  -- Auto-captured context
  page_url VARCHAR(500),
  page_title VARCHAR(200),
  module VARCHAR(50),
  browser_info JSONB,
  screen_resolution VARCHAR(20),
  
  -- Screenshots
  screenshots JSONB DEFAULT '[]',
  
  -- Additional context
  error_message TEXT,
  console_logs TEXT,
  
  -- Categorization
  affected_module VARCHAR(50),
  priority_suggested VARCHAR(20) CHECK (priority_suggested IN ('urgent', 'high', 'medium', 'low')),
  tags TEXT[],
  
  -- Status & tracking
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'confirmed', 'in_progress', 'resolved', 'closed', 'wont_fix', 'duplicate')),
  
  -- Assignment
  assigned_to UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_in_version VARCHAR(20),
  
  -- Related
  duplicate_of UUID REFERENCES feedback_submissions(id),
  related_tickets UUID[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
  comment_by UUID REFERENCES user_profiles(id),
  comment_by_name VARCHAR(200),
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status history table
CREATE TABLE feedback_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by UUID REFERENCES user_profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

### TypeScript Types

```typescript
// types/feedback.ts

export type FeedbackType = 'bug' | 'improvement' | 'question' | 'other';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type FeedbackStatus = 'new' | 'reviewing' | 'confirmed' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix' | 'duplicate';

export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
}

export interface Screenshot {
  url: string;
  filename: string;
  uploaded_at: string;
}

export interface FeedbackSubmission {
  id: string;
  ticket_number: string;
  feedback_type: FeedbackType;
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  submitted_by_role: string | null;
  submitted_by_department: string | null;
  severity: Severity | null;
  title: string;
  description: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  current_behavior: string | null;
  desired_behavior: string | null;
  business_justification: string | null;
  page_url: string | null;
  page_title: string | null;
  module: string | null;
  browser_info: BrowserInfo | null;
  screen_resolution: string | null;
  screenshots: Screenshot[];
  affected_module: string | null;
  priority_suggested: Priority | null;
  tags: string[] | null;
  status: FeedbackStatus;
  assigned_to: string | null;
  assigned_at: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_in_version: string | null;
  duplicate_of: string | null;
  related_tickets: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  comment_by: string | null;
  comment_by_name: string | null;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
}

export interface FeedbackStatusHistory {
  id: string;
  feedback_id: string;
  old_status: FeedbackStatus | null;
  new_status: FeedbackStatus;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export interface FeedbackSummary {
  newCount: number;
  criticalCount: number;
  openBugsCount: number;
  openRequestsCount: number;
  resolvedThisWeekCount: number;
}
```

## Utility Functions

### feedback-utils.ts

```typescript
// lib/feedback-utils.ts

/**
 * Captures browser context information
 */
export function captureBrowserContext(): BrowserInfo {
  const ua = navigator.userAgent;
  const browserMatch = ua.match(/(chrome|firefox|safari|edge|opera)\/?\s*(\d+)/i);
  
  return {
    name: browserMatch?.[1] || 'Unknown',
    version: browserMatch?.[2] || 'Unknown',
    platform: navigator.platform,
    userAgent: ua,
    screenResolution: `${window.innerWidth}x${window.innerHeight}`,
  };
}

/**
 * Detects the current module from URL path
 */
export function detectModuleFromUrl(pathname: string): string {
  const moduleMap: Record<string, string> = {
    '/operations': 'Operations',
    '/finance': 'Finance',
    '/hr': 'HR',
    '/hse': 'HSE',
    '/equipment': 'Equipment',
    '/customs': 'Customs',
    '/engineering': 'Engineering',
    '/procurement': 'Procurement',
    '/agency': 'Agency',
    '/admin': 'Admin',
    '/dashboard': 'Dashboard',
    '/customers': 'Customers',
    '/projects': 'Projects',
    '/quotations': 'Quotations',
    '/pjo': 'PJO',
    '/job-orders': 'Job Orders',
    '/invoices': 'Invoices',
  };

  for (const [path, module] of Object.entries(moduleMap)) {
    if (pathname.startsWith(path)) {
      return module;
    }
  }
  return 'General';
}

/**
 * Generates ticket number prefix based on feedback type
 */
export function getTicketPrefix(feedbackType: FeedbackType): string {
  return feedbackType === 'bug' ? 'BUG' : 'REQ';
}

/**
 * Formats ticket number for display
 */
export function formatTicketNumber(ticketNumber: string): string {
  return ticketNumber;
}

/**
 * Gets severity color for UI display
 */
export function getSeverityColor(severity: Severity | null): string {
  const colors: Record<Severity, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };
  return severity ? colors[severity] : 'bg-gray-500';
}

/**
 * Gets status badge variant
 */
export function getStatusVariant(status: FeedbackStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<FeedbackStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    new: 'default',
    reviewing: 'secondary',
    confirmed: 'secondary',
    in_progress: 'default',
    resolved: 'outline',
    closed: 'outline',
    wont_fix: 'destructive',
    duplicate: 'outline',
  };
  return variants[status];
}

/**
 * Validates feedback form data
 */
export function validateFeedbackForm(data: Partial<FeedbackFormData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.title?.trim()) {
    errors.push('Title is required');
  } else if (data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }
  
  if (!data.description?.trim()) {
    errors.push('Description is required');
  }
  
  if (data.feedbackType === 'bug' && !data.severity) {
    errors.push('Severity is required for bug reports');
  }
  
  if (data.feedbackType === 'improvement' && !data.desiredBehavior?.trim()) {
    errors.push('Desired behavior is required for improvement requests');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Gets available modules for dropdown
 */
export function getModuleOptions(): { value: string; label: string }[] {
  return [
    { value: 'Dashboard', label: 'Dashboard' },
    { value: 'Customers', label: 'Customers' },
    { value: 'Projects', label: 'Projects' },
    { value: 'Quotations', label: 'Quotations' },
    { value: 'PJO', label: 'Proforma Job Orders' },
    { value: 'Job Orders', label: 'Job Orders' },
    { value: 'Invoices', label: 'Invoices' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Finance', label: 'Finance' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'HSE', label: 'Health, Safety & Environment' },
    { value: 'Equipment', label: 'Equipment' },
    { value: 'Customs', label: 'Customs' },
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Admin', label: 'Administration' },
    { value: 'General', label: 'General / Other' },
  ];
}
```

### feedback-actions.ts (Server Actions)

```typescript
// lib/feedback-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Submit new feedback
 */
export async function submitFeedback(formData: FeedbackFormData, screenshots: string[]): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
  // Implementation
}

/**
 * Get user's own submissions
 */
export async function getMySubmissions(): Promise<FeedbackSubmission[]> {
  // Implementation
}

/**
 * Get user's open ticket count
 */
export async function getMyOpenTicketCount(): Promise<number> {
  // Implementation
}

/**
 * Get all feedback (admin)
 */
export async function getAllFeedback(filters?: FeedbackFilters): Promise<FeedbackSubmission[]> {
  // Implementation
}

/**
 * Get feedback summary stats (admin)
 */
export async function getFeedbackSummary(): Promise<FeedbackSummary> {
  // Implementation
}

/**
 * Update feedback status
 */
export async function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus, notes?: string): Promise<{ success: boolean; error?: string }> {
  // Implementation
}

/**
 * Assign feedback to user
 */
export async function assignFeedback(feedbackId: string, assigneeId: string): Promise<{ success: boolean; error?: string }> {
  // Implementation
}

/**
 * Add comment to feedback
 */
export async function addFeedbackComment(feedbackId: string, commentText: string, isInternal: boolean): Promise<{ success: boolean; error?: string }> {
  // Implementation
}

/**
 * Get feedback comments
 */
export async function getFeedbackComments(feedbackId: string, includeInternal: boolean): Promise<FeedbackComment[]> {
  // Implementation
}

/**
 * Upload screenshot to storage
 */
export async function uploadScreenshot(dataUrl: string, ticketNumber: string): Promise<{ url: string; error?: string }> {
  // Implementation
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Ticket Number Format Consistency

*For any* feedback submission, the generated ticket number SHALL match the pattern `BUG-XXXXX` (5-digit zero-padded) when feedback_type is 'bug', and `REQ-XXXXX` for all other feedback types (improvement, question, other).

**Validates: Requirements 2.7, 3.8, 6.2, 6.3, 6.4**

### Property 2: Form Validation - Title Required and Length Limited

*For any* feedback form submission attempt, if the title is empty, contains only whitespace, or exceeds 200 characters, the validation SHALL fail and return an appropriate error message.

**Validates: Requirements 2.3, 2.8**

### Property 3: Form Validation - Bug Severity Required

*For any* bug report submission attempt, if the severity field is not set to one of the valid values (critical, high, medium, low), the validation SHALL fail.

**Validates: Requirements 2.2**

### Property 4: Form Validation - Improvement Desired Behavior Required

*For any* improvement request submission attempt, if the desired_behavior field is empty or contains only whitespace, the validation SHALL fail.

**Validates: Requirements 3.5**

### Property 5: Module Detection from URL Path

*For any* valid URL pathname, the detectModuleFromUrl function SHALL return the correct module name based on the path prefix mapping, or 'General' if no mapping matches.

**Validates: Requirements 5.3**

### Property 6: Browser Context Capture Completeness

*For any* browser context capture operation, the returned BrowserInfo object SHALL contain non-empty values for name, version, platform, userAgent, and screenResolution fields.

**Validates: Requirements 5.1, 5.2, 5.4, 5.5**

### Property 7: Screenshot Array Integrity

*For any* array of screenshots, adding a screenshot SHALL increase the array length by 1, removing a screenshot SHALL decrease the array length by 1, and the array SHALL support multiple items.

**Validates: Requirements 4.5, 4.6, 4.8**

### Property 8: Feedback Filtering Correctness

*For any* set of feedback submissions and filter criteria (type, status, severity, module), the filtered result SHALL contain only submissions that match ALL specified filter criteria.

**Validates: Requirements 7.3**

### Property 9: Feedback Search Correctness

*For any* search query string and set of feedback submissions, the search result SHALL contain only submissions where the title OR description contains the search string (case-insensitive).

**Validates: Requirements 7.4**

### Property 10: Feedback Sorting Order

*For any* set of feedback submissions, the sorted result SHALL order submissions by severity (critical > high > medium > low > null) first, then by created_at descending within each severity group.

**Validates: Requirements 7.5**

### Property 11: Summary Statistics Calculation

*For any* set of feedback submissions, the summary statistics SHALL correctly calculate: newCount (status='new'), criticalCount (severity='critical' AND status NOT IN resolved/closed), openBugsCount (type='bug' AND status NOT IN resolved/closed/wont_fix), openRequestsCount (type='improvement' AND status NOT IN resolved/closed/wont_fix), and resolvedThisWeekCount (resolved_at within last 7 days).

**Validates: Requirements 7.1**

### Property 12: Pagination Correctness

*For any* page number, page size, and total items count, the pagination SHALL return the correct slice of items and accurate pagination metadata (hasNext, hasPrevious, totalPages).

**Validates: Requirements 7.7**

### Property 13: Status Enum Validation

*For any* status value, it SHALL be one of the valid FeedbackStatus values: 'new', 'reviewing', 'confirmed', 'in_progress', 'resolved', 'closed', 'wont_fix', 'duplicate'.

**Validates: Requirements 8.2**

### Property 14: Resolution Metadata Setting

*For any* status change to 'resolved', the submission SHALL have resolved_at timestamp set and resolved_by user ID set. For status change to 'duplicate', the duplicate_of field SHALL reference a valid existing ticket.

**Validates: Requirements 8.4, 8.6**

### Property 15: Comment Visibility and Permissions

*For any* comment retrieval operation, if the requesting user is not an admin, internal comments (is_internal=true) SHALL be excluded from the result. Users SHALL only be able to add comments to their own submissions unless they are admins.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 16: Comment Ordering and Counting

*For any* list of comments for a feedback submission, comments SHALL be ordered by created_at ascending (chronological), and the comment count SHALL equal the length of the visible comments array.

**Validates: Requirements 9.4, 9.5**

### Property 17: Open Ticket Badge Count

*For any* user, the open ticket count displayed on the badge SHALL equal the count of their submissions where status is NOT IN ('resolved', 'closed', 'wont_fix').

**Validates: Requirements 1.4**

## Error Handling

### Client-Side Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Form validation failure | Display inline error messages next to invalid fields, prevent submission |
| Screenshot capture failure | Show toast notification, allow user to continue without screenshot |
| File upload failure | Show toast notification with retry option |
| Network timeout | Show toast notification, preserve form data for retry |

### Server-Side Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Database insert failure | Return error response, log error, show user-friendly message |
| Storage upload failure | Return partial success, log error, allow submission without screenshot |
| Authentication failure | Redirect to login, preserve form data in session storage |
| RLS policy violation | Return 403 error, log attempt |

### Error Response Format

```typescript
interface FeedbackActionResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    field?: string; // For validation errors
  };
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Form Validation Tests**
   - Empty title rejection
   - Title over 200 characters rejection
   - Missing severity for bug reports
   - Missing desired behavior for improvements
   - Valid form acceptance

2. **Utility Function Tests**
   - Module detection for known paths
   - Module detection for unknown paths (returns 'General')
   - Severity color mapping
   - Status variant mapping
   - Ticket number formatting

3. **Component Rendering Tests**
   - FeedbackButton renders with correct position classes
   - FeedbackModal renders correct tab content
   - Badge visibility based on count

### Property-Based Tests

Property-based tests will use **fast-check** library to verify universal properties across many generated inputs.

Configuration:
- Minimum 100 iterations per property test
- Each test tagged with: **Feature: bug-report-improvement-request, Property {number}: {property_text}**

Property tests to implement:

1. **Property 1**: Ticket number format - Generate random feedback types, verify format matches expected pattern
2. **Property 2**: Title validation - Generate strings of various lengths including edge cases
3. **Property 3**: Bug severity validation - Generate bug submissions with/without severity
4. **Property 4**: Improvement validation - Generate improvement requests with/without desired behavior
5. **Property 5**: Module detection - Generate URL paths, verify correct module mapping
6. **Property 6**: Browser context - Mock navigator/window, verify all fields populated
7. **Property 7**: Screenshot array - Generate add/remove operations, verify array integrity
8. **Property 8**: Filtering - Generate submissions and filters, verify correct filtering
9. **Property 9**: Search - Generate submissions and search terms, verify correct matching
10. **Property 10**: Sorting - Generate submissions with various severities/dates, verify order
11. **Property 11**: Summary stats - Generate submissions, verify calculations
12. **Property 12**: Pagination - Generate various page/size combinations, verify slicing
13. **Property 13**: Status validation - Generate status values, verify enum membership
14. **Property 14**: Resolution metadata - Generate status changes, verify metadata
15. **Property 15**: Comment visibility - Generate comments with roles, verify filtering
16. **Property 16**: Comment ordering - Generate comments, verify chronological order
17. **Property 17**: Badge count - Generate user submissions, verify open count

### Integration Tests

Integration tests will verify end-to-end flows:

1. Submit bug report flow
2. Submit improvement request flow
3. Admin status update flow
4. Comment thread flow
5. Screenshot upload flow

### Test File Structure

```
__tests__/
  feedback-utils.test.ts           # Unit tests for utility functions
  feedback-utils.property.test.ts  # Property tests for utilities
  feedback-validation.test.ts      # Form validation tests
  feedback-actions.test.ts         # Server action tests
  feedback-components.test.tsx     # Component rendering tests
```
