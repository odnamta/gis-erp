-- Migration: Dashboard RPC Functions
-- Replaces heavy client-side JS processing with server-side SQL aggregation
-- Each function returns JSONB with pre-computed dashboard data
-- Phase 2 of dashboard performance optimization

-- ============================================================================
-- 1. SALES DASHBOARD METRICS
-- Replaces: 3 Supabase queries + 6 JS calculation functions
-- Returns: kpis, pipeline, pendingFollowups, topCustomers, winLossData
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sales_dashboard_metrics(
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_prev_start TIMESTAMPTZ,
  p_prev_end TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kpis JSONB;
  v_pipeline JSONB;
  v_followups JSONB;
  v_top_customers JSONB;
  v_win_loss JSONB;
  v_draft_cnt INT;
  v_pending_cnt INT;
  v_approved_cnt INT;
  v_converted_cnt INT;
  v_rejected_cnt INT;
  v_draft_val NUMERIC;
  v_pending_val NUMERIC;
  v_approved_val NUMERIC;
  v_converted_val NUMERIC;
  v_rejected_val NUMERIC;
  v_new_customers_count BIGINT;
BEGIN
  -- ── Pipeline stage counts and values (period-filtered) ──
  SELECT
    COUNT(*) FILTER (WHERE status = 'draft'),
    COUNT(*) FILTER (WHERE status = 'pending_approval'),
    COUNT(*) FILTER (WHERE status = 'approved' AND (converted_to_jo IS NULL OR converted_to_jo = false)),
    COUNT(*) FILTER (WHERE status = 'approved' AND converted_to_jo = true),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COALESCE(SUM(COALESCE(total_revenue_calculated, estimated_amount, 0))
      FILTER (WHERE status = 'draft'), 0),
    COALESCE(SUM(COALESCE(total_revenue_calculated, estimated_amount, 0))
      FILTER (WHERE status = 'pending_approval'), 0),
    COALESCE(SUM(COALESCE(total_revenue_calculated, estimated_amount, 0))
      FILTER (WHERE status = 'approved' AND (converted_to_jo IS NULL OR converted_to_jo = false)), 0),
    COALESCE(SUM(COALESCE(total_revenue_calculated, estimated_amount, 0))
      FILTER (WHERE status = 'approved' AND converted_to_jo = true), 0),
    COALESCE(SUM(COALESCE(total_revenue_calculated, estimated_amount, 0))
      FILTER (WHERE status = 'rejected'), 0)
  INTO v_draft_cnt, v_pending_cnt, v_approved_cnt, v_converted_cnt, v_rejected_cnt,
       v_draft_val, v_pending_val, v_approved_val, v_converted_val, v_rejected_val
  FROM proforma_job_orders
  WHERE is_active IS NOT FALSE
    AND created_at >= p_period_start AND created_at <= p_period_end;

  -- ── Pipeline stages with conversion rates ──
  v_pipeline := jsonb_build_array(
    jsonb_build_object(
      'status', 'draft',
      'count', v_draft_cnt,
      'value', v_draft_val,
      'conversionRate', CASE
        WHEN v_draft_cnt > 0 THEN
          ROUND(((v_pending_cnt + v_approved_cnt + v_converted_cnt)::NUMERIC
            / (v_pending_cnt + v_approved_cnt + v_converted_cnt + v_draft_cnt)) * 100, 1)
        ELSE NULL
      END
    ),
    jsonb_build_object(
      'status', 'pending_approval',
      'count', v_pending_cnt,
      'value', v_pending_val,
      'conversionRate', CASE
        WHEN v_pending_cnt > 0 THEN
          ROUND(((v_approved_cnt + v_converted_cnt)::NUMERIC
            / (v_approved_cnt + v_converted_cnt + v_pending_cnt)) * 100, 1)
        ELSE NULL
      END
    ),
    jsonb_build_object(
      'status', 'approved',
      'count', v_approved_cnt,
      'value', v_approved_val,
      'conversionRate', CASE
        WHEN v_approved_cnt > 0 THEN
          ROUND((v_converted_cnt::NUMERIC / (v_converted_cnt + v_approved_cnt)) * 100, 1)
        ELSE NULL
      END
    ),
    jsonb_build_object(
      'status', 'converted',
      'count', v_converted_cnt,
      'value', v_converted_val,
      'conversionRate', NULL::NUMERIC
    ),
    jsonb_build_object(
      'status', 'rejected',
      'count', v_rejected_cnt,
      'value', v_rejected_val,
      'conversionRate', NULL::NUMERIC
    )
  );

  -- ── New customers count ──
  SELECT COUNT(*)
  INTO v_new_customers_count
  FROM customers
  WHERE created_at >= p_period_start AND created_at <= p_period_end;

  -- ── KPIs ──
  v_kpis := jsonb_build_object(
    'pipelineValue', v_draft_val + v_pending_val + v_approved_val,
    'pipelineCount', v_draft_cnt + v_pending_cnt + v_approved_cnt,
    'winRate', CASE
      WHEN (v_converted_cnt + v_rejected_cnt) > 0 THEN
        ROUND((v_converted_cnt::NUMERIC / (v_converted_cnt + v_rejected_cnt)) * 100, 1)
      ELSE 0
    END,
    'winRateTarget', 60,
    'activePJOsCount', v_draft_cnt + v_pending_cnt,
    'newCustomersCount', v_new_customers_count
  );

  -- ── Pending followups (no date filter — status-filtered) ──
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'pjo_number', p.pjo_number,
      'customer_name', COALESCE(c.name, 'Unknown'),
      'value', COALESCE(p.total_revenue_calculated, p.estimated_amount, 0),
      'status', p.status,
      'days_in_status', GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - p.created_at))::INT,
      'staleness', CASE
        WHEN p.status = 'draft' AND GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - p.created_at))::INT > 7 THEN 'alert'
        WHEN p.status = 'draft' AND GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - p.created_at))::INT > 5 THEN 'warning'
        WHEN p.status = 'pending_approval' AND GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - p.created_at))::INT > 3 THEN 'warning'
        ELSE 'normal'
      END,
      'created_at', p.created_at
    ) ORDER BY GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - p.created_at))::INT DESC
  ), '[]'::jsonb)
  INTO v_followups
  FROM proforma_job_orders p
  LEFT JOIN projects pr ON pr.id = p.project_id
  LEFT JOIN customers c ON c.id = pr.customer_id
  WHERE p.is_active IS NOT FALSE
    AND p.status IN ('draft', 'pending_approval');

  -- ── Top customers (current vs previous period, approved PJOs only) ──
  WITH current_customers AS (
    SELECT
      c.id AS customer_id,
      c.name AS customer_name,
      SUM(COALESCE(pjo.total_revenue_calculated, pjo.estimated_amount, 0)) AS total_value,
      COUNT(*) AS job_count
    FROM proforma_job_orders pjo
    JOIN projects pr ON pr.id = pjo.project_id
    JOIN customers c ON c.id = pr.customer_id
    WHERE pjo.status = 'approved'
      AND pjo.is_active IS NOT FALSE
      AND pjo.created_at >= p_period_start AND pjo.created_at <= p_period_end
    GROUP BY c.id, c.name
  ),
  prev_customers AS (
    SELECT
      c.id AS customer_id,
      SUM(COALESCE(pjo.total_revenue_calculated, pjo.estimated_amount, 0)) AS total_value
    FROM proforma_job_orders pjo
    JOIN projects pr ON pr.id = pjo.project_id
    JOIN customers c ON c.id = pr.customer_id
    WHERE pjo.status = 'approved'
      AND pjo.is_active IS NOT FALSE
      AND pjo.created_at >= p_prev_start AND pjo.created_at <= p_prev_end
    GROUP BY c.id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', cc.customer_id,
      'name', cc.customer_name,
      'totalValue', cc.total_value,
      'jobCount', cc.job_count,
      'avgValue', CASE WHEN cc.job_count > 0 THEN ROUND(cc.total_value / cc.job_count) ELSE 0 END,
      'trend', CASE
        WHEN COALESCE(pc.total_value, 0) = 0 AND cc.total_value > 0 THEN 'up'
        WHEN COALESCE(pc.total_value, 0) = 0 THEN 'stable'
        WHEN cc.total_value > COALESCE(pc.total_value, 0) THEN 'up'
        WHEN cc.total_value < COALESCE(pc.total_value, 0) THEN 'down'
        ELSE 'stable'
      END,
      'trendPercentage', CASE
        WHEN COALESCE(pc.total_value, 0) = 0 AND cc.total_value > 0 THEN 100
        WHEN COALESCE(pc.total_value, 0) = 0 THEN 0
        ELSE ROUND(ABS((cc.total_value - COALESCE(pc.total_value, 0))::NUMERIC
          / GREATEST(COALESCE(pc.total_value, 1), 1)) * 100)::INT
      END
    ) ORDER BY cc.total_value DESC
  ), '[]'::jsonb)
  INTO v_top_customers
  FROM current_customers cc
  LEFT JOIN prev_customers pc ON pc.customer_id = cc.customer_id;

  -- ── Win/Loss data ──
  WITH pjo_data AS (
    SELECT
      status, converted_to_jo,
      COALESCE(total_revenue_calculated, estimated_amount, 0) AS revenue,
      rejection_reason
    FROM proforma_job_orders
    WHERE is_active IS NOT FALSE
      AND created_at >= p_period_start AND created_at <= p_period_end
  ),
  categories AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'approved' AND converted_to_jo = true) AS won_count,
      COALESCE(SUM(revenue) FILTER (WHERE status = 'approved' AND converted_to_jo = true), 0) AS won_value,
      COUNT(*) FILTER (WHERE status = 'rejected') AS lost_count,
      COALESCE(SUM(revenue) FILTER (WHERE status = 'rejected'), 0) AS lost_value,
      COUNT(*) FILTER (WHERE status IN ('draft', 'pending_approval')
        OR (status = 'approved' AND (converted_to_jo IS NULL OR converted_to_jo = false))) AS pending_count,
      COALESCE(SUM(revenue) FILTER (WHERE status IN ('draft', 'pending_approval')
        OR (status = 'approved' AND (converted_to_jo IS NULL OR converted_to_jo = false))), 0) AS pending_value,
      COUNT(*) AS total_count
    FROM pjo_data
  ),
  loss_reasons AS (
    SELECT rejection_reason AS reason, COUNT(*) AS cnt
    FROM pjo_data
    WHERE status = 'rejected' AND rejection_reason IS NOT NULL AND rejection_reason != ''
    GROUP BY rejection_reason
    ORDER BY cnt DESC
  )
  SELECT jsonb_build_object(
    'won', jsonb_build_object(
      'count', c.won_count,
      'value', c.won_value,
      'percentage', CASE WHEN c.total_count > 0 THEN ROUND((c.won_count::NUMERIC / c.total_count) * 100) ELSE 0 END
    ),
    'lost', jsonb_build_object(
      'count', c.lost_count,
      'value', c.lost_value,
      'percentage', CASE WHEN c.total_count > 0 THEN ROUND((c.lost_count::NUMERIC / c.total_count) * 100) ELSE 0 END
    ),
    'pending', jsonb_build_object(
      'count', c.pending_count,
      'value', c.pending_value,
      'percentage', CASE WHEN c.total_count > 0 THEN ROUND((c.pending_count::NUMERIC / c.total_count) * 100) ELSE 0 END
    ),
    'lossReasons', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('reason', lr.reason, 'count', lr.cnt)) FROM loss_reasons lr),
      '[]'::jsonb
    )
  )
  INTO v_win_loss
  FROM categories c;

  -- ── Assemble result ──
  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'pipeline', v_pipeline,
    'pendingFollowups', v_followups,
    'topCustomers', v_top_customers,
    'winLossData', v_win_loss
  );
