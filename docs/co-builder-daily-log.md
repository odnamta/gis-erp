# Co-Builder Daily Fix Log

> Auto-maintained log of all fixes during Co-Builder competition (Feb 12 - Mar 12, 2026).
> Used as source of truth for daily team emails and competition scoring.

---

## Day 1 — Rabu, 12 Februari 2026

**Pelapor aktif:** Reza Pramana, Luthfi Badar Nawa, Chairul Fajri

### Bug yang Ditemukan & Diperbaiki

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| 1 | Form feedback gagal terkirim | — | High | Fixed |
| 2 | Tidak bisa tambah Customer baru | Reza | High | Fixed |
| 3 | Tidak bisa tambah Project baru | Reza | High | Fixed |
| 4 | Tidak bisa tambah asset di Equipment | Luthfi/Nawa | High | Fixed |
| 5 | Error saat melaporkan insiden HSE | Reza | High | Fixed |
| 6 | Tidak bisa upload file di Project | Reza | Medium | Fixed |
| 7 | Feedback admin dashboard tidak bisa diakses Owner | — | Medium | Fixed |

### Perbaikan Sistemik
- 496 dari 776 RLS policy (64%) menggunakan nama role lama → diperbaiki via `has_role()` mapping
- 31 file frontend menggunakan nama role lama → diperbarui ke role baru

### Commits
- `157cfda` fix: Day 1 Co-Builder bugs - RLS policies, permissions, feedback admin
- `1f2a9fb` fix: update has_role() to map legacy role names across 496 RLS policies
- `042d095` fix: replace legacy role names across 31 frontend files

---

## Day 2 — Kamis, 13 Februari 2026

**Pelapor aktif:** Kurniashanti, Reza Pramana, Luthfi Badar Nawa, Choirul Anam

### Bug yang Ditemukan & Diperbaiki

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| 8 | Halaman Cost Entry 404 (route tidak ada) | — | High | Fixed |
| 9 | Tidak bisa buat Quotation, Invoice, BKK (entity_type column belum ada di production) | Kurniashanti | Critical | Fixed |
| 10 | Tidak bisa lihat Proforma JO (marketing tidak ada di navigation) | Kurniashanti | High | Fixed |
| 11 | Tidak bisa temukan tombol "New JMP" (hanya ada di Engineering Dashboard) | Kurniashanti | Medium | Fixed |
| 12 | Engineering Dashboard tidak bisa diakses marketing | Kurniashanti | Medium | Fixed |
| 13 | Role Kurniashanti salah (finance, seharusnya marketing) | Kurniashanti | High | Fixed |
| 14 | HSE incident detail page crash (null time format) | Reza, Luthfi | Medium | Fixed |
| 15 | System slow (tidak ada halaman spesifik) | Choirul Anam | Low | Monitoring deployed |

### Fitur Baru
- Halaman Cost Entry (`/cost-entry`) untuk tim operasional konfirmasi biaya PJO
- Vercel Analytics + Speed Insights (real user monitoring, live)
- Performance tracker: server action yang lambat (>1 detik) otomatis tercatat
- Tombol "New JMP" di halaman daftar JMP
- **Mode Explorer** — tombol di sidebar untuk melihat semua menu tanpa mengubah role
- Tombol feedback lama (hitam) disembunyikan selama kompetisi (hindari bingung)

### Admin Review
- Semua 16 feedback telah di-review dan diberi impact level
- 10 feedback di-mark "fixed" dengan bonus poin
- Impact multiplier diterapkan: 4 critical (x3), 7 important (x2), 5 helpful (x1)

### Perbaikan Performa
- Query database di-paralelkan (payment recording, invoice creation)
- Redundant database fetch dihapus di alur pembayaran

### Commits
- `71f08f5` fix: Day 2 Co-Builder bugs - cost entry page, PJO RLS, perf optimizations
- `93d4f27` feat: add Vercel Analytics, Speed Insights, and server action performance tracking
- `bb0e2b4` fix: disable entity_type writes - column not deployed to production
- `468e733` fix: Day 2 batch 2 - marketing role, navigation, JMP button, HSE null safety

### Masih dalam Investigasi → Resolved di Day 3

