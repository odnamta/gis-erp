// financial-summary — GET
// Aggregated financial summary for a booking (revenue, cost, profit).
// Ported from app/actions/profitability-actions.ts getBookingFinancialSummary()
// ops role cannot access — returns 403.

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { createUserClient } from '../_shared/supabase.ts'
import { getUserProfile } from '../_shared/auth.ts'

// Roles that CANNOT see financial data
const BLOCKED_ROLES = ['ops']

// Roles that can see profit (management and above)
const PROFIT_VISIBLE_ROLES = [
  'owner', 'director', 'marketing_manager', 'finance_manager',
  'operations_manager', 'sysadmin', 'finance', 'administration',
]

const DEFAULT_MARGIN_TARGET = 20

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions()

  try {
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Auth
    const { profile, authHeader } = await getUserProfile(req)

    // ops cannot see financial data
    if (BLOCKED_ROLES.includes(profile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'You do not have permission to view financial data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse booking_id from query params
    const url = new URL(req.url)
    const bookingId = url.searchParams.get('booking_id')

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameter: booking_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createUserClient(authHeader)

    // 3. Fetch revenue + costs in parallel
    const [revenueResult, costResult] = await Promise.all([
      supabase
        .from('shipment_revenue')
        .select('amount_idr, tax_amount, billing_status')
        .eq('booking_id', bookingId),
      supabase
        .from('shipment_costs')
        .select('amount_idr, tax_amount, total_amount, paid_amount, payment_status')
        .eq('booking_id', bookingId),
    ])

    if (revenueResult.error) {
      return new Response(
        JSON.stringify({ success: false, error: `Revenue query failed: ${revenueResult.error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (costResult.error) {
      return new Response(
        JSON.stringify({ success: false, error: `Cost query failed: ${costResult.error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const revenue = revenueResult.data || []
    const costs = costResult.data || []

    // 4. Calculate totals
    const totalRevenue = revenue.reduce((sum: number, r: Record<string, number>) => sum + (r.amount_idr || 0), 0)
    const totalRevenueTax = revenue.reduce((sum: number, r: Record<string, number>) => sum + (r.tax_amount || 0), 0)
    const totalCost = costs.reduce((sum: number, c: Record<string, number>) => sum + (c.amount_idr || 0), 0)
    const totalCostTax = costs.reduce((sum: number, c: Record<string, number>) => sum + (c.tax_amount || 0), 0)

    const grossProfit = totalRevenue - totalCost
    const profitMarginPct = totalRevenue > 0
      ? Math.round((grossProfit / totalRevenue) * 10000) / 100
      : 0

    const unbilledRevenue = revenue
      .filter((r: Record<string, unknown>) => r.billing_status === 'unbilled')
      .reduce((sum: number, r: Record<string, number>) => sum + (r.amount_idr || 0), 0)

    const unpaidCosts = costs
      .filter((c: Record<string, unknown>) => c.payment_status === 'unpaid' || c.payment_status === 'partial')
      .reduce((sum: number, c: Record<string, number>) => sum + ((c.total_amount || 0) - (c.paid_amount || 0)), 0)

    // 5. Build response — omit profit fields if role lacks visibility
    const canSeeProfits = PROFIT_VISIBLE_ROLES.includes(profile.role)

    const data: Record<string, unknown> = {
      total_revenue: totalRevenue,
      total_revenue_tax: totalRevenueTax,
      total_cost: totalCost,
      total_cost_tax: totalCostTax,
      unbilled_revenue: unbilledRevenue,
      unpaid_costs: unpaidCosts,
    }

    if (canSeeProfits) {
      data.gross_profit = grossProfit
      data.profit_margin_pct = profitMarginPct
      data.target_margin_pct = DEFAULT_MARGIN_TARGET
      data.is_target_met = profitMarginPct >= DEFAULT_MARGIN_TARGET
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message.includes('Authorization') || message.includes('token') ? 401 : 500

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
