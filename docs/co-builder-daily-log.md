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

### Masih dalam Investigasi

| # | Issue | Pelapor | Notes |
|---|-------|---------|-------|
| A | Upload file gagal di Project sidebar | Reza | Code & RLS OK. Kemungkinan config Supabase Storage bucket |
| B | HSE incident report masih crash (jika null fix tidak cukup) | Reza, Luthfi | Perlu cek: (1) tabel incident_categories ada data, (2) employee record terhubung |

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
