/**
 * Email Templates — Indonesian language
 *
 * All templates for internal ERP email reminders.
 * Professional tone with warmth appropriate for internal communications.
 */

import { formatCurrency, formatDate } from '@/lib/utils/format'

// ============================================================================
// Shared Layout
// ============================================================================

function wrapInLayout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e40af; padding: 24px 32px;">
              <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:600;">
                PT. Gama Intisamudera
              </h1>
              <p style="margin:4px 0 0; color:#93c5fd; font-size:13px;">
                ${title}
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; background-color:#f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin:0; color:#6b7280; font-size:12px; text-align:center;">
                Email ini dikirim otomatis oleh Gama ERP. Mohon tidak membalas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// ============================================================================
// Invoice Reminder
// ============================================================================

interface InvoiceReminderData {
  invoiceNumber: string
  customerName: string
  amount: number
  dueDate: string
  daysOverdue: number
}

export function invoiceReminderTemplate(data: InvoiceReminderData): {
  subject: string
  html: string
} {
  const subject = `[Pengingat] Invoice ${data.invoiceNumber} - Jatuh Tempo ${data.daysOverdue} Hari`

  const urgencyColor = data.daysOverdue > 60 ? '#dc2626' : data.daysOverdue > 30 ? '#ea580c' : '#d97706'

  const body = `
    <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6;">
      Halo Tim Finance,
    </p>
    <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
      Berikut pengingat untuk invoice yang sudah melewati jatuh tempo:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#f9fafb; border-radius:6px; border: 1px solid #e5e7eb; margin-bottom:24px;">
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">No. Invoice</td>
        <td style="color:#111827; font-size:14px; font-weight:600; border-bottom: 1px solid #e5e7eb;">${data.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">Customer</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">Jumlah</td>
        <td style="color:#111827; font-size:14px; font-weight:600; border-bottom: 1px solid #e5e7eb;">${formatCurrency(data.amount)}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">Jatuh Tempo</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #e5e7eb;">${data.dueDate}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px;">Keterlambatan</td>
        <td style="font-size:14px; font-weight:700; color:${urgencyColor};">${data.daysOverdue} hari</td>
      </tr>
    </table>
    <p style="margin:0 0 8px; color:#374151; font-size:15px; line-height:1.6;">
      Mohon segera ditindaklanjuti dengan menghubungi customer untuk penagihan.
    </p>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Terima kasih atas perhatiannya.
    </p>
  `

  return { subject, html: wrapInLayout('Pengingat Invoice Jatuh Tempo', body) }
}

// ============================================================================
// Advance Return Reminder
// ============================================================================

interface AdvanceReturnReminderData {
  bkkNumber: string
  recipientName: string
  amount: number
  deadline: string
  daysOverdue: number
}

export function advanceReturnReminderTemplate(data: AdvanceReturnReminderData): {
  subject: string
  html: string
} {
  const subject = `[Pengingat] Advance BKK ${data.bkkNumber} - Lewat Deadline Pengembalian`

  const body = `
    <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6;">
      Halo Tim Finance,
    </p>
    <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
      Advance berikut sudah melewati deadline pengembalian dan belum diselesaikan:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#f9fafb; border-radius:6px; border: 1px solid #e5e7eb; margin-bottom:24px;">
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">No. BKK</td>
        <td style="color:#111827; font-size:14px; font-weight:600; border-bottom: 1px solid #e5e7eb;">${data.bkkNumber}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">Penerima</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #e5e7eb;">${data.recipientName}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">Jumlah Advance</td>
        <td style="color:#111827; font-size:14px; font-weight:600; border-bottom: 1px solid #e5e7eb;">${formatCurrency(data.amount)}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #e5e7eb;">Deadline Pengembalian</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #e5e7eb;">${data.deadline}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px;">Keterlambatan</td>
        <td style="font-size:14px; font-weight:700; color:#dc2626;">${data.daysOverdue} hari</td>
      </tr>
    </table>
    <p style="margin:0 0 8px; color:#374151; font-size:15px; line-height:1.6;">
      Mohon segera koordinasikan pengembalian advance dengan penerima terkait.
    </p>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Terima kasih.
    </p>
  `

  return { subject, html: wrapInLayout('Pengingat Pengembalian Advance', body) }
}

