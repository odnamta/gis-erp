'use server'

import { createClient } from '@/lib/supabase/server'

export interface HistoricalEstimation {
  avgRevenue: number
  avgCost: number
  avgMargin: number // as decimal (e.g., 0.15 = 15%)
  shipmentCount: number
  lastShipmentDate: string | null
}

/**
 * Get historical cost and revenue estimation for a given customer + POL + POD combination.
 *
 * Queries past PJOs where the same customer shipped from a similar POL to a similar POD.
 * Uses ILIKE for fuzzy matching on the first meaningful part of the address.
 *
 * Returns averages for revenue, cost, margin, plus the count and last shipment date.
 */
export async function getHistoricalEstimation(
  customerId: string,
  pol: string,
  pod: string
): Promise<{ data: HistoricalEstimation | null; error?: string }> {
  if (!customerId || !pol || !pod) {
    return { data: null }
  }

  try {
    const supabase = await createClient()

    // Get all project IDs for this customer
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('customer_id', customerId)
      .eq('is_active', true)

    if (projectError || !projects || projects.length === 0) {
      return { data: null }
    }

    const projectIds = projects.map(p => p.id)

    // Extract key parts for fuzzy matching
    const polKey = extractLocationKey(pol)
    const podKey = extractLocationKey(pod)

    // Query historical PJOs with similar routes
    // Only consider PJOs that have been at least submitted (not draft)
    const { data: pjos, error: pjoError } = await supabase
      .from('proforma_job_orders')
      .select('id, total_revenue, total_expenses, etd, created_at, status')
      .in('project_id', projectIds)
      .eq('is_active', true)
      .ilike('pol', `%${polKey}%`)
      .ilike('pod', `%${podKey}%`)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(50) // Look at up to 50 historical shipments

    if (pjoError) {
      return { data: null, error: pjoError.message }
    }

    if (!pjos || pjos.length === 0) {
      return { data: null }
    }

    // Filter out PJOs with zero revenue (incomplete data)
    const validPJOs = pjos.filter(pjo => (pjo.total_revenue ?? 0) > 0)

    if (validPJOs.length === 0) {
      return { data: null }
    }

    // Calculate averages
    const totalRevenue = validPJOs.reduce((sum, pjo) => sum + (pjo.total_revenue ?? 0), 0)
    const totalCost = validPJOs.reduce((sum, pjo) => sum + (pjo.total_expenses ?? 0), 0)
    const avgRevenue = totalRevenue / validPJOs.length
    const avgCost = totalCost / validPJOs.length

    // Calculate average margin as decimal
    const avgMargin = avgRevenue > 0 ? (avgRevenue - avgCost) / avgRevenue : 0

    // Get the most recent shipment date (use ETD or created_at)
    const lastShipmentDate = validPJOs[0]?.etd || validPJOs[0]?.created_at || null

    return {
      data: {
        avgRevenue: Math.round(avgRevenue),
        avgCost: Math.round(avgCost),
        avgMargin,
        shipmentCount: validPJOs.length,
        lastShipmentDate,
      },
    }
  } catch (error) {
    return { data: null, error: 'Gagal mengambil data estimasi historis' }
  }
}

/**
 * Extract the key part of a location string for fuzzy matching.
 * "Surabaya, Jawa Timur, Indonesia" -> "Surabaya"
 * "PT XYZ, Jl. Raya No. 1, Surabaya" -> "PT XYZ"
 */
function extractLocationKey(location: string): string {
  if (!location) return ''

  const parts = location.split(',')
  const key = parts[0].trim()

  if (key.length < 3) return location.trim()

  return key
}
