'use server'

import { createClient } from '@/lib/supabase/server'

export interface RouteHistory {
  pol: string
  pod: string
  pol_place_id: string | null
  pod_place_id: string | null
  pol_lat: number | null
  pol_lng: number | null
  pod_lat: number | null
  pod_lng: number | null
  usage_count: number
  last_used: string
}

/**
 * Get distinct route history for a customer.
 * Returns previously used POL/POD combinations as suggestions.
 */
export async function getCustomerRouteHistory(
  customerId: string
): Promise<{ data: RouteHistory[]; error?: string }> {
  const supabase = await createClient()

  // Use raw SQL for DISTINCT ON + COUNT aggregation
  const { data, error } = await supabase.rpc('get_customer_route_history' as any, {
    p_customer_id: customerId,
  })

  if (error) {
    // Fallback: simple query if RPC doesn't exist yet
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('proforma_job_orders')
      .select('pol, pod, pol_place_id, pod_place_id, pol_lat, pol_lng, pod_lat, pod_lng, created_at')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .not('pol', 'is', null)
      .not('pod', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fallbackError) {
      return { data: [], error: fallbackError.message }
    }

    // Deduplicate by POL+POD combination client-side
    const routeMap = new Map<string, RouteHistory>()
    for (const row of fallbackData || []) {
      const key = `${row.pol}|${row.pod}`
      if (routeMap.has(key)) {
        const existing = routeMap.get(key)!
        existing.usage_count++
      } else {
        routeMap.set(key, {
          pol: row.pol!,
          pod: row.pod!,
          pol_place_id: row.pol_place_id,
          pod_place_id: row.pod_place_id,
          pol_lat: row.pol_lat,
          pol_lng: row.pol_lng,
          pod_lat: row.pod_lat,
          pod_lng: row.pod_lng,
          usage_count: 1,
          last_used: row.created_at || '',
        })
      }
    }

    return { data: Array.from(routeMap.values()).slice(0, 10) }
  }

  return { data: (data || []) as RouteHistory[] }
}
