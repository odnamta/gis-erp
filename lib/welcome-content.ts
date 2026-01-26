/**
 * Welcome Content Definition for GAMA ERP
 * v0.86 - Welcome Flow
 * 
 * Role-specific welcome content with Indonesian text for all 15 roles.
 * Each role has a title, description, and 2-3 quick actions.
 */

import { UserRole } from '@/types/permissions'

/**
 * Quick action button configuration
 */
export interface QuickAction {
  label: string
  href: string
  description: string
}

/**
 * Welcome content structure for each role
 */
export interface WelcomeContent {
  title: string
  description: string
  quickActions: QuickAction[]
}

/**
 * Role-specific welcome content for all 15 roles
 */
export const WELCOME_CONTENT: Record<UserRole, WelcomeContent> = {
  owner: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Owner, Anda memiliki akses penuh ke seluruh sistem termasuk laporan keuangan, persetujuan, dan manajemen pengguna. Pantau performa bisnis dan ambil keputusan strategis dengan data real-time.',
    quickActions: [
      { label: 'Executive Dashboard', href: '/dashboard/owner', description: 'Lihat ringkasan bisnis dan KPI' },
      { label: 'Kelola Pengguna', href: '/settings/users', description: 'Atur akses dan peran tim' },
      { label: 'Laporan Keuangan', href: '/reports', description: 'Analisis performa dan profitabilitas' },
    ],
  },

  director: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Director, Anda memiliki akses ke seluruh operasional dan dapat menyetujui PJO, Job Order, dan BKK. Pantau pipeline bisnis dan pastikan kelancaran operasional.',
    quickActions: [
      { label: 'Director Dashboard', href: '/dashboard/director', description: 'Lihat ringkasan operasional' },
      { label: 'Persetujuan Pending', href: '/approvals', description: 'Review dan setujui dokumen' },
      { label: 'Pipeline Bisnis', href: '/quotations', description: 'Pantau quotation dan PJO' },
    ],
  },

  sysadmin: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai System Administrator, Anda bertanggung jawab atas manajemen pengguna, pengaturan sistem, dan pemantauan aktivitas. Pastikan sistem berjalan dengan optimal.',
    quickActions: [
      { label: 'Sysadmin Dashboard', href: '/dashboard/sysadmin', description: 'Pantau status sistem' },
      { label: 'Manajemen Pengguna', href: '/settings/users', description: 'Kelola akun dan akses' },
      { label: 'Log Aktivitas', href: '/settings/activity-logs', description: 'Pantau aktivitas pengguna' },
    ],
  },

  marketing_manager: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Marketing Manager, Anda mengawasi tim marketing dan engineering. Kelola quotation, pantau pipeline penjualan, dan koordinasikan assessment teknis.',
    quickActions: [
      { label: 'Sales Dashboard', href: '/dashboard/marketing-manager', description: 'Lihat pipeline dan performa' },
      { label: 'Quotations', href: '/quotations', description: 'Kelola penawaran harga' },
      { label: 'Engineering Review', href: '/engineering', description: 'Pantau assessment teknis' },
    ],
  },

  finance_manager: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Finance Manager, Anda mengawasi administrasi dan keuangan. Kelola invoice, BKK, dan pastikan arus kas berjalan lancar.',
    quickActions: [
      { label: 'Finance Dashboard', href: '/dashboard/finance-manager', description: 'Lihat posisi keuangan' },
      { label: 'Invoice', href: '/invoices', description: 'Kelola tagihan pelanggan' },
      { label: 'BKK Pending', href: '/disbursements', description: 'Review pembayaran vendor' },
    ],
  },

  operations_manager: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Operations Manager, Anda mengawasi eksekusi job dan manajemen aset. Pantau progress pekerjaan dan pastikan utilisasi armada optimal.',
    quickActions: [
      { label: 'Operations Dashboard', href: '/dashboard/operations-manager', description: 'Lihat status operasional' },
      { label: 'Job Orders', href: '/job-orders', description: 'Pantau progress pekerjaan' },
      { label: 'Equipment', href: '/equipment', description: 'Kelola armada dan aset' },
    ],
  },

  administration: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Administration, Anda menangani persiapan PJO, invoice, dan dokumen operasional. Pastikan kelengkapan dokumen untuk setiap job.',
    quickActions: [
      { label: 'Dashboard', href: '/dashboard', description: 'Lihat tugas harian' },
      { label: 'Proforma JO', href: '/proforma-jo', description: 'Buat dan kelola PJO' },
      { label: 'Invoice', href: '/invoices', description: 'Kelola tagihan pelanggan' },
    ],
  },

  finance: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Finance, Anda menangani pembayaran, AR/AP, dan persiapan BKK. Pastikan pencatatan keuangan akurat dan tepat waktu.',
    quickActions: [
      { label: 'Finance Dashboard', href: '/dashboard/finance', description: 'Lihat status keuangan' },
      { label: 'BKK', href: '/disbursements', description: 'Kelola pembayaran vendor' },
      { label: 'Invoice', href: '/invoices', description: 'Pantau piutang pelanggan' },
    ],
  },

  marketing: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Marketing, Anda menangani pelanggan, quotation, dan estimasi biaya. Bangun hubungan baik dengan pelanggan dan menangkan lebih banyak proyek.',
    quickActions: [
      { label: 'Dashboard', href: '/dashboard', description: 'Lihat aktivitas terkini' },
      { label: 'Customers', href: '/customers', description: 'Kelola data pelanggan' },
      { label: 'Quotations', href: '/quotations', description: 'Buat penawaran harga' },
    ],
  },

  ops: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Operations, Anda menangani eksekusi job di lapangan. Catat progress pekerjaan, biaya operasional, dan koordinasikan dengan tim.',
    quickActions: [
      { label: 'Operations Dashboard', href: '/dashboard/ops', description: 'Lihat job aktif' },
      { label: 'Job Orders', href: '/job-orders', description: 'Pantau dan update progress' },
      { label: 'Equipment', href: '/equipment', description: 'Cek ketersediaan armada' },
    ],
  },

  engineer: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Engineer, Anda menangani survey, JMP, dan assessment teknis. Pastikan setiap proyek memiliki perencanaan teknis yang matang.',
    quickActions: [
      { label: 'Engineering Dashboard', href: '/dashboard/engineering', description: 'Lihat tugas engineering' },
      { label: 'Surveys', href: '/engineering/surveys', description: 'Kelola survey lapangan' },
      { label: 'JMP', href: '/engineering/jmp', description: 'Buat Job Method Plan' },
    ],
  },

  hr: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai HR, Anda menangani manajemen karyawan, absensi, dan payroll. Pastikan kesejahteraan karyawan dan kelancaran administrasi kepegawaian.',
    quickActions: [
      { label: 'HR Dashboard', href: '/dashboard/hr', description: 'Lihat ringkasan HR' },
      { label: 'Karyawan', href: '/hr/employees', description: 'Kelola data karyawan' },
      { label: 'Absensi', href: '/hr/attendance', description: 'Pantau kehadiran' },
    ],
  },

  hse: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai HSE, Anda bertanggung jawab atas keselamatan, kesehatan kerja, dan lingkungan. Pastikan semua operasi berjalan aman dan sesuai standar.',
    quickActions: [
      { label: 'HSE Dashboard', href: '/dashboard/hse', description: 'Lihat status keselamatan' },
      { label: 'Insiden', href: '/hse/incidents', description: 'Catat dan investigasi insiden' },
      { label: 'Training', href: '/hse/training', description: 'Kelola pelatihan keselamatan' },
    ],
  },

  agency: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Agency, Anda menangani operasi shipping agency termasuk booking, B/L, dan koordinasi kapal. Pastikan kelancaran operasi keagenan.',
    quickActions: [
      { label: 'Agency Dashboard', href: '/dashboard/agency', description: 'Lihat aktivitas keagenan' },
      { label: 'Bookings', href: '/agency/bookings', description: 'Kelola booking kapal' },
      { label: 'B/L', href: '/agency/bl', description: 'Kelola Bill of Lading' },
    ],
  },

  customs: {
    title: 'Selamat Datang di GAMA ERP',
    description: 'Sebagai Customs, Anda menangani dokumen kepabeanan PIB dan PEB. Pastikan kelengkapan dokumen dan kepatuhan terhadap regulasi bea cukai.',
    quickActions: [
      { label: 'Customs Dashboard', href: '/dashboard/customs', description: 'Lihat status kepabeanan' },
      { label: 'PIB', href: '/customs/pib', description: 'Kelola dokumen impor' },
      { label: 'PEB', href: '/customs/peb', description: 'Kelola dokumen ekspor' },
    ],
  },
}

