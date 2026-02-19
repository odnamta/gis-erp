# Changelog

All notable changes to GAMA ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.1] - 2026-02-19 - Co-Builder Bug Blitz + Explorer Mode UX

### Bug Fixes
- **51 FK mismatches** resolved across 41 server action files (root cause: `user.id` auth UUID used for `user_profiles.id` PK columns)
- **Quotation PDF** — created template + API route (was returning 404)
- **Asset registry filter** — fixed PostgREST syntax for disposed/sold exclusion
- **Customs PIB/PEB** — added missing RLS policies for 6 tables via Management API
- **Shipping line dropdown** — empty due to missing RLS SELECT policy
- **Agency vessel schedules** — crash from unmapped vessel/port relations
- **Customs forms** — null array crash on `exportTypes.data` / `officesResult.data`
- **HR page access** — explorer mode users silently redirected to dashboard
- **Agency card crash** — field name mismatch `has_roro` → `has_ro_ro` in port mapping
- **Engineering drawing save** — silent profile query failure, added auth + error handling
- **JMP submit for review** — auth UUID used for `employees` FK, now resolves via profile → employee chain
- **HSE incidents blank page** — null safety on `incident_categories` join
- **Leave request broken** — `getCurrentEmployeeId()` used auth UUID instead of `user_profiles.id` for employee lookup
- **My Feedback empty** — `getMySubmissions()` queried `submitted_by` with auth UUID instead of `profile.id`; users couldn't see their own feedback
- **Comment notification mismatch** — `feedback.ts` compared `submitted_by` against auth UUID (always true), fixed to use `profile.id`
- **Config API user ID** — `setConfig()` passed auth UUID as `userId` instead of `profile.id`
- **Feature flags API user ID** — `updateFeatureFlag()` passed auth UUID as `updatedBy` instead of `profile.id`
- **Admin pages null safety** — profile accessed without TypeScript null narrowing in error tracking, job failures, and data recovery pages
- **Competition scoring gap** — `point_events` table out of sync with `competition_feedback`; rebuilt 66 events (+316 pts)
- **Scoring fairness** — 3 feedback items had `base_points=3` while equivalent items had 8; corrected to 8

### Features
- **Explorer mode read-only banner** — "Mode Explorer — Hanya Lihat" notification on restricted pages
- **`guardPage()` helper** — reusable server-side permission + explorer mode cookie check
- **Explorer cookie sync** — sidebar toggle syncs to cookie for server-side layout awareness
- 9 restricted pages now accessible in explorer mode with read-only banner

### Admin
- 36 total co-builder feedback items reviewed and scored (24 batch pagi + 10 sore + 2 malam)
- Scoring system fixed: rebuilt `point_events` from source of truth
- Scoring fairness audit: 3 base_points anomalies corrected
- RLS migration applied: `pib_documents`, `pib_items`, `customs_offices`, `import_types`, `shipping_lines`, `vessel_schedules`

---

## [0.10.0] - 2026-02-10 - Feedback Fix + Co-Builder Launch + Mobile

### 🐛 Critical Bug Fixes
- **Feedback submission completely broken** - Trigger function `generate_feedback_ticket_number()` failed: referenced `feedback_ticket_seq` without schema qualification + used `SECURITY INVOKER`. Fixed to `SECURITY DEFINER` with `public.feedback_ticket_seq`.
- **user_profiles query bug in 10 files** - All queries used `.eq('id', user.id)` instead of `.eq('user_id', user.id)`. The `id` column is an auto-generated PK, not the auth user UUID. Silently returned null profiles across feedback, help center, onboarding, config, feature-flags, audit, widgets, and request-access.
- **FK constraint mismatch on feedback_submissions** - `submitted_by`, `assigned_to`, `resolved_by` referenced `user_profiles(id)` instead of `user_profiles(user_id)`. Fixed all three.
- Corrected 4 email addresses for user auto-assign

### ✨ Features
- **Co-Builder Competition System** (15 users, Feb 12 - Mar 12, 2026)
  - 5 new tables + materialized view + RPC function + 13 seeded test scenarios
  - 7 sub-pages: My Feedback, Scenarios (list + detail), Top 5, Bug Tracker, Admin Panel, Admin Review
  - Point counter with toast notifications, competition feedback floating button
