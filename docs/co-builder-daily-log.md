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
