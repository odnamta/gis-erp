# Changelog

All notable changes to GAMA ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.5] - 2026-02-21 - Co-Builder Competition Scoring Fairness

### Security
- **Auth on co-builder pages** — bug tracker requires authentication, admin pages require owner/director/sysadmin role
- **Server-side deadline enforcement** — feedback, scenario, and top5 submissions rejected after Mar 12 23:59:59 WIB
- **Remove console.log invoice ID leak** — client component was logging invoice IDs to browser console
- **Auth on system-log actions** — all 8 server actions now require owner/director/sysadmin role
- **Auth on charge-type write actions** — create/update/delete/restore/reorder require owner/director/sysadmin/finance_manager role
- **Full server action auth audit** — 64 functions across 9 files were unguarded and now have auth checks:
  - `audit-actions` (6), `retention-actions` (9), `login-history-actions` (8), `sync-actions` (4) → owner/director/sysadmin
  - `profitability-actions` (3), `booking-actions` (21), `proforma-jo/actions` (9) → any logged-in user
  - `feedback` (4) → admin or logged-in user depending on function
  - `settings/users/actions` (1) → can_manage_users permission

### Fixed
- **`active_days` calculation** — leaderboard fallback always returned 1; now correctly counts unique WIB dates
- **Timezone: UTC → WIB** — first-of-day bonus, streak bonus, and active days calculations all use WIB (UTC+7) instead of UTC
- **Self-collaboration exploit** — collaboration bonus (+5 pts) now requires referencing a different user's feedback
- **Duplicate penalty incomplete** — marking feedback as duplicate now reverses ALL linked point events (base + bonuses), not just base points
- **Scenario completion fraud** — server now validates at least 1 checkpoint is pass/fail (not all skip) and rating is 1-5

### Changed
- **Daily feedback cap removed** — no limit on submissions; quality scoring and admin duplicate marking handle spam instead
- **Category multipliers removed** — suggestions (1.5x) and UX issues (1.25x) no longer get bonus multipliers; all categories scored equally by impact level only
- **Hard gate minimum requirements** — users who haven't met requirements (10 active days, 5 feedback, 2 scenarios, top5) are ranked below all qualified users
- **Leaderboard shows qualification status** — unqualified entries dimmed with "(belum lengkap)" label
- **Renamed "Login 10 hari" → "Aktif 10 hari"** — honest label for what the metric actually measures

### Data Audit
- Audited all 90 existing feedback from 7 participants: 0 self-collaboration violations, 0 overpayment from category multipliers. No retroactive corrections needed.

---

## [0.10.4] - 2026-02-21 - Supabase Edge Functions

### Added
- **4 Supabase Edge Functions** for shared business logic — satellite apps can now call the same logic via `supabase.functions.invoke()`:
  - `approve-expense` — PJO/JO/BKK workflow transitions (submit/check/approve/reject) with role-based access control
  - `bkk-generation` — create BKK with auto-numbered `BKK-YYYY-NNNN`, role-restricted to owner/director/managers/admin/finance
  - `financial-summary` — booking revenue/cost/profit aggregation, `ops` role blocked (403), profit fields hidden for non-management roles
  - `shipment-status-transition` — booking status changes validated against transition map (draft→requested→confirmed→shipped→completed)
- **`supabase/functions/_shared/`** — reusable utilities: CORS, auth (JWT + user_profiles), audit logging, workflow state machine (Maker-Checker-Approver)
- Excluded `supabase/functions` from `tsconfig.json` so Deno Edge Functions don't interfere with Next.js build

### Technical Notes
- Edge Functions coexist with existing server actions — no refactoring of existing code
- All functions deployed to Supabase project `ljbkjtaowrdddvjhsygj`
- Auth uses `user_profiles.user_id` (not `id`) per existing convention
- BKK insert maps to actual schema: `requested_by`, `status`, `purpose` (not `created_by`/`workflow_status`/`description`)

---

## [0.10.3] - 2026-02-21 - Critical Security Fixes from Deep Audit

### Security
- **Deleted zero-auth debug endpoint** (`/api/debug/test-onboarding`) — leaked schema and wrote to DB without authentication
- **Fixed page-view log poisoning** — `/api/activity/page-view` now authenticates server-side instead of trusting body-supplied userId
- **Fixed feature-flags role spoofing** — GET handler derives role from `user_profiles`, no longer trusts query params
- **Fixed executive dashboard role spoofing** — `getAllKPIsForDashboard` verifies role server-side, ignores client-supplied value
- **Tightened RLS on financial tables** — `invoices`, `payments`, `vendor_payments` SELECT policies now exclude `ops` role
- **Ops revenue masking** — JO detail/list views hide revenue, profit, and margin columns for `ops` role

### Fixed
- **Hardcoded `userRole = 'ops'`** in PJO costs page — now fetched from `user_profiles`
- **Hardcoded `userId = 'current-user-id'`** in alert dashboard — now fetched from `supabase.auth.getUser()`
- **12 stale `/jo` and `/pjo` links** replaced with `/job-orders` and `/proforma-jo` across components, utils, and tests

### Removed
- Dead stub pages `app/(main)/jo/page.tsx` and `app/(main)/pjo/page.tsx`

### Added
- `docs/OPS_REVENUE_MEMO.md` — documents full scope of ops revenue hiding for post-competition fix
- `supabase/migrations/applied/20260221_tighten_financial_rls.sql`

---

## [0.10.2] - 2026-02-20 - Test Infrastructure + Lint Cleanup

### Fixed
- **400 test errors eliminated** — added global mocks for `next/headers` and `@/lib/supabase/server` in `vitest.setup.ts`; server-side imports no longer crash in jsdom environment
- **14 unused variable lint warnings** — removed unused imports and destructured variables across 10 files (`error-dashboard-client`, `feedback-detail-sheet`, `retention-actions`, `health/route`, `document-uploader`, `preview-modal`, `document-data-form`, `sync-user-metadata`, `sync-engine`, `system-audit-utils`)
- **2 React hooks dependency warnings** — wrapped `loadComments` and `uploadFile` in `useCallback` with proper dependency arrays

### Removed
- ~28 `console.log` statements from production code (`permissions-server`, `onboarding-actions`, `notification-workflow-actions`, `retention-actions`, `conversion-actions`, `depreciation-run-utils`, `maintenance-client`, `audits/page`, `auth/callback`)

---

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