// ============================================================================
// Weekly AR Aging Summary
// ============================================================================

interface AgingBucket {
  label: string
  count: number
  totalAmount: number
}

interface ArAgingSummaryData {
  buckets: AgingBucket[]
  totalOutstanding: number
  totalInvoices: number
  generatedAt: string
}

export function weeklyArAgingSummaryTemplate(data: ArAgingSummaryData): {
  subject: string
  html: string
} {
  const subject = `[Laporan Mingguan] AR Aging Summary - ${data.generatedAt}`

  const bucketRows = data.buckets
    .map(
      (b) => `
      <tr>
        <td style="padding:10px 12px; color:#374151; font-size:14px; border-bottom:1px solid #e5e7eb;">${b.label}</td>
        <td style="padding:10px 12px; color:#374151; font-size:14px; text-align:center; border-bottom:1px solid #e5e7eb;">${b.count}</td>
        <td style="padding:10px 12px; color:#111827; font-size:14px; font-weight:600; text-align:right; border-bottom:1px solid #e5e7eb;">${formatCurrency(b.totalAmount)}</td>
      </tr>
    `
    )
    .join('')

  const body = `
    <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6;">
      Halo Tim Finance,
    </p>
    <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
      Berikut ringkasan piutang (AR) berdasarkan umur jatuh tempo:
    </p>

    <!-- Summary Cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <table width="100%" cellpadding="16" cellspacing="0" style="background-color:#eff6ff; border-radius:6px; border:1px solid #bfdbfe;">
            <tr>
              <td>
                <p style="margin:0; color:#3b82f6; font-size:12px; text-transform:uppercase; font-weight:600;">Total Outstanding</p>
                <p style="margin:4px 0 0; color:#1e3a5f; font-size:20px; font-weight:700;">${formatCurrency(data.totalOutstanding)}</p>
              </td>
            </tr>
          </table>
        </td>
        <td width="50%" style="padding-left:8px;">
          <table width="100%" cellpadding="16" cellspacing="0" style="background-color:#f0fdf4; border-radius:6px; border:1px solid #bbf7d0;">
            <tr>
              <td>
                <p style="margin:0; color:#16a34a; font-size:12px; text-transform:uppercase; font-weight:600;">Jumlah Invoice</p>
                <p style="margin:4px 0 0; color:#14532d; font-size:20px; font-weight:700;">${data.totalInvoices}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Aging Table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px; border:1px solid #e5e7eb; overflow:hidden; margin-bottom:24px;">
      <thead>
        <tr style="background-color:#f9fafb;">
          <th style="padding:10px 12px; color:#6b7280; font-size:12px; text-transform:uppercase; font-weight:600; text-align:left; border-bottom:2px solid #e5e7eb;">Kategori</th>
          <th style="padding:10px 12px; color:#6b7280; font-size:12px; text-transform:uppercase; font-weight:600; text-align:center; border-bottom:2px solid #e5e7eb;">Invoice</th>
          <th style="padding:10px 12px; color:#6b7280; font-size:12px; text-transform:uppercase; font-weight:600; text-align:right; border-bottom:2px solid #e5e7eb;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${bucketRows}
        <tr style="background-color:#f9fafb;">
          <td style="padding:10px 12px; color:#111827; font-size:14px; font-weight:700;">Total</td>
          <td style="padding:10px 12px; color:#111827; font-size:14px; font-weight:700; text-align:center;">${data.totalInvoices}</td>
          <td style="padding:10px 12px; color:#111827; font-size:14px; font-weight:700; text-align:right;">${formatCurrency(data.totalOutstanding)}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin:0 0 8px; color:#374151; font-size:15px; line-height:1.6;">
      Mohon prioritaskan penagihan untuk invoice yang sudah melewati 60 hari.
    </p>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Laporan ini digenerate otomatis pada ${data.generatedAt}.
    </p>
  `

  return { subject, html: wrapInLayout('Laporan AR Aging Mingguan', body) }
}