| # | Issue | Pelapor | Resolusi |
|---|-------|---------|----------|
| A | Upload file gagal di Project sidebar | Reza | **Fixed Day 3** — Next.js body limit 1MB → 11MB |
| B | HSE incident report crash | Reza, Luthfi | **Resolved Day 3** — null safety deployed, 10 kategori aktif terverifikasi |

---

## Day 3 — Jumat, 14 Februari 2026 (sebelum libur Imlek)

**Pelapor aktif:** Tidak ada feedback baru (admin review day)

### Aktivitas Admin
- Semua 16 feedback di-review: admin_status + impact_level diperbarui
- 26 point_events dimasukkan (feedback_reviewed + bug_fixed bonuses)
- Impact rating: 4 critical (x3), 7 important (x2), 5 helpful (x1)

### Perubahan Leaderboard Setelah Review

| # | Nama | Sebelum | Sesudah | Perubahan |
|---|------|---------|---------|-----------|
| 1 | Reza Pramana | 110 | **207** | +97 (5 bugs fixed, 3 critical) |
| 2 | Kurniashanti | 117 | **172** | +55 (4 bugs fixed, 1 critical) |
| 3 | Choirul Anam | 98 | **98** | 0 (helpful only) |
| 4 | Luthfi Badarnawa | 66 | **92** | +26 (2 bugs fixed) |
| 5 | Chairul Fajri | 60 | **60** | 0 (scenarios only) |

### Fitur Baru
- **Mode Explorer** — tombol di sidebar untuk melihat semua menu tanpa mengubah role
- Tombol feedback lama (hitam) disembunyikan selama kompetisi
- Form feedback diperbaiki: placeholder + tips per kategori (bug, UX, saran)

### Partisipasi Tim

| Status | Jumlah | Nama |
|--------|--------|------|
| Aktif | 5 | Reza, Kurniashanti, Choirul, Luthfi, Chairul |
| Login tapi belum submit | 6 | Hutami, Feri, Navisa, Rania, Iqbal, Khuzainan |
| Belum login | 3 | Rahadian, Dedy, Arkaba |
| Excluded (GLS-ERP) | 1 | Yuma |

### Investigasi Selesai (dari Day 2)

| # | Issue | Hasil |
|---|-------|-------|
| A | Upload file gagal di Project sidebar | **Fixed** — Next.js default body limit 1MB, file >1MB gagal. Dinaikkan ke 11MB. Bucket, RLS, dan kode sudah benar. |
| B | HSE incident report crash | **Resolved** — `formatIncidentTime()` null safety sudah deploy. Tabel `incident_categories` ada 10 kategori aktif. |

### Verifikasi Database
- Kurniashanti DB profile sudah `role: marketing` (auto-update via code fix)
- Rahadian Nugraha, Dedy Herianto, Arka Basunjaya: **belum punya akun** (tidak ada di auth.users, user_profiles, maupun employees). Perlu login pertama kali via Google OAuth.

### Bug Baru (dari Kurniashanti, Feb 14-15)

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| 16 | "View all PJO" dari marketing dashboard error (link ke /pjos, route salah) | Kurniashanti | High | Fixed |
| 17 | Tidak bisa menambahkan JMP baru (jmp_number missing + marketing blocked by RLS) | Kurniashanti | High | Fixed |
| 18 | Tidak bisa menambahkan quotation baru | Kurniashanti | Medium | Monitoring (RLS OK, entity_type deployed) |
| 19 | Tidak bisa menambahkan project | Kurniashanti | Medium | Likely stale (fixed Day 1) |

### Saran & Pertanyaan Baru

| # | Feedback | Pelapor | Type | Notes |
|---|----------|---------|------|-------|
| S1 | Penambahan kolom nama perusahaan (bingung name = orang atau perusahaan) | Kurniashanti | Suggestion | UX improvement backlog |
| S2 | Upload file road survey belum ada | Kurniashanti | Suggestion | Feature request |
| Q1 | Cara menambahkan JMP | Kurniashanti | Question | Already fixed Day 2 (stale) |

### Perbaikan Database (Production)
- `entity_type` column ditambahkan ke `quotations`, `invoices`, `bukti_kas_keluar` (default: 'gama_main')
- Entity_type writes di-enable kembali di kode (quotations, invoices, disbursements, PJO conversion)
- Marketing ditambahkan ke JMP INSERT RLS policy
- 11 feedback items admin_status diperbarui (9 fixed, 2 acknowledged)

