---
inclusion: always
---
# GAMA ERP - Agent Steering Document

> **Purpose**: This document provides context for AI agents (Kiro, Claude, Cursor) assisting with Gama ERP development.

---

## 1. Project Overview

**Gama ERP** is a logistics management system for PT Gama Indonesia. It manages the workflow from client RFQ to invoice payment collection.

### Core Business Workflow
```
Marketing → Administration (PJO) → Operations → Administration (JO/Invoice)
```

| Stage | Activities |
|-------|-----------|
| **Marketing** | RFQ Received → Send Offer → Negotiation → Award/Not Awarded |
| **Engineering** | Create JMP (Journey Management Plan), Equipment Lists, Technical Docs |
| **Admin (PJO)** | Receive Award → Data Cleaning → Create PJO → Set Cost Targets |
| **Operations** | Receive Budget → Adjust Plan → Coordinate Vendors → Execute → Submit Expenses |
| **Admin (JO)** | Collect Expenses → Create JO → Generate Invoice → Track Payment |

---

## 2. Technology Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Frontend | Next.js (App Router) | v14.2.x |
| UI | React | v18.x |
| Language | TypeScript | Strict mode |
| Styling | TailwindCSS + shadcn/ui (new-york) | Components in /components/ui |
| Backend | Supabase | PostgreSQL + Auth + Storage |
| Auth | Supabase Auth | @supabase/ssr for SSR support |
| Icons | Lucide React | |
| Date Utils | date-fns, react-day-picker | |

### Key Libraries
- `class-variance-authority` + `clsx` + `tailwind-merge` for className utilities
- `cmdk` for command palette/combobox

### Supabase Configuration
- **MCP Integration**: Available via Kiro
- **RLS**: Enabled on all tables

### Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

### Adding Shadcn Components
```bash
npx shadcn@latest add <component-name>
```

---

## 3. Database Schema

### Current Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `customers` | Client companies | id, name, email, phone, address |
| `projects` | Projects/opportunities | id, customer_id, name, status |
| `proforma_job_orders` | PJOs with approval workflow | id, pjo_number, status, converted_to_jo |
| `pjo_revenue_items` | Itemized revenue per PJO | id, pjo_id, description, quantity, unit, unit_price, subtotal |
| `pjo_cost_items` | Itemized costs with budget tracking | id, pjo_id, category, estimated_amount, actual_amount, status |
| `job_orders` | Active JOs linked to PJOs | id, jo_number, pjo_id, final_revenue, final_cost, status |
| `invoices` | Invoices with payment tracking | id, invoice_number, jo_id, status |

### Key Relationships
```
customers → projects (1:many)
projects → proforma_job_orders (1:many)
proforma_job_orders → pjo_revenue_items (1:many)
proforma_job_orders → pjo_cost_items (1:many)
proforma_job_orders → job_orders (1:1)
job_orders → invoices (1:many)
```

### Cost Categories
`trucking`, `port_charges`, `documentation`, `handling`, `customs`, `insurance`, `storage`, `labor`, `fuel`, `tolls`, `other`

---

## 4. User Roles & Permissions

| Role | Department | Can Do | Dashboard Shows |
|------|-----------|--------|-----------------|
| `sales` | Marketing | Create/Edit RFQs, Manage Customers | My Opportunities, Win Rate |
| `engineer` | Engineering | Create JMP, Equipment Lists | Projects Needing Docs |
| `admin` | Administration | Create PJO/JO, Invoices | PJOs Pending, Unpaid Invoices |
| `ops` | Operations | View Budget, Submit Expenses | My Jobs, Budget vs Actual |
| `manager` | All | Approve PJOs, View All, Reports | Full Dashboard, P&L |
| `super_admin` | System | Manage Users, System Settings | System Health, User Activity |

---

## 5. Code Conventions

### File Structure
```
/app          → Next.js App Router pages and layouts
/components   → Reusable React components
/components/ui → shadcn/ui components
/lib          → Utility functions and Supabase client
/types        → TypeScript type definitions
```

### Naming Conventions
- **Components**: PascalCase (`CustomerForm.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: PascalCase (`Customer`, `JobOrder`)
- **DB columns**: snake_case (`created_at`, `customer_id`)

### Supabase Patterns
```typescript
// Client-side query
const { data, error } = await supabase.from('customers').select('*')

// Server Action (use 'use server' directive)
// Place in /app/actions folder
```

---

## 6. Current Tasks

### Phase 1 - Foundation ✅

| Task | Description | Status | Priority |
|------|-------------|--------|----------|
| 1.1 | Database Schema Setup | ✅ COMPLETE | P0 |
| 1.2 | Google OAuth Integration | ✅ COMPLETE | P0 |
| 1.3 | Customer CRUD Operations | ✅ COMPLETE | P1 |
| 1.4 | Role-Based Dashboard Views | ⬜ TODO | P1 |

### Phase 2 - PJO Itemized Financials (v0.4.1) ✅

| Task | Description | Status | Priority |
|------|-------------|--------|----------|
| 2.1 | Revenue/Cost line items tables | ✅ COMPLETE | P0 |
| 2.2 | Revenue items CRUD | ✅ COMPLETE | P0 |
| 2.3 | Cost items estimation | ✅ COMPLETE | P0 |
| 2.4 | Cost confirmation (Operations) | ✅ COMPLETE | P0 |
| 2.5 | Budget summary & health indicators | ✅ COMPLETE | P0 |
| 2.6 | PJO → JO conversion | ✅ COMPLETE | P1 |
| 2.7 | Job Orders module | ✅ COMPLETE | P1 |

---

## 7. Critical Constraints

### ⚠️ Security (MUST FOLLOW)
1. All tables MUST have RLS policies
2. Users can only access data from their assigned company
3. API keys never exposed in client-side code
4. All auth flows through Supabase Auth

### Data Integrity
1. PJO/JO/Invoice numbers auto-generated and unique
2. Status transitions follow defined workflows
3. Soft-delete with `is_active = false`
4. Monetary values as `DECIMAL(15,2)`

### UI/UX Standards
1. Use shadcn/ui components consistently
2. Loading states for all async operations
3. User-friendly error messages
4. Mobile-responsive design
5. Date format: DD/MM/YYYY (use `formatDate()` from `lib/pjo-utils.ts`)

---

## 8. Common Patterns

### Auto-generated Numbers
```
PJO: NNNN/CARGO/MM/YYYY (e.g., 0001/CARGO/XII/2025)
JO:  JO-NNNN/CARGO/MM/YYYY (e.g., JO-0001/CARGO/XII/2025)
INV: INV-2025-0001
```

### Status Workflows
```
PJO:     draft → pending_approval → approved → rejected
         (approved PJO can be converted to JO when all costs confirmed)
JO:      active → completed → submitted_to_finance → invoiced → closed
Invoice: draft → sent → paid → overdue → cancelled
Project: active → completed → on_hold
```

### Cost Item Status
```
estimated → confirmed (actual ≤ estimated)
          → exceeded (actual > estimated, requires justification)
          → under_budget (actual < estimated)
```

---

## 9. When Generating Code

### ✅ Do
- Check existing components before creating new ones
- Use existing Supabase client from `/lib/supabase`
- Follow TypeScript strict mode (no `any` types)
- Use Server Actions for mutations
- Add RLS policies immediately after creating tables

### ❌ Don't
- Create duplicate components
- Expose environment variables in client code
- Skip loading/error states
- Use inline styles (use Tailwind)

---

## 10. Quick Reference

### Supabase MCP Commands (for Kiro)
```sql
-- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- View table structure
\d+ table_name
```
---

*Last Updated: December 2025*