- **Mobile Responsiveness** - Full mobile support
  - `MobileSidebarProvider` context, drawer sidebar, hamburger menu, responsive layout
  - Floating buttons, point counter, viewport meta (no zoom)
- **Error Boundaries** - `error.tsx` and `not-found.tsx` with Indonesian text
- **User Auto-Assign** - Pre-assigned roles for 16 @gama-group.co users
- Excluded agency role from Co-Builder competition

### 🔧 Developer Experience
- MCP servers: Supabase (database management), Context7 (live docs)
- Claude Code `allowedTools` permission config (auto-accept safe operations)

---

## [0.9.21] - 2026-01-26 - System Admin Dashboard

### ✨ Features
- User stats, activity monitoring, role distribution (180 tests)

---

## [0.9.20] - 2026-01-26 - HR Dashboard Enhancement

### ✨ Features
- Payroll, leave balance, attendance analytics for Rania (309 tests)

---

## [0.86] - 2026-01-26 - Welcome Flow

### ✨ Features
- Role-specific welcome modal with quick actions for all 15 roles (84 tests)

---

## [0.9.6] - 2026-01-26 - Director Dashboard

### ✨ Features
- Business KPIs, pipeline, financial health with real data (275 tests)

---

## [0.38.1] - 2026-01-26 - Help Center Enhancement

### ✨ Features
- FAQs page with 36 Indonesian FAQs across 7 categories (25 tests)

---

## [0.9.19] - 2026-01-25 - Customs Dashboard

### ✨ Features
- PIB/PEB tracking, duties, deadlines for Khuzainan (103 tests)

---

## [0.9.18] - 2026-01-25 - HSE Dashboard

### ✨ Features
- Incidents, permits, training, PPE for Iqbal (387 tests)

---

## [0.9.17] - 2026-01-25 - Engineering Dashboard

### ✨ Features
- Engineering Dashboard with real data

---

## [0.83] - 2026-01-24 - Date & Currency Formatting Standardization

### ✨ Features
- Centralized formatting utility (`lib/utils/format.ts`) for all date/currency formatting
- Indonesian locale support for relative dates ("2 hari yang lalu")
- Document date format with full Indonesian month names ("15 Januari 2026")
- Compact currency format for dashboards ("Rp 1,5 jt", "Rp 2,3 M")

### 🔧 Developer Experience
- Added `formatting-standards.md` steering rule for AI agents
- Added `update-project-context` hook for auto-documentation
- 299 tests (111 unit + 188 property tests) for formatting utilities
- Updated CLAUDE.md with formatting standards

### 📦 Migrations
- Migrated 70+ components from inline formatting to centralized utilities
- Deprecated `formatIDR`/`formatDate` from `lib/pjo-utils.ts`

---

## [0.9.14] - 2026-01-15 - Finance Manager Dashboard Real Data

### ✨ Features
- Finance Manager dashboard with real Supabase data
- AR/AP overview cards with aging analysis
- Revenue trend charts
- Pending BKK approvals table

---

## [0.9.13] - 2026-01-23 - Operations Manager Dashboard Real Data

### ✨ Features
- Operations Manager dashboard with real Supabase data
- Job order metrics (active, completed, pending handover)
- Cost tracking with budget utilization (NO revenue data - business rule)
- Equipment/asset utilization metrics
- Team/manpower utilization tracking
- 5-minute cache for performance

### 🔒 Security
- Enforced revenue hiding for operations roles

---

## [0.9.12] - 2026-01-23 - Marketing Manager Dashboard Real Data

### ✨ Features
- Marketing Manager dashboard with real Supabase data
- Sales pipeline metrics (quotations, win rate)
- Customer acquisition statistics
- Engineering department status
- Recent activity lists
- 5-minute cache for performance

---

## [0.82] - 2026-01-22 - Changelog Feature

### ✨ Features
- Changelog page at `/changelog` with timeline view
- "What's New" sidebar menu with notification dot for unread updates
- Admin changelog editor at `/admin/changelog`
- Category badges (feature, improvement, bugfix, security)
- Major update highlighting
- Markdown rendering for descriptions

