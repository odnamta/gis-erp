// group-summary — GET
// Returns standardized KPIs for the Gama Group Dashboard (Layer 3).
// Restricted to owner/director/sysadmin roles.
//
// This is the standard Edge Function pattern that every subsidiary ERP
// must implement. The Group Dashboard calls this to aggregate KPIs.
//
// Schema: GroupSummaryResponse (defined in gama-dashboard/src/lib/types/group-summary.ts)

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getUserProfile } from '../_shared/auth.ts'

const ALLOWED_ROLES = ['owner', 'director', 'sysadmin']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions()

  try {
    if (req.method !== 'GET') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
    }

    // 1. Auth — two paths:
    //    a) Service-role JWT: decode Authorization bearer, check role=service_role (server-to-server)
    //    b) User JWT: standard getUserProfile flow (browser/app)
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    let isServiceRole = false

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.role === 'service_role') isServiceRole = true
      } catch { /* not a valid JWT, fall through to user auth */ }
    }

    if (!isServiceRole) {
      const { profile } = await getUserProfile(req)
      if (!ALLOWED_ROLES.includes(profile.role)) {
        return jsonResponse(
          { success: false, error: 'Akses hanya untuk owner/director' },
          403
        )
      }
    }

    // 2. Determine period (default: current month)
    const url = new URL(req.url)
    const periodParam = url.searchParams.get('period') // YYYY-MM
    const now = new Date()
    const period = periodParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [year, month] = period.split('-').map(Number)
    const periodStart = new Date(year, month - 1, 1).toISOString()
    const periodEnd = new Date(year, month, 0, 23, 59, 59).toISOString()

    // 3. Use service client for cross-table aggregation
    const supabase = createServiceClient()

    // 4. Fetch all KPI data in parallel
    const [
      revenueResult,
      activeJobsResult,
      outstandingInvoicesResult,
      employeeResult,
      activeShipmentsResult,
      customerResult,
      overdueResult,
      completedResult,
      totalJobsResult,
    ] = await Promise.all([
      // Monthly revenue from shipment_revenue
      supabase
        .from('shipment_revenue')
        .select('amount_idr')
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd),

      // Active jobs (status not completed/cancelled)
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("completed","cancelled")'),

      // Outstanding invoices
      supabase
        .from('invoices')
        .select('id, total_amount')
        .in('status', ['sent', 'overdue']),

      // Active employees
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // Active shipments (in transit)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['in_progress', 'loading', 'in_transit']),

      // Active customers
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // Overdue invoices
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'overdue'),

      // Completed jobs this period
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', periodStart)
        .lte('updated_at', periodEnd),

      // Total jobs this period (for completion rate)
      supabase
        .from('job_orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd),
    ])

    // 5. Calculate KPIs
    const revenueMonthly = (revenueResult.data || []).reduce(
      (sum: number, r: { amount_idr: number }) => sum + (r.amount_idr || 0),
      0
    )

    const outstandingAmount = (outstandingInvoicesResult.data || []).reduce(
      (sum: number, inv: { total_amount: number }) => sum + (inv.total_amount || 0),
      0
    )

    const totalJobs = totalJobsResult.count || 0
    const completedJobs = completedResult.count || 0
    const completionRate = totalJobs > 0
      ? Math.round((completedJobs / totalJobs) * 100)
      : 0

    // 6. Build alerts
    const alerts: Array<{ severity: string; message: string; timestamp: string }> = []

    if ((overdueResult.count || 0) > 0) {
      alerts.push({
        severity: 'warning',
        message: `${overdueResult.count} invoice jatuh tempo`,
        timestamp: now.toISOString(),
      })
    }

    if (completionRate < 50 && totalJobs > 5) {
      alerts.push({
        severity: 'warning',
        message: `Completion rate rendah: ${completionRate}%`,
        timestamp: now.toISOString(),
      })
    }

    // 7. Build response matching GroupSummaryResponse schema
    const response = {
      subsidiary_id: 'gis',
      subsidiary_name: 'PT Gama Intisamudera',
      subsidiary_type: 'freight_domestic',
      period,
      kpis: {
        revenue_monthly: revenueMonthly,
        active_jobs: activeJobsResult.count || 0,
        outstanding_invoices: outstandingInvoicesResult.count || 0,
        outstanding_amount: outstandingAmount,
        employee_count: employeeResult.count || 0,
        active_shipments: activeShipmentsResult.count || 0,
        customer_count: customerResult.count || 0,
        overdue_payments: overdueResult.count || 0,
        completion_rate: completionRate,
      },
      gamification: {
        total_points: 0, // TODO: wire to Co-Builder competition data
        active_streaks: 0,
        top_performer: null,
        leaderboard_position: null,
      },
      alerts,
      generated_at: now.toISOString(),
    }

    return jsonResponse({ success: true, data: response }, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message.includes('Authorization') || message.includes('token') ? 401 : 500

    return jsonResponse({ success: false, error: message }, status)
  }
})

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