// ============================================================================
// Leave Approval Notification
// ============================================================================

interface LeaveNotificationData {
  employeeName: string
  leaveTypeName: string
  startDate: string
  endDate: string
  totalDays: number
  approverName: string
}

export function leaveApprovedTemplate(data: LeaveNotificationData): {
  subject: string
  html: string
} {
  const subject = `[Cuti Disetujui] ${data.leaveTypeName} - ${formatDate(data.startDate)} s/d ${formatDate(data.endDate)}`

  const body = `
    <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6;">
      Halo ${data.employeeName},
    </p>
    <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
      Pengajuan cuti Anda telah <strong style="color:#16a34a;">disetujui</strong>. Berikut detailnya:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#f0fdf4; border-radius:6px; border: 1px solid #bbf7d0; margin-bottom:24px;">
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #d1fae5;">Jenis Cuti</td>
        <td style="color:#111827; font-size:14px; font-weight:600; border-bottom: 1px solid #d1fae5;">${data.leaveTypeName}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #d1fae5;">Tanggal Mulai</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #d1fae5;">${formatDate(data.startDate)}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #d1fae5;">Tanggal Selesai</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #d1fae5;">${formatDate(data.endDate)}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #d1fae5;">Jumlah Hari</td>
        <td style="color:#111827; font-size:14px; font-weight:600; border-bottom: 1px solid #d1fae5;">${data.totalDays} hari</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px;">Disetujui Oleh</td>
        <td style="color:#111827; font-size:14px; font-weight:600;">${data.approverName}</td>
      </tr>
    </table>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Selamat beristirahat dan sampai jumpa kembali!
    </p>
  `

  return { subject, html: wrapInLayout('Cuti Disetujui', body) }
}

// ============================================================================
// Leave Rejection Notification
// ============================================================================

interface LeaveRejectionData extends LeaveNotificationData {
  rejectionReason: string
}

export function leaveRejectedTemplate(data: LeaveRejectionData): {
  subject: string
  html: string
} {
  const subject = `[Cuti Ditolak] ${data.leaveTypeName} - ${formatDate(data.startDate)} s/d ${formatDate(data.endDate)}`

  const body = `
    <p style="margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6;">
      Halo ${data.employeeName},
    </p>
    <p style="margin:0 0 24px; color:#374151; font-size:15px; line-height:1.6;">
      Mohon maaf, pengajuan cuti Anda <strong style="color:#dc2626;">tidak disetujui</strong>. Berikut detailnya:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#fef2f2; border-radius:6px; border: 1px solid #fecaca; margin-bottom:24px;">
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #fecaca;">Jenis Cuti</td>
        <td style="color:#111827; font-size:14px; font-weight:600; border-bottom: 1px solid #fecaca;">${data.leaveTypeName}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #fecaca;">Tanggal</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #fecaca;">${formatDate(data.startDate)} - ${formatDate(data.endDate)} (${data.totalDays} hari)</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px; border-bottom: 1px solid #fecaca;">Ditinjau Oleh</td>
        <td style="color:#111827; font-size:14px; border-bottom: 1px solid #fecaca;">${data.approverName}</td>
      </tr>
      <tr>
        <td style="color:#6b7280; font-size:13px;">Alasan Penolakan</td>
        <td style="color:#dc2626; font-size:14px; font-weight:600;">${data.rejectionReason}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px; color:#374151; font-size:15px; line-height:1.6;">
      Silakan hubungi atasan Anda jika membutuhkan penjelasan lebih lanjut atau ingin mengajukan ulang dengan tanggal yang berbeda.
    </p>
  `

  return { subject, html: wrapInLayout('Cuti Ditolak', body) }
}
