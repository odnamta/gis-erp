'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/permissions-server'
import type {
  ChartOfAccount,
  CreateChartOfAccountInput,
  JournalEntry,
  JournalEntryWithLines,
  JournalEntryLine,
  CreateJournalEntryInput,
} from '@/types/accounting'

// Roles allowed to manage GL entries
const GL_WRITE_ROLES = ['owner', 'director', 'sysadmin', 'finance_manager', 'finance'] as const

// =====================================================
// Chart of Accounts
// =====================================================

/**
 * Get all chart of accounts, optionally filtered by type
 */
export async function getChartOfAccounts(
  accountType?: string
): Promise<ChartOfAccount[]> {
  const supabase = await createClient()

  let query = supabase
    .from('chart_of_accounts' as any)
    .select('*')
    .eq('is_active', true)
    .order('account_code', { ascending: true })

  if (accountType) {
    query = query.eq('account_type', accountType)
  }

  const { data, error } = await (query as any)

  if (error) {
    return []
  }

  return (data ?? []) as ChartOfAccount[]
}

/**
 * Get a single account by ID
 */
export async function getChartOfAccountById(
  id: string
): Promise<ChartOfAccount | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('chart_of_accounts' as any)
    .select('*')
    .eq('id', id)
    .single() as any)

  if (error) {
    return null
  }

  return data as ChartOfAccount
}

/**
 * Create a new chart of account entry
 */
export async function createChartOfAccount(
  input: CreateChartOfAccountInput
): Promise<{ id?: string; error?: string }> {
  await requireRole([...GL_WRITE_ROLES])
  const supabase = await createClient()

  if (!input.account_code || !input.account_name || !input.account_type) {
    return { error: 'Kode akun, nama akun, dan tipe akun wajib diisi' }
  }

  const { data, error } = await (supabase
    .from('chart_of_accounts' as any)
    .insert({
      account_code: input.account_code,
      account_name: input.account_name,
      account_type: input.account_type,
      parent_id: input.parent_id || null,
      description: input.description || null,
      level: input.level ?? 1,
    })
    .select('id')
    .single() as any)

  if (error) {
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return { error: 'Kode akun sudah digunakan' }
    }
    return { error: error.message }
  }

  return { id: data?.id }
}

/**
 * Update a chart of account entry
 */
export async function updateChartOfAccount(
  id: string,
  input: Partial<CreateChartOfAccountInput>
): Promise<{ error?: string }> {
  await requireRole([...GL_WRITE_ROLES])
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.account_code !== undefined) updateData.account_code = input.account_code
  if (input.account_name !== undefined) updateData.account_name = input.account_name
  if (input.account_type !== undefined) updateData.account_type = input.account_type
  if (input.parent_id !== undefined) updateData.parent_id = input.parent_id || null
  if (input.description !== undefined) updateData.description = input.description || null
  if (input.level !== undefined) updateData.level = input.level

  const { error } = await (supabase
    .from('chart_of_accounts' as any)
    .update(updateData)
    .eq('id', id) as any)

  if (error) {
    return { error: error.message }
  }

  return {}
}

// =====================================================
// Journal Entries
// =====================================================

/**
 * Generate the next journal entry number
 * Format: JE-YYYY-NNNN
 */
