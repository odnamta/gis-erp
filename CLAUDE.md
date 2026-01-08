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

## Project Structure
```
app/
├── (main)/           # Protected routes (requires auth)
│   ├── dashboard/    # Role-specific dashboards
│   ├── customers/    # Customer management
│   ├── job-orders/   # Job execution
│   ├── invoices/     # Billing
│   ├── equipment/    # Asset management
│   └── ...
├── auth/             # Authentication routes
└── api/              # API routes

components/
├── tables/           # Data tables (use virtual-data-table for large datasets)
├── dashboard/        # Dashboard components
└── ui/               # Shared UI components

lib/
├── supabase/         # Database queries
├── permissions.ts    # RBAC logic
├── dashboard-cache.ts # Caching layer
└── utils/            # Utilities including logger
```

## Key Files
- `middleware.ts` - Auth + role-based routing (reads from JWT, not DB)
- `lib/permissions.ts` - Role permission definitions
- `lib/dashboard-cache.ts` - In-memory caching (5-min TTL)
- `types/permissions.ts` - TypeScript types for auth

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
npm run dev          # Development (uses Turbopack)
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check
ANALYZE=true npm run build  # Bundle analysis
```

## Recent Optimizations (2026-01-07)
- ✅ Bundle size: 526KB → 159KB (equipment pages)
- ✅ Middleware: JWT-based auth (no DB query per request)
- ✅ Console logs: Removed from production
- ✅ Tables: Virtualized for large datasets
- ✅ Dashboard: 5-min cache for owner role
- ✅ Layout: Parallelized async calls

## Known Issues / Tech Debt
- 91 `no-explicit-any` ESLint warnings (downgraded to warnings)
- Some report pages still use client-side fetching
- ExcelJS still large (~1MB) - loaded on-demand but could be optimized further
- Google Maps loads globally (should lazy load)

## Testing
- Run `npm run build` after changes to catch TypeScript errors
- Test with Preview Mode (yellow bar) to verify RBAC
- Check bundle analyzer: `ANALYZE=true npm run build`

## Deployment
- Push to `main` branch triggers Vercel deployment
- Production URL: [your-vercel-url]
- Check Vercel logs for deployment errors

## Do NOT
- ❌ Disable TypeScript checking (ignoreBuildErrors)
- ❌ Disable ESLint (ignoreDuringBuilds)
- ❌ Add console.log (use lib/utils/logger.ts instead)
- ❌ Query database in middleware (use JWT claims)
- ❌ Show revenue/profit to ops roles