### Commits
- `6e014ce` feat: Explorer Mode, hide old feedback button, daily fix log
- `0966d69` feat: improve feedback form with category-specific guidance
- `172c92a` chore: bump version to 0.10.0, gitignore debug artifacts
- `f31b884` fix: increase server action body size limit to 11mb for file uploads
- `015fba4` docs: update Day 3 log with investigation results and file upload fix
- `9954a1e` fix: JMP creation, PJO link, entity_type deployment, daily procedure

### Docs
- Daily procedure created: `docs/co-builder-daily-procedure.md`
- Day 2-3 update email drafted (combined)
- Style guide created: `docs/co-builder-email-style.md`

---

## Days 4-7 — Sabtu-Selasa, 15-18 Februari 2026 (weekend + pasca Imlek)

**Pelapor aktif:** Reza Pramana (6 feedback), Kurniashanti Dwi Prastyaningrum (6 feedback)

### Root Cause Ditemukan: Systematic FK Mismatch

**Akar masalah:** 12 action files menggunakan `user.id` (auth.users UUID) untuk kolom FK yang mereferensi `user_profiles(id)` (auto PK). Ini menyebabkan FK constraint violation pada hampir semua operasi INSERT.

File yang terpengaruh: `asset-actions.ts`, `pib-actions.ts`, `peb-actions.ts`, `survey-actions.ts`, `drawing-actions.ts`, `safety-document-actions.ts`, `fee-actions.ts`, `incident-actions.ts`, `safety-permit-actions.ts`, `quotations/actions.ts`, `proforma-jo/actions.ts`

### Bug yang Ditemukan & Diperbaiki

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| 20 | Asset creation spinner hangs (FK mismatch `assets.created_by`) | Reza | Critical | Fixed |
| 21 | Customer list mismatch (route survey shows inactive customers) | Reza | Important | Fixed |
| 22 | HSE incident + permit to work error (FK mismatch `employees.user_id`) | Reza | Critical | Fixed |
| 23 | PDF upload fails for 4MB file (`serverActions` under `experimental`, ignored by Next.js 15) | Reza | Important | Fixed |
| 24 | PJO cost confirmation error (`variance` + `variance_pct` are GENERATED columns) | Reza | Critical | Fixed |
| 25 | Customs PIB/PEB/fees FK mismatch (`created_by` references `user_profiles.id`) | Reza | Important | Fixed |
| 26 | Project creation fails (status check constraint missing 'draft') | Kurniashanti | Critical | Fixed |
| 27 | Quotation creation FK error (`created_by` references `user_profiles.id`) | Kurniashanti | Critical | Fixed |
| 28 | Explorer admin 404 (expected behavior: admin pages are role-gated) | Kurniashanti | Helpful | Acknowledged |
| 29 | Route survey fails silently (FK mismatch `requested_by`) | Kurniashanti | Important | Fixed |
| 30 | JMP detail tabs missing edit capability (suggestion) | Kurniashanti | Helpful | Acknowledged |
| 31 | Drawing category dropdown empty (no seed data) | Kurniashanti | Important | Fixed |

### Perbaikan Sistemik
- 12 action files diperbaiki: semua FK references ke `user_profiles(id)` kini menggunakan `profile.id` (bukan `user.id`)
- `employees.user_id` lookup juga diperbaiki (references `user_profiles.id`, bukan `auth.users.id`)
- Incident auto-create employee fallback diperbaiki
- 5 fungsi safety-permit-actions diperbaiki

### Perbaikan Database (Production)
- `projects_status_check` constraint: ditambahkan 'draft' dan 'cancelled'
- `drawing_categories`: seed 10 kategori (GA, Structural, Transport Plan, Route Map, Foundation, Rigging, Detail, As-Built, Electrical, Mechanical)

### Perbaikan Konfigurasi
- `next.config.mjs`: `serverActions.bodySizeLimit` dipindahkan dari `experimental` ke top-level (Next.js 15 requirement)

### Leaderboard (per 18 Feb)

| # | Nama | Poin |
|---|------|------|
| 1 | Reza Pramana | **374** |
| 2 | Kurniashanti Dwi Prastyaningrum | **361** |
| 3 | Choirul Anam | 98 |
| 4 | Luthfi Badarnawa | 92 |
| 5 | Chairul Fajri | 80 |

