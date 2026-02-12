# GAMA ERP - Project Context for Claude Code

> **Sync Note**: Keep this file in sync with `.kiro/steering/Project Context.md` for Kiro.
> When updating this file, also update the Kiro steering file to maintain consistency.

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
- **Styling**: TailwindCSS
- **Deployment**: Vercel
- **Automation**: n8n

## Key Commands
```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build (ALWAYS run before push)
npm run lint             # ESLint check

# Database types (run after schema changes)
npx supabase gen types typescript --project-id [YOUR_PROJECT_ID] > types/supabase.ts
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
├── pjo/                 # Proforma Job Orders
├── job-orders/          # Job Order management
├── invoices/            # Invoice management
├── disbursements/       # BKK (Bukti Kas Keluar - Cash Out)
├── hr/                  # HR module (employees, payroll, leave)
│   ├── employees/
│   ├── payroll/
│   └── leave/
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

## Date & Currency Formatting (IMPORTANT)
Always use centralized formatters from `lib/utils/format.ts`:

```typescript
import { 
  formatDate,           // "15 Jan 2026" - tables, cards, UI
  formatDateTime,       // "15 Jan 2026, 14:30" - with time
  formatRelative,       // "2 hari yang lalu" - Indonesian relative
  formatDocumentDate,   // "15 Januari 2026" - formal documents/PDFs
  toInputDate,          // "2026-01-15" - HTML form inputs
  formatCurrency,       // "Rp 1.500.000" - full currency
  formatCurrencyShort,  // "Rp 1,5 jt" - compact for dashboards
  formatNumber,         // "1.500.000" - number with separators
  formatPercent,        // "75,5%" - percentage
} from '@/lib/utils/format'
```

**DO NOT use**: `toLocaleDateString()`, `new Intl.DateTimeFormat()` directly, or `formatIDR`/`formatDate` from `lib/pjo-utils.ts` (deprecated)

## Database Patterns
```sql
-- Soft delete query
SELECT * FROM customers WHERE is_active = true;

-- Entity type filtering (RLS handles this automatically)
-- Owner sees all, Agency role sees only gama_agency
SELECT * FROM customers WHERE entity_type = 'gama_main';

-- Type inference fix for Supabase queries
-- If you get "type instantiation too deep" errors:
const result = await supabase.from('table').select('column').like('column', '%x%')
const data = result.data as { column: string }[] | null  // Explicit cast
```

## Current State (February 2026)
- **Performance**: 95-97/100 Lighthouse
- **TypeScript**: 0 errors
- **ESLint**: 0 errors (515 warnings - unused variables, low priority)
- **Deployment**: Vercel (working)
- **Types**: 299 tables synced, 670KB type files
- **Mobile**: Fully responsive (sidebar drawer, hamburger menu, viewport lock)
- **Co-Builder**: Gamified feedback competition active (Feb 12 - Mar 12)

## Team Onboarding (16 users)
| Name | Email | Role | Status |
|------|-------|------|--------|
| Dio | dioatmando@ | owner | ✅ Active |
| Hutami | hutamiarini@ | marketing_manager | 🔄 Onboarding |
| Feri | ferisupriono@ | finance_manager | 🔄 Onboarding |
| Reza | rezapramana@ | operations_manager | 🔄 Onboarding |
| Luthfi | luthfibadarnawa@ | operations_manager | 🔄 Onboarding |
| Rania | rania.rahmanda@ | hr | 🔄 Onboarding |
| Iqbal | iqbaltito@ | hse | 🔄 Onboarding |
| Khuzainan | khuzainan@ | customs | 🔄 Onboarding |
| Yuma | yuma@ | agency | 🔄 Onboarding |
| Choirul | choirulanam@ | administration | 🔄 Onboarding |
| Dedy | dedyherianto@ | ops | 🔄 Onboarding |
| Chairul | chairulfajri@ | ops | 🔄 Onboarding |
| Arka | arkabasunjaya@ | engineer | 🔄 Onboarding |
| Navisa | navisakafka@ | marketing | 🔄 Onboarding |
| Rahadian | rahadian@ | ops | 🔄 Onboarding |
| Kurnia | kurniashantidp@ | finance | 🔄 Onboarding |

*All emails @gama-group.co. Roles auto-assigned via `lib/permissions-server.ts`.*

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

## Common Fixes
```typescript
// CRITICAL: user_profiles has both `id` (auto PK) and `user_id` (auth UUID)
// WRONG: .eq('id', user.id)     → returns null (id ≠ auth UUID)
// RIGHT: .eq('user_id', user.id) → correct match

// Fix "type instantiation too deep" on Supabase queries
// BEFORE (causes error):
const { data } = await supabase.from('table').select('*').like('col', '%x%')

// AFTER (fixed):
const result = await supabase.from('table').select('*').like('col', '%x%')
const data = result.data as TableType[] | null

// Tables not in generated types (use `as any` cast):
// competition_feedback, point_events, test_scenarios,
// scenario_completions, top5_submissions, feedback_submissions
const { data } = await supabase.from('competition_feedback' as any).select('*')
```

## Quick References
- Supabase Dashboard: https://supabase.com/dashboard/project/ljbkjtaowrdddvjhsygj
- Vercel Dashboard: https://vercel.com/odnamta/gama-erp
- GitHub Repo: https://github.com/odnamta/Gama-ERP

## Active Sprint Tasks
- [x] Fix feedback submission (trigger + FK + user_profiles query bug)
- [x] Co-Builder competition system (all 10 steps)
- [x] Mobile responsiveness
- [x] Auto-assign 16 users
- [ ] QA testing with real users (Feb 12 launch)
- [ ] Monitor Co-Builder competition (Feb 12 - Mar 12)

## Recent Changes
- 2026-02-10: v0.10.0 - CRITICAL: Fixed feedback submission, user_profiles query bug in 10 files, Co-Builder competition, mobile responsiveness
- 2026-01-26: v0.9.21 - System Admin Dashboard (180 tests)
- 2026-01-26: v0.9.20 - HR Dashboard Enhancement (309 tests)
- 2026-01-26: v0.86 - Welcome Flow (84 tests)
- 2026-01-26: v0.9.6 - Director Dashboard (275 tests)
- 2026-01-26: v0.38.1 - Help Center Enhancement (25 tests)
- 2026-01-25: v0.9.19 - Customs Dashboard (103 tests)
- 2026-01-25: v0.9.18 - HSE Dashboard (387 tests)

## MCP Servers
Configured in `.claude/mcp.json`:
- **Supabase** - Direct database management (queries, schema, logs)
- **Context7** - Up-to-date library documentation (Next.js, Supabase, etc.)