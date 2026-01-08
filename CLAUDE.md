# GAMA ERP - Project Context for Claude Code

## Overview
Internal ERP system for PT. Gama Intisamudera (Indonesian heavy-haul logistics company).
10-module system covering Operations, Finance, HR, HSE, Equipment, Customs, Agency, Engineering, Procurement, and AI Dashboard.

## Tech Stack
- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript (strict mode enabled)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Styling:** TailwindCSS
- **Hosting:** Vercel
- **Automation:** n8n

## Current Build Status ✅
```
TypeScript: 0 errors (npx tsc --noEmit passes)
ESLint: 0 errors, 515 warnings (unused variables - low priority)
Build: npm run build passes successfully
```

## Project Structure
```
app/
├── (main)/           # Protected routes (requires auth)
│   ├── dashboard/    # Role-specific dashboards
│   ├── customers/    # Customer management
│   ├── job-orders/   # Job execution
│   ├── invoices/     # Billing
│   ├── equipment/    # Asset management
│   ├── reports/      # All 15 reports (SERVER COMPONENTS)
│   └── ...
├── auth/             # Authentication routes
└── api/              # API routes

components/
├── tables/           # Data tables (use virtual-data-table for large datasets)
├── dashboard/        # Dashboard components
├── reports/          # Report components including ReportSkeleton
└── ui/               # Shared UI components

lib/
├── supabase/         # Database queries
├── permissions.ts    # RBAC logic
├── dashboard-cache.ts # In-memory caching (5-min TTL)
├── utils/logger.ts   # Use this instead of console.log
└── reports/          # Report utilities
```

## RBAC System (13 Roles)
```
Executive: owner, director
Managers: marketing_manager, finance_manager, operations_manager
Staff: administration, finance, marketing, ops, engineer, hr, hse
System: sysadmin
```

**CRITICAL RULE:** `ops` and `operations_manager` roles CANNOT see revenue/profit data.

## Commands
```bash
npm run dev              # Development (uses Turbopack)
npm run build            # Production build
npm run lint             # ESLint check (0 errors, 515 warnings)
npx tsc --noEmit         # TypeScript check (passes clean)
ANALYZE=true npm run build  # Bundle analysis
```

## Performance Optimizations Completed (Jan 7-8, 2026)

### Day 1: Critical Issues
- ✅ Bundle size: 526KB → 159KB (equipment pages)
- ✅ Middleware: JWT-based auth (no DB query per request)
- ✅ Console logs: Removed from production (compiler option)
- ✅ Tables: Virtualized with @tanstack/react-virtual
- ✅ Dashboard: 5-min cache for owner role (lib/dashboard-cache.ts)
- ✅ Layout: Parallelized async calls with Promise.all
- ✅ TypeScript: Re-enabled checking (was disabled)

### Day 2: Reports & Polish
- ✅ ExcelJS: Dynamic import, loads only on Export click (933KB on-demand)
- ✅ Reports: ALL 15 pages migrated to Server Components
- ✅ Skeletons: ReportSkeleton for zero layout shift
- ✅ Equipment costing: 428KB → 174KB (59% reduction)
- ✅ ESLint errors: 96 errors → 0 errors (all fixed)

### Files Fixed for Type Safety
```
lib/audit-log.ts - Database and Json imports
lib/automation-log-actions.ts - Json casting
lib/depreciation-actions.ts - Nullable handling
lib/drawing-actions.ts - Json casting
lib/error-handling/job-handler.ts - Json casting
lib/error-handling/recovery.ts - Dynamic query types
lib/error-handling/tracking.ts - Json casting
lib/event-queue-actions.ts - Json casting
lib/maintenance-actions.ts - Record number generation
lib/notification-template-utils.ts - Json casting
lib/onboarding-actions.ts - Status type handling
lib/peb-actions.ts - Internal ref generation
```

### Current Performance
- Estimated score: ~8/10 (up from 4/10)
- Report pages: Instant data (SSR, no loading spinners)
- Equipment pages: ~159-174KB First Load JS
- ExcelJS: Lazy loaded, not in initial bundle
- TypeScript: Fully enabled, 0 errors
- ESLint: 0 errors (515 warnings are unused variables - cleanup later)

## Architecture Patterns

### Report Pages (Server Components)
```
page.tsx (Server Component)
├── Fetches data on server
├── Checks permissions
├── Wraps client in Suspense
└── Returns <ReportClient initialData={data} />

report-client.tsx (Client Component)
├── Receives pre-fetched data as prop
├── Client-side filtering (instant)
├── No useEffect data fetching
└── Interactive controls only
```

### Data Tables
- Use VirtualDataTable for lists >50 rows
- Located in components/tables/virtual-data-table.tsx
- Renders only visible rows

### Caching
- Dashboard data: 5-min TTL (lib/dashboard-cache.ts)
- Currently in-memory (resets on deploy)
- TODO: Redis for persistent cache

## Remaining Tech Debt (Low Priority)
- 515 ESLint warnings (unused variables) - cleanup when convenient
- Google Maps loads globally - should lazy load
- Some dashboard widgets still use mock data

## Do NOT
- ❌ Add console.log (use lib/utils/logger.ts)
- ❌ Query database in middleware (use JWT claims)
- ❌ Show revenue/profit to ops roles
- ❌ Disable TypeScript checking
- ❌ Use static imports for ExcelJS (use dynamic import)
- ❌ Use 'use client' + useEffect for data fetching in reports
- ❌ Ignore ESLint errors (warnings are OK for now)

## Kiro Prompt Format
When providing implementation tasks, format as:
```
GOAL: [What to achieve]

STEPS:
1. [Step with file path]
2. [Code to implement]
3. [Verification]

SUCCESS CRITERIA:
✓ [Measurable outcome]
```