/**
 * Default welcome content for unknown or undefined roles
 */
export const DEFAULT_WELCOME_CONTENT: WelcomeContent = {
  title: 'Selamat Datang di GAMA ERP',
  description: 'Sistem ERP untuk manajemen logistik heavy-haul PT. Gama Intisamudera. Gunakan menu navigasi untuk mengakses fitur yang tersedia sesuai peran Anda.',
  quickActions: [
    { label: 'Dashboard', href: '/dashboard', description: 'Lihat dashboard Anda' },
    { label: 'Bantuan', href: '/help', description: 'Pelajari cara menggunakan sistem' },
  ],
}

/**
 * Get welcome content for a specific role
 * Returns role-specific content if available, otherwise returns default content
 * 
 * @param role - The user's role
 * @returns WelcomeContent for the specified role
 */
export function getWelcomeContent(role: UserRole): WelcomeContent {
  return WELCOME_CONTENT[role] || DEFAULT_WELCOME_CONTENT
}

/**
 * User profile fields needed for welcome modal display logic
 */
export interface WelcomeCheckProfile {
  tc_accepted_at: string | null
  welcome_shown_at: string | null
}

/**
 * Determine if the welcome modal should be displayed for a user
 * 
 * The welcome modal should display if and only if:
 * 1. tc_accepted_at is not null (T&C has been accepted)
 * 2. welcome_shown_at is null (welcome modal has not been shown yet)
 * 
 * This ensures:
 * - T&C modal is always shown first (Requirement 6.1, 6.2)
 * - Welcome modal only shows once per user (Requirement 3.1, 3.2)
 * 
 * @param profile - User profile with tc_accepted_at and welcome_shown_at fields
 * @returns true if welcome modal should be displayed, false otherwise
 * 
 * @example
 * // T&C not accepted yet - don't show welcome
 * shouldShowWelcome({ tc_accepted_at: null, welcome_shown_at: null }) // false
 * 
 * // T&C accepted, welcome not shown - show welcome
 * shouldShowWelcome({ tc_accepted_at: '2026-01-26T10:00:00Z', welcome_shown_at: null }) // true
 * 
 * // T&C accepted, welcome already shown - don't show welcome
 * shouldShowWelcome({ tc_accepted_at: '2026-01-26T10:00:00Z', welcome_shown_at: '2026-01-26T10:05:00Z' }) // false
 * 
 * Validates: Requirements 3.1, 3.2, 6.1, 6.2
 */
export function shouldShowWelcome(profile: WelcomeCheckProfile): boolean {
  // T&C must be accepted first (tc_accepted_at is not null)
  const tcAccepted = profile.tc_accepted_at !== null
  
  // Welcome modal should only show if not yet shown (welcome_shown_at is null)
  const welcomeNotShown = profile.welcome_shown_at === null
  
  // Both conditions must be true to show the welcome modal
  return tcAccepted && welcomeNotShown
}