END;
$$;


-- ============================================================================
-- 2. ADMIN DASHBOARD METRICS
-- Replaces: 3 Supabase queries + 10 JS calculation functions
-- Returns: kpis, pipeline, agingBuckets, pendingWork, recentDocuments
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics(
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kpis JSONB;
  v_pipeline JSONB;
  v_aging JSONB;
  v_pending_work JSONB;
  v_recent_docs JSONB;
BEGIN
  -- ── KPIs: 6 counts/sums ──
  SELECT jsonb_build_object(
    'pjosPendingApproval', (
      SELECT COUNT(*) FROM proforma_job_orders
      WHERE status = 'pending_approval' AND is_active IS NOT FALSE
    ),
    'pjosReadyForJO', (
      SELECT COUNT(*) FROM proforma_job_orders
      WHERE status = 'approved' AND all_costs_confirmed = true
        AND (converted_to_jo IS NULL OR converted_to_jo = false)
        AND is_active IS NOT FALSE
    ),
    'josInProgress', (
      SELECT COUNT(*) FROM job_orders WHERE status = 'active'
    ),
    'invoicesUnpaid', (
      SELECT COUNT(*) FROM invoices WHERE status IN ('sent', 'overdue')
    ),
    'revenueThisPeriod', (
      SELECT COALESCE(SUM(total_amount), 0) FROM invoices
      WHERE status = 'paid' AND paid_at >= p_period_start AND paid_at <= p_period_end
    ),
    'documentsCreated', (
      (SELECT COUNT(*) FROM proforma_job_orders WHERE created_at >= p_period_start AND created_at <= p_period_end)
      + (SELECT COUNT(*) FROM job_orders WHERE created_at >= p_period_start AND created_at <= p_period_end)
      + (SELECT COUNT(*) FROM invoices WHERE created_at >= p_period_start AND created_at <= p_period_end)
    )
  ) INTO v_kpis;

  -- ── Pipeline: 4 stages with percentages ──
  WITH stage_counts AS (
    SELECT
      CASE
        WHEN converted_to_jo = true THEN 'converted'
        ELSE status
      END AS stage_status,
      COUNT(*) AS cnt
    FROM proforma_job_orders
    WHERE is_active IS NOT FALSE
      AND status IN ('draft', 'pending_approval', 'approved')
    GROUP BY stage_status
  ),
  total AS (
    SELECT COALESCE(SUM(cnt), 0) AS n FROM stage_counts
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'status', s.stage_status,
      'label', CASE s.stage_status
        WHEN 'draft' THEN 'Draft'
        WHEN 'pending_approval' THEN 'Pending Approval'
        WHEN 'approved' THEN 'Approved'
        WHEN 'converted' THEN 'Converted to JO'
      END,
      'count', s.cnt,
      'percentage', CASE WHEN t.n > 0 THEN ROUND((s.cnt::NUMERIC / t.n) * 100, 1) ELSE 0 END
    )
  ), '[]'::jsonb)
  INTO v_pipeline
  FROM stage_counts s, total t;

  -- ── Aging buckets ──
  WITH aging AS (
    SELECT
      CASE
        WHEN (CURRENT_DATE - due_date::DATE) <= 0 THEN 0
        WHEN (CURRENT_DATE - due_date::DATE) <= 30 THEN 1
        WHEN (CURRENT_DATE - due_date::DATE) <= 60 THEN 2
        WHEN (CURRENT_DATE - due_date::DATE) <= 90 THEN 3
        ELSE 4
      END AS bucket_order,
      total_amount
    FROM invoices
    WHERE status IN ('sent', 'overdue') AND due_date IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'label', CASE a.bucket_order
        WHEN 0 THEN 'Current'
        WHEN 1 THEN '1-30 days'
        WHEN 2 THEN '31-60 days'
        WHEN 3 THEN '61-90 days'
        WHEN 4 THEN '90+ days'
      END,
      'minDays', CASE a.bucket_order
        WHEN 0 THEN 0
        WHEN 1 THEN 1
        WHEN 2 THEN 31
        WHEN 3 THEN 61
        WHEN 4 THEN 91
      END,
      'maxDays', CASE a.bucket_order
        WHEN 0 THEN 0
        WHEN 1 THEN 30
        WHEN 2 THEN 60
        WHEN 3 THEN 90
        ELSE NULL
      END,
      'count', a.cnt,
      'totalAmount', a.total_amount,
      'isOverdue', a.bucket_order > 0
    ) ORDER BY a.bucket_order
  ), '[]'::jsonb)
  INTO v_aging
  FROM (
    SELECT bucket_order, COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS total_amount
    FROM aging
    GROUP BY bucket_order
  ) a;

  -- ── Pending work items (UNION of 3 sources) ──
  WITH work_items AS (
    -- PJOs ready for JO conversion
    SELECT
      p.id, p.pjo_number AS document_number,
      'pjo' AS doc_type, 'create_jo' AS action,
      COALESCE(c.name, 'Unknown') AS customer_name,
      GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - COALESCE(p.updated_at, p.created_at)))::INT AS days_pending
    FROM proforma_job_orders p
    LEFT JOIN projects pr ON pr.id = p.project_id
    LEFT JOIN customers c ON c.id = pr.customer_id
    WHERE p.status = 'approved' AND p.all_costs_confirmed = true
      AND (p.converted_to_jo IS NULL OR p.converted_to_jo = false)
      AND p.is_active IS NOT FALSE

    UNION ALL

    -- JOs ready for invoice
    SELECT
      jo.id, jo.jo_number, 'jo', 'create_invoice',
      COALESCE(c.name, 'Unknown'),
      GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - COALESCE(jo.updated_at, jo.created_at)))::INT
    FROM job_orders jo
    LEFT JOIN proforma_job_orders pjo ON pjo.id = jo.pjo_id
    LEFT JOIN projects pr ON pr.id = pjo.project_id
    LEFT JOIN customers c ON c.id = pr.customer_id
    WHERE jo.status IN ('completed', 'submitted_to_finance')

    UNION ALL

    -- Invoices needing action
    SELECT
      i.id, i.invoice_number, 'invoice',
      CASE WHEN i.status = 'draft' THEN 'send_invoice' ELSE 'follow_up_payment' END,
      COALESCE(c.name, 'Unknown'),
      GREATEST(0, EXTRACT(DAY FROM CURRENT_TIMESTAMP - COALESCE(i.updated_at, i.created_at)))::INT
    FROM invoices i
    LEFT JOIN job_orders jo ON jo.id = i.jo_id
    LEFT JOIN proforma_job_orders pjo ON pjo.id = jo.pjo_id
    LEFT JOIN projects pr ON pr.id = pjo.project_id
    LEFT JOIN customers c ON c.id = pr.customer_id
    WHERE i.status IN ('draft', 'overdue')
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', wi.id,
      'number', wi.document_number,
      'type', wi.doc_type,
      'actionNeeded', wi.action,
      'actionLabel', CASE wi.action
        WHEN 'create_jo' THEN 'Create JO'
        WHEN 'create_invoice' THEN 'Create Invoice'
        WHEN 'send_invoice' THEN 'Send Invoice'
        WHEN 'follow_up_payment' THEN 'Follow Up Payment'
      END,
      'customerName', wi.customer_name,
      'daysPending', wi.days_pending,
      'linkUrl', CASE wi.doc_type
        WHEN 'pjo' THEN '/proforma-jo/' || wi.id
        WHEN 'jo' THEN '/job-orders/' || wi.id
        WHEN 'invoice' THEN '/invoices/' || wi.id
      END
    ) ORDER BY wi.days_pending DESC
  ), '[]'::jsonb)
  INTO v_pending_work
  FROM work_items wi;

  -- ── Recent documents (UNION + ORDER BY + LIMIT 10) ──
  WITH recent AS (
    SELECT p.id, 'pjo' AS doc_type, p.pjo_number AS number,
      COALESCE(c.name, 'Unknown') AS customer_name,
      p.status, p.created_at, COALESCE(p.updated_at, p.created_at) AS updated_at
    FROM proforma_job_orders p
    LEFT JOIN projects pr ON pr.id = p.project_id
    LEFT JOIN customers c ON c.id = pr.customer_id
    WHERE p.is_active IS NOT FALSE

    UNION ALL

    SELECT jo.id, 'jo', jo.jo_number,
      COALESCE(c.name, 'Unknown'),
      jo.status, jo.created_at, COALESCE(jo.updated_at, jo.created_at)
    FROM job_orders jo
    LEFT JOIN proforma_job_orders pjo ON pjo.id = jo.pjo_id
    LEFT JOIN projects pr ON pr.id = pjo.project_id
    LEFT JOIN customers c ON c.id = pr.customer_id

    UNION ALL

    SELECT i.id, 'invoice', i.invoice_number,
      COALESCE(c.name, 'Unknown'),
      i.status, i.created_at, COALESCE(i.updated_at, i.created_at)
    FROM invoices i
    LEFT JOIN job_orders jo ON jo.id = i.jo_id
    LEFT JOIN proforma_job_orders pjo ON pjo.id = jo.pjo_id
    LEFT JOIN projects pr ON pr.id = pjo.project_id
    LEFT JOIN customers c ON c.id = pr.customer_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'type', r.doc_type,
      'number', r.number,
      'customerName', r.customer_name,
      'status', r.status,
      'createdAt', r.created_at,
      'updatedAt', r.updated_at,
      'linkUrl', CASE r.doc_type
        WHEN 'pjo' THEN '/proforma-jo/' || r.id
        WHEN 'jo' THEN '/job-orders/' || r.id
        WHEN 'invoice' THEN '/invoices/' || r.id
      END
    )
  ), '[]'::jsonb)
  INTO v_recent_docs
  FROM (
    SELECT * FROM recent ORDER BY updated_at DESC LIMIT 10
  ) r;

  -- ── Assemble result ──
  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'pipeline', v_pipeline,
    'agingBuckets', v_aging,
    'pendingWork', v_pending_work,
    'recentDocuments', v_recent_docs
  );
