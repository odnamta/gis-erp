import { createClient } from '@/lib/supabase/server'

export interface OverdueAdvance {
  bkk_number: string
  amount: number
  deadline: string
  days_overdue: number
}

export interface AdvanceEligibility {
  eligible: boolean
  overdueAdvances: OverdueAdvance[]
}

/**
 * Check if a recipient is eligible to receive a new advance.
 * A recipient is BLOCKED if they have any overdue advances
 * (return_deadline < today AND status not settled/cancelled/rejected).
 *
 * @param recipientName - Name of the advance recipient (case-insensitive match)
 * @returns Eligibility result with details of any blocking advances
 */
export async function checkAdvanceEligibility(
  recipientName: string
): Promise<AdvanceEligibility> {
  if (!recipientName || recipientName.trim() === '') {
    return { eligible: true, overdueAdvances: [] }
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // Query for overdue advances:
  // - advance_recipient_name matches (case-insensitive via ilike)
  // - return_deadline is set and is before today
  // - status is NOT in terminal/resolved states
  const { data, error } = await (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('bkk_number, amount_requested, return_deadline, status')
    .ilike('advance_recipient_name', recipientName.trim())
    .lt('return_deadline', today)
    .not('status', 'in', '("settled","cancelled","rejected")') as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  if (error || !data) {
    // On query error, fail open but log — don't block BKK creation due to a query bug
    console.error('advance-guard query error:', error)
    return { eligible: true, overdueAdvances: [] }
  }

  const overdueAdvances: OverdueAdvance[] = (data as any[]).map((row) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const deadlineDate = new Date(row.return_deadline)
    const todayDate = new Date(today)
    const diffMs = todayDate.getTime() - deadlineDate.getTime()
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return {
      bkk_number: row.bkk_number,
      amount: Number(row.amount_requested),
      deadline: row.return_deadline,
      days_overdue: daysOverdue,
    }
  })

  return {
    eligible: overdueAdvances.length === 0,
    overdueAdvances,
  }
}

/**
 * Build a human-readable block message in Indonesian for overdue advances.
 */
export function buildAdvanceBlockMessage(
  recipientName: string,
  overdueAdvances: OverdueAdvance[]
): string {
  const count = overdueAdvances.length
  const details = overdueAdvances
    .map((adv) => {
      const deadlineFormatted = new Date(adv.deadline).toLocaleDateString(
        'id-ID',
        { day: 'numeric', month: 'long', year: 'numeric' }
      )
      const amountFormatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(adv.amount)
      return `${adv.bkk_number} (${amountFormatted}, jatuh tempo ${deadlineFormatted}, terlambat ${adv.days_overdue} hari)`
    })
    .join('; ')

  return `Penerima advance "${recipientName}" memiliki ${count} advance yang belum dikembalikan: ${details}. Advance baru tidak dapat dibuat sampai advance sebelumnya diselesaikan.`
}
