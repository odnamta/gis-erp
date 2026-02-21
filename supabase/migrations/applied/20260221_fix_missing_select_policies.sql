-- =====================================================
-- Fix: Add SELECT RLS policies to 30+ tables
--
-- Root cause: Tables had RLS enabled but no SELECT policy,
-- causing 403 errors on any query. This broke:
-- - HSE Incident Report page (job_orders join)
-- - Customs PEB Export page (job_orders join)
-- - Settings page (company_settings)
-- - My Leave page (leave_requests, leave_balances)
-- - Financial pages (invoices, payments)
-- - JMP submit-to-review (UPDATE policy too restrictive)
-- - Drawing create (INSERT policy too restrictive)
--
-- Applied: 2026-02-21
-- =====================================================

-- Core business tables
CREATE POLICY "job_orders_select" ON public.job_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "vendor_payments_select" ON public.vendor_payments FOR SELECT USING (auth.uid() IS NOT NULL);

-- Settings & config
CREATE POLICY "company_settings_select" ON public.company_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "app_config_select" ON public.app_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "feature_flags_select" ON public.feature_flags FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_homepages_select" ON public.role_homepages FOR SELECT USING (auth.uid() IS NOT NULL);

-- HR / Leave
CREATE POLICY "leave_requests_select" ON public.leave_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "leave_balances_select" ON public.leave_balances FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_records_select" ON public.attendance_records FOR SELECT USING (auth.uid() IS NOT NULL);

-- Payroll
CREATE POLICY "payroll_periods_select" ON public.payroll_periods FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "payroll_records_select" ON public.payroll_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "payroll_components_select" ON public.payroll_components FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "employee_payroll_setup_select" ON public.employee_payroll_setup FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "salary_slips_select" ON public.salary_slips FOR SELECT USING (auth.uid() IS NOT NULL);

-- Dashboard
CREATE POLICY "dashboard_configs_select" ON public.dashboard_configs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dashboard_layouts_select" ON public.dashboard_layouts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dashboard_widgets_select" ON public.dashboard_widgets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "default_widget_layouts_select" ON public.default_widget_layouts FOR SELECT USING (auth.uid() IS NOT NULL);

-- User-scoped tables (own data only)
CREATE POLICY "user_onboarding_progress_select" ON public.user_onboarding_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_widget_configs_select" ON public.user_widget_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_sessions_select" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_tour_progress_select" ON public.user_tour_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_notification_type_preferences_select" ON public.user_notification_type_preferences FOR SELECT USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notification_preferences_select" ON public.notification_preferences FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "notification_templates_select" ON public.notification_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "notification_workflow_preferences_select" ON public.notification_workflow_preferences FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operations
CREATE POLICY "manpower_cost_summary_select" ON public.manpower_cost_summary FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tracking_subscriptions_select" ON public.tracking_subscriptions FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix JMP UPDATE policy: allow marketing and ops to update (they can create, should be able to submit for review)
DROP POLICY IF EXISTS "journey_management_plans_update" ON public.journey_management_plans;
CREATE POLICY "journey_management_plans_update" ON public.journey_management_plans
  FOR UPDATE USING (
    has_role(ARRAY['admin', 'super_admin', 'owner', 'manager', 'engineer', 'ops', 'marketing'])
  );

-- Fix drawings INSERT: allow marketing to create drawings (explorer mode testing)
DROP POLICY IF EXISTS "drawings_insert" ON public.drawings;
CREATE POLICY "drawings_insert" ON public.drawings
  FOR INSERT WITH CHECK (
    has_role(ARRAY['admin', 'super_admin', 'owner', 'manager', 'engineer', 'ops', 'marketing'])
  );