### Admin Review
- 12 feedback baru di-review dan di-score
- 10 feedback di-mark "fixed" dengan bonus poin
- 2 feedback di-mark "acknowledged" (expected behavior + suggestion)
- Impact: 5 critical (x3), 5 important (x2), 2 helpful (x1)

### Commits
- `c8776bb` fix: resolve systematic FK mismatch across 12 action files
- `fc811e9` fix: resolve remaining 15 FK mismatches across 7 action files

### Audit Batch 2 — FK Mismatch Cleanup (15 instances)

File yang diperbaiki:
- `proforma-jo/engineering-actions.ts` — 4 FK (completed_by, engineering_completed_by)
- `quotations/engineering-actions.ts` — 3 FK (completed_by, engineering_completed_by)
- `hr/leave/actions.ts` — 2 FK (approved_by)
- `hr/payroll/actions.ts` — 1 FK (approved_by)
- `app/actions/feedback.ts` — 3 FK (submitted_by, resolved_by, comment_by)
- `app/actions/error-tracking-actions.ts` — 1 FK (resolved_by)
- `app/actions/recovery-actions.ts` — 1 FK (recovered_by)

### Total FK Fixes (Batch 1 + 2)
- **27 FK mismatches** diperbaiki di **19 action files**
- Root cause: `user.id` (auth UUID) dipakai untuk kolom FK yang references `user_profiles(id)` (auto PK)

---

## Day 8 — Selasa, 18 Februari 2026 (Comprehensive Audit)

**Aktivitas:** Full app audit & security hardening

### Audit Scope
4 parallel audit agents memindai seluruh codebase:
1. Core business flow (quotations, PJO, JO, BKK, invoices, disbursements)
2. Secondary modules (HR, HSE, safety, assets, surveys, drawings, customs)
3. Auth middleware & RLS patterns
4. Frontend error handling

### FK Mismatch Batch 3 (6 instances)

| File | Function | Kolom | Fix |
|------|----------|-------|-----|
| quotations/actions.ts | convertToPJO() | created_by | user.id → profile?.id |
| incident-actions.ts | addPreventiveAction() | performedBy (history) | user?.id → profile?.id |
| drawing-actions.ts | sendTransmittal() | sent_by | user?.id → profile?.id |
| safety-document-actions.ts | approveDocument() | employee lookup | user.id → profile?.id |
| pib-actions.ts | logPIBStatusChange() | changed_by | user?.id → profile?.id |
| peb-actions.ts | logPEBStatusChange() | changed_by | user?.id → profile?.id |

### Security Fixes

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| S1 | approvePJO/rejectPJO/approveAllPJOs tanpa auth check | Critical | Added auth + can_approve_pjo permission check |
| S2 | createProject() tanpa auth check | High | Added auth check |
| S3 | saveCompanySettings() tanpa role check | High | Added owner/director/sysadmin check |
| S4 | Disbursement accepts client-provided created_by | High | Changed to server-side profile |
| S5 | Disbursement hard delete | Medium | Changed to soft delete (is_active = false) |
| S6 | Disbursement userId parameter spoofing | High | Changed to server-side profile lookup |
| S7 | PIB/PEB missing revalidatePath | Medium | Added revalidatePath to create/update |

### Total FK Fixes (Batch 1 + 2 + 3)
- **33 FK mismatches** diperbaiki di **25 action files**

### Commits
- `a3a8fa3` fix: resolve remaining FK mismatches, add auth checks, fix security issues

---

## Day 9 — Rabu, 19 Februari 2026

**Pelapor aktif:** Navisa Kafka (6), Iqbal Tito (3), Luthfi Badarnawa (5), Reza Pramana (1), Kurniashanti (1)
**Feedback baru:** 16 item hari ini (4 pagi, 10 sore, 2 malam)

