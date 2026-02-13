---
inclusion: always
---
# GIS-ERP (PT. Gama Intisamudera ERP) - Project Context

> **Naming Note**: Local folder is `gis-erp`. External identifiers remain as-is:
> GitHub repo `Gama-ERP`, Vercel project `gama-erp`, package name `gama-erp`.
> Do NOT rename these — the system is live with active users.

## Overview
- **Company**: PT. Gama Intisamudera
- **Purpose**: Heavy-haul logistics ERP system (10 modules, 299 tables, 15 roles)
- **Timeline**: Full rollout March 12, 2026
- **Owner**: Dio Atmando
- **Part of**: `gama/` ecosystem (see `gama/CLAUDE.md`)

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL) - 299 tables
- **Auth**: Supabase Auth
- **Styling**: TailwindCSS + shadcn/ui (new-york)
- **Deployment**: Vercel (auto-deploy on push)
- **Automation**: n8n

## Key Commands
```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build (ALWAYS run before push)
npm run lint             # ESLint check

# Database types (run after schema changes)
npx supabase gen types typescript --project-id ljbkjtaowrdddvjhsygj > types/supabase.ts
cp types/supabase.ts types/database.ts
```

## Project Structure
```
app/(main)/              # Main application routes
├── dashboard/           # Role-specific dashboards
├── customers/           # Customer management
├── projects/            # Project management
├── pjo/                 # Proforma Job Orders
├── job-orders/          # Job Order management
├── invoices/            # Invoice management
├── disbursements/       # BKK (Bukti Kas Keluar)
├── hr/                  # HR module (employees, payroll, leave)
├── equipment/           # Equipment/Asset management
├── hse/                 # Health, Safety, Environment
├── customs/             # PIB/PEB documentation
├── agency/              # Shipping agency module
├── co-builder/          # Gamified feedback competition (Feb-Mar 2026)
└── settings/            # System settings, user management

lib/                     # Shared utilities
├── supabase/            # Supabase client (server.ts, client.ts)
├── permissions.ts       # RBAC logic - role definitions
├── permissions-server.ts # Server-side permission checks
├── navigation.ts        # Sidebar menu by role
├── dashboard-cache.ts   # 5-minute cache for dashboard metrics
└── utils/format.ts      # Currency/date formatting (IDR)

types/                   # TypeScript types
├── supabase.ts          # Generated DB types (670KB, 299 tables)
├── database.ts          # Copy of supabase.ts
└── permissions.ts       # Role/permission type definitions
```

## Roles (15 total)
```
Executive: owner, director, sysadmin
Manager:   marketing_manager, finance_manager, operations_manager
Staff:     administration, finance, marketing, ops, engineer, hr, hse, agency, customs
```
- `ops` and `operations_manager` CANNOT see revenue/profit/invoices
- `agency` is scoped to `entity_type: gama_agency`

## Critical Business Rules
1. **Revenue Hiding**: Operations roles CANNOT see revenue, profit, or invoice totals
2. **Soft Delete**: Use `is_active = false`, never hard delete
3. **Entity Isolation**: `entity_type` separates gama_main vs gama_agency
4. **Currency**: All amounts in IDR, format with thousands separator
5. **BKK Numbers**: Format BKK-YYYYMM-XXXX, auto-increment per month

## Database Patterns
```typescript
// CRITICAL: user_profiles has both `id` (auto PK) and `user_id` (auth UUID)
// WRONG: .eq('id', user.id)     -> returns null
// RIGHT: .eq('user_id', user.id) -> correct

// Fix "type instantiation too deep":
const result = await supabase.from('table').select('*').like('col', '%x%')
const data = result.data as TableType[] | null
```

## DO NOT
- Disable TypeScript (no @ts-ignore unless critical)
- Add console.log in production code
- Query database in middleware (use cached JWT)
- Expose service_role key in client code
- Show revenue/profit to operations roles
- Hard delete records

## When Making Changes
1. Run `npm run build` before committing
2. Check TypeScript errors in terminal
3. Test the specific feature you changed
4. If Vercel build fails but local passes, check type inference issues

## External References
- Supabase: `ljbkjtaowrdddvjhsygj`
- GitHub: `odnamta/Gama-ERP`
- Vercel: `odnamta/gama-erp`

---
*Synced with CLAUDE.md*
