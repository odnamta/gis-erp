'use server'

import { createClient } from '@/lib/supabase/server'

export interface BKKSuggestion {
  vendor_id: string | null
  vendor_name: string | null
  vendor_code: string | null
  category: string
  purpose: string
  amount: number
  cost_item_ids: string[]
  cost_item_descriptions: string[]
}

export interface BKKAutoGenerationResult {
  suggestions: BKKSuggestion[]
  jo_number: string
  total_estimated: number
  existing_bkk_count: number
  existing_bkk_total: number
  error?: string
}

/**
 * Generate BKK suggestions from JO cost items.
 * Groups cost items by vendor + category and creates a suggested BKK for each group.
 * Only suggests for cost items that don't already have active BKKs.
 */
export async function generateBKKSuggestionsFromJO(
  joId: string
): Promise<BKKAutoGenerationResult> {
  const supabase = await createClient()

  // 1. Fetch JO with PJO link
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('id, jo_number, pjo_id')
    .eq('id', joId)
    .single()

  if (joError || !jo) {
    return {
      suggestions: [],
      jo_number: '',
      total_estimated: 0,
      existing_bkk_count: 0,
      existing_bkk_total: 0,
      error: 'Job Order tidak ditemukan',
    }
  }

  if (!jo.pjo_id) {
    return {
      suggestions: [],
      jo_number: jo.jo_number,
      total_estimated: 0,
      existing_bkk_count: 0,
      existing_bkk_total: 0,
      error: 'Job Order tidak memiliki PJO terkait',
    }
  }

  // 2. Fetch PJO cost items with vendor info
  const { data: costItems, error: costError } = await supabase
    .from('pjo_cost_items')
    .select('id, category, description, estimated_amount, vendor_id, actual_amount, status, vendors(id, vendor_name, vendor_code)')
    .eq('pjo_id', jo.pjo_id)
    .order('category')

  if (costError || !costItems) {
    return {
      suggestions: [],
      jo_number: jo.jo_number,
      total_estimated: 0,
      existing_bkk_count: 0,
      existing_bkk_total: 0,
      error: 'Gagal mengambil data cost items',
    }
  }

  // 3. Fetch existing BKKs for this JO
  const { data: existingBKKs } = await (supabase
    .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select('id, pjo_cost_item_id, amount_requested, status')
    .eq('jo_id', joId)
    .neq('status', 'cancelled')
    .neq('status', 'rejected') as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  const bkkRecords = (existingBKKs || []) as {
    id: string
    pjo_cost_item_id: string | null
    amount_requested: number
    status: string
  }[]

  const existingBKKCount = bkkRecords.length
  const existingBKKTotal = bkkRecords.reduce(
    (sum, b) => sum + Number(b.amount_requested || 0),
    0
  )

  // Build set of cost item IDs that already have active BKKs
  const coveredCostItemIds = new Set(
    bkkRecords
      .filter((b) => b.pjo_cost_item_id)
      .map((b) => b.pjo_cost_item_id!)
  )

  // 4. Filter to uncovered cost items (not confirmed/exceeded, no active BKK)
  const uncoveredItems = (costItems as any[]).filter( // eslint-disable-line @typescript-eslint/no-explicit-any
    (item) =>
      item.status !== 'confirmed' &&
      item.status !== 'exceeded' &&
      !coveredCostItemIds.has(item.id)
  )

  if (uncoveredItems.length === 0) {
    return {
      suggestions: [],
      jo_number: jo.jo_number,
      total_estimated: (costItems as any[]).reduce( // eslint-disable-line @typescript-eslint/no-explicit-any
        (sum, item) => sum + Number(item.estimated_amount || 0),
        0
      ),
      existing_bkk_count: existingBKKCount,
      existing_bkk_total: existingBKKTotal,
      error:
        existingBKKCount > 0
          ? 'Semua cost item sudah memiliki BKK'
          : undefined,
    }
  }

  // 5. Group by vendor_id + category
  const groupKey = (item: { vendor_id: string | null; category: string }) =>
    `${item.vendor_id || 'no-vendor'}::${item.category}`

  const groups = new Map<
    string,
    {
      vendor_id: string | null
      vendor_name: string | null
      vendor_code: string | null
      category: string
      items: typeof uncoveredItems
    }
  >()

  for (const item of uncoveredItems) {
    const key = groupKey(item)
    if (!groups.has(key)) {
      const vendorData = item.vendors as {
        id: string
        vendor_name: string
        vendor_code: string | null
      } | null
      groups.set(key, {
        vendor_id: item.vendor_id || null,
        vendor_name: vendorData?.vendor_name || null,
        vendor_code: vendorData?.vendor_code || null,
        category: item.category,
        items: [],
      })
    }
    groups.get(key)!.items.push(item)
  }

  // 6. Build suggestions
  const suggestions: BKKSuggestion[] = []
  for (const group of groups.values()) {
    const totalAmount = group.items.reduce(
      (sum: number, item: { estimated_amount: number }) =>
        sum + Number(item.estimated_amount || 0),
      0
    )
    const descriptions = group.items.map(
      (item: { description: string }) => item.description
    )
    const purpose = group.vendor_name
      ? `Pembayaran ke ${group.vendor_name} - ${descriptions.join(', ')}`
      : descriptions.join(', ')

    suggestions.push({
      vendor_id: group.vendor_id,
      vendor_name: group.vendor_name,
      vendor_code: group.vendor_code,
      category: group.category,
      purpose,
      amount: totalAmount,
      cost_item_ids: group.items.map((item: { id: string }) => item.id),
      cost_item_descriptions: descriptions,
    })
  }

  const totalEstimated = (costItems as any[]).reduce( // eslint-disable-line @typescript-eslint/no-explicit-any
    (sum, item) => sum + Number(item.estimated_amount || 0),
    0
  )

  return {
    suggestions,
    jo_number: jo.jo_number,
    total_estimated: totalEstimated,
    existing_bkk_count: existingBKKCount,
    existing_bkk_total: existingBKKTotal,
  }
}