### Bug yang Ditemukan & Diperbaiki (Batch Pagi — dari session sebelumnya)

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| 34 | HSE incident report FK mismatch | Multiple | Critical | Fixed |
| 35 | HSE audit type save FK mismatch | Multiple | Critical | Fixed |
| 36 | HSE training course create FK mismatch | Multiple | Critical | Fixed |
| 37 | HSE all findings page error (FK cluster) | Multiple | Critical | Fixed |
| 38 | HSE safety document save FK mismatch | Multiple | Critical | Fixed |
| 39 | Quotation PDF generate/view error (no template) | Multiple | Critical | Fixed |
| 40 | Asset registry filter bug (PostgREST syntax) | Multiple | Important | Fixed |
| 41 | Customs PIB page error (missing RLS policies) | Multiple | Important | Fixed |
| 42 | Shipping line dropdown empty (missing RLS) | Multiple | Important | Fixed |
| 43 | Customs forms null array crash | Multiple | Important | Fixed |
| 44 | Agency vessel schedules page crash | Multiple | Important | Fixed |
| 45 | HR page can't open for marketing role (explorer mode) | Navisa | Important | Fixed |

### Bug yang Ditemukan & Diperbaiki (Batch Sore — feedback baru hari ini)

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| 46 | Agency card black screen crash (field name mismatch `has_roro` → `has_ro_ro`) | Luthfi | Critical | Fixed |
| 47 | Engineering drawing can't save (silent profile query failure) | Iqbal | Important | Fixed |
| 48 | JMP can't submit for review (auth UUID used for employees FK) | Kurniashanti | Important | Fixed |
| 49 | HSE incidents blank page (null access on category join) | Luthfi | Important | Fixed |
| 50 | HSE Incident report form error | Luthfi | Important | Fixed |
| 51 | Leave request not working (getCurrentEmployeeId FK mismatch) | Reza | Important | Fixed |

### FK Mismatch Batch 4 (14 instances)

| File | Function | Kolom | Fix |
|------|----------|-------|-----|
| safety-document-actions.ts | acknowledgeDocument() | employee lookup | user.id → profile.id |
| depreciation-actions.ts | recordDepreciation() (x2) | created_by | user?.id → depProfile?.id |
| depreciation-actions.ts | recordCost() | created_by | user?.id → costProfile?.id |
| utilization-actions.ts | logDailyUtilization() (x2) | logged_by, created_by | user?.id → utilProfile?.id |
| maintenance-actions.ts | createMaintenanceRecord() (x2) | created_by | user?.id → mntProfile?.id |
| template-actions.ts | createTemplate() | created_by | user?.id → tplProfile?.id |
| template-actions.ts | generateDocument() | created_by | user?.id → genProfile?.id |
| job-equipment-actions.ts | assignEquipmentToJob() (x2) | created_by, assigned_by | user?.id → equipProfile?.id |
| agency-actions.ts | submitAgentFeedback() | created_by | user?.id → fbProfile?.id |
| integration-connection-actions.ts | createConnection() | created_by | user?.id → connProfile?.id |
| retention-actions.ts | archiveLogs() | created_by | user?.id → retProfile?.id |
| shipment-cost-actions.ts | createShipmentCost() | created_by | user.id → costProfile.id |
| shipment-revenue-actions.ts | createShipmentRevenue() | created_by | user.id → revProfile.id |

### Total FK Fixes (Batch 1 + 2 + 3 + 4 + Malam)
- **51 FK mismatches** diperbaiki di **41 action files**

### Fitur Baru
- **Quotation PDF template** — `lib/pdf/quotation-pdf.tsx` + API route `/api/pdf/quotation/[id]`
- **Explorer mode read-only banner** — notifikasi "Mode Explorer — Hanya Lihat" pada halaman yang restricted
- **`guardPage()` helper** — reusable permission + explorer mode check untuk server pages
- **Explorer mode cookie sync** — sidebar toggle sekarang sync ke cookie agar server layout bisa baca

### RLS Migration Applied
Tabel: `pib_documents`, `pib_items`, `customs_offices`, `import_types`, `shipping_lines`, `vessel_schedules`
Pattern: SELECT untuk semua authenticated, INSERT/UPDATE untuk role tertentu, DELETE hanya admin
Status: Applied via Supabase Management API (`bookings` table belum ada, di-skip)

### Explorer Mode Bypass (9 pages)
Pages yang sekarang bisa diakses dalam explorer mode dengan banner read-only:
- `/hr/*` (layout-level)
- `/customs/import`, `/customs/export`
- `/settings`
- `/disbursements`
- `/finance/vendor-invoices`
- `/quotations`
- `/cost-entry`

