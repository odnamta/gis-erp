# Design Document: Project CRUD

## Overview

This feature implements full CRUD operations for Projects in Gama ERP. Projects are linked to customers and serve as containers for PJOs and JOs. The implementation follows the existing patterns established in the Customer CRUD feature, using Server Actions, shadcn/ui components, and property-based testing.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Pages                                 │
├─────────────────────────────────────────────────────────────┤
│  /projects              │  /projects/[id]                   │
│  - ProjectsClient       │  - Project detail view            │
│  - ProjectTable         │  - PJOs list                      │
│  - ProjectDialog        │  - JOs list                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Actions                            │
│  app/(main)/projects/actions.ts                             │
│  - createProject()                                          │
│  - updateProject()                                          │
│  - deleteProject() (soft-delete)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│  projects table (with is_active for soft-delete)            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### ProjectTable Component
```typescript
interface ProjectTableProps {
  projects: ProjectWithCustomer[]
  customers: Customer[]
  onEdit: (project: ProjectWithCustomer) => void
  onDelete: (project: ProjectWithCustomer) => void
}

type ProjectWithCustomer = Project & {
  customers: { name: string } | null
}
```

### ProjectForm Component
```typescript
interface ProjectFormProps {
  customers: Customer[]
  initialData?: Project
  onSubmit: (data: ProjectFormData) => Promise<void>
  isLoading: boolean
  mode: 'create' | 'edit'
}

interface ProjectFormData {
  customer_id: string
  name: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  site_address?: string
}
```

### ProjectDialog Component
```typescript
interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  project?: ProjectWithCustomer
  preselectedCustomerId?: string
}
```

### StatusBadge Component
```typescript
interface StatusBadgeProps {
  status: 'draft' | 'active' | 'completed' | 'cancelled'
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}
```

### Filter Functions
```typescript
function filterProjectsByStatus(
  projects: ProjectWithCustomer[], 
  status: string | null
): ProjectWithCustomer[]

function filterProjectsByCustomer(
  projects: ProjectWithCustomer[], 
  customerId: string | null
): ProjectWithCustomer[]

function filterProjects(
  projects: ProjectWithCustomer[],
  statusFilter: string | null,
  customerFilter: string | null
): ProjectWithCustomer[]
```

## Data Models

### Project (from types/database.ts)
```typescript
interface Project {
  id: string
  customer_id: string
  name: string
  status: string
  description: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}
```

### ProjectWithCustomer (joined query result)
```typescript
type ProjectWithCustomer = Project & {
  customers: { name: string } | null
}
```

### Validation Schema (Zod)
```typescript
const projectSchema = z.object({
  customer_id: z.string().uuid('Please select a customer'),
  name: z.string().min(1, 'Project name is required'),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  site_address: z.string().optional(),
})
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Status filter returns only matching projects
*For any* list of projects and any status value, filtering by that status returns only projects where project.status equals the filter value.
**Validates: Requirements 2.1**

### Property 2: Customer filter returns only matching projects
*For any* list of projects and any customer ID, filtering by that customer returns only projects where project.customer_id equals the filter value.
**Validates: Requirements 2.2**

### Property 3: Combined filters are conjunctive
*For any* list of projects, status filter, and customer filter, the combined filter result equals the intersection of individual filter results.
**Validates: Requirements 2.3**

### Property 4: Project name validation rejects empty/whitespace
*For any* string composed entirely of whitespace characters, the project form validation rejects it as an invalid name.
**Validates: Requirements 3.3**

### Property 5: Edit form pre-fills all project data
*For any* valid project, when opened in edit mode, all form fields contain the project's current values.
**Validates: Requirements 4.1**

### Property 6: Project detail displays all fields
*For any* valid project, the detail view renders all project fields (name, status, site_address, customer name, dates).
**Validates: Requirements 5.2**

### Property 7: Status badge color mapping is correct
*For any* valid status value, the getStatusColor function returns the correct color class (draft→gray, active→green, completed→blue, cancelled→red).
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Project not found | Return 404 page with "Project not found" message |
| Customer not selected | Form validation error: "Please select a customer" |
| Empty project name | Form validation error: "Project name is required" |
| Database error on create | Return error message, show toast |
| Database error on update | Return error message, show toast |
| Delete with active PJOs/JOs | Prevent deletion, show warning message |

## Testing Strategy

### Property-Based Testing
- Use `fast-check` library (already installed)
- Minimum 100 iterations per property test
- Tag each test with: `**Feature: project-crud, Property {number}: {property_text}**`

### Unit Tests
- Test filter functions with specific examples
- Test status badge color mapping
- Test form validation edge cases

### Test File Structure
```
__tests__/
  projects.test.tsx
    - Filter Property Tests
    - Form Validation Property Tests
    - Status Badge Property Tests
    - Project Detail Display Tests
```

