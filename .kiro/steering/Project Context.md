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
- `ops` CANNOT see revenue/profit/invoices
- `operations_manager` CAN see profit (management level), but `ops` staff cannot
- `agency` is scoped to `entity_type: gama_agency`

## Core Business Flow (Heavy-Haul Logistics)

```
1. MARKETING wins project (Quotation → Won)
   → Rough revenue + cost estimates
   → Stays involved: client communication + oversee operations

2. ADMINISTRATION creates PJO (detailed shipment plan)
   → Based on marketing's estimates + past spending data
   → Detailed estimated revenue items per shipment
   → Detailed estimated cost items per shipment
   → Creates BKK (disbursements) and releases in phases

3. BKK DISBURSEMENTS split two ways:
   ├─ Direct to vendor (equipment rental, subcontractors, etc.)
   └─ To operations team as operating budget (manpower, fuel, etc.)

4. OPERATIONS executes the shipment
   → Uses budget received from BKK
   → Tracks actual spending (fuel, manpower, daily ops)
   → Submits spending records back to administration
   → CANNOT see revenue/profit (prevents budget maximizing)
   → Spending may exceed initial estimate (price increases, incidents)
     but should not fluctuate drastically from initial PJO

5. SHIPMENT COMPLETES (signed berita acara / surat jalan)

6. ADMINISTRATION finalizes
   → Collects all costs (vendor invoices + ops spending records)
   → Confirms all revenue
   → PJO → JO (revenue + cost now FIXED)

7. JO → INVOICE(s)
   → One JO can produce multiple invoices (term splits, partial billing)
   → Revenue is now invoiceable to customer
```

### Why Ops Cannot See Profit
Operations staff (`ops`) are given a budget per shipment via BKK. If they knew
the profit margin, they could spend up to the profit line — eating the margin.
By hiding revenue/profit, ops is incentivized to spend only what's necessary.
`operations_manager` CAN see profit as they need it for oversight and decisions.

### Key Concepts
- **PJO** = detailed shipment plan with estimated revenue + costs (pre-execution)
- **JO** = finalized record after shipment completes (actual revenue + costs locked)
- **BKK** = Bukti Kas Keluar (cash disbursement) — the mechanism for releasing budget
- **Berita Acara / Surat Jalan** = delivery receipt confirming shipment completion
- **Cost Entry** (`/cost-entry`) = ops dashboard to track spending against allocated budget

## Critical Business Rules
1. **Revenue Hiding**: `ops` staff CANNOT see revenue, profit, or invoice totals. `operations_manager` CAN see profit.
2. **Soft Delete**: Use `is_active = false`, never hard delete
3. **Entity Isolation**: `entity_type` separates gama_main vs gama_agency
4. **Currency**: All amounts in IDR, format with thousands separator
5. **BKK Numbers**: Format BKK-YYYYMM-XXXX, auto-increment per month
6. **Budget Discipline**: Ops spending may exceed estimates (price changes, incidents) but should stay close to initial PJO estimates

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
- Show revenue/profit to `ops` staff (operations_manager CAN see profit)
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