### Full App Audit — Additional FK Fixes (Batch Malam)

| File | Function | Kolom | Fix |
|------|----------|-------|-----|
| feedback.ts | getMySubmissions() | submitted_by | user.id → profile.id (My Feedback was returning empty!) |
| feedback.ts | addComment() notification | submitted_by comparison | user.id → profile.id (always sent notification) |
| config/route.ts | POST handler | userId | user.id → profile.id |
| feature-flags/route.ts | POST handler | updatedBy | user.id → profile.id |

### Null Safety Fixes (Batch Malam)

| File | Issue | Fix |
|------|-------|-----|
| admin/errors/page.tsx | profile possibly null after redirect | Combined null + role check for proper TS narrowing |
| admin/jobs/page.tsx | Same pattern | Same fix |
| admin/recovery/page.tsx | Same pattern | Same fix |

Note: 5 number-generation functions (invoices, disbursements, pjo, bkk, executive-dashboard) were audited but already had proper `data.length` guards.

### Navisa's Late Feedback (2 items)

| # | Feedback | Pelapor | Impact | Status |
|---|----------|---------|--------|--------|
| 52 | Container Tracking error page | Navisa | Helpful | Acknowledged (transient deploy error, code handles errors correctly) |
| 53 | No button to add employee data | Navisa | Helpful | Acknowledged (by design — HR adds employees, explorer mode is read-only) |

### Scoring Fairness Audit
- Reviewed all 64 items for scoring consistency
- Found 3 items with unfairly low `base_points=3` (equivalent items had 8):
  - Iqbal #5: "tidak bisa simpan dokumen" 3→8
  - Iqbal #7: "tanggal melakukan audit" 3→8
  - Kurniashanti #23: "View all PJO tidak bisa di akses" 3→8
- All corrected in DB + corresponding point_events updated

### Perbaikan Scoring System
- Ditemukan: `point_events` tabel tidak sinkron dengan `competition_feedback` scoring
- 41 `feedback_reviewed` events hilang (747 poin), 25 `bug_fixed` events hilang (125 poin)
- **Root cause:** Batch scoring via SQL hanya update `competition_feedback`, tidak buat `point_events`
- **Fix:** Hapus semua `feedback_reviewed` & `bug_fixed` events, re-create dari source of truth
- Total poin yang dikembalikan: **+316 poin** tersebar ke semua peserta
- Terdampak paling besar: Iqbal (+197), Luthfi (+108), Reza (+68), Navisa (+56)

### Admin Review
- 24 feedback dari batch pagi di-review (session sebelumnya)
- 10 feedback sore di-review dan di-score
- 2 feedback malam dari Navisa di-review dan di-score
- Scoring fairness audit: 3 base_points anomalies corrected (3→8)
- Saran yang masuk: JMP PDF export, manual project name di drawing, maintenance record edit button, schedule maintenance UX
- Semua 66 feedback items (0 unscored)

### Leaderboard (per 19 Feb malam, final)

| # | Nama | Total | Feedback | Skenario | Bonus |
|---|------|-------|----------|----------|-------|
| 1 | Reza Pramana | **539** | 338 | 120 | 81 |
| 2 | Iqbal Tito | **491** | 352 | 100 | 39 |
| 3 | Kurniashanti Dwi P. | **410** | 241 | 100 | 69 |
| 4 | Luthfi Badarnawa | **384** | 218 | 120 | 46 |
| 5 | Navisa Kafka | **223** | 108 | 80 | 35 |
| 6 | Choirul Anam | **114** | 32 | 80 | 2 |
| 7 | Chairul Fajri | **88** | 8 | 80 | 0 |

**Perubahan ranking:** Iqbal naik dari #3 ke #2 (melewati Kurniashanti). Navisa naik signifikan (+39 dari scoring fairness + 2 new items).

### Commits
- `e6d44fc` fix: resolve 25 FK mismatches, add quotation PDF, fix asset filter & agency schedules
- `6703dde` fix: allow HR access in explorer mode for co-builder competition
- `ea93008` feat: add explorer mode read-only banner and bypass for restricted pages
- `099b47e` fix: resolve 6 bugs from Day 9 co-builder feedback
- `1a22cf2` docs: update Day 9 log and CHANGELOG with scoring corrections
- `f1a10f8` fix: resolve 4 additional FK mismatches from full app audit
- `bade528` fix: null safety on admin pages profile access