### 🗄️ Database
- Added `changelog_entries` table with RLS policies
- Initial changelog data seeded

---

## [0.4.5] - 2026-01-20 - PJO Form Button Fix

### 🐛 Bug Fixes
- Fixed PJO form button not clickable issue
- Improved button state management during form submission

---

## [0.9.2] - 2026-01-08 - Performance Optimization Release

### 🚀 Performance Improvements
- **Lighthouse score: 40 → 95-97** (+140% improvement)
- **Equipment costing bundles: 428KB → 174KB** (-59%)
- **Dashboard load: 5s → <1s** (-80%)
- **Report pages: 2-4s spinner → instant SSR**
- **Middleware latency: 50-200ms → ~0ms** per navigation
- **Console logs in production: 1,395 → 0**

### ✨ Features
- Added list virtualization for large datasets (60fps with 10,000+ rows)
- Migrated all 15 report pages to Server Components
- Implemented lazy loading for ExcelJS (933KB loads on-demand)
- Added dashboard caching with 5-minute TTL
- Created ReportSkeleton for zero layout shift (CLS = 0)
- Owner dashboard now loads preview data on-demand
- Login page optimized with static generation

### 🔧 Developer Experience
- Re-enabled TypeScript strict checking (all errors fixed)
- Added bundle analyzer (`ANALYZE=true npm run build`)
- Parallelized layout async calls
- Removed 1,395 console.log statements from production

### 📊 Core Web Vitals
- FCP: 3-4s → 1.4s ✅
- LCP: 5-6s → 2.6-2.9s ⚠️ (very close to 2.5s target)
- TTI: 8-10s → ~2s ✅
- TBT: ~800ms → 60ms ✅
- CLS: 0.3-0.5 → 0 ✅

### 📚 Documentation
- Added Lighthouse audit results (`LIGHTHOUSE-AUDIT.md`)
- Added performance optimization summary (`PERFORMANCE-OPTIMIZATION-SUMMARY.md`)
- Documented performance budgets for CI/CD
- Created backlog for future optimizations (`PERFORMANCE-BACKLOG.md`)

### ⚠️ Breaking Changes
None. All changes are backwards compatible.

### 🔮 Future Optimizations (Backlog)
- LCP optimization: 2.6-2.9s → 2.5s
- Reduce unused JavaScript (170ms savings)
- Reduce unused CSS (160ms savings)
- Database optimization (index analysis, N+1 queries)
- Edge runtime migration for API routes
- Real user monitoring (Vercel Analytics, Sentry)

**Note:** Current 95-97/100 Lighthouse score is production-ready. Future optimizations are diminishing returns.

---

## [0.9.1] - 2025-12 - Assets & Customs Module

### ✨ Features
- Assets Management module (equipment, vehicles, machinery tracking)
- Customs Documentation module (PEB/PIB documents)
- Asset maintenance scheduling and tracking
- Asset assignments to jobs and employees

---

## [0.9.0] - 2025-12 - Engineering Module

### ✨ Features
- Route surveys with GPS waypoints
- Journey Management Plans (JMP)
- Technical assessments
- Drawing management with revisions
- Drawing transmittals and approvals

---

## [0.8.0] - 2025-11 - Job Orders & Invoicing

### ✨ Features
- Job Orders module with full CRUD
- Invoice generation and tracking
- PJO → JO conversion workflow
- Cost confirmation by Operations

---

## [0.7.0] - 2025-10 - PJO Itemized Financials

### ✨ Features
- Revenue/Cost line items tables
- Revenue items CRUD
- Cost items estimation
- Budget summary & health indicators

---

## [0.6.0] - 2025-09 - Quotations Module

### ✨ Features
- Quotation creation and management
- Complexity scoring system
- Engineering review workflow
- Market type classification

---

## [0.5.0] - 2025-08 - Projects & Customers

### ✨ Features
- Customer CRUD operations
- Projects management
- Role-based access control
- Google OAuth integration

---

## [0.4.0] - 2025-07 - Foundation

### ✨ Features
- Initial database schema setup
- Supabase integration
- Authentication system
- Basic navigation and layout
