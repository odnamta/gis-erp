'use server'

import { createClient } from '@/lib/supabase/server'
import { extractLocationKey } from '@/lib/utils/location'

export interface PJODuplicateResult {
  id: string
  pjo_number: string
  pol: string | null
  pod: string | null
  etd: string | null
  eta: string | null
  total_revenue: number
  status: string
  created_at: string
}

export interface InvoiceDuplicateResult {
  id: string
  invoice_number: string
  total_amount: number
  invoice_date: string | null
  status: string
  customer_name: string | null
}

/**
 * Check for potential duplicate PJOs based on same customer, same POL/POD,
 * and overlapping date range.
 *
 * A PJO is considered a potential duplicate when:
 * - Same customer (via project)
 * - Same or similar POL and POD (ILIKE match on first significant part)
 * - ETD/ETA overlaps with existing PJO date range
 */
export async function checkPJODuplicates(
  customerId: string,
  pol: string,
  pod: string,
  etd: string | null,
  eta: string | null
): Promise<{ duplicates: PJODuplicateResult[]; error?: string }> {
  if (!customerId || !pol || !pod) {
    return { duplicates: [] }
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
      return { duplicates: [] }
    }

    const projectIds = projects.map(p => p.id)

    // Extract the first meaningful part of POL/POD for fuzzy matching
    // e.g., "Surabaya, Jawa Timur" -> "Surabaya"
    const polKey = extractLocationKey(pol)
    const podKey = extractLocationKey(pod)

    // Query PJOs for this customer's projects with similar routes
    let query = supabase
      .from('proforma_job_orders')
      .select('id, pjo_number, pol, pod, etd, eta, total_revenue, status, created_at')
      .in('project_id', projectIds)
      .eq('is_active', true)
      .neq('status', 'cancelled')
      .ilike('pol', `%${polKey}%`)
      .ilike('pod', `%${podKey}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: pjos, error: pjoError } = await query

    if (pjoError) {
      return { duplicates: [], error: pjoError.message }
    }

    if (!pjos || pjos.length === 0) {
      return { duplicates: [] }
    }

    // Filter for date overlap if ETD/ETA provided
    let filtered = pjos as PJODuplicateResult[]
    if (etd && eta) {
      const newStart = new Date(etd)
      const newEnd = new Date(eta)

      filtered = pjos.filter(pjo => {
        if (!pjo.etd || !pjo.eta) return true // Include if no dates (still a potential match)
        const existingStart = new Date(pjo.etd)
        const existingEnd = new Date(pjo.eta)

        // Check for date range overlap: newStart <= existingEnd AND newEnd >= existingStart
        return newStart <= existingEnd && newEnd >= existingStart
      }) as PJODuplicateResult[]
    }

    return { duplicates: filtered }
  } catch (error) {
    return { duplicates: [], error: 'Gagal memeriksa duplikat PJO' }
  }
}

/**
 * Check for potential duplicate invoices based on same customer,
 * similar amount (within 5% tolerance), and within 7 days.
 */
export async function checkInvoiceDuplicates(
  customerId: string,
  amount: number,
  invoiceDate: string
): Promise<{ duplicates: InvoiceDuplicateResult[]; error?: string }> {
  if (!customerId || !amount || !invoiceDate) {
    return { duplicates: [] }
  }

  try {
    const supabase = await createClient()

    // Calculate date range: 7 days before and after
    const date = new Date(invoiceDate)
    const startDate = new Date(date)
    startDate.setDate(startDate.getDate() - 7)
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 7)

    // Calculate amount tolerance: +/- 5%
    const lowerBound = amount * 0.95
    const upperBound = amount * 1.05

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, total_amount, invoice_date, status,
        customers (name)
      `)
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .gte('invoice_date', startDate.toISOString().split('T')[0])
      .lte('invoice_date', endDate.toISOString().split('T')[0])
      .gte('total_amount', lowerBound)
      .lte('total_amount', upperBound)
      .neq('status', 'cancelled')
      .order('invoice_date', { ascending: false })
      .limit(10)

    if (error) {
      return { duplicates: [], error: error.message }
    }

    if (!invoices || invoices.length === 0) {
      return { duplicates: [] }
    }

    const results: InvoiceDuplicateResult[] = invoices.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      total_amount: inv.total_amount,
      invoice_date: inv.invoice_date,
      status: inv.status,
      customer_name: (inv.customers as { name: string } | null)?.name ?? null,
    }))

    return { duplicates: results }
  } catch (error) {
    return { duplicates: [], error: 'Gagal memeriksa duplikat invoice' }
  }
}