END;
$$;


-- ============================================================================
-- 3. MANAGER DASHBOARD METRICS
-- Replaces: 5 Supabase queries + 8 JS calculation functions (aggregation parts)
-- Returns: kpis + plData (revenue/costs by category for 3 periods)
-- Note: pendingApprovals and budgetAlerts lists still use regular queries
-- ============================================================================

CREATE OR REPLACE FUNCTION get_manager_dashboard_metrics(
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_prev_start TIMESTAMPTZ,
  p_prev_end TIMESTAMPTZ,
  p_ytd_start TIMESTAMPTZ,
  p_ytd_end TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kpis JSONB;
  v_pl_data JSONB;
  v_current_revenue NUMERIC;
  v_last_revenue NUMERIC;
  v_ytd_revenue NUMERIC;
  v_current_costs NUMERIC;
  v_last_costs NUMERIC;
  v_ytd_costs NUMERIC;
  v_current_profit NUMERIC;
  v_last_profit NUMERIC;
BEGIN
  -- ── Revenue/cost aggregations from job_orders (3 periods in 1 scan) ──
  SELECT
    COALESCE(SUM(final_revenue) FILTER (WHERE created_at >= p_period_start AND created_at <= p_period_end), 0),
    COALESCE(SUM(final_revenue) FILTER (WHERE created_at >= p_prev_start AND created_at <= p_prev_end), 0),
    COALESCE(SUM(final_revenue) FILTER (WHERE created_at >= p_ytd_start AND created_at <= p_ytd_end), 0),
    COALESCE(SUM(final_cost) FILTER (WHERE created_at >= p_period_start AND created_at <= p_period_end), 0),
    COALESCE(SUM(final_cost) FILTER (WHERE created_at >= p_prev_start AND created_at <= p_prev_end), 0),
    COALESCE(SUM(final_cost) FILTER (WHERE created_at >= p_ytd_start AND created_at <= p_ytd_end), 0)
  INTO v_current_revenue, v_last_revenue, v_ytd_revenue,
       v_current_costs, v_last_costs, v_ytd_costs
  FROM job_orders;

  v_current_profit := v_current_revenue - v_current_costs;
  v_last_profit := v_last_revenue - v_last_costs;

  -- ── KPIs ──
  v_kpis := jsonb_build_object(
    'revenueMTD', v_current_revenue,
    'costsMTD', v_current_costs,
    'profitMTD', v_current_profit,
    'marginMTD', CASE
      WHEN v_current_revenue > 0 THEN ROUND((v_current_profit / v_current_revenue) * 100, 1)
      ELSE 0
    END,
    'revenueVariance', CASE
      WHEN v_last_revenue > 0 THEN ROUND(((v_current_revenue - v_last_revenue) / v_last_revenue) * 100, 1)
      ELSE 0
    END,
    'costsVariance', CASE
      WHEN v_last_costs > 0 THEN ROUND(((v_current_costs - v_last_costs) / v_last_costs) * 100, 1)
      ELSE 0
    END,
    'profitVariance', CASE
      WHEN v_last_profit != 0 THEN ROUND(((v_current_profit - v_last_profit) / ABS(v_last_profit)) * 100, 1)
      ELSE 0
    END,
    'pendingApprovalsCount', (
      SELECT COUNT(*) FROM proforma_job_orders WHERE status = 'pending_approval' AND is_active IS NOT FALSE
    ),
    'budgetExceededCount', (
      SELECT COUNT(*) FROM pjo_cost_items WHERE status = 'exceeded'
    ),
    'jobsInProgressCount', (
      SELECT COUNT(*) FROM job_orders WHERE status = 'active'
    )
  );

  -- ── Cost breakdown by category for 3 periods ──
  WITH cost_periods AS (
    SELECT
      ci.category,
      COALESCE(SUM(COALESCE(ci.actual_amount, ci.estimated_amount, 0))
        FILTER (WHERE pjo.created_at >= p_period_start AND pjo.created_at <= p_period_end), 0) AS current_amount,
      COALESCE(SUM(COALESCE(ci.actual_amount, ci.estimated_amount, 0))
        FILTER (WHERE pjo.created_at >= p_prev_start AND pjo.created_at <= p_prev_end), 0) AS last_amount,
      COALESCE(SUM(COALESCE(ci.actual_amount, ci.estimated_amount, 0))
        FILTER (WHERE pjo.created_at >= p_ytd_start AND pjo.created_at <= p_ytd_end), 0) AS ytd_amount
    FROM pjo_cost_items ci
    JOIN proforma_job_orders pjo ON pjo.id = ci.pjo_id
    WHERE pjo.is_active IS NOT FALSE
    GROUP BY ci.category
  )
  SELECT jsonb_build_object(
    'currentRevenue', v_current_revenue,
    'lastRevenue', v_last_revenue,
    'ytdRevenue', v_ytd_revenue,
    'currentCostsByCategory', COALESCE(
      (SELECT jsonb_object_agg(category, current_amount) FROM cost_periods),
      '{}'::jsonb
    ),
    'lastCostsByCategory', COALESCE(
      (SELECT jsonb_object_agg(category, last_amount) FROM cost_periods),
      '{}'::jsonb
    ),
    'ytdCostsByCategory', COALESCE(
      (SELECT jsonb_object_agg(category, ytd_amount) FROM cost_periods),
      '{}'::jsonb
    )
  ) INTO v_pl_data;

  -- ── Assemble result ──
  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'plData', v_pl_data
  );
END;
$$;


-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_sales_dashboard_metrics(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_manager_dashboard_metrics(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
