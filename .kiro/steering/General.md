---
inclusion: always
---
# GAMA ERP - Code Conventions & Patterns

> **Purpose**: Code conventions and patterns for AI agents assisting with Gama ERP development.
> **See also**: `Project Context.md` for project overview, roles, and current state.

---

## 1. File Structure
```
app/(main)/              # Main application routes
components/              # Reusable React components
components/ui/           # shadcn/ui components
lib/                     # Utility functions and Supabase client
lib/supabase/            # Supabase client (server.ts, client.ts)
types/                   # TypeScript type definitions
```

## 2. Naming Conventions
- **Components**: PascalCase (`CustomerForm.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: PascalCase (`Customer`, `JobOrder`)
- **DB columns**: snake_case (`created_at`, `customer_id`)
- **Server Actions**: Place in same folder as page or `/app/actions`

## 3. Supabase Patterns
```typescript
// Server-side query (in Server Components or Server Actions)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data, error } = await supabase.from('customers').select('*')

// Client-side query (in Client Components)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server Action pattern
'use server'
export async function createCustomer(data: FormData) {
  const supabase = await createClient()
  // ... mutation logic
  revalidatePath('/customers')
}
```

## 4. Auto-generated Numbers
```
QUO: QUO-YYYY-NNNN (e.g., QUO-2025-0001)
PJO: NNNN/CARGO/MM/YYYY (e.g., 0001/CARGO/XII/2025)
JO:  JO-NNNN/CARGO/MM/YYYY (e.g., JO-0001/CARGO/XII/2025)
INV: INV-YYYY-NNNN
BKK: BKK-YYYYMM-XXXX
```

## 5. Status Workflows
```
Quotation: draft → engineering_review → ready → submitted → won/lost/cancelled
PJO:       draft → pending_approval → approved → rejected
JO:        active → completed → submitted_to_finance → invoiced → closed
Invoice:   draft → sent → paid → overdue → cancelled
```

## 6. Cost Categories
`trucking`, `port_charges`, `documentation`, `handling`, `customs`, `insurance`, `storage`, `labor`, `fuel`, `tolls`, `other`

## 7. UI/UX Standards
1. Use shadcn/ui components consistently
2. Loading states for all async operations
3. User-friendly error messages (toast notifications)
4. Mobile-responsive design
5. Date format: DD/MM/YYYY (use `formatDate()` from `lib/pjo-utils.ts`)
6. Currency format: IDR with thousands separator

## 8. Security Rules
1. All tables MUST have RLS policies
2. Users can only access data from their assigned entity_type
3. API keys never exposed in client-side code
4. All auth flows through Supabase Auth
5. Use `getUserProfile()` from `lib/permissions-server.ts` for role checks

## 9. Common Fixes
```typescript
// Fix "type instantiation too deep" on Supabase queries
// BEFORE (causes error):
const { data } = await supabase.from('table').select('*').like('col', '%x%')

// AFTER (fixed):
const result = await supabase.from('table').select('*').like('col', '%x%')
const data = result.data as TableType[] | null
```

## 10. Code Generation Rules

### ✅ Do
- Check existing components before creating new ones
- Use existing Supabase client from `/lib/supabase`
- Follow TypeScript strict mode (no `any` types)
- Use Server Actions for mutations
- Add RLS policies immediately after creating tables
- Run `npm run build` before committing

### ❌ Don't
- Create duplicate components
- Expose environment variables in client code
- Skip loading/error states
- Use inline styles (use Tailwind)
- Query database in middleware (use cached JWT)
- Show revenue/profit to operations roles
- Hard delete records (use soft delete)

---
*Last Updated: January 2026*