### Scoring Policy Update (effective Day 10+)

**New incentive: Workflow & Productivity suggestions**
- Workflow suggestions (add, remove, or simplify steps) now scored at `base_points=15` (was 8, same as general suggestions)
- New bonus event: `suggestion_adopted` = **10 pts** when a suggestion is actually implemented (vs `bug_fixed` = 5 pts)
- Rationale: A good workflow insight has more long-term productivity impact than a single bug fix
- Communicated to team via next email update

**Updated scoring table:**
| Category | base_points | Bonus when implemented |
|----------|------------|----------------------|
| Bug | 8 | `bug_fixed` = 5 pts |
| UX Issue | 8 | `bug_fixed` = 5 pts |
| General suggestion | 8 | — |
| **Workflow / Productivity** | **15** | `suggestion_adopted` = **10 pts** |
| Question | 8 | — |

---

## Days 10-12 — Kamis-Sabtu, 20-22 Februari 2026

**Pelapor aktif:** Kurniashanti (16 feedback), Choirul Anam (6), Iqbal Tito (1), Navisa Kafka (1), Hutami Widya Arini (2)
**Feedback baru:** 25 item (terbanyak dari Kurniashanti: 16 item)
**Pelapor baru:** Hutami Widya Arini (pertama kali submit feedback), Arka Basunjaya (login pertama kali Feb 20)

### Root Cause Ditemukan: Missing Employee Records

**Akar masalah:** SEMUA peserta co-builder tidak memiliki record di tabel `employees`. Ini menyebabkan kegagalan di semua modul yang memerlukan employee ID (HSE, Leave, Engineering actions). Auto-create fallback gagal karena RLS memblokir INSERT dari non-HR role.

**Fix:** 12 employee records dibuat untuk semua peserta co-builder.

### Root Cause Ditemukan: Employees Query Wrong Column

**Akar masalah:** Query employees di `hse/incidents/report/page.tsx` dan `hse/incidents/[id]/page.tsx` menggunakan `.eq('is_active', true)` padahal kolom yang benar adalah `status` (bukan `is_active`). Ini menyebabkan dropdown employee selalu kosong.

**Fix:** `.eq('is_active', true)` → `.eq('status', 'active')`

### Bug yang Ditemukan & Diperbaiki

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| 54 | Route survey tidak bisa ditambahkan (marketing FK/RLS) | Kurniashanti | Important | Fixed |
| 55 | Generate PDF quotation error | Kurniashanti | Important | Investigating |
| 56 | Tidak bisa menambahkan PJO (requires revenue+cost items) | Kurniashanti | Important | Acknowledged |
| 57 | JMP tidak bisa submit to review (employee record missing) | Kurniashanti | Important | Fixed |
| 58 | Drawing tidak berhasil ditambahkan (employee record missing) | Kurniashanti | Important | Fixed |
| 59 | Revenue by customer financial report 404 (wrong href) | Kurniashanti | Critical | Fixed |
| 60 | Tidak bisa menambahkan shipping line (explorer RLS) | Kurniashanti | Important | Fixed |
| 61 | Tidak bisa melaporkan incident (employees query + no record) | Kurniashanti | Critical | Fixed |
| 62 | Settings blank (explorer mode redirect — by design) | Kurniashanti | Helpful | Acknowledged |
| 63 | "My Leave" menu tidak bisa (HR layout too restrictive) | Kurniashanti | Critical | Fixed |
| 64 | JMP tidak bisa di print (window.print only) | Kurniashanti | Important | Acknowledged |
| 65 | PEB customs page error (null safety explorer mode) | Navisa | Important | Fixed |
| 66 | HSE laporkan insiden error (employees query + no record) | Iqbal | Critical | Fixed |
| 67 | "Performa JO" system bagus (positive feedback) | Choirul | Helpful | Acknowledged |
| 68 | HSE Report Incidents error (employees query + no record) | Choirul | Important | Fixed |
| 69 | Financial Report Revenue breakdown error (wrong href) | Choirul | Important | Fixed |
| 70 | Revenue by project access denied (finance role missing) | Choirul | Important | Fixed |

