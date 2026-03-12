'use server'

/**
 * Route Rate Lookup — Server Action
 *
 * Looks up matching customer contract rates and vendor rates
 * for a given route to provide decision support during PJO creation.
 *
 * Part of the GPS-based distance/tariff decision support tool (v1).
 */

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { extractLocationKey } from '@/lib/utils/location'

export interface RateSuggestion {
  id: string
  type: 'customer' | 'vendor'
  source_name: string // customer name or vendor name
  service_type: string
  description: string
  unit: string
  base_price: number
  route_pattern: string | null // only for customer rates
  notes: string | null
}

export interface RateLookupResult {
  customerRates: RateSuggestion[]
  vendorRates: RateSuggestion[]
}

/**
 * Look up matching rate cards for a customer + route combination.
 *
 * For customer rates: matches by customer_id and route_pattern (ILIKE).
 * For vendor rates: returns all active vendor rates for common freight services
 * (trucking, equipment_rental, labor) that could apply.
 *
 * Revenue data is hidden from ops staff.
 */
export async function lookupRouteRates(
  customerId: string,
  pol: string,
  pod: string,
): Promise<{ data: RateLookupResult; error?: string }> {
  const emptyResult: RateLookupResult = { customerRates: [], vendorRates: [] }

  if (!customerId) {
    return { data: emptyResult, error: 'Customer ID diperlukan' }
  }

  const profile = await getUserProfile()
  if (!profile) {
    return { data: emptyResult, error: 'Unauthorized' }
  }

  const isOps = profile.role === 'ops'
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    // 1. Look up active customer contract rates
    let customerRates: RateSuggestion[] = []
    if (!isOps) {
      // Fetch all active customer rates for this customer
      const { data: rates } = await supabase
        .from('customer_contract_rates' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('id, service_type, description, unit, base_price, route_pattern, notes')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('service_type')

      if (rates) {
        // Filter by route pattern match if POL/POD are provided
        const polKey = pol ? extractLocationKey(pol) : ''
        const podKey = pod ? extractLocationKey(pod) : ''

        customerRates = (rates as any[]) // eslint-disable-line @typescript-eslint/no-explicit-any
          .filter(rate => {
            // Include rates with no route_pattern (applies to all routes)
            if (!rate.route_pattern) return true
            // Match route_pattern against POL-POD
            const pattern = rate.route_pattern.toLowerCase()
            if (polKey && pattern.includes(polKey.toLowerCase())) return true
            if (podKey && pattern.includes(podKey.toLowerCase())) return true
            // Also check combined format "POL - POD"
            const combined = `${pol} - ${pod}`.toLowerCase()
            if (pattern.includes(combined) || combined.includes(pattern)) return true
            return false
          })
          .map(rate => ({
            id: rate.id,
            type: 'customer' as const,
            source_name: 'Customer Contract',
            service_type: rate.service_type,
            description: rate.description,
            unit: rate.unit,
            base_price: rate.base_price,
            route_pattern: rate.route_pattern,
            notes: rate.notes,
          }))
      }
    }

    // 2. Look up active vendor rates for freight-related services
    const freightServiceTypes = ['trucking', 'equipment_rental', 'labor', 'shipping', 'port_handling']
    const { data: vendorRatesData } = await supabase
      .from('vendor_rates' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('id, vendor_id, service_type, description, unit, base_price, notes, vendors(vendor_name)')
      .in('service_type', freightServiceTypes)
      .eq('is_active', true)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('service_type')
      .order('base_price')
      .limit(20)

    const vendorRates: RateSuggestion[] = (vendorRatesData || []).map((rate: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: rate.id,
      type: 'vendor' as const,
      source_name: (rate.vendors as any)?.vendor_name || 'Unknown Vendor', // eslint-disable-line @typescript-eslint/no-explicit-any
      service_type: rate.service_type,
      description: rate.description,
      unit: rate.unit,
      base_price: rate.base_price,
      route_pattern: null,
      notes: rate.notes,
    }))

    return {
      data: {
        customerRates,
        vendorRates,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data tarif'
    return { data: emptyResult, error: message }
  }
}
