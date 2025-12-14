# Design Document: Customer Management CRUD

## Overview

This design implements complete Customer Management functionality for Gama ERP, including listing, searching, creating, editing, and viewing customer details. The implementation uses Next.js Server Components for data fetching, Client Components for interactivity, and Supabase for database operations.

## Architecture

```mermaid
flowchart TD
    subgraph Pages
        A[/customers - List Page] --> B[CustomerTable]
        A --> C[CustomerDialog]
        D[/customers/[id] - Detail Page] --> E[CustomerDetail]
        D --> F[ProjectsList]
    end
    
    subgraph Components
        B --> G[SearchInput]
        B --> H[DataTable]
        C --> I[CustomerForm]
    end
    
    subgraph Actions
        I --> J[createCustomer]
        I --> K[updateCustomer]
    end
    
    subgraph Database
        J --> L[(Supabase customers)]
        K --> L
        A --> L
        D --> L
    end
```

## Components and Interfaces

### 1. Customer List Page (`app/(main)/customers/page.tsx`)

Server Component that fetches and displays customers.

```typescript
// Fetches customers server-side
const customers = await supabase
  .from('customers')
  .select('*')
  .order('name')
```

### 2. Customer Table Component (`components/customers/customer-table.tsx`)

Client Component for interactive table with search.

```typescript
interface CustomerTableProps {
  customers: Customer[]
}
```

### 3. Customer Dialog Component (`components/customers/customer-dialog.tsx`)

Client Component for add/edit customer form.

```typescript
interface CustomerDialogProps {
  customer?: Customer | null  // null for add, Customer for edit
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}
```

### 4. Customer Form Component (`components/customers/customer-form.tsx`)

Form with validation for customer data.

```typescript
interface CustomerFormProps {
  customer?: Customer | null
  onSubmit: (data: CustomerFormData) => Promise<void>
  isLoading: boolean
}

interface CustomerFormData {
  name: string
  email: string
  phone: string
  address: string
}
```

### 5. Customer Detail Page (`app/(main)/customers/[id]/page.tsx`)

Server Component for customer details and projects.

```typescript
interface CustomerDetailPageProps {
  params: { id: string }
}
```

### 6. Server Actions (`app/(main)/customers/actions.ts`)

```typescript
async function createCustomer(data: CustomerFormData): Promise<{ error?: string }>
async function updateCustomer(id: string, data: CustomerFormData): Promise<{ error?: string }>
```

## Data Models

### Customer (from Supabase)
```typescript
interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  created_at: string | null
  updated_at: string | null
}
```

### Form Validation Schema
```typescript
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Customer list displays all fields in order
*For any* list of customers, when displayed in the table, each customer SHALL show name, email, phone, and the list SHALL be ordered alphabetically by name.
**Validates: Requirements 1.1, 1.2**

### Property 2: Search filter returns only matching customers
*For any* search term and list of customers, the filtered results SHALL contain only customers whose name includes the search term (case-insensitive).
**Validates: Requirements 2.1**

### Property 3: Email validation rejects invalid formats
*For any* string that does not match a valid email pattern, the form validation SHALL reject it and display an error message.
**Validates: Requirements 3.4**

### Property 4: Edit form pre-fills all customer data
*For any* customer being edited, the edit dialog SHALL pre-fill all form fields with the customer's existing data.
**Validates: Requirements 4.1**

### Property 5: Customer detail displays all fields
*For any* valid customer ID, the detail page SHALL display all customer fields including name, email, phone, and address.
**Validates: Requirements 5.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Fetch customers fails | Display error alert with retry option |
| Add customer fails | Show error toast, keep dialog open |
| Update customer fails | Show error toast, keep dialog open |
| Customer not found | Display 404 message with back link |
| Invalid form data | Show inline validation errors |
| Network error | Show error toast with generic message |

## Testing Strategy

### Unit Tests
- Customer form renders all fields
- Validation errors display correctly
- Empty state renders when no customers
- Loading state displays during fetch

### Property-Based Tests
Using `fast-check` library:

1. **Customer ordering**: Generate random customer lists, verify alphabetical ordering
2. **Search filtering**: Generate random search terms and customer names, verify filter correctness
3. **Email validation**: Generate invalid email strings, verify rejection
4. **Form pre-fill**: Generate random customer data, verify all fields pre-filled

### Integration Tests
- Full add customer flow with Supabase
- Full edit customer flow with Supabase
- Navigation to customer detail page

## File Structure

```
gama-erp/
├── app/(main)/customers/
│   ├── page.tsx              # Customer list page (Server Component)
│   ├── actions.ts            # Server actions for CRUD
│   └── [id]/
│       └── page.tsx          # Customer detail page
├── components/customers/
│   ├── customer-table.tsx    # Interactive table with search
│   ├── customer-dialog.tsx   # Add/Edit dialog
│   └── customer-form.tsx     # Form with validation
└── __tests__/
    └── customers.test.tsx    # Unit and property tests
```