async function generateEntryNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const prefix = `JE-${year}-`

  const { data } = await (supabase
    .from('journal_entries' as any)
    .select('entry_number')
    .like('entry_number', `${prefix}%`)
    .order('entry_number', { ascending: false })
    .limit(1) as any)

  let sequence = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].entry_number as string
    const lastSeq = parseInt(lastNumber.split('-')[2], 10)
    if (!isNaN(lastSeq)) sequence = lastSeq + 1
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`
}

/**
 * Get journal entries with optional filtering
 */
export async function getJournalEntries(options?: {
  status?: string
  sourceType?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<JournalEntry[]> {
  const supabase = await createClient()

  let query = supabase
    .from('journal_entries' as any)
    .select('*')
    .order('entry_date', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }
  if (options?.sourceType) {
    query = query.eq('source_type', options.sourceType)
  }
  if (options?.startDate) {
    query = query.gte('entry_date', options.startDate)
  }
  if (options?.endDate) {
    query = query.lte('entry_date', options.endDate)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await (query as any)

  if (error) {
    return []
  }

  return (data ?? []) as JournalEntry[]
}

/**
 * Get a single journal entry with its lines
 */
export async function getJournalEntryById(
  id: string
): Promise<JournalEntryWithLines | null> {
  const supabase = await createClient()

  // Fetch journal entry
  const { data: entry, error: entryError } = await (supabase
    .from('journal_entries' as any)
    .select('*')
    .eq('id', id)
    .single() as any)

  if (entryError || !entry) {
    return null
  }

  // Fetch lines with account info
  const { data: lines, error: linesError } = await (supabase
    .from('journal_entry_lines' as any)
    .select(`
      *,
      account:chart_of_accounts (
        account_code,
        account_name,
        account_type
      )
    `)
    .eq('journal_entry_id', id)
    .order('line_order', { ascending: true }) as any)

  if (linesError) {
    return {
      ...(entry as JournalEntry),
      lines: [],
    }
  }

  return {
    ...(entry as JournalEntry),
    lines: (lines ?? []) as JournalEntryLine[],
  }
}

/**
 * Create a new journal entry with lines
 * Validates that total debits equal total credits
 */
export async function createJournalEntry(
  input: CreateJournalEntryInput
): Promise<{ id?: string; error?: string }> {
  await requireRole([...GL_WRITE_ROLES])
  const supabase = await createClient()

  // Validate lines
  if (!input.lines || input.lines.length < 2) {
    return { error: 'Jurnal harus memiliki minimal 2 baris' }
  }

  // Validate debit = credit
  const totalDebit = input.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = input.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      error: `Total debit (${totalDebit}) harus sama dengan total kredit (${totalCredit})`,
    }
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Generate entry number
  const entryNumber = await generateEntryNumber()

  // Insert journal entry
  const { data: entryData, error: entryError } = await (supabase
    .from('journal_entries' as any)
    .insert({
      entry_number: entryNumber,
      entry_date: input.entry_date,
      description: input.description,
      source_type: input.source_type,
      source_id: input.source_id || null,
      notes: input.notes || null,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'draft',
      created_by: user?.id || null,
    })
    .select('id')
    .single() as any)

  if (entryError) {
    return { error: entryError.message }
  }

  const entryId = entryData?.id as string

  // Insert lines
  const lineInserts = input.lines.map((line, index) => ({
    journal_entry_id: entryId,
    account_id: line.account_id,
    debit: line.debit || 0,
    credit: line.credit || 0,
    description: line.description || null,
    line_order: index + 1,
  }))

  const { error: linesError } = await (supabase
    .from('journal_entry_lines' as any)
    .insert(lineInserts) as any)

  if (linesError) {
    // Soft-delete the entry if lines failed (never hard delete)
    await (supabase
      .from('journal_entries' as any)
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', entryId) as any)
    return { error: `Gagal menyimpan baris jurnal: ${linesError.message}` }
  }

  return { id: entryId }
}

/**
 * Post a draft journal entry
 */
export async function postJournalEntry(
  id: string
): Promise<{ error?: string }> {
  await requireRole([...GL_WRITE_ROLES])
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch current status
  const { data: entry, error: fetchError } = await (supabase
    .from('journal_entries' as any)
    .select('status')
    .eq('id', id)
    .single() as any)

  if (fetchError || !entry) {
    return { error: 'Jurnal tidak ditemukan' }
  }

  if ((entry as { status: string }).status !== 'draft') {
    return { error: 'Hanya jurnal berstatus draft yang dapat diposting' }
  }

  const { error } = await (supabase
    .from('journal_entries' as any)
    .update({
      status: 'posted',
      posted_by: user?.id || null,
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id) as any)

  if (error) {
    return { error: error.message }
  }

  return {}
}
