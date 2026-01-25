---
inclusion: always
---
# GAMA ERP - Project Context for Kiro

## Project Overview
- **Company**: PT. Gama Intisamudera
- **Purpose**: Heavy-haul logistics ERP system (10 modules)
- **Timeline**: Full rollout March 12, 2026
- **Owner**: Dio Atmando

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL) - 299 tables
- **Auth**: Supabase Auth
- **Styling**: TailwindCSS + shadcn/ui (new-york)
- **Deployment**: Vercel
- **Automation**: n8n

## Key Commands
```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build (ALWAYS run before push)
npm run lint             # ESLint check

# Database types (run after schema changes)
npx supabase gen types typescript --project-id ljbkjtaowrdddvjhsygj > types/supabase.ts
cp types/supabase.ts types/database.ts

# Deployment
git add . && git commit -m "message" && git push   # Triggers Vercel auto-deploy
```

## Project Structure
```
app/(main)/              # Main application routes
├── dashboard/           # Role-specific dashboards (owner, finance-manager, hr, etc.)
├── customers/           # Customer management
├── projects/            # Project management
├── pjo/                 # Proforma Job Orders (redirect)
├── proforma-jo/         # PJO module (main)
├── job-orders/          # Job Order management
├── invoices/            # Invoice management
├── disbursements/       # BKK (Bukti Kas Keluar - Cash Out)
├── hr/                  # HR module (employees, payroll, leave)
├── equipment/           # Equipment/Asset management
├── hse/                 # Health, Safety, Environment
├── customs/             # PIB/PEB documentation
├── agency/              # Shipping agency module
├── quotations/          # Quotation management
├── vendors/             # Vendor management
├── engineering/         # Engineering module
└── settings/            # System settings, user management, activity logs

lib/                     # Shared utilities
├── supabase/            # Supabase client (server.ts, client.ts)
├── permissions.ts       # RBAC logic - role definitions
├── permissions-server.ts # Server-side permission checks
├── navigation.ts        # Sidebar menu by role
├── dashboard-cache.ts   # 5-minute cache for dashboard metrics
└── utils/
    └── format.ts        # Currency formatting (IDR)

types/                   # TypeScript types
├── supabase.ts          # Generated DB types (670KB, 299 tables)
├── database.ts          # Copy of supabase.ts
└── permissions.ts       # Role/permission type definitions
```

## Roles (15 total)
```
Executive Tier:
- owner           # Full access, cannot be modified
- director        # Full operational access
- sysadmin        # System administration

Manager Tier:
- marketing_manager    # Sales, quotations, engineering
- finance_manager      # Finance, invoices, disbursements, approvals
- operations_manager   # Jobs, equipment (NO revenue visibility)

Staff Tier:
- administration  # PJO, JO, documents
- finance         # Finance tasks
- marketing       # Sales support
- ops             # Operations (NO revenue visibility)
- engineer        # Engineering assessments
- hr              # HR module only
- hse             # HSE module only
- agency          # Agency module only (entity_type: gama_agency)
- customs         # Customs module only (PIB/PEB)
```

## Critical Business Rules
1. **Revenue Hiding**: Operations roles (ops, operations_manager) CANNOT see revenue, profit, or invoice totals
2. **Soft Delete**: Use `is_active = false`, never hard delete
3. **Entity Isolation**: `entity_type` column separates gama_main vs gama_agency data
4. **Currency**: All amounts in IDR (Indonesian Rupiah), format with thousands separator
5. **BKK Numbers**: Format BKK-YYYYMM-XXXX, auto-increment per month

## Database Patterns
```sql
-- Soft delete query
SELECT * FROM customers WHERE is_active = true;

-- Entity type filtering (RLS handles this automatically)
SELECT * FROM customers WHERE entity_type = 'gama_main';
```

```typescript
// Type inference fix for Supabase queries
// If you get "type instantiation too deep" errors:
const result = await supabase.from('table').select('column').like('column', '%x%')
const data = result.data as { column: string }[] | null  // Explicit cast
```

## Current State (January 2026)
- **Performance**: 95-97/100 Lighthouse
- **TypeScript**: 0 errors
- **ESLint**: 0 errors (515 warnings - unused variables, low priority)
- **Deployment**: Vercel (working)
- **Types**: 299 tables synced, 670KB type files

## Team Onboarding
| Name | Role | Status |
|------|------|--------|
| Dio | owner | ✅ Active |
| Feri | finance_manager | 🔄 Setting up |
| Rania | hr | 🔄 Setting up |

## DO NOT
- ❌ Disable TypeScript (no @ts-ignore unless absolutely critical)
- ❌ Add console.log in production code
- ❌ Query database in middleware (use cached JWT)
- ❌ Expose service_role key in client code
- ❌ Show revenue/profit to operations roles
- ❌ Hard delete records (use soft delete)

## When Making Changes
1. **Always** run `npm run build` before committing
2. Check for TypeScript errors in terminal output
3. Test the specific feature you changed
4. Write meaningful commit messages
5. If build fails on Vercel but passes locally, check type inference issues

## Quick References
- Supabase Dashboard: https://supabase.com/dashboard/project/ljbkjtaowrdddvjhsygj
- Vercel Dashboard: https://vercel.com/odnamta/gama-erp
- GitHub Repo: https://github.com/odnamta/Gama-ERP

## Active Sprint Tasks
- [ ] Fix user creation (user_onboarding_status table)
- [ ] Onboard Feri (finance_manager)
- [ ] Onboard Rania (hr)
- [ ] QA testing with real users
- [ ] User activity tracking (v0.13.1)

## Recent Changes
- 2026-01-25: v0.9.18 - HSE Dashboard implemented (387 tests, incidents, permits, training, PPE for Iqbal)
- 2026-01-24: v0.9.17 - Engineering Dashboard implemented with real data (surveys, JMPs, assessments)
- 2026-01-24: v0.85 - Terms & Conditions system (117 tests, legal compliance, version tracking)
- 2026-01-25: v0.84 - Role Request System implementation complete (364 tests, self-service onboarding)
- 2026-01-24: Fixed 10 failing test files (34 tests) - date generators, role names, currency formatting
- 2026-01-24: v0.9.16 - Assets Dashboard real data implementation complete (53 tests passing)
- 2026-01-24: v0.9.15 - Agency Dashboard with real data (bookings, B/L, shipping lines, vessels)

---
*Last Updated: January 25, 2026*