### Saran & Pertanyaan Baru

| # | Feedback | Pelapor | Type | Status |
|---|----------|---------|------|--------|
| Q2 | Cara menghapus quotation | Kurniashanti | Question | Answered — by design |
| S3 | Active journey — no add button | Kurniashanti | Suggestion | Acknowledged |
| S4 | Penambahan carrier type (sliding trailer) | Kurniashanti | Suggestion | Fixed — 3 types added |
| S5 | Quotation flow — customer double input | Hutami | Workflow | Acknowledged — high impact |
| S6 | Quotation flow — project name double input | Hutami | Workflow | Acknowledged |
| S7 | P&L report — PPh erodes profit | Choirul | Suggestion | Acknowledged |
| S8 | Report — "other" category fix needed | Choirul | Suggestion | Fixed — Indonesian keywords |
| S9 | Invoice creation flow — proforma based | Choirul | Suggestion | Acknowledged |

### Perbaikan Sistemik
- 12 employee records dibuat untuk semua peserta co-builder (root cause HSE + Leave + Engineering failures)
- `employees` query `.eq('is_active', true)` → `.eq('status', 'active')` di 2 file HSE
- Report permissions: duplicate `revenue-customer` entry (wrong href) diperbaiki ke `revenue-by-customer`
- `revenue-by-project` report: `finance` role ditambahkan ke allowedRoles
- HR layout: diperbuka untuk self-service routes (my-leave, my-attendance) — semua user authenticated bisa akses
- HSE nav: `marketing_manager` dan `finance_manager` ditambahkan (konsisten dengan permissions.ts)
- PEB customs page: null safety pada documents dan customs offices data
- Carrier type: ditambahkan SLIDING TRAILER, EXTENDABLE TRAILER, MULTI AXLE TRAILER
- Revenue categorization P&L: ditambahkan keyword Indonesia (kirim, angkut, mobilisasi, pelabuhan, bongkar, muat, dll)

### Partisipasi Tim

| Status | Jumlah | Nama |
|--------|--------|------|
| Aktif (submit feedback) | 7 | Kurniashanti, Reza, Iqbal, Luthfi, Navisa, Choirul, **Hutami** (NEW!) |
| Skenario saja | 1 | Chairul |
| Login tapi belum submit | 4 | **Arka** (login Feb 20), Feri, Rania, Khuzainan |
| Belum login | 2 | Rahadian, Dedy |
| Excluded (GLS-ERP) | 1 | Yuma |

### Leaderboard (per 22 Feb malam, final)

| # | Nama | Total | Feedback | Skenario | Bonus | Perubahan |
|---|------|-------|----------|----------|-------|-----------|
| 1 | **Kurniashanti** | **915** | 594 | 100 | 221 | +505 (16 feedback, massive sprint!) |
| 2 | Iqbal Tito | **571** | 402 | 100 | 69 | +80 (1 critical HSE bug) |
| 3 | Reza Pramana | **539** | 338 | 120 | 81 | — (no new feedback) |
| 4 | Luthfi Badarnawa | **384** | 218 | 120 | 46 | — (no new feedback) |
| 5 | Choirul Anam | **343** | 189 | 160 | -6 | +229 (6 feedback, 8 scenarios!) |
| 6 | Navisa Kafka | **274** | 124 | 100 | 50 | +51 (1 PEB bug) |
| 7 | **Hutami Widya Arini** | **107** | 75 | 0 | 32 | NEW (2 workflow suggestions) |
| 8 | Chairul Fajri | **88** | 8 | 80 | 0 | — (scenarios only) |

**Kurniashanti meledak** — dari #3 ke #1 dengan selisih besar (+505 pts dalam 3 hari, 16 feedback items). Sekarang unggul 344 poin dari #2.

### Commits
- (pending push)

---

<!-- Template for new days:

## Day N — [Hari], [Tanggal] 2026

**Pelapor aktif:** [names]

### Bug yang Ditemukan & Diperbaiki

| # | Bug | Pelapor | Severity | Status |
|---|-----|---------|----------|--------|
| | | | | |

### Fitur Baru
-

### Commits
-

### Masih dalam Investigasi

| # | Issue | Pelapor | Notes |
|---|-------|---------|-------|
| | | | |

-->
